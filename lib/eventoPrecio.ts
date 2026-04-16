/** Precio fijo de la entrada (EUR). */
export const COSTO_EVENTO_EUR = 70;

export function clampDepositado(n: number): number {
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(COSTO_EVENTO_EUR, Math.round(n * 100) / 100);
}

/** Cuánto falta por pagar respecto al total del evento. */
export function pendienteEuros(depositado: number | undefined): number {
  const d = clampDepositado(depositado ?? 0);
  return Math.max(0, Math.round((COSTO_EVENTO_EUR - d) * 100) / 100);
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
