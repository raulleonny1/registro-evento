"use client";

import { useCallback, useState, type RefObject } from "react";

type Props = {
  reportRef: RefObject<HTMLElement | null>;
  filenameBase: string;
};

export function AdminReportExportToolbar({ reportRef, filenameBase }: Props) {
  const [pdfBusy, setPdfBusy] = useState(false);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handlePdf = useCallback(async () => {
    const el = reportRef.current;
    if (!el) return;
    setPdfBusy(true);
    try {
      const { exportHtmlToPdf } = await import("@/lib/exportAdminPdf");
      const date = new Date().toISOString().slice(0, 10);
      await exportHtmlToPdf(el, `${filenameBase}-${date}.pdf`);
    } finally {
      setPdfBusy(false);
    }
  }, [reportRef, filenameBase]);

  return (
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
  );
}
