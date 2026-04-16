import Link from "next/link";
import { EstadoContent } from "@/components/EstadoContent";

export default async function EstadoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Estado del registro</h1>
        <Link href="/" className="mt-2 inline-block text-sm text-blue-600 underline dark:text-blue-400">
          Volver al inicio
        </Link>
      </div>
      <EstadoContent id={id} />
    </main>
  );
}
