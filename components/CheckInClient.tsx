"use client";

import { doc, getDoc } from "firebase/firestore";
import { useCallback, useEffect, useRef, useState } from "react";
import { db } from "@/lib/firebase";
import type { Html5Qrcode } from "html5-qrcode";

const READER_ID = "checkin-qr-reader";

type ResultAllow = {
  kind: "allow";
  nombre: string;
  email: string;
  whatsapp?: string;
  parroquiaLine?: string;
  estadoPago: string;
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
        const par = d.parroquia as { ciudad?: string; nombre?: string } | undefined;
        const parroquiaLine =
          par && (par.ciudad || par.nombre)
            ? `${String(par.ciudad ?? "")} — ${String(par.nombre ?? "")}`
            : undefined;

        if (estado === "aprobado") {
          playFeedback(true);
          setResult({
            kind: "allow",
            nombre,
            email,
            whatsapp: whatsapp || undefined,
            parroquiaLine,
            estadoPago: estadoPagoLabel(estado),
          });
        } else {
          playFeedback(false);
          let motivo = estadoPagoLabel(estado);
          if (estado === "pendiente") motivo = "Pago pendiente — sin comprobar";
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

  useEffect(() => {
    if (view !== "cam") return;

    let cancelled = false;

    async function start() {
      setCamError(null);
      setCamStarting(true);
      decodeLockRef.current = false;

      await new Promise<void>((r) => requestAnimationFrame(() => r()));

      try {
        const { Html5Qrcode: H5 } = await import("html5-qrcode");
        if (cancelled) return;

        scannerRef.current = new H5(READER_ID, { verbose: false });
        const scanner = scannerRef.current;

        const scanConfig = {
          fps: 10,
          aspectRatio: 1.777777778,
          qrbox: (vw: number, vh: number) => {
            const edge = Math.min(vw, vh);
            const n = Math.max(140, Math.floor(edge * 0.72));
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
    setView("welcome");
  }, []);

  const safeBottom = "pb-[max(1.25rem,env(safe-area-inset-bottom))]";
  const safeTop = "pt-[max(0.75rem,env(safe-area-inset-top))]";

  if (view === "result" && result) {
    const ok = result.kind === "allow";
    return (
      <div
        className={
          ok
            ? `flex min-h-dvh flex-col items-center justify-center gap-6 bg-emerald-600 p-6 text-center text-white ${safeBottom}`
            : `flex min-h-dvh flex-col items-center justify-center gap-6 bg-red-700 p-6 text-center text-white ${safeBottom}`
        }
      >
        <p className="text-3xl font-bold tracking-tight sm:text-4xl">
          {ok ? "Entrada permitida" : result.titulo}
        </p>
        {ok ? (
          <>
            <p className="text-5xl font-extrabold leading-tight sm:text-6xl">{result.nombre}</p>
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
          className="mt-4 rounded-full bg-white/20 px-8 py-4 text-lg font-semibold text-white ring-2 ring-white/50 backdrop-blur hover:bg-white/30 active:scale-[0.98] motion-safe:transition"
        >
          Escanear otro
        </button>
      </div>
    );
  }

  if (view === "cam") {
    return (
      <div className={`flex min-h-dvh flex-col bg-black ${safeTop}`}>
        <div className="z-20 flex shrink-0 items-center justify-between gap-2 px-3 pb-2 text-white">
          <p className="text-sm font-medium opacity-90">Enfoca el QR del ticket</p>
          <button
            type="button"
            onClick={() => void closeCamera()}
            className="rounded-lg bg-white/15 px-3 py-2 text-sm font-medium ring-1 ring-white/30"
          >
            Cerrar
          </button>
        </div>
        <div className="relative min-h-0 flex-1">
          {camStarting && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black text-white">
              Iniciando cámara…
            </div>
          )}
          {camError && (
            <p className="absolute inset-x-0 top-20 z-10 px-4 text-center text-sm text-red-400">
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
      className={`flex min-h-dvh flex-col items-center justify-center gap-8 bg-zinc-950 p-6 text-white ${safeBottom} ${safeTop}`}
    >
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-bold">Check-in del evento</h1>
        <p className="mt-3 text-zinc-400">
          Activa la cámara, escanea el QR del ticket y valida el acceso al instante.
        </p>
      </div>
      <button
        type="button"
        disabled={camStarting}
        onClick={openCamera}
        className="rounded-full bg-emerald-600 px-12 py-5 text-xl font-bold text-white shadow-lg shadow-emerald-900/40 transition hover:bg-emerald-500 active:scale-[0.98] disabled:opacity-50 motion-safe:transition"
      >
        Activar cámara
      </button>
    </div>
  );
}
