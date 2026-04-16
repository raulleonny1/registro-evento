"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type RegistroDoc = {
  nombre: string;
  email: string;
  telefono: string;
  estado: string;
  comprobanteURL?: string;
  qr?: string;
};

export function EstadoContent({ id }: { id: string }) {
  const [data, setData] = useState<RegistroDoc | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "registros", id));
        if (cancelled) return;
        if (!snap.exists()) {
          setData(null);
          return;
        }
        const d = snap.data() as RegistroDoc;
        setData(d);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Error al cargar");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) {
    return <p className="text-red-600">{error}</p>;
  }
  if (data === undefined) {
    return <p className="text-zinc-500">Cargando…</p>;
  }
  if (data === null) {
    return <p>No se encontró el registro.</p>;
  }

  const { estado } = data;

  if (estado === "pendiente") {
    return (
      <div className="flex max-w-lg flex-col gap-4">
        <p className="font-medium">Instrucciones de pago</p>
        <p className="text-sm text-zinc-700 dark:text-zinc-300">
          Realiza una transferencia bancaria por el monto del evento a la cuenta indicada por el
          organizador. Cuando hayas pagado, sube el comprobante (captura o PDF) usando el botón de
          abajo.
        </p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          (Sustituye este texto por los datos reales de cuenta, monto y referencia si lo deseas.)
        </p>
        <Link
          href={`/subir/${id}`}
          className="inline-flex w-fit rounded bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Subir comprobante
        </Link>
      </div>
    );
  }

  if (estado === "revision") {
    return <p>Tu comprobante está en revisión</p>;
  }

  if (estado === "aprobado") {
    return (
      <div className="flex flex-col gap-3">
        <p>Tu registro está aprobado.</p>
        <Link
          href={`/ticket/${id}`}
          className="inline-flex w-fit rounded bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Ver ticket
        </Link>
      </div>
    );
  }

  if (estado === "rechazado") {
    return (
      <p className="text-zinc-700 dark:text-zinc-300">
        Tu registro no fue aprobado. Si crees que es un error, contacta al organizador.
      </p>
    );
  }

  return <p className="text-zinc-600">Estado: {estado}</p>;
}
