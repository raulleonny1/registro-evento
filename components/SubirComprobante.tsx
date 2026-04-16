"use client";

import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { formatFirebaseError } from "@/lib/firebaseError";
import { REGISTRO_ESTADOS } from "@/lib/registroEstados";

const ACCEPT = "image/*,.pdf,application/pdf";

type Props = {
  id: string;
  /** Se llama tras guardar URL y estado en Firestore (p. ej. para refrescar la vista padre). */
  onUploaded?: () => void;
};

export function SubirComprobante({ id, onUploaded }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function subirArchivo(f: File) {
    setError(null);
    setLoading(true);
    try {
      const ext = f.name.split(".").pop() || "bin";
      const safeName = `${Date.now()}.${ext}`;
      const path = `comprobantes/${id}/${safeName}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, f, { contentType: f.type || undefined });
      const comprobanteURL = await getDownloadURL(storageRef);
      await updateDoc(doc(db, "registros", id), {
        comprobanteURL,
        estado: REGISTRO_ESTADOS.revision,
      });
      setSuccess(true);
      onUploaded?.();
    } catch (err) {
      setError(formatFirebaseError(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Selecciona un archivo o toma una foto.");
      return;
    }
    await subirArchivo(file);
  }

  function onPickFile(next: File | null) {
    setFile(next);
    setError(null);
  }

  if (success) {
    return (
      <div className="rounded-xl border border-emerald-500/40 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-950 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-100">
        Comprobante enviado correctamente. Tu pago pasará a revisión.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Elegir archivo (imagen o PDF)
          <input
            type="file"
            accept={ACCEPT}
            onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
            className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-200 file:px-3 file:py-2 file:text-sm file:font-medium dark:file:bg-zinc-700 dark:file:text-zinc-100"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Tomar foto con la cámara
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
            className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-rose-100 file:px-3 file:py-2 file:text-sm file:font-medium dark:file:bg-rose-900/50 dark:file:text-rose-100"
          />
        </label>
      </div>
      {file && (
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          Archivo seleccionado: <span className="font-medium">{file.name}</span>
        </p>
      )}
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/50 dark:text-red-100">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading || !file}
        className="touch-manipulation min-h-[48px] rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {loading ? "Subiendo…" : "Enviar comprobante"}
      </button>
    </form>
  );
}
