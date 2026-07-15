"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { doc, getDoc, increment, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatFirebaseError } from "@/lib/firebaseError";
import {
  costoInscripcionEuros,
  minimoPrimerDepositoEuros,
  etiquetaTarifaInscripcion,
  formatEuros,
  normalizeModalidadRegistro,
  parseMontoEuros,
  pendienteEuros,
  type DatosTarifaRegistro,
  type ModalidadRegistro,
} from "@/lib/eventoPrecio";
import {
  parseComiteOrganizador,
  REGISTRO_COMITE_ORGANIZADOR,
  REGISTRO_PRECIO_INSCRIPCION_EUR,
} from "@/lib/comiteOrganizador";
import { iosDecimalMoneyInputProps } from "@/lib/iosKeyboardHints";
import { REGISTRO_ESTADOS } from "@/lib/registroEstados";

const ACCEPT = "image/*,.pdf,application/pdf";
const UPLOAD_TIMEOUT_MS = 180_000;
const FIRESTORE_TIMEOUT_MS = 30_000;
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
          `${label} super? ${Math.round(ms / 1000)} s. Revisa la conexi?n o prueba con otro archivo o PDF.`,
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

/** C?mara / explorador: inferir extensi?n si falta nombre. */
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

/**
 * Sube el archivo a Cloudinary v?a API Route (el secreto no sale al navegador).
 * Usa XHR para poder mostrar progreso de subida al servidor.
 */
function uploadToCloudinary(
  file: File,
  registroId: string,
  onProgress: (pct: number) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("registroId", registroId);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload-comprobante");
    xhr.timeout = UPLOAD_TIMEOUT_MS;

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && e.total > 0) {
        onProgress(Math.round((100 * e.loaded) / e.total));
      }
    };

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText) as { url?: string; error?: string };
        if (xhr.status >= 200 && xhr.status < 300 && data.url) {
          resolve(data.url);
          return;
        }
        reject(new Error(data.error || `Error del servidor (${xhr.status})`));
      } catch {
        reject(new Error("Respuesta inv?lida del servidor."));
      }
    };

    xhr.onerror = () => reject(new Error("Error de red al subir."));
    xhr.ontimeout = () => reject(new Error("La subida tard? demasiado (tiempo agotado)."));
    xhr.send(formData);
  });
}

