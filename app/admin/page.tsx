import dynamic from "next/dynamic";
import Link from "next/link";

const AdminPanel = dynamic(() => import("@/components/AdminPanel"), {
  loading: () => (
    <div
      className="rounded border border-zinc-200 p-8 text-zinc-500 dark:border-zinc-700"
      aria-live="polite"
    >
      Cargando panel…
    </div>
  ),
});

export const metadata = {
  title: "Admin — Registros",
};

export default function AdminPage() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="text-2xl font-semibold">Panel admin</h1>
        <div className="flex flex-wrap gap-4 text-sm">
          <Link href="/checkin" className="text-blue-600 underline dark:text-blue-400">
            Check-in (QR)
          </Link>
          <Link href="/" className="text-blue-600 underline dark:text-blue-400">
            Ir al registro
          </Link>
        </div>
      </div>
      <AdminPanel />
    </main>
  );
}
