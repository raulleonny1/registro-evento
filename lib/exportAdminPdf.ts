"use client";

import html2pdf from "html2pdf.js";

/**
 * Propiedades copiadas del DOM real al clon.
 * No incluimos `background` abreviado (puede traer gradientes con lab()).
 */
const CLONE_STYLE_PROPS = [
  "color",
  "backgroundColor",
  "borderTopColor",
  "borderRightColor",
  "borderBottomColor",
  "borderLeftColor",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "borderTopStyle",
  "borderRightStyle",
  "borderBottomStyle",
  "borderLeftStyle",
  "borderRadius",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "fontStyle",
  "lineHeight",
  "letterSpacing",
  "textAlign",
  "textDecoration",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
  "display",
  "width",
  "height",
  "minWidth",
  "maxWidth",
  "minHeight",
  "maxHeight",
  "boxSizing",
  "verticalAlign",
  "whiteSpace",
  "overflow",
  "flexDirection",
  "flexWrap",
  "justifyContent",
  "alignItems",
  "gap",
  "gridTemplateColumns",
] as const;

/** Ancho lógico del informe en PDF (A4 apaisado ≈ 1120–1200 px útiles). */
const PDF_CONTENT_WIDTH_PX = 1180;

let colorCanvas: HTMLCanvasElement | null = null;
function getColor2d(): CanvasRenderingContext2D | null {
  if (!colorCanvas) colorCanvas = document.createElement("canvas");
  return colorCanvas.getContext("2d");
}

/**
 * Chrome/Safari recientes devuelven a veces lab()/oklch() en getComputedStyle;
 * html2canvas no los parsea. El canvas del navegador los convierte a rgb/hex.
 */
