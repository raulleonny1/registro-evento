import Link from "next/link";
import { SubirComprobante } from "@/components/SubirComprobante";

export default async function SubirPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Subir comprobante</h1>
        <Link
          href={`/estado/${id}`}
          className="mt-2 inline-block text-sm text-blue-600 underline dark:text-blue-400"
        >
          Volver al estado
        </Link>
      </div>
      <SubirComprobante id={id} />
    </main>
  );
}
