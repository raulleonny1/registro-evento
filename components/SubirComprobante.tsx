"use client";

import { useRef, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { formatFirebaseError } from "@/lib/firebaseError";
import { REGISTRO_ESTADOS } from "@/lib/registroEstados";

const ACCEPT = "image/*,.pdf,application/pdf";
const UPLOAD_TIMEOUT_MS = 180_000;
/** Evita subidas enormes que suelen fallar en móvil (MB). */
const MAX_BYTES = 15 * 1024 * 1024;

type Props = {
  id: string;
  /** Se llama tras guardar URL y estado en Firestore (p. ej. para refrescar la vista padre). */
  onUploaded?: () => void;
};

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      reject(
        new Error(
          `${label} superó ${Math.round(ms / 1000)} s. Revisa la conexión, prueba Wi‑Fi, o sube un PDF o una foto más pequeña.`,
        ),
      );
    }, ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

/** Cámara a veces devuelve nombre vacío o genérico; inferimos extensión del tipo MIME. */
function inferExt(file: File): string {
  const fromName = file.name?.split(".").pop();
  if (fromName && fromName.length <= 8 && /^[a-z0-9]+$/i.test(fromName)) {
    return fromName.toLowerCase();
  }
  const t = (file.type || "").toLowerCase();
  if (t.includes("jpeg") || t === "image/jpg") return "jpg";
  if (t === "image/png") return "png";
  if (t === "image/webp") return "webp";
  if (t === "image/heic" || t === "image/heif") return "heic";
  if (t === "application/pdf") return "pdf";
  return "jpg";
}

export function SubirComprobante({ id, onUploaded }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  async function subirArchivo(f: File) {
    setError(null);
    if (!f.size) {
      setError(
        "No se pudo leer el archivo (0 bytes). Prueba tomar la foto de nuevo o elegir archivo desde la galería.",
      );
      return;
    }
    if (f.size > MAX_BYTES) {
      setError(
        `El archivo es demasiado grande (máx. ${Math.round(MAX_BYTES / (1024 * 1024))} MB). Prueba con otra foto o un PDF.`,
      );
      return;
    }

    setLoading(true);
    try {
      const ext = inferExt(f);
      const safeName = `${Date.now()}.${ext}`;
      const path = `comprobantes/${id}/${safeName}`;
      const storageRef = ref(storage, path);
      const contentType =
        f.type && f.type.length > 0 ? f.type : "application/octet-stream";

      await withTimeout(
        uploadBytes(storageRef, f, { contentType }),
        UPLOAD_TIMEOUT_MS,
        "La subida a Storage",
      );
      const comprobanteURL = await withTimeout(
        getDownloadURL(storageRef),
        60_000,
        "Obtener enlace del archivo",
      );
      await updateDoc(doc(db, "registros", id), {
        comprobanteURL,
        estado: REGISTRO_ESTADOS.revision,
      });
      setSuccess(true);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
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
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            disabled={loading}
            onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
            className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-200 file:px-3 file:py-2 file:text-sm file:font-medium dark:file:bg-zinc-700 dark:file:text-zinc-100"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">
          Tomar foto con la cámara
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            disabled={loading}
            onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
            className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-rose-100 file:px-3 file:py-2 file:text-sm file:font-medium dark:file:bg-rose-900/50 dark:file:text-rose-100"
          />
        </label>
      </div>
      {file && (
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          Archivo seleccionado: <span className="font-medium">{file.name || inferExt(file)}</span>{" "}
          ({(file.size / 1024).toFixed(0)} KB)
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
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <span
              className="size-4 animate-spin rounded-full border-2 border-white/30 border-t-white dark:border-zinc-400 dark:border-t-zinc-900"
              aria-hidden
            />
            Subiendo…
          </span>
        ) : (
          "Enviar comprobante"
        )}
      </button>
    </form>
  );
}
