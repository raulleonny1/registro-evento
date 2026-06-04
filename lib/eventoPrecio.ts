export const MODALIDADES_REGISTRO = {
  completo_25_27: "completo_25_27",
  sab_dom_26_27: "sab_dom_26_27",
} as const;

export type ModalidadRegistro =
  (typeof MODALIDADES_REGISTRO)[keyof typeof MODALIDADES_REGISTRO];

/** Compatibilidad con registros antiguos sin modalidad guardada. */
export const MODALIDAD_REGISTRO_DEFAULT: ModalidadRegistro = MODALIDADES_REGISTRO.completo_25_27;

import {
  PRECIO_COMITE_ORGANIZADOR_EUR,
  parseComiteOrganizador,
  REGISTRO_PRECIO_INSCRIPCION_EUR,
} from "@/lib/comiteOrganizador";

export const MINIMO_INSCRIPCION_EUR = 35;

/** Datos de Firestore necesarios para calcular el importe de inscripción. */
export type DatosTarifaRegistro = {
  modalidadRegistro?: unknown;
  comiteOrganizador?: unknown;
  [REGISTRO_PRECIO_INSCRIPCION_EUR]?: unknown;
};

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

function normalizeTarifaInput(
  input: DatosTarifaRegistro | ModalidadRegistro | unknown,
): DatosTarifaRegistro {
  if (
    input === MODALIDADES_REGISTRO.completo_25_27 ||
    input === MODALIDADES_REGISTRO.sab_dom_26_27
  ) {
    return { modalidadRegistro: input };
  }
  if (typeof input === "object" && input !== null) {
    return input as DatosTarifaRegistro;
  }
  return { modalidadRegistro: input };
}

/** Importe total de inscripción (comité 50 €; si no, según modalidad). */
export function costoInscripcionEuros(
  input: DatosTarifaRegistro | ModalidadRegistro | unknown,
): number {
  const data = normalizeTarifaInput(input);
  if (parseComiteOrganizador(data.comiteOrganizador)) {
    const p = data[REGISTRO_PRECIO_INSCRIPCION_EUR];
    if (typeof p === "number" && Number.isFinite(p) && p > 0) return p;
    return PRECIO_COMITE_ORGANIZADOR_EUR;
  }
  return costoEventoEuros(data.modalidadRegistro);
}

export function etiquetaTarifaInscripcion(
  input: DatosTarifaRegistro | ModalidadRegistro | unknown,
): string {
  const data = normalizeTarifaInput(input);
  if (parseComiteOrganizador(data.comiteOrganizador)) {
    return `comité · ${formatEuros(costoInscripcionEuros(data))}`;
  }
  return etiquetaModalidadRegistro(data.modalidadRegistro);
}

/** Primer depósito mínimo: comité paga el importe completo (50 €); resto, reserva de 35 €. */
export function minimoPrimerDepositoEuros(
  tarifa: DatosTarifaRegistro | ModalidadRegistro | unknown,
): number {
  const data = normalizeTarifaInput(tarifa);
  if (parseComiteOrganizador(data.comiteOrganizador)) {
    return costoInscripcionEuros(data);
  }
  return MINIMO_INSCRIPCION_EUR;
}

export function etiquetaModalidadRegistro(modalidad?: unknown): string {
  const key = normalizeModalidadRegistro(modalidad);
  if (key === MODALIDADES_REGISTRO.sab_dom_26_27) {
    return "Sábado 26 y domingo 27";
  }
  return "Del 25 al 27";
}

export function clampDepositado(
  n: number,
  tarifa?: DatosTarifaRegistro | ModalidadRegistro | unknown,
): number {
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(costoInscripcionEuros(tarifa ?? {}), Math.round(n * 100) / 100);
}

/** Cuánto falta por pagar respecto al total de inscripción. */
export function pendienteEuros(
  depositado: number | undefined,
  tarifa?: DatosTarifaRegistro | ModalidadRegistro | unknown,
): number {
  const d = clampDepositado(depositado ?? 0, tarifa);
  return Math.max(0, Math.round((costoInscripcionEuros(tarifa ?? {}) - d) * 100) / 100);
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
