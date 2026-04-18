/**
 * Genera un PDF a partir de un nodo HTML (informes de administración).
 */
export async function exportHtmlToPdf(element: HTMLElement, filename: string): Promise<void> {
  const html2pdf = (await import("html2pdf.js")).default;
  await html2pdf()
    .set({
      margin: [10, 10, 10, 10],
      filename,
      image: { type: "jpeg", quality: 0.96 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        ignoreElements: (el: Element) =>
          el instanceof HTMLElement && el.classList.contains("no-pdf"),
      },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["avoid-all", "css", "legacy"] },
    } as never)
    .from(element)
    .save();
}
