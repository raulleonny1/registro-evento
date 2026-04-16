import { FirebaseError } from "firebase/app";

/** Mensaje legible para UI a partir de errores de Firebase. */
export function formatFirebaseError(err: unknown): string {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case "permission-denied":
        return "Permiso denegado: revisa las reglas de Firestore (colección «registros» debe permitir create/read/update).";
      case "unavailable":
      case "deadline-exceeded":
        return "Servicio temporalmente no disponible o lento. Intenta de nuevo en unos segundos.";
      case "failed-precondition":
        return "Error de configuración en Firebase. Comprueba que Firestore esté creado en el proyecto.";
      default:
        return `${err.message} (código: ${err.code})`;
    }
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "Error desconocido al conectar con Firebase.";
}