export function SubirComprobante({ id, onUploaded }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [montoStr, setMontoStr] = useState("");
  const [depositadoActual, setDepositadoActual] = useState<number | null>(null);
  const [modalidadRegistro, setModalidadRegistro] = useState<ModalidadRegistro | null>(null);
  const [tarifa, setTarifa] = useState<DatosTarifaRegistro | null>(null);
  const [loading, setLoading] = useState(false);
  const [progressPct, setProgressPct] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const snap = await getDoc(doc(db, "registros", id));
        if (cancelled || !snap.exists()) return;
        const x = snap.data() ?? {};
        const n = Number(x.montoDepositadoEuros ?? 0);
        setDepositadoActual(Number.isFinite(n) ? n : 0);
        setModalidadRegistro(normalizeModalidadRegistro(x.modalidadRegistro));
        setTarifa({
          modalidadRegistro: x.modalidadRegistro,
          comiteOrganizador: x[REGISTRO_COMITE_ORGANIZADOR],
          [REGISTRO_PRECIO_INSCRIPCION_EUR]: x[REGISTRO_PRECIO_INSCRIPCION_EUR],
        });
      } catch {
        if (!cancelled) setDepositadoActual(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

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
        `El archivo es demasiado grande (m?x. ${Math.round(MAX_BYTES / (1024 * 1024))} MB). Prueba con otra foto o un PDF.`,
      );
      return;
    }

    const monto = parseMontoEuros(montoStr);
    if (monto == null) {
      setError("Indica cu?nto has depositado en este comprobante (ej. 35 o 35,50).");
      return;
    }

    let snapPre: Awaited<ReturnType<typeof getDoc>>;
    try {
      snapPre = await getDoc(doc(db, "registros", id));
    } catch {
      setError("No se pudo leer tu registro. Revisa la conexi?n.");
      return;
    }
    const pre = (snapPre.data() ?? {}) as Record<string, unknown>;
    const prev = Number(pre.montoDepositadoEuros ?? 0);
    const prevOk = Number.isFinite(prev) ? prev : 0;
    const modalidad = normalizeModalidadRegistro(pre.modalidadRegistro);
    const tarifaPre: DatosTarifaRegistro = {
      modalidadRegistro: pre.modalidadRegistro,
      comiteOrganizador: pre[REGISTRO_COMITE_ORGANIZADOR],
      [REGISTRO_PRECIO_INSCRIPCION_EUR]: pre[REGISTRO_PRECIO_INSCRIPCION_EUR],
    };
    const pendiente = pendienteEuros(prevOk, tarifaPre);
    const minimoPrimero = minimoPrimerDepositoEuros(tarifaPre);
    if (prevOk < 0.01 && monto + 0.001 < minimoPrimero) {
      setError(`El primer dep?sito debe ser al menos ${formatEuros(minimoPrimero)}.`);
      return;
    }
    if (monto > pendiente + 0.001) {
      setError(
        pendiente < 0.01
          ? "El importe ya est? cubierto. Si es un error, contacta con organizaci?n."
          : `Este comprobante no puede superar lo pendiente (${formatEuros(pendiente)}).`,
      );
      return;
    }

    setLoading(true);
    try {
      setProgressPct(0);
      const comprobanteURL = await withTimeout(
        uploadToCloudinary(f, id, (pct) => setProgressPct(pct)),
        UPLOAD_TIMEOUT_MS,
        "Subir comprobante",
      );

      await withTimeout(
        updateDoc(doc(db, "registros", id), {
          comprobanteURL,
          estado: REGISTRO_ESTADOS.revision,
          montoDepositadoEuros: increment(monto),
        }),
        FIRESTORE_TIMEOUT_MS,
        "Guardar en la base de datos",
      );

      // Aviso por correo (no bloquea la subida si falla Resend).
      try {
        await fetch("/api/email/comprobante-recibido", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ registroId: id }),
        });
      } catch {
        /* silencioso */
      }

      setSuccess(true);
      setFile(null);
      setMontoStr("");
      const nuevo = prevOk + monto;
      setDepositadoActual(nuevo);
      setModalidadRegistro(modalidad);
      setTarifa(tarifaPre);
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

  const tarifaActiva: DatosTarifaRegistro = tarifa ?? { modalidadRegistro: modalidadRegistro };
  const pendiente =
    depositadoActual != null ? pendienteEuros(depositadoActual, tarifaActiva) : null;
  const totalEntrada = costoInscripcionEuros(tarifaActiva);

  if (success) {
    return (
      <div className="flex max-w-md flex-col gap-3 rounded-xl border border-emerald-500/40 bg-emerald-50/90 px-4 py-4 text-sm text-emerald-950 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-100">
        <p className="text-base font-semibold">Comprobante enviado correctamente</p>
        <p className="leading-relaxed">
          Tu pago ha pasado a revisi?n. <strong className="font-semibold">Espera a que el equipo lo apruebe</strong>{" "}
          para poder obtener el <strong className="font-semibold">c?digo QR y el acceso al evento</strong>: hasta
          entonces no estar?n disponibles.
        </p>
        <p className="leading-relaxed text-emerald-900 dark:text-emerald-200/95">
          Puedes seguir el estado en{" "}
          <Link
            href={`/estado/${id}`}
            className="font-semibold text-emerald-800 underline underline-offset-2 dark:text-emerald-300"
          >
            tu registro
          </Link>
          . Cuando figure como aprobado, ah? tendr?s el enlace al ticket y al c?digo.
        </p>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="flex max-w-md flex-col gap-4">
      {depositadoActual != null && pendiente != null && (
        <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800 dark:border-zinc-600 dark:bg-zinc-900/50 dark:text-zinc-200">
          {etiquetaTarifaInscripcion(tarifaActiva)}. Total inscripci?n:{" "}
          {formatEuros(totalEntrada)}. Llevas{" "}
          <span className="font-semibold">{formatEuros(depositadoActual)}</span> registrados.
          {pendiente > 0.01 ? (
            <>
              {" "}
              Pendiente: <span className="font-semibold">{formatEuros(pendiente)}</span>.
            </>
          ) : (
            <span className="font-medium text-emerald-700 dark:text-emerald-400">
              {" "}
              Importe completo.
            </span>
          )}
          <span className="mt-1 block text-xs text-zinc-600 dark:text-zinc-400">
            {parseComiteOrganizador(tarifaActiva.comiteOrganizador)
              ? `Inscripci?n comit?: ${formatEuros(totalEntrada)} (importe completo).`
              : `M?nimo de inscripci?n: ${formatEuros(minimoPrimerDepositoEuros(tarifaActiva))}.`}
          </span>
        </p>
      )}
      <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-800 dark:text-zinc-200">
        Importe de este comprobante (EUR)
        <input
          type="text"
          {...iosDecimalMoneyInputProps}
          autoComplete="off"
          enterKeyHint="done"
          placeholder="ej. 35 o 35,50"
          value={montoStr}
          disabled={loading}
          onChange={(e) => {
            setMontoStr(e.target.value);
            setError(null);
          }}
          className="min-h-[44px] rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base text-zinc-900 placeholder:text-zinc-400 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100"
        />
        <span className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
          Indica solo lo que corresponde a este justificante (puedes pagar el resto despu?s).
        </span>
      </label>
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
          Tomar foto con la c?mara
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
          Archivo: <span className="font-medium">{file.name || `foto.${inferExt(file)}`}</span> {" "}
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
        disabled={loading || !file || !montoStr.trim()}
        className="touch-manipulation min-h-[48px] rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {loading ? (
          <span className="inline-flex w-full flex-col items-center gap-1">
            <span className="inline-flex items-center gap-2">
              <span
                className="size-4 shrink-0 animate-spin rounded-full border-2 border-white/30 border-t-white dark:border-zinc-400 dark:border-t-zinc-900"
                aria-hidden
              />
              Subiendo
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
