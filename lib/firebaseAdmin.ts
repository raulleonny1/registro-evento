import { getApps, initializeApp, cert, type App, type ServiceAccount } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let app: App | null = null;

function parseServiceAccount(): Record<string, unknown> {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_JSON no configurado. Firebase Console → Cuentas de servicio → Generar clave privada; pega el JSON en Vercel (una sola línea).",
    );
  }
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON no es JSON válido.");
  }
}

export function getAdminFirestore(): Firestore {
  if (getApps().length > 0) {
    return getFirestore();
  }
  const sa = parseServiceAccount();
  app = initializeApp({
    credential: cert(sa as ServiceAccount),
  });
  return getFirestore(app);
}

export function isFirebaseAdminConfigured(): boolean {
  return Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim());
}
