import Link from "next/link";
import { RegistroOpciones } from "@/components/RegistroOpciones";

export const metadata = {
  title: "Registro — Encuentro IERE 2026",
  description: "Inscripción, continuar registro o ver código QR — Encuentro IERE 2026",
};

export default function RegistroHubPage() {
  return (
    <main className="relative min-h-[100dvh] overflow-x-hidden bg-gradient-to-b from-rose-50 via-white to-violet-50/60 text-zinc-900 dark:from-zinc-950 dark:via-zinc-950 dark:to-rose-950/30 dark:text-zinc-50">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(225,29,72,0.14),transparent)] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(225,29,72,0.12),transparent)]"
        aria-hidden
      />

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col px-4 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6">
        <div className="sticky top-0 z-10 -mx-4 mb-4 flex justify-center bg-gradient-to-b from-rose-50/95 pb-2 pt-1 backdrop-blur-sm dark:from-zinc-950/95 sm:-mx-6 sm:static sm:mb-6 sm:bg-transparent sm:pb-0 sm:pt-0 sm:backdrop-blur-none">
          <Link
            href="/"
            className="touch-manipulation inline-flex min-h-[44px] items-center justify-center rounded-full px-4 text-sm font-semibold text-rose-800 ring-1 ring-rose-200/80 transition active:scale-[0.98] dark:text-rose-300 dark:ring-rose-500/40"
          >
            ← Inicio
          </Link>
        </div>

        <header className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Registro al evento
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Elige una opción para inscribirte, retomar tu proceso o ver tu código de acceso.
          </p>
        </header>

        <div className="rounded-2xl border border-zinc-200/80 bg-white/95 p-5 shadow-xl shadow-rose-900/5 dark:border-zinc-700/80 dark:bg-zinc-900/95">
          <RegistroOpciones />
        </div>
      </div>
    </main>
  );
}
