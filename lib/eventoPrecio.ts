export const MODALIDADES_REGISTRO = {
  completo_25_27: "completo_25_27",
  sab_dom_26_27: "sab_dom_26_27",
} as const;

export type ModalidadRegistro =
  (typeof MODALIDADES_REGISTRO)[keyof typeof MODALIDADES_REGISTRO];

/** Compatibilidad con registros antiguos sin modalidad guardada. */
export const MODALIDAD_REGISTRO_DEFAULT: ModalidadRegistro = MODALIDADES_REGISTRO.completo_25_27;

export const MINIMO_INSCRIPCION_EUR = 35;

/** Precio legacy por defecto (equivale a la modalidad completa). */
export const COSTO_EVENTO_EUR = 70;

export function normalizeModalidadRegistro(raw: unknown): ModalidadRegistro {
  if (raw === MODALIDADES_REGISTRO.completo_25_27 || raw === MODALIDADES_REGISTRO.sab_dom_26_27) {
    return raw;
  }
  return MODALIDAD_REGISTRO_DEFAULT;
}

export function costoEventoEuros(modalidad?: unknown): number {
  const key = normalizeModalidadRegistro(modalidad);
  if (key === MODALIDADES_REGISTRO.sab_dom_26_27) return 50;
  return COSTO_EVENTO_EUR;
}

export function etiquetaModalidadRegistro(modalidad?: unknown): string {
  const key = normalizeModalidadRegistro(modalidad);
  if (key === MODALIDADES_REGISTRO.sab_dom_26_27) {
    return "Sábado 26 y domingo 27";
  }
  return "Del 25 al 27";
}

export function clampDepositado(n: number, modalidad?: unknown): number {
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(costoEventoEuros(modalidad), Math.round(n * 100) / 100);
}

/** Cuánto falta por pagar respecto al total del evento. */
export function pendienteEuros(depositado: number | undefined, modalidad?: unknown): number {
  const d = clampDepositado(depositado ?? 0, modalidad);
  return Math.max(0, Math.round((costoEventoEuros(modalidad) - d) * 100) / 100);
}

export function formatEuros(n: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

/** Acepta "35,50" o "35.5". */
export function parseMontoEuros(raw: string): number | null {
  const t = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n * 100) / 100;
}
