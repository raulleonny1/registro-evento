import dynamic from "next/dynamic";
import Link from "next/link";
import { AdminGate } from "@/components/AdminGate";

const AdminPanel = dynamic(() => import("@/components/AdminPanel"), {
  loading: () => (
    <div className="flex min-h-[40vh] items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-zinc-400">
      <span className="flex items-center gap-3">
        <span
          className="size-8 animate-spin rounded-full border-2 border-rose-500/30 border-t-rose-400"
          aria-hidden
        />
        Cargando panel…
      </span>
    </div>
  ),
});

export const metadata = {
  title: "Administración — Registros IERE",
};

export default function AdminPage() {
  return (
    <AdminGate>
      <div className="min-h-dvh bg-gradient-to-br from-slate-950 via-zinc-950 to-rose-950/30 text-zinc-100">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_70%_50%_at_50%_-10%,rgba(225,29,72,0.12),transparent)]" />

        <main className="relative mx-auto max-w-7xl px-3 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-6 lg:px-8">
          <header className="mb-8 flex flex-col gap-5 border-b border-white/10 pb-6 sm:mb-10 sm:pb-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-400/90">
                Panel
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl">
                Gestión de registros
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-zinc-400">
                Desliza en móvil o usa la vista en tarjetas. Para validar entradas usa Check-in QR.
              </p>
            </div>
            <nav className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch] sm:flex-wrap sm:overflow-visible lg:max-w-none">
              <Link
                href="/checkin"
                className="snap-start shrink-0 touch-manipulation rounded-xl border border-emerald-500/40 bg-emerald-600/20 px-4 py-3 text-center text-sm font-semibold text-emerald-100 transition active:scale-[0.98] sm:py-2.5"
              >
                Check-in QR
              </Link>
              <Link
                href="/registro"
                className="snap-start shrink-0 touch-manipulation rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-center text-sm font-medium text-zinc-200 transition hover:bg-white/10 sm:py-2.5"
              >
                Registro
              </Link>
              <Link
                href="/"
                className="snap-start shrink-0 touch-manipulation rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 px-4 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-rose-900/30 sm:py-2.5"
              >
                Inicio
              </Link>
            </nav>
          </header>

          <AdminPanel />
        </main>
      </div>
    </AdminGate>
  );
}
