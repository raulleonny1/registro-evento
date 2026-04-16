import Link from "next/link";
import { RegistroForm } from "@/components/RegistroForm";

export const metadata = {
  title: "Nuevo registro — Encuentro IERE 2026",
  description: "Inscripción al Encuentro Nacional de Mujeres IERE",
};

export default function RegistroNuevoPage() {
  return (
    <main className="relative min-h-[100dvh] overflow-x-hidden bg-gradient-to-b from-rose-50 via-white to-violet-50/60 text-zinc-900 dark:from-zinc-950 dark:via-zinc-950 dark:to-rose-950/30 dark:text-zinc-50">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(225,29,72,0.14),transparent)] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(225,29,72,0.12),transparent)]"
        aria-hidden
      />

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col px-4 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6">
        <div className="sticky top-0 z-10 -mx-4 mb-2 flex justify-center bg-gradient-to-b from-rose-50/95 pb-2 pt-1 backdrop-blur-sm dark:from-zinc-950/95 sm:-mx-6 sm:static sm:mb-4 sm:bg-transparent sm:pb-0 sm:pt-0 sm:backdrop-blur-none">
          <Link
            href="/registro"
            className="touch-manipulation inline-flex min-h-[44px] items-center justify-center rounded-full px-4 text-sm font-semibold text-rose-800 ring-1 ring-rose-200/80 transition active:scale-[0.98] dark:text-rose-300 dark:ring-rose-500/40"
          >
            ← Registro
          </Link>
        </div>

        <header className="mb-6 text-center sm:mb-8">
          <p className="mb-3 inline-flex items-center justify-center rounded-full border border-rose-200/80 bg-white/80 px-3 py-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-rose-800 shadow-sm backdrop-blur-sm dark:border-rose-500/30 dark:bg-zinc-900/80 dark:text-rose-200">
            Registro oficial
          </p>
          <h1 className="text-balance px-1 text-xl font-bold leading-snug tracking-tight text-zinc-900 sm:text-2xl md:text-3xl dark:text-white">
            Encuentro Nacional de Mujeres IERE
          </h1>
          <p className="mt-3 text-base font-semibold text-rose-800 sm:text-lg md:text-xl dark:text-rose-300">
            25 al 27 de septiembre de 2026
          </p>
          <p className="mx-auto mt-4 max-w-md text-balance font-serif text-base italic leading-relaxed text-zinc-700 sm:text-lg md:text-xl dark:text-zinc-300">
            &ldquo;Cada Don, una Misión&rdquo;
          </p>
          <p className="mx-auto mt-3 max-w-sm text-pretty text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Completa tus datos. Después podrás subir el comprobante de pago cuando lo hayas realizado.
          </p>
        </header>

        <section
          className="rounded-2xl border border-zinc-200/80 bg-white/95 p-4 shadow-xl shadow-rose-900/5 backdrop-blur-md sm:p-7 dark:border-zinc-700/80 dark:bg-zinc-900/95 dark:shadow-black/40"
          aria-labelledby="registro-heading"
        >
          <h2 id="registro-heading" className="text-lg font-semibold text-zinc-900 dark:text-white">
            Datos de registro
          </h2>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Todos los campos son obligatorios.
          </p>
          <div className="mt-5 sm:mt-6">
            <RegistroForm />
          </div>
        </section>

        <p className="mt-6 max-w-prose text-center text-[0.7rem] leading-relaxed text-zinc-500 sm:mt-8 sm:text-xs dark:text-zinc-500">
          Al enviar aceptas recibir comunicaciones relacionadas con este evento en el correo y el
          WhatsApp indicados.
        </p>
      </div>
    </main>
  );
}
