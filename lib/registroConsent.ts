/** Nombre del campo en Firestore (único origen de verdad). */
export const REGISTRO_ACEPTO_DATOS_EVENTO = "aceptoDatosEvento" as const;

/** Clave en sessionStorage al pasar la pantalla de aviso RGPD (antes del formulario). */
export const SESSION_RGPD_ACEPTO = "iere_rgpd_acepto_v1" as const;

/**
 * Interpreta el valor guardado en Firestore para el consentimiento RGPD.
 * Cubre boolean, números y cadenas por si el documento se editó a mano en consola.
 */
export function parseAceptoDatosEvento(raw: unknown): boolean | null {
  if (raw === true || raw === 1) return true;
  if (raw === false || raw === 0) return false;
  if (typeof raw === "string") {
    const s = raw.trim().toLowerCase();
    if (s === "true" || s === "1" || s === "si" || s === "sí" || s === "yes") return true;
    if (s === "false" || s === "0" || s === "no") return false;
  }
  return null;
}
