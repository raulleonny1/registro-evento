"use client";

import html2pdf from "html2pdf.js";

/**
 * Propiedades copiadas del DOM real al clon (valores ya resueltos a rgb/rgba en el navegador).
 * Evita que html2canvas vuelva a parsear CSS con funciones modernas (p. ej. lab() de Tailwind v4).
 */
const CLONE_STYLE_PROPS = [
  "color",
  "backgroundColor",
  "background",
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

function applyComputedStyles(orig: Element, clone: Element) {
  if (!(orig instanceof HTMLElement) || !(clone instanceof HTMLElement)) return;
  const cs = window.getComputedStyle(orig);
  for (const prop of CLONE_STYLE_PROPS) {
    const v = cs.getPropertyValue(prop);
    if (v) clone.style.setProperty(prop, v);
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
      onclone: (clonedDoc: Document, clonedEl: HTMLElement) => {
        stripExternalStylesFromClone(clonedDoc);
        walkInlineStyles(element, clonedEl);
      },
    },
    jsPDF: { unit: "mm" as const, format: "a4" as const, orientation: "portrait" as const },
    pagebreak: { mode: ["css", "legacy"] as ("css" | "legacy")[] },
  };

  const run = html2pdf().set(opt).from(element).save();

  const timeoutMs = 90_000;
  const timeout = new Promise<never>((_, rej) => {
    setTimeout(() => rej(new Error(`Tiempo de espera (${timeoutMs / 1000}s). Prueba con menos filas o recarga.`)), timeoutMs);
  });

  try {
    await Promise.race([run, timeout]);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`No se pudo crear el PDF: ${msg}`);
  }
}