function coerceModernColorToRgb(input: string): string {
  const t = input.trim();
  if (!t || t === "transparent" || t === "none") return t;
  if (!/lab\(|oklch\(|lch\(|color\(/i.test(t)) return t;

  const ctx = getColor2d();
  if (!ctx) return "#171717";
  try {
    ctx.fillStyle = "#000000";
    ctx.fillStyle = t;
    const out = ctx.fillStyle;
    if (typeof out === "string" && !/lab\(|oklch\(|lch\(/i.test(out)) return out;
  } catch {
    /* */
  }
  return "#171717";
}

function safeCssValue(prop: string, value: string): string {
  if (!value) return value;
  if (!/lab\(|oklch\(|lch\(|color\(/i.test(value)) return value;

  if (
    prop === "box-shadow" ||
    prop === "text-shadow" ||
    prop === "filter" ||
    prop === "backdrop-filter"
  ) {
    return "none";
  }

  return coerceModernColorToRgb(value);
}

function applyComputedStyles(orig: Element, clone: Element) {
  if (!(orig instanceof HTMLElement) || !(clone instanceof HTMLElement)) return;
  const cs = window.getComputedStyle(orig);
  for (const prop of CLONE_STYLE_PROPS) {
    const raw = cs.getPropertyValue(prop);
    if (!raw) continue;
    const v = safeCssValue(prop, raw);
    clone.style.setProperty(prop, v);
  }
}

function walkInlineStyles(origRoot: Element, cloneRoot: Element) {
  applyComputedStyles(origRoot, cloneRoot);
  cloneRoot.removeAttribute("class");

  const o = origRoot.children;
  const c = cloneRoot.children;
  for (let i = 0; i < o.length; i++) {
    if (c[i]) walkInlineStyles(o[i], c[i]);
  }
}

function stripExternalStylesFromClone(clonedDoc: Document) {
  clonedDoc.querySelectorAll('link[rel="stylesheet"]').forEach((n) => n.remove());
  clonedDoc.querySelectorAll("style").forEach((n) => n.remove());
}

function sanitizeCloneInlineColors(root: HTMLElement) {
  const walk = (el: HTMLElement) => {
    const st = el.style;
    for (let i = 0; i < st.length; i++) {
      const prop = st[i];
      const val = st.getPropertyValue(prop);
      if (!val) continue;
      const next = safeCssValue(prop, val);
      if (next !== val) st.setProperty(prop, next);
    }
    for (let i = 0; i < el.children.length; i++) {
      const ch = el.children[i];
      if (ch instanceof HTMLElement) walk(ch);
    }
  };
  walk(root);
}

/**
 * Estilos propios del PDF: informe limpio en horizontal (sin depender de Tailwind).
 */
function injectPdfReportStyles(clonedDoc: Document) {
  const style = clonedDoc.createElement("style");
  style.textContent = `
    * { box-sizing: border-box !important; }
    .no-pdf { display: none !important; }
    [data-admin-pdf="mobile"] { display: none !important; }

    .admin-report-print-surface {
      display: block !important;
      position: relative !important;
      width: ${PDF_CONTENT_WIDTH_PX}px !important;
      max-width: ${PDF_CONTENT_WIDTH_PX}px !important;
      margin: 0 !important;
      padding: 28px 32px 36px !important;
      background: #ffffff !important;
      color: #18181b !important;
      border: none !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      font-family: Arial, Helvetica, sans-serif !important;
      overflow: visible !important;
    }

    .admin-report-print-surface header {
      display: block !important;
      width: 100% !important;
      margin: 0 0 18px !important;
      padding: 0 0 14px !important;
      border-bottom: 2px solid #9f1239 !important;
      background: transparent !important;
    }

    .admin-report-print-surface header p:first-child {
      margin: 0 0 4px !important;
      font-size: 10px !important;
      font-weight: 700 !important;
      letter-spacing: 0.16em !important;
      text-transform: uppercase !important;
      color: #9f1239 !important;
    }

    .admin-report-print-surface header h1 {
      margin: 0 0 6px !important;
      font-size: 22px !important;
      font-weight: 700 !important;
      line-height: 1.25 !important;
      color: #18181b !important;
    }

    .admin-report-print-surface header p {
      margin: 2px 0 !important;
      font-size: 11px !important;
      line-height: 1.45 !important;
      color: #52525b !important;
    }

    [data-admin-pdf="desktop"] {
      display: block !important;
      width: 100% !important;
      overflow: visible !important;
      border: 1px solid #e4e4e7 !important;
      border-radius: 8px !important;
      background: #ffffff !important;
      box-shadow: none !important;
    }

    [data-admin-pdf="desktop"] .overflow-x-auto,
    [data-admin-pdf="desktop"] > div {
      display: block !important;
      width: 100% !important;
      overflow: visible !important;
      max-width: none !important;
    }

    .admin-report-print-surface table {
      width: 100% !important;
      min-width: 0 !important;
      max-width: 100% !important;
      border-collapse: collapse !important;
      table-layout: fixed !important;
      font-size: 8.5px !important;
      line-height: 1.35 !important;
      color: #27272a !important;
    }

    .admin-report-print-surface thead {
      display: table-header-group !important;
    }

    .admin-report-print-surface th {
      background: #fafafa !important;
      color: #52525b !important;
      font-size: 7.5px !important;
      font-weight: 700 !important;
      text-transform: uppercase !important;
      letter-spacing: 0.04em !important;
      text-align: left !important;
      vertical-align: middle !important;
      padding: 7px 6px !important;
      border-bottom: 1.5px solid #d4d4d8 !important;
      border-right: 1px solid #f4f4f5 !important;
      white-space: normal !important;
      word-break: break-word !important;
    }

    .admin-report-print-surface td {
      vertical-align: top !important;
      padding: 6px 6px !important;
      border-bottom: 1px solid #ececec !important;
      border-right: 1px solid #f4f4f5 !important;
      color: #27272a !important;
      background: #ffffff !important;
      white-space: normal !important;
      word-break: break-word !important;
      overflow-wrap: anywhere !important;
    }

    .admin-report-print-surface tbody tr:nth-child(even) td {
      background: #fcfcfc !important;
    }

    .admin-report-print-surface section h2,
    .admin-report-print-surface h2 {
      font-size: 13px !important;
      color: #18181b !important;
      margin: 0 0 6px !important;
    }
  `;
  clonedDoc.head.appendChild(style);
}

/**
 * En el panel de registros hay dos vistas (tabla escritorio + tarjetas móvil).
 * Forzamos solo la tabla y un layout estable para A4 apaisado.
 */
function forceAdminPanelPdfLayout(clonedRoot: HTMLElement) {
  const desktop = clonedRoot.querySelector('[data-admin-pdf="desktop"]');
  const mobile = clonedRoot.querySelector('[data-admin-pdf="mobile"]');
  if (desktop instanceof HTMLElement) {
    desktop.style.setProperty("display", "block", "important");
    desktop.style.setProperty("width", "100%", "important");
    desktop.style.setProperty("overflow", "visible", "important");
    desktop.style.setProperty("position", "relative", "important");
    desktop.querySelectorAll("*").forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      if (node.classList.contains("overflow-x-auto") || node.style.overflow === "auto") {
        node.style.setProperty("overflow", "visible", "important");
        node.style.setProperty("width", "100%", "important");
        node.style.setProperty("max-width", "none", "important");
      }
    });
    const table = desktop.querySelector("table");
    if (table instanceof HTMLElement) {
      table.style.setProperty("min-width", "0", "important");
      table.style.setProperty("width", "100%", "important");
      table.style.setProperty("table-layout", "fixed", "important");
    }
  }
  if (mobile instanceof HTMLElement) {
    mobile.style.setProperty("display", "none", "important");
  }

  clonedRoot.style.setProperty("position", "relative", "important");
  clonedRoot.style.setProperty("width", `${PDF_CONTENT_WIDTH_PX}px`, "important");
  clonedRoot.style.setProperty("max-width", `${PDF_CONTENT_WIDTH_PX}px`, "important");
  clonedRoot.style.setProperty("overflow", "visible", "important");
  clonedRoot.style.setProperty("background", "#ffffff", "important");
  clonedRoot.style.setProperty("box-shadow", "none", "important");
  clonedRoot.style.setProperty("border-radius", "0", "important");

  const header = clonedRoot.querySelector("header");
  if (header instanceof HTMLElement) {
    header.style.setProperty("display", "block", "important");
    header.style.setProperty("position", "relative", "important");
    header.style.setProperty("width", "100%", "important");
    header.style.setProperty("margin-bottom", "16px", "important");
  }

  clonedRoot.querySelectorAll(".no-pdf").forEach((n) => {
    if (n instanceof HTMLElement) n.style.setProperty("display", "none", "important");
  });
}

/**
 * Genera un PDF A4 horizontal a partir de un nodo HTML (informes de administración).
 */
export async function exportHtmlToPdf(element: HTMLElement, filename: string): Promise<void> {
  if (typeof window === "undefined") {
    throw new Error("El PDF solo puede generarse en el navegador.");
  }

  const opt = {
    margin: [8, 8, 8, 8] as [number, number, number, number],
    filename,
    image: { type: "jpeg" as const, quality: 0.95 },
    html2canvas: {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      scrollY: 0,
      scrollX: 0,
      windowWidth: PDF_CONTENT_WIDTH_PX + 64,
      width: PDF_CONTENT_WIDTH_PX + 64,
      ignoreElements: (el: Element) =>
        el instanceof HTMLElement && el.classList.contains("no-pdf"),
      onclone: (clonedDoc: Document, clonedEl: HTMLElement) => {
        stripExternalStylesFromClone(clonedDoc);
        walkInlineStyles(element, clonedEl);
        sanitizeCloneInlineColors(clonedEl);
        injectPdfReportStyles(clonedDoc);
        forceAdminPanelPdfLayout(clonedEl);
      },
    },
    jsPDF: { unit: "mm" as const, format: "a4" as const, orientation: "landscape" as const },
    pagebreak: { mode: ["css", "legacy"] as ("css" | "legacy")[] },
  };

  const run = html2pdf().set(opt).from(element).save();

  const timeoutMs = 90_000;
  const timeout = new Promise<never>((_, rej) => {
    setTimeout(
      () => rej(new Error(`Tiempo de espera (${timeoutMs / 1000}s). Prueba con menos filas o recarga.`)),
      timeoutMs,
    );
  });

  try {
    await Promise.race([run, timeout]);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`No se pudo crear el PDF: ${msg}`);
  }
}
