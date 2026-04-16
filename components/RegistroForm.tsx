"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatFirebaseError } from "@/lib/firebaseError";
import { iereParroquias, labelParroquia, zonasIereEnOrden } from "@/lib/iereParroquias";

const SUBMIT_TIMEOUT_MS = 35_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      reject(
        new Error(
          `${label} superó ${ms / 1000}s. Comprueba conexión, reglas de Firestore (colección registros) y que el proyecto tenga Firestore activado.`,
        ),
      );
    }, ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

const inputClass =
  "min-h-[48px] w-full rounded-xl border border-zinc-200 bg-white px-4 text-base text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 " +
  "focus:border-rose-400 focus:ring-4 focus:ring-rose-500/15 " +
  "dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500 " +
  "dark:focus:border-rose-500 dark:focus:ring-rose-500/20";

const selectClass = `${inputClass} cursor-pointer`;

const labelClass = "text-sm font-medium text-zinc-700 dark:text-zinc-300";

export function RegistroForm() {
  const router = useRouter();
  const [nombreApellidos, setNombreApellidos] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [parroquiaIdx, setParroquiaIdx] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const zonas = useMemo(() => zonasIereEnOrden(), []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const idx = parseInt(parroquiaIdx, 10);
    if (Number.isNaN(idx) || idx < 0 || idx >= iereParroquias.length) {
      setError("Selecciona una parroquia válida.");
      return;
    }

    const parroquia = iereParroquias[idx];

    setLoading(true);
    try {
      const ref = await withTimeout(
        addDoc(collection(db, "registros"), {
          nombre: nombreApellidos.trim(),
          email: email.trim().toLowerCase(),
          whatsapp: whatsapp.trim(),
          parroquia: {
            zona: parroquia.zona,
            ciudad: parroquia.ciudad,
            nombre: parroquia.nombre,
          },
          estado: "pendiente",
          fecha: serverTimestamp(),
        }),
        SUBMIT_TIMEOUT_MS,
        "El registro",
      );
      await router.push(`/estado/${ref.id}`);
    } catch (err) {
      setError(formatFirebaseError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="space-y-2">
        <label htmlFor="reg-nombre" className={labelClass}>
          Nombre y apellidos
        </label>
        <input
          id="reg-nombre"
          name="nombre"
          required
          autoComplete="name"
          type="text"
          enterKeyHint="next"
          value={nombreApellidos}
          onChange={(e) => setNombreApellidos(e.target.value)}
          placeholder="Ej. María García López"
          className={inputClass}
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="reg-email" className={labelClass}>
          Correo electrónico
        </label>
        <input
          id="reg-email"
          name="email"
          required
          autoComplete="email"
          type="email"
          inputMode="email"
          enterKeyHint="next"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@correo.com"
          className={inputClass}
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="reg-whatsapp" className={labelClass}>
          WhatsApp
        </label>
        <input
          id="reg-whatsapp"
          name="whatsapp"
          required
          autoComplete="tel"
          type="tel"
          inputMode="tel"
          enterKeyHint="next"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="Ej. +34 612 345 678"
          className={inputClass}
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="reg-parroquia" className={labelClass}>
          Parroquia IERE (España)
        </label>
        <select
          id="reg-parroquia"
          name="parroquia"
          required
          value={parroquiaIdx}
          onChange={(e) => setParroquiaIdx(e.target.value)}
          className={selectClass}
        >
          <option value="" disabled>
            Selecciona tu parroquia
          </option>
          {zonas.map((zona) => (
            <optgroup key={zona} label={zona}>
              {iereParroquias
                .map((p, globalIdx) => ({ p, globalIdx }))
                .filter(({ p }) => p.zona === zona)
                .map(({ p, globalIdx }) => (
                  <option key={`${p.ciudad}-${p.nombre}-${globalIdx}`} value={String(globalIdx)}>
                    {labelParroquia(p)}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
        <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          Elige la comunidad o misión donde participas. Si no aparece, selecciona la más cercana y
          coméntalo en el comprobante o con tu organizadora.
        </p>
      </div>
      {error && (
        <p
          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="mt-1 flex min-h-[52px] w-full items-center justify-center rounded-xl bg-gradient-to-r from-rose-700 to-rose-800 px-4 py-3.5 text-base font-semibold text-white shadow-lg shadow-rose-900/25 transition hover:from-rose-600 hover:to-rose-700 active:scale-[0.99] disabled:opacity-60 dark:from-rose-600 dark:to-rose-700 dark:hover:from-rose-500 dark:hover:to-rose-600 dark:shadow-black/30"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span
              className="size-5 animate-spin rounded-full border-2 border-white/30 border-t-white"
              aria-hidden
            />
            Enviando…
          </span>
        ) : (
          "Continuar al siguiente paso"
        )}
      </button>
    </form>
  );
}
