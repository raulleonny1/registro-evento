import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore, isFirebaseAdminConfigured } from "@/lib/firebaseAdmin";
import { emailRecordatorioDeposito } from "@/lib/emailTemplates";
import { isResendConfigured, sendEmail } from "@/lib/resendMail";
import { esPendientePago, normalizeEstado } from "@/lib/registroEstados";
import {
  debeEnviarRecordatorio,
  diasHastaEvento,
  faseRecordatorio,
  etiquetaFase,
  parseTimestampFirestore,
} from "@/lib/recordatorioFrecuencia";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Tope Free Resend: 100/día. Dejamos margen. */
const MAX_ENVIO_POR_EJECUCION = 90;

function autorizado(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  const q = request.nextUrl.searchParams.get("secret");
  return q === secret;
}

function sinDeposito(monto: unknown): boolean {
  const n = Number(monto ?? 0);
  return !Number.isFinite(n) || n < 0.01;
}

/**
 * Cron diario: decide por proximidad al 25/09/2026 si toca recordatorio.
 * Auth: Authorization Bearer CRON_SECRET
 */
export async function GET(request: NextRequest) {
  if (!autorizado(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json({ error: "Firebase Admin no configurado" }, { status: 503 });
  }
  if (!isResendConfigured()) {
    return NextResponse.json({ error: "Resend no configurado (RESEND_API_KEY)" }, { status: 503 });
  }

  const ahora = Date.now();
  const fase = faseRecordatorio(ahora);
  if (fase === "pasado") {
    return NextResponse.json({
      ok: true,
      fase,
      diasHastaEvento: diasHastaEvento(ahora),
      mensaje: "El Encuentro ya inició; no se envían más recordatorios de depósito.",
      enviados: 0,
    });
  }

  const db = getAdminFirestore();
  const snap = await db.collection("registros").get();

  const candidatos: Array<{
    id: string;
    email: string;
    nombre: string;
    ultimoMs: number | null;
  }> = [];

  let omitidosPorIntervalo = 0;

  for (const doc of snap.docs) {
    const x = doc.data();
    const email = typeof x.email === "string" ? x.email.trim().toLowerCase() : "";
    if (!email || !email.includes("@")) continue;
    if (!sinDeposito(x.montoDepositadoEuros)) continue;
    const estado = normalizeEstado(String(x.estado ?? ""));
    if (!esPendientePago(estado)) continue;

    const ultimoMs = parseTimestampFirestore(x.ultimoRecordatorioDepositoEn);
    if (fase === "ultimas_24h" && x.recordatorioFinal24hEnviado === true) {
      omitidosPorIntervalo += 1;
      continue;
    }
    const decision = debeEnviarRecordatorio(ultimoMs, ahora);
    if (!decision.enviar) {
      omitidosPorIntervalo += 1;
      continue;
    }
    candidatos.push({
      id: doc.id,
      email,
      nombre: String(x.nombre ?? ""),
      ultimoMs,
    });
  }

  const aEnviar = candidatos.slice(0, MAX_ENVIO_POR_EJECUCION);
  let enviados = 0;
  let fallidos = 0;
  const errores: string[] = [];
  const esUltimas24h = fase === "ultimas_24h";

  for (const c of aEnviar) {
    const plantilla = emailRecordatorioDeposito({
      nombre: c.nombre,
      registroId: c.id,
      fase,
      esUltimoAviso: esUltimas24h,
    });
    const res = await sendEmail({
      to: c.email,
      subject: plantilla.subject,
      html: plantilla.html,
      text: plantilla.text,
    });
    if (res.ok) {
      enviados += 1;
      try {
        await db.collection("registros").doc(c.id).update({
          ultimoRecordatorioDepositoEn: FieldValue.serverTimestamp(),
          ...(esUltimas24h ? { recordatorioFinal24hEnviado: true } : {}),
        });
      } catch {
        /* no bloquear el cron */
      }
    } else {
      fallidos += 1;
      if (errores.length < 8) errores.push(`${c.email}: ${res.error}`);
    }
  }

  return NextResponse.json({
    ok: true,
    fase,
    frecuencia: etiquetaFase(fase),
    diasHastaEvento: Math.round(diasHastaEvento(ahora) * 10) / 10,
    elegiblesHoy: candidatos.length,
    omitidosPorIntervalo,
    intentados: aEnviar.length,
    enviados,
    fallidos,
    omitidosPorCuota: Math.max(0, candidatos.length - aEnviar.length),
    errores,
  });
}
