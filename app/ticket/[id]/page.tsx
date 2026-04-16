import Link from "next/link";
import { TicketView } from "@/components/TicketView";

export default async function TicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <main className="mx-auto flex max-w-lg flex-col items-center gap-6 p-6">
      <div className="w-full">
        <h1 className="text-2xl font-semibold">Tu ticket</h1>
        <Link
          href={`/estado/${id}`}
          className="mt-2 inline-block text-sm text-blue-600 underline dark:text-blue-400"
        >
          Estado del registro
        </Link>
      </div>
      <TicketView id={id} />
    </main>
  );
}
