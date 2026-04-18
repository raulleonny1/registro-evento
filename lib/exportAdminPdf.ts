"use client";

import html2pdf from "html2pdf.js";

/**
 * Genera un PDF a partir de un nodo HTML (informes de administración).
 * Debe ejecutarse solo en el navegador (módulo marcado "use client").
 */
export async function exportHtmlToPdf(element: HTMLElement, filename: string): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("El PDF solo puede generarse en el navegador.");
  }

  const opt = {
    margin: [10, 10, 10, 10] as [number, number, number, number],
    filename,
    image: { type: "jpeg" as const, quality: 0.92 },
    html2canvas: {
      scale: Math.min(2, window.devicePixelRatio || 1.5),
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      scrollY: -window.scrollY,
      windowWidth: document.documentElement.offsetWidth,
      ignoreElements: (el: Element) =>
        el instanceof HTMLElement && el.classList.contains("no-pdf"),
    },
    jsPDF: { unit: "mm" as const, format: "a4" as const, orientation: "portrait" as const },
    pagebreak: { mode: ["css", "legacy"] as ("css" | "legacy")[] },
  };

  try {
    await html2pdf().set(opt).from(element).save();
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`No se pudo crear el PDF: ${msg}`);
  }
}
