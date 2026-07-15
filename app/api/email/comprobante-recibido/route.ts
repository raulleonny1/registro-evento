import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore, isFirebaseAdminConfigured } from "@/lib/firebaseAdmin";
import { emailComprobanteRecibido } from "@/lib/emailTemplates";
import { isResendConfigured, sendEmail } from "@/lib/resendMail";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Aviso tras subir comprobante: ya puedes seguir el estado y completar el acceso al evento.
 * Se llama desde el cliente tras un upload correcto; no debe romper el flujo de subida.
 */
export async function POST(request: NextRequest) {
  if (!isResendConfigured()) {
    return NextResponse.json({ ok: false, skipped: true, reason: "resend_not_configured" });
  }
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json({ ok: false, skipped: true, reason: "admin_not_configured" });
  }

  let body: { registroId?: string };
  try {
    body = (await request.json()) as { registroId?: string };
  } catch {
    return NextResponse.json({ error: "JSON no válido" }, { status: 400 });
  }

  const registroId =
    typeof body.registroId === "string" ? body.registroId.trim() : "";
  if (!registroId || registroId.length > 128) {
    return NextResponse.json({ error: "registroId no válido" }, { status: 400 });
  }

  try {
    const db = getAdminFirestore();
    const snap = await db.collection("registros").doc(registroId).get();
    if (!snap.exists) {
      return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });
    }
    const x = snap.data() ?? {};
    const email = typeof x.email === "string" ? x.email.trim().toLowerCase() : "";
    if (!email) {
      return NextResponse.json({ ok: false, skipped: true, reason: "no_email" });
    }

    const plantilla = emailComprobanteRecibido({
      nombre: String(x.nombre ?? ""),
      registroId,
    });
    const res = await sendEmail({
      to: email,
      subject: plantilla.subject,
      html: plantilla.html,
      text: plantilla.text,
    });

    if (!res.ok) {
      return NextResponse.json({ ok: false, error: res.error }, { status: 502 });
    }
    return NextResponse.json({ ok: true, id: res.id });
  } catch (e) {
    console.error("[email/comprobante-recibido]", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Error" },
      { status: 500 },
    );
  }
}
