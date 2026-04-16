"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatFirebaseError } from "@/lib/firebaseError";
import { iereParroquias, labelParroquia, zonasIereEnOrden } from "@/lib/iereParroquias";
import { REGISTRO_ESTADOS } from "@/lib/registroEstados";
import { soloDigitos, ultimosDigitos } from "@/lib/phoneDigits";

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

/* text-base (16px) evita zoom automático en focus en iOS Safari */
const fieldClass =
  "min-h-[52px] w-full touch-manipulation rounded-xl border border-zinc-200 bg-white px-4 py-3.5 text-base leading-normal text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 " +
  "focus:border-rose-400 focus:ring-4 focus:ring-rose-500/15 " +
  "dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500 " +
  "dark:focus:border-rose-500 dark:focus:ring-rose-500/20";

const selectClass = `${fieldClass} cursor-pointer`;

const labelClass = "text-sm font-semibold text-zinc-800 dark:text-zinc-200";

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

    const wa = whatsapp.trim();
    const whatsappDigitos = soloDigitos(wa);
    if (whatsappDigitos.length < 4) {
      setError("El teléfono debe tener al menos 4 dígitos para poder localizar tu registro después.");
      return;
    }

    setLoading(true);
    try {
      const whatsappUltimos4 = ultimosDigitos(wa, 4);

      const ref = await withTimeout(
        addDoc(collection(db, "registros"), {
          nombre: nombreApellidos.trim(),
          email: email.trim().toLowerCase(),
          whatsapp: wa,
          whatsappDigitos,
          whatsappUltimos4,
          parroquia: {
            zona: parroquia.zona,
            ciudad: parroquia.ciudad,
            nombre: parroquia.nombre,
          },
          estado: REGISTRO_ESTADOS.pendiente_pago,
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="space-y-2">
        <label htmlFor="reg-nombre" className={labelClass}>
          Nombre y apellidos
        </label>
        <input
          id="reg-nombre"
          name="nombre"
          required
          autoComplete="name"
          autoCapitalize="words"
          type="text"
          enterKeyHint="next"
          value={nombreApellidos}
          onChange={(e) => setNombreApellidos(e.target.value)}
          placeholder="Ej. María García López"
          className={fieldClass}
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
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          type="email"
          inputMode="email"
          enterKeyHint="next"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@correo.com"
          className={fieldClass}
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
          className={fieldClass}
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
            Pulsa para elegir tu parroquia
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
          Si no aparece tu comunidad, elige la más cercana y coméntalo al subir el comprobante.
        </p>
      </div>
      {error && (
        <p
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-snug text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100"
          role="alert"
        >
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="touch-manipulation mt-1 flex min-h-[56px] w-full items-center justify-center rounded-xl bg-gradient-to-r from-rose-700 to-rose-800 px-4 py-4 text-base font-semibold text-white shadow-lg shadow-rose-900/25 transition active:scale-[0.99] disabled:opacity-60 dark:from-rose-600 dark:to-rose-700 dark:shadow-black/30"
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
