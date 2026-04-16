import type { Firestore } from "firebase/firestore";

type FirestoreMod = typeof import("firebase/firestore");

let cache: Promise<{ fs: FirestoreMod; db: Firestore }> | null = null;

/** Carga perezosa una sola vez: Firebase + módulo Firestore (mejor tiempo hasta primer dato en admin). */
export function getFirestoreLazy(): Promise<{ fs: FirestoreMod; db: Firestore }> {
  if (!cache) {
    cache = Promise.all([
      import("firebase/firestore"),
      import("@/lib/firebase"),
    ]).then(([fs, { db }]) => ({ fs, db }));
  }
  return cache;
}
