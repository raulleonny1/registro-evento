"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AdminReportExportToolbar } from "@/components/AdminReportExportToolbar";
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
  inscritosDesdeViernes: number;
  inscritosSabadoDomingo: number;
};

export default function AdminRecaudacionScreen() {
  const reportRef = useRef<HTMLDivElement>(null);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generadoEn, setGeneradoEn] = useState("");

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
      setGeneradoEn(
        new Intl.DateTimeFormat("es-ES", {
          dateStyle: "long",
          timeStyle: "short",
        }).format(new Date()),
      );
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
    <div className="flex flex-col gap-6">
      {error && (
        <div
          className="no-print rounded-xl border border-rose-500/40 bg-rose-950/50 px-4 py-3 text-sm text-rose-100"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="no-print flex flex-wrap items-center justify-between gap-3">
        <AdminReportExportToolbar reportRef={reportRef} filenameBase="recaudacion-iere-2026" />
        <button
          type="button"
          onClick={() => void load()}
          className="touch-manipulation rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-zinc-200 transition hover:bg-white/10 active:scale-[0.98] sm:py-2"
        >
          Actualizar datos
        </button>
      </div>

      <div
        ref={reportRef}
        className="admin-report-print-surface space-y-8 rounded-2xl border border-zinc-200 bg-white p-5 text-zinc-900 shadow-xl sm:p-8 dark:border-zinc-600 dark:bg-zinc-50"
      >
        <header className="border-b border-zinc-200 pb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700">
            Informe
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            Resumen de recaudación
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Encuentro Nacional de Mujeres IERE · 25 al 27 de septiembre de 2026
          </p>
          <p className="mt-2 text-xs text-zinc-500">
            Generado: <span className="font-medium text-zinc-700">{generadoEn}</span>
          </p>
        </header>

        <section aria-labelledby="asistencia-heading">
          <h2 id="asistencia-heading" className="text-sm font-semibold text-zinc-800">
            Inscripciones por asistencia
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Según la modalidad elegida en el registro.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-sky-200 bg-sky-50 px-5 py-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-sky-800/90">
                Inscritos en total
              </p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-sky-950 sm:text-3xl">
                {totalRegistros}
              </p>
              <p className="mt-2 text-xs text-sky-900/70">Todas las personas registradas.</p>
            </div>
            <div className="rounded-xl border border-violet-200 bg-violet-50 px-5 py-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-violet-800/90">
                Desde el viernes
              </p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-violet-950 sm:text-3xl">
                {inscritosDesdeViernes}
              </p>
              <p className="mt-2 text-xs text-violet-900/70">
                Modalidad del 25 al 27 (incluye viernes).
              </p>
            </div>
            <div className="rounded-xl border border-fuchsia-200 bg-fuchsia-50 px-5 py-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-fuchsia-800/90">
                Sábado y domingo
              </p>
              <p className="mt-2 text-2xl font-bold tabular-nums text-fuchsia-950 sm:text-3xl">
                {inscritosSabadoDomingo}
              </p>
              <p className="mt-2 text-xs text-fuchsia-900/70">Solo sábado 26 y domingo 27.</p>
            </div>
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-800/90">
              Recaudado en total
            </p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-emerald-950 sm:text-3xl">
              {formatEuros(totalRecaudado)}
            </p>
            <p className="mt-2 text-xs text-emerald-900/70">
              Suma en todos los inscritos ({totalRegistros}{" "}
              {totalRegistros === 1 ? "persona" : "personas"}).
            </p>
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-800/90">
              Pendiente por cobrar
            </p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-amber-950 sm:text-3xl">
              {formatEuros(totalPendiente)}
            </p>
            <p className="mt-2 text-xs text-amber-900/70">
              Suma pendiente según modalidad de cada inscripción.
            </p>
          </div>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-4 shadow-sm sm:col-span-2 lg:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-600">
              Personas con saldo pendiente
            </p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-zinc-900 sm:text-3xl">
              {personasConDeuda}
            </p>
            <p className="mt-2 text-xs text-zinc-600">
              {personasConDeuda === 0
                ? "Nadie debe cantidad según los importes registrados."
                : "Detalle en la tabla siguiente."}
            </p>
          </div>
        </div>

        <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-200 bg-zinc-50/80 px-4 py-3 sm:px-6">
            <h2 className="text-base font-semibold text-zinc-900">Quién debe y cuánto</h2>
            <p className="mt-0.5 text-sm text-zinc-600">
              Solo figuran quienes tienen pendiente mayor que cero.
            </p>
          </div>
          {deudores.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-zinc-500 sm:px-6">
              No hay pendientes registrados.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-200">
              {deudores.map((d) => (
                <li
                  key={d.id}
                  className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 sm:px-6"
                >
                  <span className="min-w-0 font-medium text-zinc-900">{d.nombre}</span>
                  <span className="shrink-0 tabular-nums text-base font-semibold text-amber-800">
                    {formatEuros(d.pendiente)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <p className="no-print text-center text-xs text-zinc-600">
        <Link
          href="/admin"
          className="font-medium text-rose-400/90 underline-offset-2 hover:underline"
        >
          Volver al panel de registros
        </Link>
      </p>
    </div>
  );
}
