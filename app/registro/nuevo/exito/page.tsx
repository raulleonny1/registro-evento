import Link from "next/link";

export const metadata = {
  title: "Registro recibido — Encuentro IERE 2026",
  description: "Tu inscripción se ha guardado. Sube el comprobante desde Continuar registro.",
};

export default async function RegistroExitoPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;

  return (
    <main className="relative min-h-[100dvh] overflow-x-hidden bg-gradient-to-b from-rose-50 via-white to-violet-50/60 text-zinc-900 dark:from-zinc-950 dark:via-zinc-950 dark:to-rose-950/30 dark:text-zinc-50">
      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-lg flex-col px-4 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-6">
        <Link
          href="/"
          className="mb-6 inline-flex w-fit min-h-[44px] items-center text-sm font-semibold text-rose-800 ring-1 ring-rose-200/80 rounded-full px-4 dark:text-rose-300 dark:ring-rose-500/40"
        >
          ← Inicio
        </Link>

        <div className="rounded-2xl border border-emerald-200/90 bg-emerald-50/90 p-6 shadow-lg dark:border-emerald-500/30 dark:bg-emerald-950/40">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
            Registro recibido
          </p>
          <h1 className="mt-2 text-xl font-bold leading-snug text-zinc-900 dark:text-white">
            Ya estás inscrita en el sistema
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            Cuando hayas hecho el <strong>depósito o transferencia</strong>, vuelve a esta web y entra en{" "}
            <strong>Continuar registro</strong>: podrás localizar tu ficha con los{" "}
            <strong>últimos 4 dígitos</strong> del teléfono que indicaste (o con tu ID de registro) y{" "}
            <strong>subir el comprobante</strong> (archivo o foto).
          </p>
          {id ? (
            <p className="mt-3 rounded-lg border border-emerald-200/80 bg-white/80 px-3 py-2 font-mono text-xs text-zinc-700 dark:border-emerald-500/20 dark:bg-zinc-900/60 dark:text-zinc-300">
              ID de registro: {id}
            </p>
          ) : null}
        </div>

        <div className="mt-8 flex flex-col gap-3">
          <Link
            href="/registro/continuar"
            className="inline-flex min-h-[52px] items-center justify-center rounded-xl bg-gradient-to-r from-rose-700 to-rose-800 px-5 py-3 text-center text-sm font-semibold text-white shadow-md"
          >
            Ir a Continuar registro (subir comprobante)
          </Link>
          {id ? (
            <Link
              href={`/estado/${id}`}
              className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-zinc-300 px-5 py-3 text-center text-sm font-semibold text-zinc-800 dark:border-zinc-600 dark:text-zinc-200"
            >
              Ver estado del registro
            </Link>
          ) : null}
        </div>

        <p className="mt-8 text-center text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
          Guarda el ID de registro si lo necesitas para localizar tu ficha más adelante.
        </p>
      </div>
    </main>
  );
}
