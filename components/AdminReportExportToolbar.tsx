"use client";

import { useCallback, useState, type RefObject } from "react";

type Props = {
  reportRef: RefObject<HTMLElement | null>;
  filenameBase: string;
};

export function AdminReportExportToolbar({ reportRef, filenameBase }: Props) {
  const [pdfBusy, setPdfBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePrint = useCallback(() => {
    setError(null);
    const el = reportRef.current;
    if (!el) {
      setError("No hay contenido para imprimir. Actualiza la página e inténtalo de nuevo.");
      return;
    }
    try {
      // Safari/iOS a veces necesita el print en el siguiente frame tras el gesto del usuario.
      requestAnimationFrame(() => {
        setTimeout(() => {
          window.print();
        }, 0);
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo abrir el diálogo de impresión.");
    }
  }, [reportRef]);

  const handlePdf = useCallback(async () => {
    setError(null);
    const el = reportRef.current;
    if (!el) {
      setError("No hay contenido para exportar. Actualiza la página e inténtalo de nuevo.");
      return;
    }
    if (el.offsetHeight < 8 && el.offsetWidth < 8) {
      setError("El informe aún no está visible. Espera a que carguen los datos.");
      return;
    }
    setPdfBusy(true);
    try {
      const { exportHtmlToPdf } = await import("@/lib/exportAdminPdf");
      const date = new Date().toISOString().slice(0, 10);
      await exportHtmlToPdf(el, `${filenameBase}-${date}.pdf`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error desconocido al generar el PDF.";
      setError(msg);
    } finally {
      setPdfBusy(false);
    }
  }, [reportRef, filenameBase]);

  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      <div
        className="no-print flex flex-wrap items-center gap-2"
        role="group"
        aria-label="Exportar informe"
      >
        <button
          type="button"
          onClick={handlePrint}
          className="touch-manipulation rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-800 shadow-sm transition hover:bg-zinc-50 active:scale-[0.98] dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
        >
          Imprimir
        </button>
        <button
          type="button"
          disabled={pdfBusy}
          onClick={() => void handlePdf()}
          className="touch-manipulation rounded-xl border border-rose-500/50 bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-500 disabled:opacity-50 active:scale-[0.98]"
        >
          {pdfBusy ? "Generando PDF…" : "Descargar PDF"}
        </button>
      </div>
      {error && (
        <p
          className="no-print rounded-lg border border-rose-400/50 bg-rose-950/50 px-3 py-2 text-xs leading-snug text-rose-100"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}
