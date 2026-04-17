"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { REGISTRO_ESTADOS, esPendientePago, normalizeEstado } from "@/lib/registroEstados";

export type ParroquiaDoc = {
  area?: string;
  parroquia?: string;
  iglesia?: string;
  manual?: boolean;
  /** Legacy */
  zona?: string;
  ciudad?: string;
  nombre?: string;
};

export type RegistroDoc = {
  nombre: string;
  email: string;
  /** Legacy */
  telefono?: string;
  whatsapp?: string;
  parroquia?: ParroquiaDoc;
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

  const estado = normalizeEstado(data.estado);

  if (esPendientePago(data.estado)) {
    return (
      <div className="flex max-w-lg flex-col gap-6">
        <div className="rounded-xl border border-amber-200/80 bg-amber-50/90 px-4 py-3 text-sm text-amber-950 dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-100">
          <p className="font-semibold">Pendiente de pago</p>
          <p className="mt-2 leading-relaxed">
            Realiza la transferencia por el importe indicado por el organizador. Cuando hayas hecho el
            depósito, entra en{" "}
            <Link href="/registro/continuar" className="font-semibold text-amber-900 underline dark:text-amber-200">
              Continuar registro
            </Link>{" "}
            (últimos 4 dígitos del teléfono o ID) y sube ahí el comprobante: archivo o foto desde el
            móvil.
          </p>
        </div>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          <Link
            href="/registro/continuar"
            className="inline-flex w-fit rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Ir a Continuar registro
          </Link>
        </p>
      </div>
    );
  }

  if (estado === REGISTRO_ESTADOS.revision) {
    return (
      <div className="flex max-w-lg flex-col gap-4">
        <div className="rounded-xl border border-sky-200/90 bg-sky-50/95 px-4 py-3 text-sm leading-relaxed text-sky-950 dark:border-sky-500/35 dark:bg-sky-950/35 dark:text-sky-100">
          <p className="font-semibold">En revisión</p>
          <p className="mt-2">
            El equipo está revisando tu comprobante. <strong className="font-semibold">Hasta que no aprueben el pago</strong>, no
            podrás ver el <strong className="font-semibold">código QR ni el acceso al evento</strong>. Te avisaremos cuando quede
            confirmado.
          </p>
        </div>
        <p className="font-medium text-zinc-900 dark:text-zinc-100">
          Vuelve a esta página más tarde o entra desde &ldquo;Continuar registro&rdquo; para comprobar si ya está aprobado.
        </p>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Para enviar otro archivo, usa{" "}
          <Link href="/registro/continuar" className="font-medium text-rose-700 underline dark:text-rose-400">
            Continuar registro
          </Link>{" "}
          o{" "}
          <Link href={`/subir/${id}`} className="text-rose-700 underline dark:text-rose-400">
            esta página de subida
          </Link>
          .
        </p>
      </div>
    );
  }

  if (estado === REGISTRO_ESTADOS.aprobado) {
    return (
      <div className="flex flex-col gap-4">
        <p className="font-medium text-zinc-900 dark:text-zinc-100">Tu registro está aprobado.</p>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/ticket/${id}`}
            className="inline-flex w-fit rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900"
          >
            Ver ticket y QR
          </Link>
          <Link
            href={`/registro/codigo`}
            className="inline-flex w-fit rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-800 dark:border-zinc-600 dark:text-zinc-200"
          >
            Ver código de evento
          </Link>
        </div>
      </div>
    );
  }

  if (estado === REGISTRO_ESTADOS.rechazado) {
    return (
      <p className="text-zinc-700 dark:text-zinc-300">
        Tu registro no fue aprobado. Si crees que es un error, contacta al organizador.
      </p>
    );
  }

  return <p className="text-zinc-600">Estado: {estado}</p>;
}
