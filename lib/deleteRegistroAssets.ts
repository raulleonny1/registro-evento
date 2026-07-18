import { deleteObject, listAll, ref } from "firebase/storage";
import { getStorageInstance } from "@/lib/firebase";

/**
 * Borra archivos en Firebase Storage para un registro.
 * Si hay `comprobanteURL` de Firebase, intenta borrar ese objeto.
 * Luego lista `comprobantes/{registroId}/` por si quedan archivos extra.
 */
export async function deleteComprobanteFiles(
  registroId: string,
  comprobanteURL?: string,
): Promise<void> {
  const storage = getStorageInstance();

  if (
    comprobanteURL?.includes("firebasestorage.googleapis.com") ||
    comprobanteURL?.includes("firebasestorage.app")
  ) {
    try {
      const r = ref(storage, comprobanteURL);
      await deleteObject(r);
    } catch {
      /* URL inválida o archivo ya borrado */
    }
  }

  const folderRef = ref(storage, `comprobantes/${registroId}`);
  try {
    const { items } = await listAll(folderRef);
    await Promise.all(items.map((item) => deleteObject(item)));
  } catch {
    /* sin carpeta, sin permiso list, o sin archivos */
  }
}
