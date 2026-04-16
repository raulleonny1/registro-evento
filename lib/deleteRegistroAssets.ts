import { deleteObject, listAll, ref } from "firebase/storage";
import { storage } from "@/lib/firebase";

/** Borra archivos en Storage bajo comprobantes/{registroId}/ (si existen). */
export async function deleteComprobanteFiles(registroId: string): Promise<void> {
  const folderRef = ref(storage, `comprobantes/${registroId}`);
  try {
    const { items } = await listAll(folderRef);
    await Promise.all(items.map((item) => deleteObject(item)));
  } catch {
    /* sin carpeta o sin archivos */
  }
}
