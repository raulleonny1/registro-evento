"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
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
};

function EstadoBadge({ estado }: { estado: string }) {
  const styles: Record<string, string> = {
    pendiente_pago: "border-amber-400/40 bg-amber-500/15 text-amber-200",
    pendiente: "border-amber-400/40 bg-amber-500/15 text-amber-200",
    revision: "border-sky-400/40 bg-sky-500/15 text-sky-200",
    aprobado: "border-emerald-400/40 bg-emerald-500/15 text-emerald-200",
    rechazado: "border-rose-400/40 bg-rose-500/15 text-rose-200",
  };
  const key = normalizeEstado(estado);
  const cls = styles[key] ?? styles[estado] ?? "border-white/15 bg-white/10 text-zinc-300";
  return (
    <span
      className={`inline-flex shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide ${cls}`}
    >
      {etiquetaEstado(estado)}
    </span>
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
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);
  const [previewTarget, setPreviewTarget] = useState<ComprobantePreview | null>(null);
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
            className="rounded-xl border border-rose-500/40 bg-rose-950/50 px-4 py-3 text-sm text-rose-100"
            role="alert"
          >
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-zinc-400">
            <span className="font-semibold text-white">{rows.length}</span>{" "}
            {rows.length === 1 ? "registro" : "registros"}
          </p>
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

        {/* Vista escritorio: tabla */}
        <div className="hidden overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-2xl shadow-black/40 backdrop-blur-sm md:block">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.04]">
                  <th className="whitespace-nowrap px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Nombre
                  </th>
                  <th className="whitespace-nowrap px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Email
                  </th>
                  <th className="whitespace-nowrap px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    WhatsApp
                  </th>
                  <th className="min-w-[180px] px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Parroquia
                  </th>
                  <th className="whitespace-nowrap px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Modalidad
                  </th>
                  <th className="whitespace-nowrap px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Estado
                  </th>
                  <th className="whitespace-nowrap px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Pagado
                  </th>
                  <th className="whitespace-nowrap px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Pendiente
                  </th>
                  <th className="whitespace-nowrap px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Comprobante
                  </th>
                  <th className="whitespace-nowrap px-4 py-3.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rows.map((r) => {
                  const est = normalizeEstado(r.estado);
                  const aprobarBloqueado = est === REGISTRO_ESTADOS.pendiente_pago;
                  return (
                  <tr key={r.id} className="transition hover:bg-white/[0.04]">
                    <td className="max-w-[160px] px-4 py-3 font-medium text-zinc-100">{r.nombre}</td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-zinc-300" title={r.email}>
                      {r.email}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-400">{r.whatsapp || "—"}</td>
                    <td className="max-w-[220px] px-4 py-3 text-xs leading-snug text-zinc-400">
                      {r.parroquiaLabel}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-300">
                      {etiquetaModalidadRegistro(r.modalidadRegistro)}
                    </td>
                    <td className="px-4 py-3">
                      <EstadoBadge estado={r.estado} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums text-zinc-200">
                      {formatEuros(r.montoDepositadoEuros)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 tabular-nums text-amber-200/90">
                      {formatEuros(pendienteEuros(r.montoDepositadoEuros, r.modalidadRegistro))}
                    </td>
                    <td className="px-4 py-3">
                      {r.comprobanteURL ? (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewTarget({
                              url: r.comprobanteURL ?? "",
                              nombre: r.nombre,
                            })
                          }
                          className="font-medium text-rose-300 underline decoration-rose-500/50 underline-offset-2 hover:text-rose-200"
                        >
                          Ver archivo
                        </button>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
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
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-lg shadow-black/20"
            >
              <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
                <h3 className="min-w-0 flex-1 text-base font-semibold leading-snug text-white">
                  {r.nombre}
                </h3>
                <EstadoBadge estado={r.estado} />
              </div>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <div>
                    <dt className="text-[0.65rem] font-semibold uppercase tracking-wider text-zinc-500">
                      Pagado
                    </dt>
                    <dd className="tabular-nums text-emerald-200/90">
                      {formatEuros(r.montoDepositadoEuros)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[0.65rem] font-semibold uppercase tracking-wider text-zinc-500">
                      Pendiente
                    </dt>
                    <dd className="tabular-nums text-amber-200/90">
                      {formatEuros(pendienteEuros(r.montoDepositadoEuros, r.modalidadRegistro))}
                    </dd>
                  </div>
                </div>
                <div>
                  <dt className="text-[0.65rem] font-semibold uppercase tracking-wider text-zinc-500">
                    Modalidad
                  </dt>
                  <dd className="text-zinc-300">{etiquetaModalidadRegistro(r.modalidadRegistro)}</dd>
                </div>
                <div>
                  <dt className="text-[0.65rem] font-semibold uppercase tracking-wider text-zinc-500">
                    Email
                  </dt>
                  <dd className="break-all text-zinc-300">{r.email}</dd>
                </div>
                <div>
                  <dt className="text-[0.65rem] font-semibold uppercase tracking-wider text-zinc-500">
                    WhatsApp
                  </dt>
                  <dd className="text-zinc-300">{r.whatsapp || "—"}</dd>
                </div>
                <div>
                  <dt className="text-[0.65rem] font-semibold uppercase tracking-wider text-zinc-500">
                    Parroquia
                  </dt>
                  <dd className="text-xs leading-snug text-zinc-400">{r.parroquiaLabel}</dd>
                </div>
              </dl>
              {r.comprobanteURL && (
                <button
                  type="button"
                  onClick={() =>
                    setPreviewTarget({
                      url: r.comprobanteURL ?? "",
                      nombre: r.nombre,
                    })
                  }
                  className="mt-3 inline-flex touch-manipulation items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-950/30 px-3 py-2.5 text-sm font-medium text-rose-200 active:bg-rose-900/50"
                >
                  Ver comprobante
                </button>
              )}
              <div className="mt-4 grid grid-cols-3 gap-2">
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
          <p className="text-center text-zinc-500">No hay registros todavía.</p>
        )}
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
