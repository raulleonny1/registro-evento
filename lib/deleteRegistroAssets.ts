import { deleteObject, listAll, ref } from "firebase/storage";
import { storage } from "@/lib/firebase";

/**
 * Borra archivos en Storage para un registro.
 * Si hay `comprobanteURL`, intenta borrar ese objeto con `ref(storage, url)` (Firebase 12+).
 * Luego intenta listar `comprobantes/{registroId}/` por si quedan archivos extra.
 */
export async function deleteComprobanteFiles(
  registroId: string,
  comprobanteURL?: string,
): Promise<void> {
  if (comprobanteURL) {
    try {
      const r = ref(storage, comprobanteURL);
      await deleteObject(r);
    } catch {
      /* URL inválida, otro bucket o archivo ya borrado */
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
