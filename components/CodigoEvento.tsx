"use client";

import { useEffect, useState } from "react";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatFirebaseError } from "@/lib/firebaseError";
import { generateQrDataUrl } from "@/lib/qr";
import { REGISTRO_ESTADOS, normalizeEstado } from "@/lib/registroEstados";
import { soloDigitos, ultimosDigitos } from "@/lib/phoneDigits";

type Row = {
  id: string;
  nombre: string;
  estado: string;
  qr?: string;
};

/**
 * Si no hay letras, tratamos el texto como teléfono (últimos 4 dígitos).
 * Si hay letras o símbolos de ID, intentamos lectura por ID de documento.
 */
function busquedaPorTelefonoSolo(raw: string): boolean {
  const t = raw.trim();
  if (!t) return false;
  const digits = soloDigitos(t);
  if (digits.length < 4) return false;
  return !/[a-zA-Z]/.test(t);
}

function QrMostrado({ id, qrGuardado }: { id: string; qrGuardado?: string }) {
  const [src, setSrc] = useState<string | null>(qrGuardado ?? null);

  useEffect(() => {
    if (qrGuardado) {
      setSrc(qrGuardado);
      return;
    }
    let cancelled = false;
    void generateQrDataUrl(id, 320).then((url) => {
      if (!cancelled) setSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, [id, qrGuardado]);

  if (!src) {
    return (
      <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">Generando código QR…</p>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="Código QR del evento"
      width={320}
      height={320}
      className="mx-auto mt-6 max-h-[min(80vw,320px)] max-w-[min(100%,320px)] rounded-xl border border-zinc-200 object-contain dark:border-zinc-600"
    />
  );
}

export function CodigoEvento() {
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidatos, setCandidatos] = useState<Row[] | null>(null);
  const [elegido, setElegido] = useState<Row | null>(null);

  async function resolver() {
    const raw = busqueda.trim();
    setError(null);
    setCandidatos(null);
    setElegido(null);

    if (!raw) {
      setError("Introduce los últimos 4 dígitos del teléfono o tu ID de registro.");
      return;
    }

    const soloTel = soloDigitos(raw);
    const tieneLetras = /[a-zA-Z]/.test(raw);
    if (!tieneLetras && soloTel.length > 0 && soloTel.length < 4) {
      setError("Para buscar por teléfono necesitas al menos 4 dígitos.");
      return;
    }

    setLoading(true);
    try {
      if (busquedaPorTelefonoSolo(raw)) {
        const last4 = ultimosDigitos(soloDigitos(raw), 4);
        const q = query(
          collection(db, "registros"),
          where("whatsappUltimos4", "==", last4),
        );
        const snap = await getDocs(q);
        const list: Row[] = snap.docs.map((d) => {
          const x = d.data();
          return {
            id: d.id,
            nombre: String(x.nombre ?? ""),
            estado: normalizeEstado(String(x.estado ?? "")),
            qr: typeof x.qr === "string" ? x.qr : undefined,
          };
        });
        list.sort((a, b) => a.nombre.localeCompare(b.nombre));
        setCandidatos(list);
        if (list.length === 0) {
          setError("No encontramos ningún registro con esos datos.");
        } else if (list.length === 1) {
          setElegido(list[0]);
        }
        setLoading(false);
        return;
      }

      const idDoc = raw.trim();
      if (idDoc) {
        const snap = await getDoc(doc(db, "registros", idDoc));
        if (!snap.exists()) {
          setError("No existe un registro con ese ID.");
          setLoading(false);
          return;
        }
        const x = snap.data();
        const row: Row = {
          id: snap.id,
          nombre: String(x.nombre ?? ""),
          estado: normalizeEstado(String(x.estado ?? "")),
          qr: typeof x.qr === "string" ? x.qr : undefined,
        };
        setCandidatos([row]);
        setElegido(row);
        setLoading(false);
        return;
      }

      setError(
        "Introduce al menos 4 dígitos del teléfono o el ID completo del registro.",
      );
    } catch (e) {
      setError(formatFirebaseError(e));
    } finally {
      setLoading(false);
    }
  }

  const mostrar = elegido;

  const fieldClass =
    "min-h-[52px] w-full touch-manipulation rounded-xl border border-zinc-200 bg-white px-4 py-3.5 text-base text-zinc-900 shadow-sm outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-500/15 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100";

  return (
    <div className="flex flex-col gap-8">
      <section className="rounded-2xl border border-zinc-200/80 bg-white/95 p-5 shadow-lg dark:border-zinc-700 dark:bg-zinc-900/95">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-white">Buscar tu registro</h2>
        <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          Puedes usar los <strong>últimos 4 dígitos</strong> del teléfono con el que te inscribiste, o
          el <strong>ID de registro</strong> (cadena larga) si lo tienes.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex min-w-0 flex-1 flex-col gap-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Teléfono (4 dígitos) o ID
            <input
              type="text"
              inputMode="text"
              autoComplete="off"
              spellCheck={false}
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="5678 o ID de Firestore"
              className={fieldClass}
            />
          </label>
          <button
            type="button"
            disabled={loading}
            onClick={() => void resolver()}
            className="touch-manipulation min-h-[52px] shrink-0 rounded-xl bg-gradient-to-r from-rose-700 to-rose-800 px-6 py-3 text-sm font-semibold text-white shadow-md disabled:opacity-50"
          >
            {loading ? "Buscando…" : "Buscar"}
          </button>
        </div>
      </section>

      {error && (
        <p
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-100"
          role="alert"
        >
          {error}
        </p>
      )}

      {candidatos && candidatos.length > 1 && !elegido && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-700 dark:bg-zinc-900">
          <p className="mb-3 text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Varias coincidencias. Elige tu nombre:
          </p>
          <ul className="flex flex-col gap-2">
            {candidatos.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setElegido(r)}
                  className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-left text-sm font-semibold transition hover:border-rose-300 dark:border-zinc-600 dark:bg-zinc-800"
                >
                  {r.nombre}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {mostrar && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-center dark:border-zinc-700 dark:bg-zinc-900">
          {mostrar.estado === REGISTRO_ESTADOS.aprobado ? (
            <>
              <p className="text-sm font-medium uppercase tracking-wide text-emerald-700 dark:text-emerald-400">
                Entrada al evento
              </p>
              <h3 className="mt-3 text-2xl font-bold text-zinc-900 dark:text-white">{mostrar.nombre}</h3>
              <QrMostrado id={mostrar.id} qrGuardado={mostrar.qr} />
              <p className="mt-4 font-mono text-xs text-zinc-500">ID: {mostrar.id}</p>
            </>
          ) : (
            <div className="py-6">
              <p className="text-lg font-semibold text-zinc-900 dark:text-white">
                Tu registro aún no ha sido aprobado
              </p>
              <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                Cuando el organizador confirme el pago, aquí podrás ver tu código QR. Mientras tanto
                puedes revisar el{" "}
                <a href={`/estado/${mostrar.id}`} className="font-medium text-rose-700 underline">
                  estado de tu registro
                </a>
                .
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
