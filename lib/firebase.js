import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

if (typeof window !== "undefined") {
  const ok =
    firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId;
  if (!ok) {
    console.error(
      "[Firebase] Revisa .env.local: faltan NEXT_PUBLIC_FIREBASE_* (apiKey, projectId, appId, etc.)",
    );
  }
}

const app = initializeApp(firebaseConfig);

// Base de datos (Firestore)
export const db = getFirestore(app);

// Archivos (comprobantes, PDFs, imágenes)
// Bucket explícito evita subidas colgadas si el valor por defecto no coincide con el proyecto.
const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
export const storage =
  typeof bucket === "string" && bucket.length > 0
    ? getStorage(app, `gs://${bucket}`)
    : getStorage(app);