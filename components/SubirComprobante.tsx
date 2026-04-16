"use client";

import { useRef, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { formatFirebaseError } from "@/lib/firebaseError";
import { REGISTRO_ESTADOS } from "@/lib/registroEstados";

const ACCEPT = "image/*,.pdf,application/pdf";
const READ_FILE_TIMEOUT_MS = 120_000;
const UPLOAD_TIMEOUT_MS = 180_000;
const GET_URL_TIMEOUT_MS = 45_000;
const FIRESTORE_TIMEOUT_MS = 30_000;
/** Evita subidas enormes que suelen fallar en móvil (MB). */
const MAX_BYTES = 15 * 1024 * 1024;

type Props = {
  id: string;
  onUploaded?: () => void;
};

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      reject(
        new Error(
          `${label} superó ${Math.round(ms / 1000)} s. Revisa la conexión o prueba con otro archivo o PDF.`,
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

/** Cámara / explorador: inferir extensión si falta nombre o tipo. */
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

function resolveContentType(file: File, ext: string): string {
  if (file.type && file.type.length > 0) return file.type;
  if (ext === "pdf") return "application/pdf";
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  if (ext === "heic" || ext === "heif") return "image/heic";
  return "application/octet-stream";
}

/**
 * Lee el archivo completo a memoria (evita bloqueos al subir `File` desde
 * explorador/OneDrive en algunos navegadores).
 */
async function readFileAsUint8Array(file: File): Promise<Uint8Array> {
  const buf = await file.arrayBuffer();
  return new Uint8Array(buf);
}

type UploadTask = ReturnType<typeof uploadBytesResumable>;

/**
 * Sube con tarea reanudable: cancela al vencer el tiempo; un solo listener para progreso y fin.
 */
function runUploadTask(
  task: UploadTask,
  timeoutMs: number,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      try {
        task.cancel();
      } catch {
        /* */
      }
      reject(
        new Error(
          `La subida superó ${Math.round(timeoutMs / 1000)} s. Prueba Wi‑Fi, un PDF o una foto más pequeña.`,
        ),
      );
    }, timeoutMs);

    task.on(
      "state_changed",
      (snap) => {
        if (snap.totalBytes > 0) {
          onProgress(Math.round((100 * snap.bytesTransferred) / snap.totalBytes));
        }
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
      () => {
        clearTimeout(timer);
        resolve();
      },
    );
  });
}

export function SubirComprobante({ id, onUploaded }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progressPct, setProgressPct] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  async function subirArchivo(f: File) {
    setError(null);
    setProgressPct(null);

    if (!f.size) {
      setError(
        "No se pudo leer el archivo (0 bytes). Prueba otra foto o elige el archivo de nuevo.",
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
      const contentType = resolveContentType(f, ext);

      const bytes = await withTimeout(
        readFileAsUint8Array(f),
        READ_FILE_TIMEOUT_MS,
        "Leer el archivo en el dispositivo",
      );

      const task = uploadBytesResumable(storageRef, bytes, { contentType });
      await runUploadTask(task, UPLOAD_TIMEOUT_MS, (pct) => setProgressPct(pct));

      const comprobanteURL = await withTimeout(
        getDownloadURL(storageRef),
        GET_URL_TIMEOUT_MS,
        "Obtener enlace del archivo",
      );

      await withTimeout(
        updateDoc(doc(db, "registros", id), {
          comprobanteURL,
          estado: REGISTRO_ESTADOS.revision,
        }),
        FIRESTORE_TIMEOUT_MS,
        "Guardar en la base de datos",
      );

      setSuccess(true);
      setFile(null);
      setProgressPct(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
      onUploaded?.();
    } catch (err) {
      setError(formatFirebaseError(err));
      setProgressPct(null);
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
    setProgressPct(null);
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
          Archivo: <span className="font-medium">{file.name || `foto.${inferExt(file)}`}</span> —{" "}
          {(file.size / 1024).toFixed(0)} KB
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
          <span className="inline-flex w-full flex-col items-center gap-1">
            <span className="inline-flex items-center gap-2">
              <span
                className="size-4 shrink-0 animate-spin rounded-full border-2 border-white/30 border-t-white dark:border-zinc-400 dark:border-t-zinc-900"
                aria-hidden
              />
              Subiendo…
              {progressPct != null ? (
                <span className="tabular-nums text-white/90 dark:text-zinc-800">{progressPct}%</span>
              ) : null}
            </span>
            {progressPct != null ? (
              <span className="h-1 w-full max-w-[200px] overflow-hidden rounded-full bg-white/20 dark:bg-zinc-300/40">
                <span
                  className="block h-full bg-white transition-[width] dark:bg-zinc-900"
                  style={{ width: `${progressPct}%` }}
                />
              </span>
            ) : null}
          </span>
        ) : (
          "Enviar comprobante"
        )}
      </button>
    </form>
  );
}
