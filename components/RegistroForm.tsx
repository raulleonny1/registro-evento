"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

const inputClass =
  "min-h-[48px] w-full rounded-xl border border-zinc-200 bg-white px-4 text-base text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 " +
  "focus:border-rose-400 focus:ring-4 focus:ring-rose-500/15 " +
  "dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:placeholder:text-zinc-500 " +
  "dark:focus:border-rose-500 dark:focus:ring-rose-500/20";

const labelClass = "text-sm font-medium text-zinc-700 dark:text-zinc-300";

export function RegistroForm() {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const ref = await addDoc(collection(db, "registros"), {
        nombre: nombre.trim(),
        email: email.trim(),
        telefono: telefono.trim(),
        estado: "pendiente",
        fecha: serverTimestamp(),
      });
      router.push(`/estado/${ref.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo registrar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="space-y-2">
        <label htmlFor="reg-nombre" className={labelClass}>
          Nombre completo
        </label>
        <input
          id="reg-nombre"
          name="nombre"
          required
          autoComplete="name"
          type="text"
          enterKeyHint="next"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Tal como figura en tu identificación"
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
        <label htmlFor="reg-telefono" className={labelClass}>
          Teléfono (WhatsApp)
        </label>
        <input
          id="reg-telefono"
          name="telefono"
          required
          autoComplete="tel"
          type="tel"
          inputMode="tel"
          enterKeyHint="done"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          placeholder="+52 o código de tu país"
          className={inputClass}
        />
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
