"use client";

import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";

const ACCEPT = "image/*,.pdf,application/pdf";

export function SubirComprobante({ id }: { id: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Selecciona un archivo");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const safeName = `${Date.now()}.${ext}`;
      const path = `comprobantes/${id}/${safeName}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file, { contentType: file.type || undefined });
      const comprobanteURL = await getDownloadURL(storageRef);
      await updateDoc(doc(db, "registros", id), {
        comprobanteURL,
        estado: "revision",
      });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="rounded border border-green-600 bg-green-50 p-4 text-green-900 dark:bg-green-950 dark:text-green-100">
        Comprobante enviado correctamente. Puedes volver al{" "}
        <a href={`/estado/${id}`} className="underline">
          estado del registro
        </a>
        .
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        Archivo (imagen o PDF)
        <input
          type="file"
          accept={ACCEPT}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm"
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading || !file}
        className="rounded bg-zinc-900 px-4 py-2 text-sm text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {loading ? "Subiendo…" : "Enviar comprobante"}
      </button>
    </form>
  );
}
