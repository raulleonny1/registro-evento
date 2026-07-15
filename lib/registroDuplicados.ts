import { collection, getDocs, limit, query, where } from "firebase/firestore";
import { getDb } from "@/lib/firebase";
import { movilEspanaCanonico } from "@/lib/comiteOrganizador";
import { soloDigitos } from "@/lib/phoneDigits";

export type MotivoDuplicado = "email" | "whatsapp";

export type ResultadoDuplicado =
  | { duplicado: false }
  | { duplicado: true; motivo: MotivoDuplicado; registroId?: string };

export function normalizarEmailRegistro(email: string): string {
  return email.trim().toLowerCase();
}

/** Misma normalización que al guardar (34 + 9 dígitos si es móvil ES). */
export function normalizarWhatsappDigitos(whatsapp: string): string {
  return movilEspanaCanonico(whatsapp) ?? soloDigitos(whatsapp);
}

export function mensajeRegistroDuplicado(r: ResultadoDuplicado): string {
  if (!r.duplicado) return "";
  if (r.motivo === "email") {
    return "Ya hay una inscripción con este correo electrónico. Entra en «Continuar registro» para localizar tu ficha o subir el comprobante.";
  }
  return "Ya hay una inscripción con este número de móvil. Entra en «Continuar registro» (últimos 4 dígitos del teléfono) para localizar tu ficha.";
}

async function existePorCampo(
  campo: "email" | "whatsappDigitos",
  valor: string,
): Promise<string | null> {
  const snap = await getDocs(
    query(collection(getDb(), "registros"), where(campo, "==", valor), limit(1)),
  );
  if (snap.empty) return null;
  return snap.docs[0].id;
}

/** Comprueba duplicados en Firestore (cliente). */
export async function verificarRegistroDuplicado(
  email: string,
  whatsapp: string,
): Promise<ResultadoDuplicado> {
  const emailNorm = normalizarEmailRegistro(email);
  const digitos = normalizarWhatsappDigitos(whatsapp);
  const digitosAlt = soloDigitos(whatsapp);

  const idEmail = await existePorCampo("email", emailNorm);
  if (idEmail) return { duplicado: true, motivo: "email", registroId: idEmail };

  const idsDigitos = new Set<string>();
  for (const d of [digitos, digitosAlt].filter(Boolean)) {
    const id = await existePorCampo("whatsappDigitos", d);
    if (id) idsDigitos.add(id);
  }
  if (idsDigitos.size > 0) {
    return { duplicado: true, motivo: "whatsapp", registroId: [...idsDigitos][0] };
  }

  return { duplicado: false };
}
