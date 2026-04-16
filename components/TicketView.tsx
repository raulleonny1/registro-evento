"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { generateQrDataUrl } from "@/lib/qr";

export function TicketView({ id }: { id: string }) {
  const [nombre, setNombre] = useState<string | null | undefined>(undefined);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "registros", id));
        if (cancelled) return;
        if (!snap.exists()) {
          setNombre(null);
          return;
        }
        const d = snap.data();
        const n = (d.nombre as string) ?? "";
        setNombre(n);
        const guardado = typeof d.qr === "string" && d.qr.length > 0 ? d.qr : null;
        const url = guardado ?? (await generateQrDataUrl(id, 400));
        if (!cancelled) setQrUrl(url);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) return <p className="text-red-600">{error}</p>;
  if (nombre === undefined) return <p className="text-zinc-500">Cargando…</p>;
  if (nombre === null) return <p>Registro no encontrado.</p>;

  return (
    <div className="flex flex-col items-center gap-6">
      <h2 className="text-xl font-semibold">{nombre}</h2>
      {qrUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={qrUrl}
          alt="Código QR del ticket"
          width={400}
          height={400}
          className="max-h-[80vw] max-w-[min(100%,400px)] object-contain"
        />
      )}
      <p className="text-sm text-zinc-600 dark:text-zinc-400">ID: {id}</p>
    </div>
  );
}
