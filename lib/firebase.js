import { getApps, initializeApp } from "firebase/app";
import {
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
} from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getApp() {
  if (getApps().length > 0) return getApps()[0];
  return initializeApp(firebaseConfig);
}

let dbInstance = null;
let storageInstance = null;

/**
 * Firestore en el navegador con caché en memoria.
 * Safari/iOS suele colgar con la persistencia IndexedDB por defecto (registro, duplicados, etc.).
 */
export function getDb() {
  if (typeof window === "undefined") {
    throw new Error("Firestore solo está disponible en el navegador.");
  }
  if (dbInstance) return dbInstance;

  if (typeof window !== "undefined") {
    const ok =
      firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId;
    if (!ok) {
      console.error(
        "[Firebase] Revisa .env.local: faltan NEXT_PUBLIC_FIREBASE_* (apiKey, projectId, appId, etc.)",
      );
    }
  }

  const app = getApp();
  try {
    dbInstance = initializeFirestore(app, {
      localCache: memoryLocalCache(),
    });
  } catch {
    dbInstance = getFirestore(app);
  }
  return dbInstance;
}

/** Instancia para componentes cliente (memoria en iOS/Android). */
export const db = typeof window !== "undefined" ? getDb() : null;

export function getStorageInstance() {
  if (typeof window === "undefined") {
    throw new Error("Storage solo está disponible en el navegador.");
  }
  if (storageInstance) return storageInstance;
  const app = getApp();
  const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  storageInstance =
    typeof bucket === "string" && bucket.length > 0
      ? getStorage(app, `gs://${bucket}`)
      : getStorage(app);
  return storageInstance;
}

/** @deprecated Prefer getStorageInstance() */
export const storage =
  typeof window !== "undefined" ? getStorageInstance() : null;
