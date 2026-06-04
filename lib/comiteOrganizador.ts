import { soloDigitos } from "@/lib/phoneDigits";

/** Campo en Firestore: miembro del comité organizador (tarifa especial). */
export const REGISTRO_COMITE_ORGANIZADOR = "comiteOrganizador" as const;

/** Importe fijo de inscripción para el comité (EUR). */
export const PRECIO_COMITE_ORGANIZADOR_EUR = 50;

/** Precio guardado en el documento (auditoría / informes). */
export const REGISTRO_PRECIO_INSCRIPCION_EUR = "precioInscripcionEur" as const;

/**
 * Móviles del comité (España, 34 + 9 dígitos).
 * Se reconoce con o sin prefijo +34, espacios o guiones.
 */
const COMITE_MOVILES_CANONICOS = new Set([
  "34673238124",
  "34691671650",
  "34695128420",
  "34659508089",
  "34617849123",
  "34667942615",
  "34672111589",
  "34692255276",
  "34611128322",
  "34605767900",
  "34622270613",
  "34613995489",
  "34608441833",
  "34660007014",
]);

/** Normaliza a 34 + 9 dígitos si es un móvil español válido. */
export function movilEspanaCanonico(telefono: string): string | null {
  let d = soloDigitos(telefono);
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 9 && /^[67]\d{8}$/.test(d)) return `34${d}`;
  if (d.startsWith("34") && d.length >= 11) {
    const nueve = d.slice(-9);
    if (/^[67]\d{8}$/.test(nueve)) return `34${nueve}`;
  }
  if (d.length > 9) {
    const nueve = d.slice(-9);
    if (/^[67]\d{8}$/.test(nueve)) return `34${nueve}`;
  }
  return null;
}

export function esMiembroComiteOrganizador(telefono: string): boolean {
  const canon = movilEspanaCanonico(telefono);
  if (!canon) return false;
  return COMITE_MOVILES_CANONICOS.has(canon);
}

export function parseComiteOrganizador(raw: unknown): boolean {
  return raw === true;
}

/** Campos a guardar en Firestore cuando el teléfono es del comité. */
export function datosComiteEnFirestore(): {
  [REGISTRO_COMITE_ORGANIZADOR]: true;
  [REGISTRO_PRECIO_INSCRIPCION_EUR]: number;
} {
  return {
    [REGISTRO_COMITE_ORGANIZADOR]: true,
    [REGISTRO_PRECIO_INSCRIPCION_EUR]: PRECIO_COMITE_ORGANIZADOR_EUR,
  };
}
