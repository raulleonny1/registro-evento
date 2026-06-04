import type { Firestore } from "firebase-admin/firestore";
import {
  mensajeRegistroDuplicado,
  normalizarEmailRegistro,
  normalizarWhatsappDigitos,
  type MotivoDuplicado,
  type ResultadoDuplicado,
} from "@/lib/registroDuplicados";
import { soloDigitos } from "@/lib/phoneDigits";

async function primerIdPorCampo(
  db: Firestore,
  campo: "email" | "whatsappDigitos",
  valor: string,
): Promise<string | null> {
  const snap = await db
    .collection("registros")
    .where(campo, "==", valor)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return snap.docs[0].id;
}

export async function verificarRegistroDuplicadoAdmin(
  db: Firestore,
  email: string,
  whatsapp: string,
  whatsappDigitosEnviado?: string,
): Promise<ResultadoDuplicado> {
  const emailNorm = normalizarEmailRegistro(email);
  const digitos = normalizarWhatsappDigitos(whatsapp);
  const digitosAlt = soloDigitos(whatsapp);
  const candidatos = new Set(
    [whatsappDigitosEnviado?.trim(), digitos, digitosAlt].filter(
      (d): d is string => Boolean(d && d.length >= 4),
    ),
  );

  const idEmail = await primerIdPorCampo(db, "email", emailNorm);
  if (idEmail) return { duplicado: true, motivo: "email", registroId: idEmail };

  for (const d of candidatos) {
    const id = await primerIdPorCampo(db, "whatsappDigitos", d);
    if (id) return { duplicado: true, motivo: "whatsapp", registroId: id };
  }

  return { duplicado: false };
}

export function errorHttpRegistroDuplicado(r: ResultadoDuplicado & { duplicado: true }): string {
  return mensajeRegistroDuplicado(r);
}

export type { MotivoDuplicado };
