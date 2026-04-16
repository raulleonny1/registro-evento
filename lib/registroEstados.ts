/** Estados oficiales del ciclo de registro (Firestore `estado`). */
export const REGISTRO_ESTADOS = {
  pendiente_pago: "pendiente_pago",
  revision: "revision",
  aprobado: "aprobado",
  rechazado: "rechazado",
} as const;

export type RegistroEstado = (typeof REGISTRO_ESTADOS)[keyof typeof REGISTRO_ESTADOS];

/** Compatibilidad con registros antiguos con `pendiente`. */
export function normalizeEstado(raw: string | undefined): string {
  if (!raw) return "";
  if (raw === "pendiente") return REGISTRO_ESTADOS.pendiente_pago;
  return raw;
}

export function esPendientePago(estado: string | undefined): boolean {
  return normalizeEstado(estado) === REGISTRO_ESTADOS.pendiente_pago;
}

export function etiquetaEstado(estado: string | undefined): string {
  const e = normalizeEstado(estado);
  switch (e) {
    case REGISTRO_ESTADOS.pendiente_pago:
      return "Pendiente de pago";
    case REGISTRO_ESTADOS.revision:
      return "En revisión";
    case REGISTRO_ESTADOS.aprobado:
      return "Aprobado";
    case REGISTRO_ESTADOS.rechazado:
      return "Rechazado";
    default:
      return e || "—";
  }
}
