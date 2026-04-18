"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AdminReportExportToolbar } from "@/components/AdminReportExportToolbar";
import { getFirestoreLazy } from "@/lib/firestoreClient";
import { formatFirebaseError } from "@/lib/firebaseError";
import { deleteComprobanteFiles } from "@/lib/deleteRegistroAssets";
import { labelParroquiaFirestore } from "@/lib/iereParroquias";
import {
  etiquetaModalidadRegistro,
  formatEuros,
  normalizeModalidadRegistro,
  pendienteEuros,
  type ModalidadRegistro,
} from "@/lib/eventoPrecio";
import { etiquetaEstado, normalizeEstado, REGISTRO_ESTADOS } from "@/lib/registroEstados";
import {
  labelAceptoDatosEvento,
  parseAceptoDatosEvento,
  REGISTRO_ACEPTO_DATOS_EVENTO,
} from "@/lib/registroConsent";

type Row = {
  id: string;
  nombre: string;
  email: string;
  whatsapp: string;
  parroquiaLabel: string;
  estado: string;
  comprobanteURL?: string;
  montoDepositadoEuros: number;
  modalidadRegistro: ModalidadRegistro;
  /** Consentimiento RGPD al inscribirse (nuevos registros). */
  aceptoDatosEvento: boolean | null;
};

function EstadoBadge({ estado, light }: { estado: string; light?: boolean }) {
  const key = normalizeEstado(estado);
  if (light) {
    const styles: Record<string, string> = {
      pendiente_pago: "border-amber-300 bg-amber-50 text-amber-900",
      pendiente: "border-amber-300 bg-amber-50 text-amber-900",
      revision: "border-sky-300 bg-sky-50 text-sky-900",
      aprobado: "border-emerald-300 bg-emerald-50 text-emerald-900",
      rechazado: "border-rose-300 bg-rose-50 text-rose-900",
    };
    const cls = styles[key] ?? styles[estado] ?? "border-zinc-300 bg-zinc-100 text-zinc-800";
    return (
      <span
        className={`inline-flex shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide ${cls}`}
      >
        {etiquetaEstado(estado)}
      </span>
    );
  }
  const styles: Record<string, string> = {
    pendiente_pago: "border-amber-400/40 bg-amber-500/15 text-amber-200",
    pendiente: "border-amber-400/40 bg-amber-500/15 text-amber-200",
    revision: "border-sky-400/40 bg-sky-500/15 text-sky-200",
    aprobado: "border-emerald-400/40 bg-emerald-500/15 text-emerald-200",
    rechazado: "border-rose-400/40 bg-rose-500/15 text-rose-200",
  };
  const cls = styles[key] ?? styles[estado] ?? "border-white/15 bg-white/10 text-zinc-300";
  return (
    <span
      className={`inline-flex shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide ${cls}`}
    >
      {etiquetaEstado(estado)}
    </span>
  );
}

function AceptoDatosSelect({ value }: { value: boolean | null }) {
  const v = value === true ? "si" : value === false ? "no" : "no_consta";
  return (
    <select
      disabled
      value={v}
      aria-label="Aceptó el aviso de datos para este evento"
      className="max-w-[11rem] cursor-default rounded-lg border border-zinc-300 bg-white py-1.5 pl-2 pr-7 text-xs font-medium text-zinc-800 dark:border-white/15 dark:bg-zinc-900/80 dark:text-zinc-200"
    >
      <option value="si">Sí, aceptó</option>
      <option value="no">No</option>
      <option value="no_consta">No consta</option>
    </select>
  );
}

const btnBase =
  "touch-manipulation rounded-xl px-3 py-3 text-xs font-semibold transition active:scale-[0.98] disabled:opacity-40 sm:py-2";

type ComprobantePreview = {
  url: string;
  nombre: string;
};

