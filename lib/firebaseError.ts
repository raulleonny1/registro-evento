import { FirebaseError } from "firebase/app";
import { enrichRegistroError } from "@/lib/firebaseEnv";

/** Mensaje legible para UI a partir de errores de Firebase. */
export function formatFirebaseError(err: unknown): string {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case "permission-denied":
      case "storage/unauthorized":
        return "Permiso denegado: publica las reglas de Storage (carpeta «comprobantes») y Firestore (colección «registros») en Firebase Console.";
      case "storage/canceled":
        return "La subida se canceló. Inténtalo de nuevo.";
      case "storage/retry-limit-exceeded":
      case "storage/unknown":
        return "No se pudo subir el archivo a Storage. Revisa la conexión e inténtalo de nuevo.";
      case "unavailable":
      case "deadline-exceeded":
        return "Servicio temporalmente no disponible o lento. Intenta de nuevo en unos segundos.";
      case "failed-precondition":
        return "Error de configuración en Firebase. Comprueba que Firestore y Storage estén creados en el proyecto.";
      default:
        return `${err.message} (código: ${err.code})`;
    }
  }
  if (err instanceof Error) {
    return enrichRegistroError(err.message);
  }
  return "Error desconocido al conectar con Firebase.";
}
