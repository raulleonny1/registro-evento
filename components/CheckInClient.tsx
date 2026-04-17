"use client";

import { doc, getDoc, increment, updateDoc } from "firebase/firestore";
import { useCallback, useEffect, useRef, useState } from "react";
import { db } from "@/lib/firebase";
import {
  MINIMO_INSCRIPCION_EUR,
  costoEventoEuros,
  etiquetaModalidadRegistro,
  formatEuros,
  normalizeModalidadRegistro,
  parseMontoEuros,
  pendienteEuros,
  type ModalidadRegistro,
} from "@/lib/eventoPrecio";
import { labelParroquiaFirestore } from "@/lib/iereParroquias";
import type { Html5Qrcode } from "html5-qrcode";
import { iosDecimalMoneyInputProps } from "@/lib/iosKeyboardHints";

const READER_ID = "checkin-qr-reader";

type ResultAllow = {
  kind: "allow";
  registroId: string;
  nombre: string;
  email: string;
  whatsapp?: string;
  parroquiaLine?: string;
  estadoPago: string;
  modalidadRegistro: ModalidadRegistro;
  totalEntradaEuros: number;
  montoDepositadoEuros: number;
  pendienteEuros: number;
};

type ResultDeny = {
  kind: "deny";
  titulo: string;
  nombre?: string;
  email?: string;
  whatsapp?: string;
  parroquiaLine?: string;
  estadoPago: string;
};

type CheckResult = ResultAllow | ResultDeny;

function estadoPagoLabel(estado: string): string {
  switch (estado) {
    case "aprobado":
      return "Aprobado";
    case "pendiente_pago":
    case "pendiente":
      return "Pago pendiente";
    case "revision":
      return "Comprobante en revisión";
    case "rechazado":
      return "Registro rechazado";
    default:
      return estado || "Desconocido";
  }
}

function playFeedback(permitido: boolean) {
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    navigator.vibrate(permitido ? [35, 45, 35] : [160]);
  }
  try {
    const AC =
      typeof window !== "undefined"
        ? window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        : undefined;
    if (!AC) return;
    const ctx = new AC();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = permitido ? 1020 : 200;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.09, ctx.currentTime + 0.02);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.14);
  } catch {
    /* sin audio */
  }
}

type View = "welcome" | "cam" | "result";

