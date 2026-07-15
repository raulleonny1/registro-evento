/**
 * Frecuencia de recordatorios de depósito según proximidad al Encuentro
 * (inicio: 25 de septiembre de 2026).
 *
 * - Más de 30 días → 1 correo / semana
 * - 30–14 días → 1 correo / semana
 * - 14–7 días → 2 correos / semana
 * - Últimos 7 días → 2–3 correos en la semana (no diarios)
 * - Últimas 24 h → 1 último recordatorio
 */

/** Inicio del Encuentro (medianoche Europa/Madrid ≈ UTC+2 en septiembre). */
export const EVENTO_INICIO_UTC = Date.UTC(2026, 8, 25, 0, 0, 0); // 25 sep 2026 00:00 UTC

const MS_DIA = 24 * 60 * 60 * 1000;
const MS_HORA = 60 * 60 * 1000;

export type FaseRecordatorio =
  | "lejos"
  | "mensual"
  | "quincena"
  | "ultima_semana"
  | "ultimas_24h"
  | "pasado";

export function diasHastaEvento(now = Date.now()): number {
  return (EVENTO_INICIO_UTC - now) / MS_DIA;
}

export function horasHastaEvento(now = Date.now()): number {
  return (EVENTO_INICIO_UTC - now) / MS_HORA;
}

export function faseRecordatorio(now = Date.now()): FaseRecordatorio {
  const dias = diasHastaEvento(now);
  if (dias < 0) return "pasado";
  if (dias <= 1) return "ultimas_24h";
  if (dias <= 7) return "ultima_semana";
  if (dias <= 14) return "quincena";
  if (dias <= 30) return "mensual";
  return "lejos";
}

/**
 * Intervalo mínimo entre recordatorios (ms) según la fase.
 */
export function intervaloMinimoMs(fase: FaseRecordatorio): number {
  switch (fase) {
    case "lejos":
    case "mensual":
      return 7 * MS_DIA; // 1 / semana
    case "quincena":
      return 3 * MS_DIA; // ~2 / semana
    case "ultima_semana":
      return 2.5 * MS_DIA; // 2–3 en la semana, no todos los días
    case "ultimas_24h":
      return 20 * MS_HORA; // un último aviso (evita doble si el cron corre 2 veces)
    case "pasado":
      return Number.POSITIVE_INFINITY;
  }
}

export function etiquetaFase(fase: FaseRecordatorio): string {
  switch (fase) {
    case "lejos":
    case "mensual":
      return "1 correo por semana";
    case "quincena":
      return "hasta 2 correos por semana";
    case "ultima_semana":
      return "2 a 3 correos esta semana (no diarios)";
    case "ultimas_24h":
      return "último recordatorio antes del Encuentro";
    case "pasado":
      return "evento iniciado";
  }
}

/** ¿Debemos enviar ahora, dado el último envío? */
export function debeEnviarRecordatorio(
  ultimoEnvioMs: number | null,
  now = Date.now(),
): { enviar: boolean; fase: FaseRecordatorio; motivo: string } {
  const fase = faseRecordatorio(now);
  if (fase === "pasado") {
    return { enviar: false, fase, motivo: "evento_ya_inicio" };
  }

  const min = intervaloMinimoMs(fase);
  if (ultimoEnvioMs == null || !Number.isFinite(ultimoEnvioMs)) {
    return { enviar: true, fase, motivo: "primer_recordatorio" };
  }

  const elapsed = now - ultimoEnvioMs;
  if (elapsed >= min) {
    return { enviar: true, fase, motivo: "intervalo_cumplido" };
  }
  return {
    enviar: false,
    fase,
    motivo: `esperar_${Math.ceil((min - elapsed) / MS_HORA)}h`,
  };
}

export function parseTimestampFirestore(raw: unknown): number | null {
  if (!raw) return null;
  if (typeof raw === "object" && raw !== null && "toMillis" in raw) {
    const fn = (raw as { toMillis?: () => number }).toMillis;
    if (typeof fn === "function") {
      const n = fn.call(raw);
      return Number.isFinite(n) ? n : null;
    }
  }
  if (typeof raw === "object" && raw !== null && "seconds" in raw) {
    const s = Number((raw as { seconds: unknown }).seconds);
    if (Number.isFinite(s)) return s * 1000;
  }
  if (raw instanceof Date) return raw.getTime();
  return null;
}
