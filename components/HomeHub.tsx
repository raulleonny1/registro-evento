import Link from "next/link";

export function HomeHub() {
  return (
    <main className="relative min-h-dvh overflow-x-hidden bg-gradient-to-b from-rose-50 via-white to-violet-50/60 text-zinc-900 dark:from-zinc-950 dark:via-zinc-950 dark:to-rose-950/30 dark:text-zinc-50">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(225,29,72,0.14),transparent)] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(225,29,72,0.12),transparent)]"
        aria-hidden
      />

      <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6">
        <header className="mb-10 text-center">
          <p className="mb-3 inline-flex items-center justify-center rounded-full border border-rose-200/80 bg-white/80 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-rose-800 shadow-sm backdrop-blur-sm dark:border-rose-500/30 dark:bg-zinc-900/80 dark:text-rose-200">
            IERE · 2026
          </p>
          <h1 className="text-balance text-2xl font-bold leading-tight tracking-tight text-zinc-900 sm:text-3xl dark:text-white">
            Encuentro Nacional de Mujeres IERE
          </h1>
          <p className="mt-4 text-lg font-medium text-rose-800 sm:text-xl dark:text-rose-300">
            25 al 27 de septiembre de 2026
          </p>
          <p className="mx-auto mt-5 max-w-md text-balance font-serif text-lg italic leading-relaxed text-zinc-700 sm:text-xl dark:text-zinc-300">
            &ldquo;Cada Don, una Misión&rdquo;
          </p>
          <p className="mx-auto mt-6 max-w-sm text-pretty text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Elige si deseas inscribirte al evento o acceder a la administración.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2 sm:gap-5">
          <Link
            href="/registro"
            className="group flex flex-col rounded-2xl border border-rose-200/80 bg-white/90 p-6 shadow-xl shadow-rose-900/10 transition hover:border-rose-300 hover:shadow-rose-900/20 dark:border-zinc-700/80 dark:bg-zinc-900/90 dark:hover:border-rose-500/40"
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-300">
              Participantes
            </span>
            <span className="mt-2 text-lg font-bold text-zinc-900 dark:text-white">Registro</span>
            <span className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Inscripción, comprobante y seguimiento de tu solicitud.
            </span>
            <span className="mt-4 text-sm font-semibold text-rose-700 group-hover:underline dark:text-rose-400">
              Continuar →
            </span>
          </Link>

          <Link
            href="/admin"
            className="group flex flex-col rounded-2xl border border-zinc-200/80 bg-white/90 p-6 shadow-xl shadow-zinc-900/5 transition hover:border-zinc-300 dark:border-zinc-700/80 dark:bg-zinc-900/90 dark:hover:border-zinc-500"
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Organización
            </span>
            <span className="mt-2 text-lg font-bold text-zinc-900 dark:text-white">
              Administración
            </span>
            <span className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              Revisar inscripciones y check-in (código de acceso requerido).
            </span>
            <span className="mt-4 text-sm font-semibold text-zinc-700 group-hover:underline dark:text-zinc-300">
              Entrar →
            </span>
          </Link>
        </div>
      </div>
    </main>
  );
}
