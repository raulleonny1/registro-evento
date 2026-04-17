"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatFirebaseError } from "@/lib/firebaseError";
import { SubirComprobante } from "@/components/SubirComprobante";
import {
  MODALIDADES_REGISTRO,
  MINIMO_INSCRIPCION_EUR,
  costoEventoEuros,
  etiquetaModalidadRegistro,
  formatEuros,
  normalizeModalidadRegistro,
  pendienteEuros,
  type ModalidadRegistro,
} from "@/lib/eventoPrecio";
import {
  esPendientePago,
  etiquetaEstado,
  normalizeEstado,
  REGISTRO_ESTADOS,
} from "@/lib/registroEstados";
import { iosDigitOnlyInputProps } from "@/lib/iosKeyboardHints";
import { soloDigitos } from "@/lib/phoneDigits";

type Found = {
  id: string;
  nombre: string;
  email: string;
  estado: string;
  comprobanteURL?: string;
  modalidadRegistro: ModalidadRegistro;
  montoDepositadoEuros: number;
};

export function ContinuarRegistro() {
  const [digitos, setDigitos] = useState("");
  const [idDirecto, setIdDirecto] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Found[] | null>(null);
  const [selected, setSelected] = useState<Found | null>(null);
  const [guardandoModalidad, setGuardandoModalidad] = useState(false);
  const [modalidadMsg, setModalidadMsg] = useState<string | null>(null);
  const resultadoRegistroRef = useRef<HTMLDivElement>(null);

  /** Scroll al bloque del registro cuando aparece o cambia de persona — no al refrescar solo datos (mismo `id`). */
  useEffect(() => {
    if (!selected) return;
    const t = window.requestAnimationFrame(() => {
      resultadoRegistroRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
    return () => window.cancelAnimationFrame(t);
  }, [selected?.id]);

  async function buscarPorUltimos4() {
    const last4 = soloDigitos(digitos).slice(-4);
    if (last4.length !== 4) {
      setError("Introduce exactamente los últimos 4 dígitos de tu teléfono.");
      return;
    }
    setError(null);
    setLoading(true);
    setResults(null);
    setSelected(null);
    setModalidadMsg(null);
    try {
      const q = query(
        collection(db, "registros"),
        where("whatsappUltimos4", "==", last4),
      );
      const snap = await getDocs(q);
      const list: Found[] = snap.docs.map((d) => {
        const x = d.data();
        return {
          id: d.id,
          nombre: String(x.nombre ?? ""),
          email: String(x.email ?? ""),
          estado: normalizeEstado(String(x.estado ?? "")),
          comprobanteURL: x.comprobanteURL ? String(x.comprobanteURL) : undefined,
          modalidadRegistro: normalizeModalidadRegistro(x.modalidadRegistro),
          montoDepositadoEuros: Number(x.montoDepositadoEuros ?? 0) || 0,
        };
      });
      list.sort((a, b) => a.nombre.localeCompare(b.nombre));
      setResults(list);
      if (list.length === 0) {
        setError(
          "No encontramos ningún registro con esos dígitos. Comprueba el número o busca por ID de registro abajo.",
        );
      } else if (list.length === 1) {
        setSelected(list[0]);
      }
    } catch (e) {
      setError(formatFirebaseError(e));
    } finally {
      setLoading(false);
    }
  }

  async function buscarPorId() {
    const id = idDirecto.trim();
    if (!id) {
      setError("Pega el ID de registro que te enviamos por correo.");
      return;
    }
    setError(null);
    setLoading(true);
    setResults(null);
    setSelected(null);
    setModalidadMsg(null);
    try {
      const snap = await getDoc(doc(db, "registros", id));
      if (!snap.exists()) {
        setError("No existe un registro con ese ID.");
        setLoading(false);
        return;
      }
      const x = snap.data();
      const f: Found = {
        id: snap.id,
        nombre: String(x.nombre ?? ""),
        email: String(x.email ?? ""),
        estado: normalizeEstado(String(x.estado ?? "")),
        comprobanteURL: x.comprobanteURL ? String(x.comprobanteURL) : undefined,
        modalidadRegistro: normalizeModalidadRegistro(x.modalidadRegistro),
        montoDepositadoEuros: Number(x.montoDepositadoEuros ?? 0) || 0,
      };
      setResults([f]);
      setSelected(f);
    } catch (e) {
      setError(formatFirebaseError(e));
    } finally {
      setLoading(false);
    }
  }

  async function refrescarSeleccionado() {
    if (!selected) return;
    try {
      const snap = await getDoc(doc(db, "registros", selected.id));
      if (!snap.exists()) return;
      const x = snap.data();
      setSelected({
        id: snap.id,
        nombre: String(x.nombre ?? ""),
        email: String(x.email ?? ""),
        estado: normalizeEstado(String(x.estado ?? "")),
        comprobanteURL: x.comprobanteURL ? String(x.comprobanteURL) : undefined,
        modalidadRegistro: normalizeModalidadRegistro(x.modalidadRegistro),
        montoDepositadoEuros: Number(x.montoDepositadoEuros ?? 0) || 0,
      });
    } catch {
      /* ignorar */
    }
  }

  async function guardarModalidadRegistro(next: ModalidadRegistro) {
    if (!selected || next === selected.modalidadRegistro) return;
    setGuardandoModalidad(true);
    setModalidadMsg(null);
    setError(null);
    try {
      await updateDoc(doc(db, "registros", selected.id), {
        modalidadRegistro: next,
      });
      setSelected((prev) => (prev ? { ...prev, modalidadRegistro: next } : prev));
      setResults((prev) =>
        prev?.map((item) => (item.id === selected.id ? { ...item, modalidadRegistro: next } : item)) ?? null,
      );
      setModalidadMsg("Opción de asistencia actualizada correctamente.");
    } catch (e) {
      setError(formatFirebaseError(e));
    } finally {
      setGuardandoModalidad(false);
    }
  }

  const puedeSubirComprobante =
    selected &&
    (esPendientePago(selected.estado) ||
      normalizeEstado(selected.estado) === REGISTRO_ESTADOS.revision);
  const totalSeleccionado = selected ? costoEventoEuros(selected.modalidadRegistro) : null;
  const pendienteSeleccionado = selected
    ? pendienteEuros(selected.montoDepositadoEuros, selected.modalidadRegistro)
    : null;

  const fieldClass =
    "min-h-[52px] w-full touch-manipulation rounded-xl border border-zinc-200 bg-white px-4 py-3.5 text-base text-zinc-900 shadow-sm outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-500/15 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100";

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-2xl border border-zinc-200/80 bg-white/95 p-5 shadow-lg dark:border-zinc-700 dark:bg-zinc-900/95">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
          Buscar por teléfono
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Escribe los <strong>últimos 4 dígitos</strong> del número que indicaste al inscribirte
          (sin prefijo internacional, solo números). Si te encontramos, la página{" "}
          <strong className="font-semibold text-zinc-700 dark:text-zinc-300">bajará sola</strong> a tu
          ficha para subir el comprobante.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Últimos 4 dígitos
            <input
              {...iosDigitOnlyInputProps}
              autoComplete="off"
              maxLength={8}
              value={digitos}
              onChange={(e) => setDigitos(soloDigitos(e.target.value).slice(0, 8))}
              placeholder="Ej. 5678"
              className={fieldClass}
            />
          </label>
          <button
            type="button"
            disabled={loading}
            onClick={() => void buscarPorUltimos4()}
            className="touch-manipulation min-h-[52px] shrink-0 rounded-xl bg-gradient-to-r from-rose-700 to-rose-800 px-6 py-3 text-sm font-semibold text-white shadow-md disabled:opacity-50"
          >
            {loading ? "Buscando…" : "Buscar"}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-dashed border-zinc-300 bg-white/60 p-5 dark:border-zinc-600 dark:bg-zinc-900/60">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
          Buscar por ID de registro
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Si te llegó un enlace o correo con un identificador largo, pégalo aquí. Al encontrar el
          registro, la página <strong className="font-semibold text-zinc-700 dark:text-zinc-300">bajará</strong>{" "}
          a tu ficha.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            ID
            <input
              type="text"
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
              value={idDirecto}
              onChange={(e) => setIdDirecto(e.target.value.trim())}
              placeholder="Ej. AbCdEfGhIjKlMnOpQrSt"
              className={fieldClass}
            />
          </label>
          <button
            type="button"
            disabled={loading}
            onClick={() => void buscarPorId()}
            className="touch-manipulation min-h-[52px] shrink-0 rounded-xl border border-zinc-300 bg-white px-6 py-3 text-sm font-semibold text-zinc-800 shadow-sm dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
          >
            Buscar por ID
          </button>
        </div>
      </section>

      {error && (
        <p
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-100"
          role="alert"
        >
          {error}
        </p>
      )}

      {results && results.length > 1 && !selected && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <p className="mb-3 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Hay varias personas con esos dígitos. Elige tu registro:
          </p>
          <ul className="flex flex-col gap-2">
            {results.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setSelected(r)}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-left text-sm transition hover:border-rose-300 hover:bg-rose-50/50 dark:border-zinc-600 dark:bg-zinc-800 dark:hover:border-rose-500/40"
                >
                  <span className="font-semibold text-zinc-900 dark:text-white">{r.nombre}</span>
                  <span className="mt-0.5 block text-xs text-zinc-500">{r.email}</span>
                  <span className="mt-1 inline-block rounded-full bg-zinc-200/80 px-2 py-0.5 text-[0.65rem] font-medium uppercase text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">
                    {etiquetaEstado(r.estado)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {selected && (
        <div
          ref={resultadoRegistroRef}
          tabIndex={-1}
          className="scroll-mt-6 rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-5 outline-none ring-offset-2 ring-offset-white focus-visible:ring-2 focus-visible:ring-emerald-500/50 dark:border-emerald-500/20 dark:bg-emerald-950/20 dark:ring-offset-zinc-950"
        >
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
            Registro encontrado
          </p>
          <h3 className="mt-2 text-lg font-bold text-zinc-900 dark:text-white">{selected.nombre}</h3>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{selected.email}</p>
          <p className="mt-3 text-sm">
            Estado:{" "}
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
              {etiquetaEstado(selected.estado)}
            </span>
          </p>
          <div className="mt-4 rounded-xl border border-zinc-200/80 bg-white/80 p-4 dark:border-zinc-700 dark:bg-zinc-900/50">
            <p className="text-sm font-semibold text-zinc-900 dark:text-white">
              Opción elegida en el registro
            </p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
              Puedes cambiarla aquí si te equivocaste, incluso después de subir el depósito.
            </p>
            <div className="mt-3 space-y-2">
              {(Object.values(MODALIDADES_REGISTRO) as ModalidadRegistro[]).map((opt) => {
                const checked = selected.modalidadRegistro === opt;
                return (
                  <label
                    key={opt}
                    className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2.5 ${
                      checked
                        ? "border-rose-300 bg-rose-50 dark:border-rose-500/40 dark:bg-rose-950/30"
                        : "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`modalidad-${selected.id}`}
                      value={opt}
                      checked={checked}
                      disabled={guardandoModalidad}
                      onChange={() => void guardarModalidadRegistro(opt)}
                      className="mt-1 size-4 accent-rose-600"
                    />
                    <span className="text-sm text-zinc-800 dark:text-zinc-200">
                      {etiquetaModalidadRegistro(opt)} ({costoEventoEuros(opt)} EUR)
                    </span>
                  </label>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-zinc-600 dark:text-zinc-400">
              Mínimo de inscripción: {MINIMO_INSCRIPCION_EUR} EUR.
            </p>
            {totalSeleccionado != null && pendienteSeleccionado != null && (
              <p className="mt-1 text-xs text-zinc-700 dark:text-zinc-300">
                Total actual: {formatEuros(totalSeleccionado)}. Depositado:{" "}
                {formatEuros(selected.montoDepositadoEuros)}. Pendiente:{" "}
                {formatEuros(pendienteSeleccionado)}.
              </p>
            )}
            {modalidadMsg && (
              <p className="mt-2 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                {modalidadMsg}
              </p>
            )}
          </div>

          {puedeSubirComprobante && (
            <div className="mt-6 rounded-2xl border border-rose-200/80 bg-white/80 p-4 dark:border-rose-500/25 dark:bg-zinc-900/50">
              <p className="mb-3 text-sm font-semibold text-zinc-900 dark:text-white">
                Subir comprobante de pago
              </p>
              <p className="mb-4 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                Archivo o foto. Si la subida tarda mucho, comprueba la conexión o prueba un PDF.
              </p>
              {/* key estable: si incluimos estado, al pasar a "revision" tras subir el comprobante React
                  remontaba el hijo y se perdía el mensaje de éxito. */}
              <SubirComprobante
                key={selected.id}
                id={selected.id}
                onUploaded={() => void refrescarSeleccionado()}
              />
            </div>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href={`/estado/${selected.id}`}
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              Ver estado del registro
            </Link>
            <Link
              href={`/registro/codigo`}
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl text-sm font-semibold text-rose-700 underline dark:text-rose-400"
            >
              Ver código de evento
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
