"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ADMIN_ACCESS_CODE, ADMIN_SESSION_KEY } from "@/lib/adminAccess";

export function AdminGate({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [ok, setOk] = useState(false);
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      if (sessionStorage.getItem(ADMIN_SESSION_KEY) === "1") {
        setOk(true);
      }
    } catch {
      /* private mode */
    }
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pin.trim() === ADMIN_ACCESS_CODE) {
      try {
        sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
      } catch {
        /* */
      }
      setOk(true);
      setError(false);
    } else {
      setError(true);
      setPin("");
    }
  }

  if (!mounted) {
    return (
      <div className="min-h-dvh bg-gradient-to-br from-slate-950 via-zinc-950 to-rose-950/30" />
    );
  }

  if (!ok) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-zinc-950 to-rose-950/30 px-4 py-12">
        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-zinc-900/80 p-8 shadow-2xl backdrop-blur-md">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-rose-400/90">
            Acceso restringido
          </p>
          <h1 className="mt-2 text-center text-2xl font-bold text-white">Panel administración</h1>
          <p className="mt-2 text-center text-sm text-zinc-400">
            Introduce el código de acceso para continuar.
          </p>
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <label className="block text-sm font-medium text-zinc-300">
              Código
              <input
                type="password"
                inputMode="numeric"
                autoComplete="off"
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value);
                  setError(false);
                }}
                className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 px-4 py-3 text-center text-2xl tracking-[0.3em] text-white outline-none ring-rose-500/30 focus:border-rose-500/50 focus:ring-4"
                placeholder="••••"
                aria-invalid={error}
                autoFocus
              />
            </label>
            {error && (
              <p className="text-center text-sm text-rose-400" role="alert">
                Código incorrecto. Inténtalo de nuevo.
              </p>
            )}
            <button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 py-3.5 text-sm font-semibold text-white shadow-lg shadow-rose-900/30 transition hover:from-rose-500 hover:to-rose-600"
            >
              Entrar
            </button>
          </form>
          <Link
            href="/"
            className="mt-6 block text-center text-sm text-zinc-500 underline-offset-4 hover:text-zinc-300 hover:underline"
          >
            ← Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