function isPdfUrl(url: string): boolean {
  return /\.pdf($|[?#])/i.test(url);
}

export default function AdminPanel() {
  const reportRef = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);
  const [previewTarget, setPreviewTarget] = useState<ComprobantePreview | null>(null);
  const [generadoEn, setGeneradoEn] = useState("");
  const mapRows = useCallback((docs: Array<{ id: string; data: () => Record<string, unknown> }>): Row[] => {
    const list: Row[] = docs.map((d) => {
      const x = d.data();
      const par = x.parroquia as
        | { area?: string; parroquia?: string; iglesia?: string; ciudad?: string; nombre?: string }
        | undefined;
      const parroquiaLabel = labelParroquiaFirestore(par);
      const wa =
        typeof x.whatsapp === "string"
          ? x.whatsapp
          : typeof x.telefono === "string"
            ? x.telefono
            : "";
      const md = Number(x.montoDepositadoEuros ?? 0);
      const rawAcepto = x[REGISTRO_ACEPTO_DATOS_EVENTO];
      const aceptoDatosEvento = parseAceptoDatosEvento(rawAcepto);
      return {
        id: d.id,
        nombre: String(x.nombre ?? ""),
        email: String(x.email ?? ""),
        whatsapp: wa,
        parroquiaLabel,
        estado: String(x.estado ?? ""),
        comprobanteURL: x.comprobanteURL ? String(x.comprobanteURL) : undefined,
        montoDepositadoEuros: Number.isFinite(md) ? md : 0,
        modalidadRegistro: normalizeModalidadRegistro(x.modalidadRegistro),
        aceptoDatosEvento,
      };
    });
    list.sort((a, b) => a.nombre.localeCompare(b.nombre));
    return list;
  }, []);

  useEffect(() => {
    let active = true;
    let unsub: (() => void) | null = null;

    void (async () => {
      try {
        const { fs, db } = await getFirestoreLazy();
        if (!active) return;
        const { collection, onSnapshot } = fs;
        unsub = onSnapshot(
          collection(db, "registros"),
          (snap) => {
            setRows(mapRows(snap.docs));
            setError(null);
          },
          (e) => {
            setError(formatFirebaseError(e));
          },
        );
      } catch (e) {
        setError(formatFirebaseError(e));
      }
    })();

    return () => {
      active = false;
      unsub?.();
    };
  }, [mapRows]);

  useEffect(() => {
    if (rows === null) return;
    setGeneradoEn(
      new Intl.DateTimeFormat("es-ES", {
        dateStyle: "long",
        timeStyle: "short",
      }).format(new Date()),
    );
  }, [rows]);

  const load = useCallback(async () => {
    try {
      const { fs, db } = await getFirestoreLazy();
      const { collection, getDocs } = fs;
      const snap = await getDocs(collection(db, "registros"));
      setRows(mapRows(snap.docs));
      setError(null);
    } catch (e) {
      setError(formatFirebaseError(e));
    }
  }, [mapRows]);

  async function aprobar(registroId: string) {
    setBusyId(registroId);
    setError(null);
    try {
      const { fs, db } = await getFirestoreLazy();
      const { doc, updateDoc } = fs;
      const { generateQrDataUrl } = await import("@/lib/qr");
      const qr = await generateQrDataUrl(registroId, 320);
      await updateDoc(doc(db, "registros", registroId), {
        estado: "aprobado",
        qr,
      });
      await load();
    } catch (e) {
      setError(formatFirebaseError(e));
    } finally {
      setBusyId(null);
    }
  }

  async function rechazar(registroId: string) {
    setBusyId(registroId);
    setError(null);
    try {
      const { fs, db } = await getFirestoreLazy();
      const { doc, updateDoc } = fs;
      await updateDoc(doc(db, "registros", registroId), { estado: "rechazado" });
      await load();
    } catch (e) {
      setError(formatFirebaseError(e));
    } finally {
      setBusyId(null);
    }
  }

  async function confirmarEliminar() {
    if (!deleteTarget) return;
    const id = deleteTarget.id;
    const comprobanteURL = deleteTarget.comprobanteURL;
    setBusyId(id);
    setError(null);
    try {
      const { fs, db } = await getFirestoreLazy();
      const { doc, deleteDoc } = fs;
      await deleteDoc(doc(db, "registros", id));
      setDeleteTarget(null);
      await load();
      await deleteComprobanteFiles(id, comprobanteURL);
    } catch (e) {
      setError(formatFirebaseError(e));
    } finally {
      setBusyId(null);
    }
  }

  useEffect(() => {
    if (!previewTarget) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setPreviewTarget(null);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [previewTarget]);

  if (error && !rows?.length) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-950/40 px-4 py-3 text-rose-200">
        {error}
      </div>
    );
  }
  if (rows === null) {
    return (
      <div className="flex items-center justify-center gap-3 py-20 text-zinc-400">
        <span
          className="size-8 animate-spin rounded-full border-2 border-rose-500/30 border-t-rose-400"
          aria-hidden
        />
        Cargando registros…
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        {error && (
          <div
            className="no-print rounded-xl border border-rose-500/40 bg-rose-950/50 px-4 py-3 text-sm text-rose-100"
            role="alert"
          >
            {error}
          </div>
        )}

        <div className="no-print flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <AdminReportExportToolbar reportRef={reportRef} filenameBase="registros-iere-2026" />
            <p className="text-sm text-zinc-400">
              <span className="font-semibold text-white">{rows.length}</span>{" "}
              {rows.length === 1 ? "registro" : "registros"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/recaudacion"
              className="touch-manipulation rounded-xl border border-rose-500/35 bg-rose-600/15 px-4 py-3 text-sm font-semibold text-rose-100 transition hover:bg-rose-600/25 active:scale-[0.98] sm:py-2"
            >
              Resumen de recaudación
            </Link>
            <button
              type="button"
              onClick={() => void load()}
              className="touch-manipulation rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-zinc-200 transition hover:bg-white/10 active:scale-[0.98] sm:py-2"
            >
              Actualizar lista
            </button>
          </div>
        </div>

        <div
          ref={reportRef}
          className="admin-report-print-surface space-y-6 rounded-2xl border border-zinc-200 bg-white p-5 text-zinc-900 shadow-xl sm:p-8 dark:border-zinc-600 dark:bg-zinc-50"
        >
          <header className="border-b border-zinc-200 pb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">
              Informe
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
              Gestión de registros
            </h1>
            <p className="mt-2 text-sm text-zinc-600">
              Encuentro Nacional de Mujeres IERE · 25 al 27 de septiembre de 2026
            </p>
            <p className="mt-2 text-xs text-zinc-500">
              Generado: <span className="font-medium text-zinc-700">{generadoEn}</span>
            </p>
            <p className="mt-2 text-sm font-medium text-zinc-800">
              {rows.length} {rows.length === 1 ? "persona inscrita" : "personas inscritas"}
            </p>
          </header>

          {/* Vista escritorio: tabla */}
          <div className="hidden overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1180px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50/90">
                    <th className="whitespace-nowrap px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-zinc-600">
                      Nombre
                    </th>
                    <th className="whitespace-nowrap px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-zinc-600">
                      Email
                    </th>
                    <th className="whitespace-nowrap px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-zinc-600">
                      WhatsApp
                    </th>
                    <th className="min-w-[180px] px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-zinc-600">
                      Parroquia
                    </th>
                    <th className="whitespace-nowrap px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-zinc-600">
                      Modalidad
                    </th>
                    <th className="whitespace-nowrap px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-zinc-600">
                      Aviso datos
                    </th>
                    <th className="whitespace-nowrap px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-zinc-600">
                      Estado
                    </th>
                    <th className="whitespace-nowrap px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-zinc-600">
                      Pagado
                    </th>
                    <th className="whitespace-nowrap px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-zinc-600">
                      Pendiente
                    </th>
                    <th className="whitespace-nowrap px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-zinc-600">
                      Comprobante
                    </th>
                    <th className="no-print no-pdf whitespace-nowrap px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-zinc-600">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {rows.map((r) => {
                    const est = normalizeEstado(r.estado);
                    const aprobarBloqueado = est === REGISTRO_ESTADOS.pendiente_pago;
                    return (
                      <tr key={r.id} className="transition hover:bg-zinc-50/80">
                        <td className="max-w-[160px] px-4 py-3 font-medium text-zinc-900">{r.nombre}</td>
                        <td className="max-w-[200px] truncate px-4 py-3 text-zinc-700" title={r.email}>
                          {r.email}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-zinc-700">{r.whatsapp || "—"}</td>
                        <td className="max-w-[220px] px-4 py-3 text-xs leading-snug text-zinc-600">
                          {r.parroquiaLabel}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-800">
                          {etiquetaModalidadRegistro(r.modalidadRegistro)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs text-zinc-800">
                              {labelAceptoDatosEvento(r.aceptoDatosEvento)}
                            </span>
                            <span className="no-pdf">
                              <AceptoDatosSelect value={r.aceptoDatosEvento} />
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <EstadoBadge estado={r.estado} light />
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 tabular-nums text-zinc-900">
                          {formatEuros(r.montoDepositadoEuros)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 tabular-nums text-amber-800">
                          {formatEuros(pendienteEuros(r.montoDepositadoEuros, r.modalidadRegistro))}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {r.comprobanteURL ? (
                            <span className="inline-flex flex-wrap items-center gap-2">
                              <span className="text-zinc-800">Sí</span>
                              <button
                                type="button"
                                onClick={() =>
                                  setPreviewTarget({
                                    url: r.comprobanteURL ?? "",
                                    nombre: r.nombre,
                                  })
                                }
                                className="no-pdf font-medium text-rose-600 underline decoration-rose-400/60 underline-offset-2 hover:text-rose-700"
                              >
                                Ver archivo
                              </button>
                            </span>
                          ) : (
                            <span className="text-zinc-500">—</span>
                          )}
                        </td>
                        <td className="no-print no-pdf px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              disabled={busyId === r.id || aprobarBloqueado}
                              title={
                                aprobarBloqueado
                                  ? "Primero debe subirse un comprobante (estado pendiente de pago)"
                                  : undefined
                              }
                              onClick={() => aprobar(r.id)}
                              className={`${btnBase} bg-emerald-600/90 text-white shadow-lg shadow-emerald-900/20 hover:bg-emerald-500`}
                            >
                              Aprobar
                            </button>
                            <button
                              type="button"
                              disabled={busyId === r.id}
                              onClick={() => rechazar(r.id)}
                              className={`${btnBase} bg-amber-600/90 text-white shadow-lg shadow-amber-900/20 hover:bg-amber-500`}
                            >
                              Rechazar
                            </button>
                            <button
                              type="button"
                              disabled={busyId === r.id}
                              onClick={() => setDeleteTarget(r)}
                              className={`${btnBase} border border-rose-500/50 bg-rose-950/50 text-rose-200 hover:bg-rose-900/80`}
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Vista móvil: tarjetas */}
          <div className="flex flex-col gap-3 md:hidden">
            {rows.map((r) => {
              const est = normalizeEstado(r.estado);
              const aprobarBloqueado = est === REGISTRO_ESTADOS.pendiente_pago;
              return (
                <article
                  key={r.id}
                  className="rounded-2xl border border-zinc-200 bg-zinc-50/90 p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3 border-b border-zinc-200 pb-3">
                    <h3 className="min-w-0 flex-1 text-base font-semibold leading-snug text-zinc-900">
                      {r.nombre}
                    </h3>
                    <EstadoBadge estado={r.estado} light />
                  </div>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      <div>
                        <dt className="text-[0.65rem] font-semibold uppercase tracking-wider text-zinc-500">
                          Pagado
                        </dt>
                        <dd className="tabular-nums text-emerald-800">
                          {formatEuros(r.montoDepositadoEuros)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[0.65rem] font-semibold uppercase tracking-wider text-zinc-500">
                          Pendiente
                        </dt>
                        <dd className="tabular-nums text-amber-800">
                          {formatEuros(pendienteEuros(r.montoDepositadoEuros, r.modalidadRegistro))}
                        </dd>
                      </div>
                    </div>
                    <div>
                      <dt className="text-[0.65rem] font-semibold uppercase tracking-wider text-zinc-500">
                        Modalidad
                      </dt>
                      <dd className="text-zinc-800">{etiquetaModalidadRegistro(r.modalidadRegistro)}</dd>
                    </div>
                    <div>
                      <dt className="text-[0.65rem] font-semibold uppercase tracking-wider text-zinc-500">
                        Aviso datos (RGPD)
                      </dt>
                      <dd className="mt-1 text-zinc-800">{labelAceptoDatosEvento(r.aceptoDatosEvento)}</dd>
                      <dd className="no-pdf mt-1">
                        <AceptoDatosSelect value={r.aceptoDatosEvento} />
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[0.65rem] font-semibold uppercase tracking-wider text-zinc-500">
                        Email
                      </dt>
                      <dd className="break-all text-zinc-700">{r.email}</dd>
                    </div>
                    <div>
                      <dt className="text-[0.65rem] font-semibold uppercase tracking-wider text-zinc-500">
                        WhatsApp
                      </dt>
                      <dd className="text-zinc-700">{r.whatsapp || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-[0.65rem] font-semibold uppercase tracking-wider text-zinc-500">
                        Parroquia
                      </dt>
                      <dd className="text-xs leading-snug text-zinc-600">{r.parroquiaLabel}</dd>
                    </div>
                  </dl>
                  {r.comprobanteURL && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                      <span className="text-zinc-800">Comprobante: Sí</span>
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewTarget({
                            url: r.comprobanteURL ?? "",
                            nombre: r.nombre,
                          })
                        }
                        className="no-pdf inline-flex touch-manipulation items-center gap-2 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 font-medium text-rose-800"
                      >
                        Ver comprobante
                      </button>
                    </div>
                  )}
                  <div className="no-pdf mt-4 grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      disabled={busyId === r.id || aprobarBloqueado}
                      title={
                        aprobarBloqueado
                          ? "Primero debe subirse un comprobante (estado pendiente de pago)"
                          : undefined
                      }
                      onClick={() => aprobar(r.id)}
                      className={`${btnBase} min-h-[48px] bg-emerald-600 text-white shadow-md hover:bg-emerald-500`}
                    >
                      Aprobar
                    </button>
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => rechazar(r.id)}
                      className={`${btnBase} min-h-[48px] bg-amber-600 text-white shadow-md hover:bg-amber-500`}
                    >
                      Rechazar
                    </button>
                    <button
                      type="button"
                      disabled={busyId === r.id}
                      onClick={() => setDeleteTarget(r)}
                      className={`${btnBase} min-h-[48px] border border-rose-500/50 bg-rose-950/60 text-rose-100 hover:bg-rose-900/80`}
                    >
                      Eliminar
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {rows.length === 0 && (
            <p className="py-6 text-center text-sm text-zinc-500">No hay registros todavía.</p>
          )}
        </div>
      </div>

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-dialog-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            aria-label="Cerrar"
            onClick={() => busyId === null && setDeleteTarget(null)}
          />
          <div className="relative max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-white/15 border-b-0 bg-gradient-to-b from-zinc-900 to-zinc-950 p-5 shadow-2xl sm:rounded-2xl sm:border-b sm:p-6">
            <h2 id="delete-dialog-title" className="text-lg font-semibold text-white">
              ¿Eliminar registro?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Se borrará de forma permanente el registro de{" "}
              <span className="font-medium text-zinc-200">{deleteTarget.nombre}</span> y los
              archivos de comprobante asociados en Storage.
            </p>
            <p className="mt-3 rounded-lg border border-rose-500/20 bg-rose-950/40 px-3 py-2 text-xs text-rose-200/90">
              Esta acción no se puede deshacer.
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:gap-3 sm:pb-0">
              <button
                type="button"
                disabled={busyId !== null}
                onClick={() => setDeleteTarget(null)}
                className="touch-manipulation rounded-xl border border-white/15 px-4 py-3.5 text-sm font-medium text-zinc-300 transition hover:bg-white/5 sm:py-2.5"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={busyId !== null}
                onClick={() => void confirmarEliminar()}
                className="inline-flex touch-manipulation items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-rose-900/40 transition hover:bg-rose-500 disabled:opacity-50 sm:py-2.5"
              >
                {busyId === deleteTarget.id ? (
                  <>
                    <span
                      className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
                      aria-hidden
                    />
                    Eliminando…
                  </>
                ) : (
                  "Sí, eliminar"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {previewTarget && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="preview-dialog-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            aria-label="Cerrar visor de comprobante"
            onClick={() => setPreviewTarget(null)}
          />
          <div className="relative flex h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-white/15 border-b-0 bg-zinc-950 shadow-2xl sm:h-[90dvh] sm:max-w-5xl sm:rounded-2xl sm:border-b">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <h2 id="preview-dialog-title" className="truncate text-sm font-semibold text-white sm:text-base">
                  Comprobante de {previewTarget.nombre}
                </h2>
                <p className="mt-0.5 text-xs text-zinc-400">Pulsa Esc o Cerrar para volver al panel.</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <a
                  href={previewTarget.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="touch-manipulation inline-flex min-h-[40px] items-center rounded-lg border border-white/15 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-white/5"
                >
                  Abrir aparte
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewTarget(null)}
                  className="touch-manipulation inline-flex min-h-[40px] items-center rounded-lg bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-500"
                >
                  Cerrar
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 bg-zinc-900">
              {isPdfUrl(previewTarget.url) ? (
                <iframe
                  title="Vista previa del comprobante"
                  src={previewTarget.url}
                  className="h-full w-full"
                />
              ) : (
                <div className="flex h-full items-center justify-center p-3 sm:p-6">
                  <img
                    src={previewTarget.url}
                    alt={`Comprobante de ${previewTarget.nombre}`}
                    className="max-h-full max-w-full rounded-lg object-contain"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
