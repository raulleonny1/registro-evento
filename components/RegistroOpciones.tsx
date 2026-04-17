import Link from "next/link";

const optClass =
  "group flex w-full touch-manipulation items-center gap-4 rounded-2xl border border-rose-100/90 bg-white/90 px-4 py-3.5 text-left shadow-sm transition hover:border-rose-200 hover:bg-white active:scale-[0.99] dark:border-zinc-600 dark:bg-zinc-900/80 dark:hover:border-rose-500/40";

function Chevron() {
  return (
    <span
      className="ml-auto shrink-0 text-rose-400 transition group-hover:translate-x-0.5 group-hover:text-rose-600 dark:text-rose-500/80"
      aria-hidden
    >
      →
    </span>
  );
}

export function RegistroOpciones() {
  return (
    <nav className="flex w-full flex-col gap-2" aria-label="Opciones de registro">
      <Link href="/registro/nuevo" className={optClass}>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-slate-900 dark:text-white">
            Registrarse por primera vez
          </span>
          <span className="mt-0.5 block text-xs leading-snug text-slate-500 dark:text-zinc-400">
            Completa el formulario y recibe las instrucciones de pago.
          </span>
        </span>
        <Chevron />
      </Link>
      <Link href="/registro/continuar" className={optClass}>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-slate-900 dark:text-white">
            ¿Ya realizaste el pago? Continuar registro
          </span>
          <span className="mt-0.5 block text-xs leading-snug text-slate-500 dark:text-zinc-400">
            Busca tu inscripción con los últimos 4 dígitos del teléfono.
          </span>
        </span>
        <Chevron />
      </Link>
      <Link href="/registro/codigo" className={optClass}>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-slate-900 dark:text-white">
            Ver código de evento
          </span>
          <span className="mt-0.5 block text-xs leading-snug text-slate-500 dark:text-zinc-400">
            Consulta tu QR cuando el registro esté aprobado.
          </span>
        </span>
        <Chevron />
      </Link>
    </nav>
  );
}
