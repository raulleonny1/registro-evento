import { NextRequest, NextResponse } from "next/server";
import { getAdminFirestore, isFirebaseAdminConfigured } from "@/lib/firebaseAdmin";
import { enviarConfirmacionRegistroEmail } from "@/lib/enviarConfirmacionRegistroEmail";
import { avisarAdminNuevoRegistro } from "@/lib/avisarAdminEmail";
import { parseComiteOrganizador } from "@/lib/comiteOrganizador";
import { normalizeModalidadRegistro } from "@/lib/eventoPrecio";
import { isResendConfigured } from "@/lib/resendMail";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Confirmación tras inscribirse (mismo formato que recordatorios).
 * Se llama desde el cliente si el registro se guardó solo por Firestore en el navegador.
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

    const res = await enviarConfirmacionRegistroEmail({
      registroId,
      nombre: String(x.nombre ?? ""),
      email,
      modalidadRegistro: normalizeModalidadRegistro(x.modalidadRegistro),
      comite: parseComiteOrganizador(x.comiteOrganizador),
    });

    const par = (x.parroquia ?? {}) as Record<string, unknown>;
    const parroquiaLinea = [par.area, par.parroquia, par.iglesia]
      .map((v) => (typeof v === "string" ? v.trim() : ""))
      .filter(Boolean)
      .join(" · ");

    void avisarAdminNuevoRegistro({
      registroId,
      nombre: String(x.nombre ?? ""),
      email,
      whatsapp: typeof x.whatsapp === "string" ? x.whatsapp : undefined,
      modalidadRegistro: normalizeModalidadRegistro(x.modalidadRegistro),
      comite: parseComiteOrganizador(x.comiteOrganizador),
      parroquiaLinea: parroquiaLinea || undefined,
      observaciones:
        typeof x.observaciones === "string" && x.observaciones.trim()
          ? x.observaciones.trim()
          : undefined,
    }).catch((err) => {
      console.error("[email/confirmacion-registro] aviso admin", err);
    });

    if (!res.ok) {
      if (res.skipped) {
        return NextResponse.json({ ok: false, skipped: true, reason: res.error });
      }
      return NextResponse.json({ ok: false, error: res.error }, { status: 502 });
    }
    return NextResponse.json({ ok: true, id: res.id });
  } catch (e) {
    console.error("[email/confirmacion-registro]", e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Error" },
      { status: 500 },
    );
  }
}
