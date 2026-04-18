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

  // Sombras y filtros pueden mezclar varios colores; html2canvas falla al parsearlos.
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

/**
 * Último paso: cualquier estilo inline residual con lab()/oklch() en el clon.
 */
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
 * Genera un PDF a partir de un nodo HTML (informes de administración).
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
        sanitizeCloneInlineColors(clonedEl);
      },
    },
    jsPDF: { unit: "mm" as const, format: "a4" as const, orientation: "portrait" as const },
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
