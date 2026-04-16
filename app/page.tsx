import { RegistroForm } from "@/components/RegistroForm";

export default function Home() {
  return (
    <main className="relative min-h-dvh overflow-x-hidden bg-gradient-to-b from-rose-50 via-white to-violet-50/60 text-zinc-900 dark:from-zinc-950 dark:via-zinc-950 dark:to-rose-950/30 dark:text-zinc-50">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(225,29,72,0.14),transparent)] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(225,29,72,0.12),transparent)]"
        aria-hidden
      />

      <div className="relative mx-auto flex min-h-dvh max-w-lg flex-col px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6">
        <header className="mb-8 text-center sm:mb-10">
          <p className="mb-3 inline-flex items-center justify-center rounded-full border border-rose-200/80 bg-white/80 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-rose-800 shadow-sm backdrop-blur-sm dark:border-rose-500/30 dark:bg-zinc-900/80 dark:text-rose-200">
            Registro oficial
          </p>
          <h1 className="text-balance text-2xl font-bold leading-tight tracking-tight text-zinc-900 sm:text-3xl dark:text-white">
            Encuentro Nacional de Mujeres IERE
          </h1>
          <p className="mt-4 text-lg font-medium text-rose-800 sm:text-xl dark:text-rose-300">
            25 al 27 de septiembre de 2026
          </p>
          <p className="mx-auto mt-6 max-w-md text-balance font-serif text-lg italic leading-relaxed text-zinc-700 sm:text-xl dark:text-zinc-300">
            &ldquo;Cada Don, una Misión&rdquo;
          </p>
          <p className="mx-auto mt-3 max-w-sm text-pretty text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Completa tus datos para continuar con el proceso de inscripción y recibir las
            indicaciones de pago.
          </p>
        </header>

        <section
          className="mt-auto rounded-2xl border border-zinc-200/80 bg-white/90 p-5 shadow-xl shadow-rose-900/5 backdrop-blur-md sm:p-7 dark:border-zinc-700/80 dark:bg-zinc-900/90 dark:shadow-black/40"
          aria-labelledby="registro-heading"
        >
          <h2 id="registro-heading" className="text-lg font-semibold text-zinc-900 dark:text-white">
            Datos de registro
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Los campos marcados son obligatorios.
          </p>
          <div className="mt-6">
            <RegistroForm />
          </div>
        </section>

        <p className="mt-8 text-center text-xs text-zinc-500 dark:text-zinc-500">
          Al enviar aceptas recibir comunicaciones relacionadas con este evento en el correo y
          teléfono indicados.
        </p>
      </div>
    </main>
  );
}