export default function CheckInClient() {
  const [view, setView] = useState<View>("welcome");
  const [result, setResult] = useState<CheckResult | null>(null);
  const [puertaMonto, setPuertaMonto] = useState("");
  const [puertaError, setPuertaError] = useState<string | null>(null);
  const [puertaLoading, setPuertaLoading] = useState(false);
  const [camError, setCamError] = useState<string | null>(null);
  const [camStarting, setCamStarting] = useState(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const decodeLockRef = useRef(false);

  const stopScannerCleanup = useCallback(async () => {
    const s = scannerRef.current;
    if (!s) return;
    try {
      if (s.isScanning) await s.stop();
      s.clear();
    } catch {
      /* ignore */
    }
    scannerRef.current = null;
  }, []);

  const processId = useCallback(
    async (raw: string) => {
      if (decodeLockRef.current) return;
      decodeLockRef.current = true;

      await stopScannerCleanup();

      const id = raw.trim();
      if (!id) {
        playFeedback(false);
        setResult({
          kind: "deny",
          titulo: "NO PUEDE ENTRAR",
          estadoPago: "Código vacío",
        });
        setView("result");
        return;
      }

      try {
        setPuertaMonto("");
        setPuertaError(null);
        const snap = await getDoc(doc(db, "registros", id));
        if (!snap.exists()) {
          playFeedback(false);
          setResult({
            kind: "deny",
            titulo: "NO PUEDE ENTRAR",
            estadoPago: "Registro no encontrado",
          });
          setView("result");
          return;
        }

        const d = snap.data();
        const nombre = String(d.nombre ?? "");
        const email = String(d.email ?? "");
        const estado = String(d.estado ?? "");
        const whatsappRaw = d.whatsapp ?? d.telefono;
        const whatsapp = typeof whatsappRaw === "string" ? whatsappRaw : "";
        const par = d.parroquia as
          | { area?: string; parroquia?: string; iglesia?: string; ciudad?: string; nombre?: string }
          | undefined;
        const pl = labelParroquiaFirestore(par);
        const parroquiaLine = pl !== "—" ? pl : undefined;

        if (estado === "aprobado") {
          playFeedback(true);
          const montoDep = Number(d.montoDepositadoEuros ?? 0);
          const depOk = Number.isFinite(montoDep) ? montoDep : 0;
          const modalidad = normalizeModalidadRegistro(d.modalidadRegistro);
          setResult({
            kind: "allow",
            registroId: id,
            nombre,
            email,
            whatsapp: whatsapp || undefined,
            parroquiaLine,
            estadoPago: estadoPagoLabel(estado),
            modalidadRegistro: modalidad,
            totalEntradaEuros: costoEventoEuros(modalidad),
            montoDepositadoEuros: depOk,
            pendienteEuros: pendienteEuros(depOk, modalidad),
          });
        } else {
          playFeedback(false);
          let motivo = estadoPagoLabel(estado);
          if (estado === "pendiente_pago" || estado === "pendiente")
            motivo = "Pago pendiente — sin comprobar";
          else if (estado === "revision") motivo = "Comprobante en revisión — espere aprobación";
          else if (estado === "rechazado") motivo = "Registro rechazado — no tiene acceso";
          setResult({
            kind: "deny",
            titulo: "NO PUEDE ENTRAR",
            nombre: nombre || undefined,
            email: email || undefined,
            whatsapp: whatsapp || undefined,
            parroquiaLine,
            estadoPago: motivo,
          });
        }
        setView("result");
      } catch (e) {
        playFeedback(false);
        setResult({
          kind: "deny",
          titulo: "NO PUEDE ENTRAR",
          estadoPago: e instanceof Error ? e.message : "Error de red",
        });
        setView("result");
      }
    },
    [stopScannerCleanup],
  );

  const processIdRef = useRef(processId);
  processIdRef.current = processId;

  /* iOS/Safari: el vídeo debe ir en línea y silenciado para que la cámara funcione bien */
  useEffect(() => {
    if (view !== "cam") return;
    const t = window.setInterval(() => {
      const el = document.querySelector(`#${READER_ID} video`);
      if (el instanceof HTMLVideoElement) {
        el.setAttribute("playsinline", "");
        el.setAttribute("webkit-playsinline", "");
        el.muted = true;
        window.clearInterval(t);
      }
    }, 80);
    return () => window.clearInterval(t);
  }, [view]);

  useEffect(() => {
    if (view !== "cam") return;

    let cancelled = false;

    async function start() {
      setCamError(null);
      setCamStarting(true);
      decodeLockRef.current = false;

      await new Promise<void>((r) => requestAnimationFrame(() => r()));

      try {
        const { Html5Qrcode: H5, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
        if (cancelled) return;

        scannerRef.current = new H5(READER_ID, {
          verbose: false,
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        });
        const scanner = scannerRef.current;

        const scanConfig = {
          fps: 15,
          aspectRatio: 1.777777778,
          videoConstraints: {
            facingMode: "environment",
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          qrbox: (vw: number, vh: number) => {
            const edge = Math.min(vw, vh);
            const n = Math.max(160, Math.floor(edge * 0.68));
            return { width: n, height: n };
          },
        };

        const onOk = (text: string) => {
          void processIdRef.current(text);
        };

        try {
          await scanner.start({ facingMode: "environment" }, scanConfig, onOk, () => {});
        } catch {
          if (cancelled) return;
          const cams = await H5.getCameras();
          if (!cams.length) throw new Error("No hay cámaras disponibles");
          const back =
            cams.find((c) => /back|rear|environment|trasera/i.test(c.label)) ?? cams[cams.length - 1];
          await scanner.start({ deviceId: { exact: back.id } }, scanConfig, onOk, () => {});
        }

        if (!cancelled) setCamStarting(false);
      } catch (e) {
        if (!cancelled) {
          setCamError(e instanceof Error ? e.message : "No se pudo abrir la cámara");
          setCamStarting(false);
          setView("welcome");
        }
      }
    }

    void start();

    return () => {
      cancelled = true;
      void (async () => {
        const s = scannerRef.current;
        if (!s) return;
        try {
          if (s.isScanning) await s.stop();
          s.clear();
        } catch {
          /* ignore */
        }
        scannerRef.current = null;
      })();
    };
  }, [view]);

  const openCamera = useCallback(() => {
    setCamError(null);
    setView("cam");
  }, []);

  const closeCamera = useCallback(async () => {
    decodeLockRef.current = false;
    await stopScannerCleanup();
    setView("welcome");
    setCamError(null);
  }, [stopScannerCleanup]);

  const scanAgain = useCallback(() => {
    decodeLockRef.current = false;
    setResult(null);
    setPuertaMonto("");
    setPuertaError(null);
    setView("welcome");
  }, []);

  async function registrarPagoEnPuerta() {
    if (result?.kind !== "allow") return;
    const monto = parseMontoEuros(puertaMonto);
    if (monto == null) {
      setPuertaError("Indica un importe válido (ej. 20 o 15,50).");
      return;
    }
    setPuertaLoading(true);
    setPuertaError(null);
    try {
      const snap = await getDoc(doc(db, "registros", result.registroId));
      if (!snap.exists()) {
        setPuertaError("Registro no encontrado.");
        return;
      }
      const prev = Number(snap.data()?.montoDepositadoEuros ?? 0);
      const prevOk = Number.isFinite(prev) ? prev : 0;
      const modalidad = normalizeModalidadRegistro(snap.data()?.modalidadRegistro);
      const pend = pendienteEuros(prevOk, modalidad);
      if (prevOk < 0.01 && monto + 0.001 < MINIMO_INSCRIPCION_EUR) {
        setPuertaError(`El primer pago debe ser al menos ${formatEuros(MINIMO_INSCRIPCION_EUR)}.`);
        return;
      }
      if (monto > pend + 0.001) {
        setPuertaError(
          pend < 0.01
            ? "No hay pendiente según el registro."
            : `Como máximo ${formatEuros(pend)} (lo pendiente).`,
        );
        return;
      }
      await updateDoc(doc(db, "registros", result.registroId), {
        montoDepositadoEuros: increment(monto),
      });
      const nuevo = prevOk + monto;
      setResult({
        ...result,
        modalidadRegistro: modalidad,
        totalEntradaEuros: costoEventoEuros(modalidad),
        montoDepositadoEuros: nuevo,
        pendienteEuros: pendienteEuros(nuevo, modalidad),
      });
      setPuertaMonto("");
    } catch (e) {
      setPuertaError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setPuertaLoading(false);
    }
  }

  const safeBottom = "pb-[max(1.25rem,env(safe-area-inset-bottom))]";
  const safeTop = "pt-[max(0.75rem,env(safe-area-inset-top))]";

  if (view === "result" && result) {
    const ok = result.kind === "allow";
    return (
      <div
        className={
          ok
            ? `flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-emerald-600 p-4 text-center text-white sm:gap-6 sm:p-6 ${safeBottom}`
            : `flex min-h-[100dvh] flex-col items-center justify-center gap-4 bg-red-700 p-4 text-center text-white sm:gap-6 sm:p-6 ${safeBottom}`
        }
      >
        <p className="text-2xl font-bold tracking-tight sm:text-4xl">
          {ok ? "Entrada permitida" : result.titulo}
        </p>
        {ok ? (
          <>
            <p className="max-w-[95vw] break-words text-3xl font-extrabold leading-tight sm:text-5xl md:text-6xl">
              {result.nombre}
            </p>
            <div className="mt-2 max-w-lg space-y-2 text-lg opacity-95">
              <p>
                <span className="text-white/80">Email: </span>
                {result.email}
              </p>
              {result.whatsapp && (
                <p>
                  <span className="text-white/80">WhatsApp: </span>
                  {result.whatsapp}
                </p>
              )}
              {result.parroquiaLine && (
                <p className="text-base">
                  <span className="text-white/80">Parroquia: </span>
                  {result.parroquiaLine}
                </p>
              )}
              <p>
                <span className="text-white/80">Estado de pago: </span>
                {result.estadoPago}
              </p>
              <div className="mt-4 rounded-2xl border border-white/25 bg-white/10 px-4 py-3 text-left shadow-inner">
                <p className="text-base font-semibold">Pago entrada</p>
                <p className="mt-1 text-base">
                  <span className="text-white/80">Modalidad: </span>
                  {etiquetaModalidadRegistro(result.modalidadRegistro)}
                </p>
                <p className="mt-1 text-base">
                  <span className="text-white/80">Total entrada: </span>
                  {formatEuros(result.totalEntradaEuros)}
                </p>
                <p className="text-base">
                  <span className="text-white/80">Pagado: </span>
                  {formatEuros(result.montoDepositadoEuros)}
                </p>
                <p className="text-base">
                  <span className="text-white/80">Pendiente: </span>
                  {formatEuros(result.pendienteEuros)}
                </p>
                {result.pendienteEuros > 0.01 ? (
                  <div className="mt-3 flex flex-col gap-2">
                    <label className="block text-sm text-white/90">
                      Cobrar diferencia en puerta (€)
                      <input
                        type="text"
                        {...iosDecimalMoneyInputProps}
                        autoComplete="off"
                        enterKeyHint="done"
                        value={puertaMonto}
                        disabled={puertaLoading}
                        onChange={(e) => {
                          setPuertaMonto(e.target.value);
                          setPuertaError(null);
                        }}
                        placeholder="ej. 20"
                        className="mt-1 w-full min-h-[44px] rounded-xl border border-white/30 bg-white/95 px-3 py-2 text-base text-zinc-900 placeholder:text-zinc-500"
                      />
                    </label>
                    {puertaError && (
                      <p className="text-sm font-medium text-amber-200">{puertaError}</p>
                    )}
                    <button
                      type="button"
                      disabled={puertaLoading || !puertaMonto.trim()}
                      onClick={() => void registrarPagoEnPuerta()}
                      className="touch-manipulation min-h-[48px] rounded-xl bg-white/25 px-4 py-3 text-sm font-semibold text-white ring-2 ring-white/40 hover:bg-white/35 disabled:opacity-50"
                    >
                      {puertaLoading ? "Guardando…" : "Registrar pago recibido"}
                    </button>
                  </div>
                ) : (
                  <p className="mt-2 text-sm font-medium text-emerald-100">Entrada pagada al completo.</p>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            {result.nombre && (
              <p className="text-2xl font-semibold sm:text-3xl">{result.nombre}</p>
            )}
            {"email" in result && result.email && (
              <p className="text-lg opacity-90">{result.email}</p>
            )}
            {"whatsapp" in result && result.whatsapp && (
              <p className="text-base opacity-90">WhatsApp: {result.whatsapp}</p>
            )}
            {"parroquiaLine" in result && result.parroquiaLine && (
              <p className="max-w-lg text-base opacity-90">Parroquia: {result.parroquiaLine}</p>
            )}
            <p className="max-w-md text-xl font-medium leading-snug sm:text-2xl">{result.estadoPago}</p>
          </>
        )}
        <button
          type="button"
          onClick={scanAgain}
          className="touch-manipulation mt-2 min-h-[52px] w-full max-w-sm rounded-full bg-white/20 px-8 py-4 text-base font-semibold text-white ring-2 ring-white/50 backdrop-blur active:scale-[0.98] motion-safe:transition sm:text-lg"
        >
          Escanear otro
        </button>
      </div>
    );
  }

  if (view === "cam") {
    return (
      <div className={`flex h-[100dvh] min-h-[100dvh] flex-col bg-black ${safeTop}`}>
        <div className="z-20 flex shrink-0 items-center justify-between gap-2 px-3 pb-2 pt-1 text-white">
          <p className="max-w-[70%] text-sm font-medium leading-snug opacity-90">
            Enfoca el QR del ticket (cámara trasera)
          </p>
          <button
            type="button"
            onClick={() => void closeCamera()}
            className="touch-manipulation shrink-0 rounded-xl bg-white/15 px-4 py-3 text-sm font-semibold ring-1 ring-white/30 active:bg-white/25"
          >
            Cerrar
          </button>
        </div>
        <div className="relative min-h-0 flex-1">
          {camStarting && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black text-white">
              <span
                className="size-10 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-400"
                aria-hidden
              />
              <span className="text-sm">Iniciando cámara…</span>
            </div>
          )}
          {camError && (
            <p className="absolute inset-x-0 top-16 z-10 px-4 text-center text-sm leading-snug text-red-400">
              {camError}
            </p>
          )}
          <div
            id={READER_ID}
            className="absolute inset-0 overflow-hidden [&_video]:h-full [&_video]:w-full [&_video]:object-cover"
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex min-h-[100dvh] flex-col items-center justify-center gap-6 bg-zinc-950 px-4 py-8 text-white sm:gap-8 sm:p-6 ${safeBottom} ${safeTop}`}
    >
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold sm:text-3xl">Check-in del evento</h1>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400 sm:text-base">
          Pulsa el botón, permite el acceso a la cámara y apunta al código QR del ticket.
        </p>
      </div>
      <button
        type="button"
        disabled={camStarting}
        onClick={openCamera}
        className="touch-manipulation w-full max-w-sm rounded-2xl bg-emerald-600 px-8 py-5 text-lg font-bold text-white shadow-lg shadow-emerald-900/40 transition hover:bg-emerald-500 active:scale-[0.98] disabled:opacity-50 sm:text-xl"
      >
        Activar cámara
      </button>
      <p className="max-w-xs text-center text-xs text-zinc-600">
        Usa HTTPS o localhost. En iPhone: Ajustes → Safari → Cámara (si no ves el vídeo).
      </p>
    </div>
  );
}
