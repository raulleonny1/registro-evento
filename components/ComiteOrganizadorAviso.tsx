import { formatEuros } from "@/lib/eventoPrecio";
import { PRECIO_COMITE_ORGANIZADOR_EUR } from "@/lib/comiteOrganizador";

type Props = {
  className?: string;
};

/** Aviso al detectar el móvil de una miembro del comité (tarifa 50 €). */
export function ComiteOrganizadorAviso({ className = "" }: Props) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={
        "relative overflow-hidden rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50 via-white to-rose-50/80 p-5 shadow-lg shadow-amber-900/5 dark:border-amber-500/25 dark:from-amber-950/50 dark:via-zinc-950 dark:to-rose-950/30 dark:shadow-black/30 " +
        className
      }
    >
      <div
        className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-amber-200/40 blur-2xl dark:bg-amber-500/10"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-6 -left-6 size-24 rounded-full bg-rose-200/30 blur-2xl dark:bg-rose-500/10"
        aria-hidden
      />

      <div className="relative flex gap-3">
        <div
          className="flex size-11 shrink-0 items-center justify-center rounded-full border border-amber-300/80 bg-white/90 text-amber-800 shadow-sm dark:border-amber-500/40 dark:bg-zinc-900/80 dark:text-amber-200"
          aria-hidden
        >
          <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
            />
          </svg>
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-amber-800/90 dark:text-amber-300/90">
            Comité
          </p>
          <p className="mt-1 font-serif text-lg font-semibold leading-snug text-zinc-900 dark:text-zinc-50">
            Un reconocimiento a tu servicio
          </p>
          <p className="mt-3 text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            Formas parte del comité. Tu inscripción es de{" "}
            <strong className="font-semibold text-rose-800 dark:text-rose-300">
              {formatEuros(PRECIO_COMITE_ORGANIZADOR_EUR)}
            </strong>
            .
          </p>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Completa tus datos, realiza el pago y sube el comprobante desde{" "}
            <strong className="text-zinc-800 dark:text-zinc-200">Continuar registro</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}
