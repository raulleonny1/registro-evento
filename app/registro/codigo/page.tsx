import Link from "next/link";
import { CodigoEvento } from "@/components/CodigoEvento";

export const metadata = {
  title: "Código de evento — Encuentro IERE 2026",
  description: "Consulta tu código QR cuando tu registro esté aprobado",
};

export default function CodigoEventoPage() {
  return (
    <main className="relative min-h-[100dvh] overflow-x-hidden bg-gradient-to-b from-rose-50 via-white to-violet-50/60 text-zinc-900 dark:from-zinc-950 dark:via-zinc-950 dark:to-rose-950/30 dark:text-zinc-50">
      <div className="relative mx-auto w-full max-w-lg px-4 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-6">
        <div className="mb-6">
          <Link
            href="/registro"
            className="touch-manipulation inline-flex min-h-[44px] items-center justify-center rounded-full px-4 text-sm font-semibold text-rose-800 ring-1 ring-rose-200/80 dark:text-rose-300 dark:ring-rose-500/40"
          >
            ← Registro
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Ver código de evento</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Solo se muestra el QR cuando el organizador haya aprobado tu pago.
        </p>
        <div className="mt-8">
          <CodigoEvento />
        </div>
      </div>
    </main>
  );
}
