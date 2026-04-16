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

        <main className="relative mx-auto max-w-7xl px-4 pb-12 pt-8 sm:px-6 lg:px-8">
          <header className="mb-10 flex flex-col gap-6 border-b border-white/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-400/90">
                Panel
              </p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                Gestión de registros
              </h1>
              <p className="mt-2 max-w-xl text-sm text-zinc-400">
                Aprueba, rechaza o elimina inscripciones. Los eliminados se quitan de Firestore y del
                almacenamiento de comprobantes.
              </p>
            </div>
            <nav className="flex flex-wrap gap-3">
              <Link
                href="/checkin"
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
              >
                Check-in QR
              </Link>
              <Link
                href="/registro"
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
              >
                Formulario registro
              </Link>
              <Link
                href="/"
                className="rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-900/30 transition hover:from-rose-500 hover:to-rose-600"
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
