"use client";

import html2pdf from "html2pdf.js";
import {
  etiquetaTarifaInscripcion,
  formatEuros,
  pendienteEuros,
  type DatosTarifaRegistro,
  type ModalidadRegistro,
} from "@/lib/eventoPrecio";
import { etiquetaEstado } from "@/lib/registroEstados";
import { labelAceptoDatosEvento } from "@/lib/registroConsent";

export type RegistroPdfRow = {
  id: string;
  nombre: string;
  email: string;
  whatsapp: string;
  parroquiaLabel: string;
  estado: string;
  comprobanteURL?: string;
  montoDepositadoEuros: number;
  modalidadRegistro: ModalidadRegistro;
  tarifa: DatosTarifaRegistro;
  comiteOrganizador: boolean;
  aceptoDatosEvento: boolean | null;
  observaciones?: string;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildRegistrosPdfDocument(
  rows: RegistroPdfRow[],
  generadoEn: string,
): HTMLElement {
  const root = document.createElement("div");
  root.setAttribute("data-registros-pdf", "1");
  root.style.cssText = [
    "width:1120px",
    "max-width:1120px",
    "margin:0",
    "padding:28px 24px 32px",
    "background:#ffffff",
    "color:#18181b",
    "font-family:Arial,Helvetica,sans-serif",
    "box-sizing:border-box",
  ].join(";");

  const header = document.createElement("div");
  header.style.cssText =
    "margin:0 0 18px;padding:0 0 12px;border-bottom:2px solid #9f1239;box-sizing:border-box;";
  header.innerHTML = `
    <div style="margin:0 0 4px;font-size:10px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#9f1239;">Informe</div>
    <div style="margin:0 0 6px;font-size:20px;font-weight:700;line-height:1.25;color:#18181b;">Gestión de registros</div>
    <div style="margin:0 0 3px;font-size:11px;line-height:1.4;color:#52525b;">Encuentro Nacional de Mujeres IERE · 25 al 27 de septiembre de 2026</div>
    <div style="margin:0 0 3px;font-size:10px;line-height:1.4;color:#71717a;">Generado: ${escapeHtml(generadoEn || "—")}</div>
    <div style="margin:0;font-size:11px;font-weight:600;line-height:1.4;color:#27272a;">${rows.length} ${
      rows.length === 1 ? "persona inscrita" : "personas inscritas"
    }</div>
  `;
  root.appendChild(header);

  const tableWrap = document.createElement("div");
  tableWrap.style.cssText = "width:100%;box-sizing:border-box;";

  const table = document.createElement("table");
  table.style.cssText = [
    "width:100%",
    "border-collapse:collapse",
    "table-layout:fixed",
    "font-size:8px",
    "line-height:1.35",
    "color:#27272a",
  ].join(";");

  const colWidths = [
    "11%",
    "13%",
    "9%",
    "14%",
    "9%",
    "7%",
    "8%",
    "7%",
    "7%",
    "10%",
    "5%",
  ];

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  const headers = [
    "Nombre",
    "Email",
    "WhatsApp",
    "Parroquia",
    "Modalidad",
    "Aviso datos",
    "Estado",
    "Pagado",
    "Pendiente",
    "Observaciones",
    "Comp.",
  ];
  headers.forEach((label, i) => {
    const th = document.createElement("th");
    th.textContent = label;
    th.style.cssText = [
      `width:${colWidths[i]}`,
      "background:#f4f4f5",
      "color:#3f3f46",
      "font-size:7px",
      "font-weight:700",
      "text-transform:uppercase",
      "letter-spacing:0.03em",
      "text-align:left",
      "vertical-align:middle",
      "padding:7px 5px",
      "border:1px solid #d4d4d8",
      "box-sizing:border-box",
    ].join(";");
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  rows.forEach((r, idx) => {
    const tr = document.createElement("tr");
    const bg = idx % 2 === 0 ? "#ffffff" : "#fafafa";
    const modalidad = r.comiteOrganizador
      ? `Comité · ${etiquetaTarifaInscripcion(r.tarifa)}`
      : etiquetaTarifaInscripcion(r.tarifa);
    const cells = [
      r.nombre || "—",
      r.email || "—",
      r.whatsapp || "—",
      r.parroquiaLabel || "—",
      modalidad,
      labelAceptoDatosEvento(r.aceptoDatosEvento),
      etiquetaEstado(r.estado),
      formatEuros(r.montoDepositadoEuros),
      formatEuros(pendienteEuros(r.montoDepositadoEuros, r.tarifa)),
      r.observaciones?.trim() || "—",
      r.comprobanteURL ? "Sí" : "No",
    ];
    cells.forEach((text) => {
      const td = document.createElement("td");
      td.textContent = text;
      td.style.cssText = [
        `background:${bg}`,
        "vertical-align:top",
        "padding:6px 5px",
        "border:1px solid #e4e4e7",
        "word-break:break-word",
        "overflow-wrap:anywhere",
        "white-space:normal",
        "box-sizing:border-box",
      ].join(";");
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  tableWrap.appendChild(table);
  root.appendChild(tableWrap);

  return root;
}

/**
 * PDF A4 horizontal generado desde los datos (no clona la UI del admin).
 * Evita el solapamiento cabecera/tabla del html2canvas sobre Tailwind.
 */
export async function exportRegistrosPdf(
  rows: RegistroPdfRow[],
  generadoEn: string,
  filename: string,
): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("El PDF solo puede generarse en el navegador.");
  }
  if (!rows.length) {
    throw new Error("No hay registros para exportar.");
  }

  const host = document.createElement("div");
  host.style.cssText =
    "position:fixed;left:-10000px;top:0;width:1120px;background:#fff;z-index:-1;pointer-events:none;";
  const doc = buildRegistrosPdfDocument(rows, generadoEn);
  host.appendChild(doc);
  document.body.appendChild(host);

  const opt = {
    margin: [8, 8, 8, 8] as [number, number, number, number],
    filename,
    image: { type: "jpeg" as const, quality: 0.96 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      scrollX: 0,
      scrollY: 0,
      windowWidth: 1160,
      width: 1160,
    },
    jsPDF: { unit: "mm" as const, format: "a4" as const, orientation: "landscape" as const },
    pagebreak: { mode: ["css", "legacy"] as ("css" | "legacy")[] },
  };

  try {
    const run = html2pdf().set(opt).from(doc).save();
    const timeoutMs = 90_000;
    await Promise.race([
      run,
      new Promise<never>((_, rej) => {
        setTimeout(
          () =>
            rej(
              new Error(
                `Tiempo de espera (${timeoutMs / 1000}s). Prueba de nuevo o usa Descargar Excel (CSV).`,
              ),
            ),
          timeoutMs,
        );
      }),
    ]);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`No se pudo crear el PDF: ${msg}`);
  } finally {
    host.remove();
  }
}
