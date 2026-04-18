"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getFirestoreLazy } from "@/lib/firestoreClient";
import {
  MODALIDADES_REGISTRO,
  formatEuros,
  normalizeModalidadRegistro,
  pendienteEuros,
} from "@/lib/eventoPrecio";

type Deudor = {
  id: string;
  nombre: string;
  pendiente: number;
};

type Resumen = {
  totalRecaudado: number;
  totalPendiente: number;
  personasConDeuda: number;
  deudores: Deudor[];
  totalRegistros: number;
  /** Modalidad del 25 al 27 (incluye viernes). */
  inscritosDesdeViernes: number;
  /** Modalidad solo sábado 26 y domingo 27. */
  inscritosSabadoDomingo: number;
};

export default function AdminRecaudacionScreen() {
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const { fs, db } = await getFirestoreLazy();
      const { collection, getDocs } = fs;
      const snap = await getDocs(collection(db, "registros"));

      let totalRecaudado = 0;
      let totalPendiente = 0;
      let inscritosDesdeViernes = 0;
      let inscritosSabadoDomingo = 0;
      const deudores: Deudor[] = [];

      for (const d of snap.docs) {
        const x = d.data() as {
          nombre?: unknown;
          montoDepositadoEuros?: unknown;
          modalidadRegistro?: unknown;
        };
        const md = Number(x.montoDepositadoEuros ?? 0);
        const m = Number.isFinite(md) ? md : 0;
        const modalidad = normalizeModalidadRegistro(x.modalidadRegistro);
        if (modalidad === MODALIDADES_REGISTRO.sab_dom_26_27) {
          inscritosSabadoDomingo += 1;
        } else {
          inscritosDesdeViernes += 1;
        }
        const pend = pendienteEuros(m, modalidad);
        totalRecaudado += m;
        totalPendiente += pend;
        if (pend > 0.01) {
          deudores.push({
            id: d.id,
            nombre: String(x.nombre ?? "—"),
            pendiente: pend,
          });
        }
      }

      deudores.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

      setResumen({
        totalRecaudado,
        totalPendiente,
        personasConDeuda: deudores.length,
        deudores,
        totalRegistros: snap.docs.length,
        inscritosDesdeViernes,
        inscritosSabadoDomingo,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar");
      setResumen(null);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (error && !resumen) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border border-rose-500/30 bg-rose-950/40 px-4 py-3 text-rose-200">
          {error}
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="touch-manipulation self-start rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-zinc-200"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (resumen === null) {
    return (
      <div className="flex items-center justify-center gap-3 py-20 text-zinc-400">
        <span
          className="size-8 animate-spin rounded-full border-2 border-rose-500/30 border-t-rose-400"
          aria-hidden
        />
        Calculando resumen…
      </div>
    );
  }

  const {
    totalRecaudado,
    totalPendiente,
    personasConDeuda,
    deudores,
    totalRegistros,
    inscritosDesdeViernes,
    inscritosSabadoDomingo,
  } = resumen;

  return (
    <div className="flex flex-col gap-8">
      {error && (
        <div
          className="rounded-xl border border-rose-500/40 bg-rose-950/50 px-4 py-3 text-sm text-rose-100"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => void load()}
          className="touch-manipulation rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-zinc-200 transition hover:bg-white/10 active:scale-[0.98] sm:py-2"
        >
          Actualizar datos
        </button>
      </div>

      <section aria-labelledby="asistencia-heading">
        <h2 id="asistencia-heading" className="text-sm font-semibold text-zinc-300">
          Inscripciones por asistencia
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Según la modalidad elegida en el registro (25–27 septiembre de 2026).
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-sky-500/25 bg-sky-950/30 px-5 py-5 shadow-lg shadow-black/20">
            <p className="text-xs font-semibold uppercase tracking-wider text-sky-300/80">
              Inscritos en total
            </p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-sky-100 sm:text-3xl">
              {totalRegistros}
            </p>
            <p className="mt-2 text-xs text-sky-200/60">
              Todas las personas registradas en el sistema.
            </p>
          </div>
          <div className="rounded-2xl border border-violet-500/25 bg-violet-950/30 px-5 py-5 shadow-lg shadow-black/20">
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-300/80">
              Desde el viernes
            </p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-violet-100 sm:text-3xl">
              {inscritosDesdeViernes}
            </p>
            <p className="mt-2 text-xs text-violet-200/60">
              Modalidad del 25 al 27 (incluye viernes 25, sábado 26 y domingo 27).
            </p>
          </div>
          <div className="rounded-2xl border border-fuchsia-500/25 bg-fuchsia-950/25 px-5 py-5 shadow-lg shadow-black/20">
            <p className="text-xs font-semibold uppercase tracking-wider text-fuchsia-300/80">
              Sábado y domingo
            </p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-fuchsia-100 sm:text-3xl">
              {inscritosSabadoDomingo}
            </p>
            <p className="mt-2 text-xs text-fuchsia-200/60">
              Modalidad solo sábado 26 y domingo 27 (sin viernes).
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-950/35 px-5 py-5 shadow-lg shadow-black/20">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300/80">
            Recaudado en total
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-emerald-100 sm:text-3xl">
            {formatEuros(totalRecaudado)}
          </p>
          <p className="mt-2 text-xs text-emerald-200/60">
            Suma de lo registrado en todos los inscritos ({totalRegistros}{" "}
            {totalRegistros === 1 ? "persona" : "personas"}).
          </p>
        </div>
        <div className="rounded-2xl border border-amber-500/25 bg-amber-950/30 px-5 py-5 shadow-lg shadow-black/20">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-300/80">
            Pendiente por cobrar
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-amber-100 sm:text-3xl">
            {formatEuros(totalPendiente)}
          </p>
          <p className="mt-2 text-xs text-amber-200/60">
            Suma de lo pendiente según la modalidad elegida por cada inscrita.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-5 shadow-lg shadow-black/20 sm:col-span-2 lg:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Personas con saldo pendiente
          </p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-white sm:text-3xl">
            {personasConDeuda}
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            {personasConDeuda === 0
              ? "Nadie debe cantidad según los importes registrados."
              : "Listado abajo con nombre e importe pendiente."}
          </p>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-2xl shadow-black/40 backdrop-blur-sm">
        <div className="border-b border-white/10 px-4 py-4 sm:px-6">
          <h2 className="text-lg font-semibold text-white">Quién debe y cuánto</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Solo aparecen quienes tienen pendiente mayor que cero.
          </p>
        </div>
        {deudores.length === 0 ? (
          <p className="px-4 py-10 text-center text-zinc-500 sm:px-6">
            No hay pendientes registrados.
          </p>
        ) : (
          <ul className="divide-y divide-white/5">
            {deudores.map((d) => (
              <li
                key={d.id}
                className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3.5 sm:px-6"
              >
                <span className="min-w-0 font-medium text-zinc-100">{d.nombre}</span>
                <span className="shrink-0 tabular-nums text-base font-semibold text-amber-200">
                  {formatEuros(d.pendiente)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-center text-xs text-zinc-600">
        <Link href="/admin" className="font-medium text-rose-400/90 underline-offset-2 hover:underline">
          Volver al panel de registros
        </Link>
      </p>
    </div>
  );
}
