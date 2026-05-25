import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getFirebaseConfigError } from "@/lib/firebaseEnv";
import { REGISTRO_ACEPTO_DATOS_EVENTO } from "@/lib/registroConsent";
import { REGISTRO_ESTADOS } from "@/lib/registroEstados";
import type { ModalidadRegistro } from "@/lib/eventoPrecio";

export type RegistroSubmitPayload = {
  nombre: string;
  email: string;
  whatsapp: string;
  whatsappDigitos: string;
  whatsappUltimos4: string;
  parroquia: {
    area: string;
    parroquia: string;
    iglesia: string;
    manual?: boolean;
  };
  modalidadRegistro: ModalidadRegistro;
};

const SUBMIT_TIMEOUT_MS = 35_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      reject(
        new Error(
          `${label} superó ${ms / 1000}s. Comprueba conexión y reglas de Firestore (colección registros).`,
        ),
      );
    }, ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

async function guardarPorCliente(payload: RegistroSubmitPayload): Promise<string> {
  const configErr = getFirebaseConfigError();
  if (configErr) throw new Error(configErr);

  const ref = await withTimeout(
    addDoc(collection(db, "registros"), {
      nombre: payload.nombre,
      email: payload.email,
      whatsapp: payload.whatsapp,
      whatsappDigitos: payload.whatsappDigitos,
      whatsappUltimos4: payload.whatsappUltimos4,
      parroquia: payload.parroquia,
      modalidadRegistro: payload.modalidadRegistro,
      estado: REGISTRO_ESTADOS.pendiente_pago,
      fecha: serverTimestamp(),
      [REGISTRO_ACEPTO_DATOS_EVENTO]: true,
      aceptoDatosEventoEn: serverTimestamp(),
    }),
    SUBMIT_TIMEOUT_MS,
    "El registro",
  );
  return ref.id;
}

/**
 * Guarda inscripción: API en servidor (recomendado en Vercel); si no hay cuenta de servicio, cliente.
 */
export async function guardarRegistro(payload: RegistroSubmitPayload): Promise<string> {
  const res = await withTimeout(
    fetch("/api/registro", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
    SUBMIT_TIMEOUT_MS,
    "El registro",
  );

  if (res.status === 503) {
    return guardarPorCliente(payload);
  }

  const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
  if (!res.ok) {
    throw new Error(data.error || `Error del servidor (${res.status}).`);
  }
  if (!data.id) {
    throw new Error("El servidor no devolvió ID de registro.");
  }
  return data.id;
}
