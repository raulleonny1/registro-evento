"use client";

import Link from "next/link";
import { useState } from "react";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatFirebaseError } from "@/lib/firebaseError";
import { SubirComprobante } from "@/components/SubirComprobante";
import {
  esPendientePago,
  etiquetaEstado,
  normalizeEstado,
  REGISTRO_ESTADOS,
} from "@/lib/registroEstados";
import { soloDigitos } from "@/lib/phoneDigits";

type Found = {
  id: string;
  nombre: string;
  email: string;
  estado: string;
  comprobanteURL?: string;
};

export function ContinuarRegistro() {
  const [digitos, setDigitos] = useState("");
  const [idDirecto, setIdDirecto] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Found[] | null>(null);
  const [selected, setSelected] = useState<Found | null>(null);

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
      });
    } catch {
      /* ignorar */
    }
  }

  const puedeSubirComprobante =
    selected &&
    (esPendientePago(selected.estado) ||
      normalizeEstado(selected.estado) === REGISTRO_ESTADOS.revision);

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
          (sin prefijo internacional, solo números).
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Últimos 4 dígitos
            <input
              type="text"
              inputMode="numeric"
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
          Si te llegó un enlace o correo con un identificador largo, pégalo aquí.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            ID
            <input
              type="text"
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
        <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/50 p-5 dark:border-emerald-500/20 dark:bg-emerald-950/20">
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

          {puedeSubirComprobante && (
            <div className="mt-6 rounded-2xl border border-rose-200/80 bg-white/80 p-4 dark:border-rose-500/25 dark:bg-zinc-900/50">
              <p className="mb-3 text-sm font-semibold text-zinc-900 dark:text-white">
                Subir comprobante de pago
              </p>
              <p className="mb-4 text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                Archivo o foto. Si la subida tarda mucho, comprueba la conexión o prueba un PDF.
              </p>
              <SubirComprobante
                key={`${selected.id}-${selected.estado}`}
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
