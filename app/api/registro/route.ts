import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminFirestore, isFirebaseAdminConfigured } from "@/lib/firebaseAdmin";
import { REGISTRO_ACEPTO_DATOS_EVENTO } from "@/lib/registroConsent";
import { REGISTRO_ESTADOS } from "@/lib/registroEstados";
import { MODALIDADES_REGISTRO, type ModalidadRegistro } from "@/lib/eventoPrecio";
import { datosComiteEnFirestore, esMiembroComiteOrganizador } from "@/lib/comiteOrganizador";
import { normalizarWhatsappDigitos } from "@/lib/registroDuplicados";
import {
  errorHttpRegistroDuplicado,
  verificarRegistroDuplicadoAdmin,
} from "@/lib/registroDuplicadosServer";
import { enviarConfirmacionRegistroEmail } from "@/lib/enviarConfirmacionRegistroEmail";
import { avisarAdminNuevoRegistro } from "@/lib/avisarAdminEmail";
import { isResendConfigured } from "@/lib/resendMail";

export const runtime = "nodejs";
export const maxDuration = 30;

type ParroquiaBody = {
  area?: string;
  parroquia?: string;
  iglesia?: string;
  manual?: boolean;
};

type Body = {
  nombre?: string;
  email?: string;
  whatsapp?: string;
  whatsappDigitos?: string;
  whatsappUltimos4?: string;
  parroquia?: ParroquiaBody;
  modalidadRegistro?: string;
  observaciones?: string;
};

function isModalidad(v: string): v is ModalidadRegistro {
  return (Object.values(MODALIDADES_REGISTRO) as string[]).includes(v);
}

export async function POST(request: NextRequest) {
  if (!isFirebaseAdminConfigured()) {
    return NextResponse.json(
      {
        error:
          "Servidor sin cuenta de servicio Firebase. En Vercel añade FIREBASE_SERVICE_ACCOUNT_JSON (JSON de Firebase → Cuentas de servicio) y redespliega.",
      },
      { status: 503 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Cuerpo JSON no válido." }, { status: 400 });
  }

  const nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const whatsapp = typeof body.whatsapp === "string" ? body.whatsapp.trim() : "";
  const whatsappDigitos =
    typeof body.whatsappDigitos === "string" ? body.whatsappDigitos.trim() : "";
  const whatsappUltimos4 =
    typeof body.whatsappUltimos4 === "string" ? body.whatsappUltimos4.trim() : "";
  const modalidad = typeof body.modalidadRegistro === "string" ? body.modalidadRegistro : "";
  const observaciones =
    typeof body.observaciones === "string" ? body.observaciones.trim().slice(0, 800) : "";

  const par = body.parroquia;
  const area = typeof par?.area === "string" ? par.area.trim() : "";
  const parroquia = typeof par?.parroquia === "string" ? par.parroquia.trim() : "";
  const iglesia = typeof par?.iglesia === "string" ? par.iglesia.trim() : "";

  if (!nombre || !email || !whatsapp || whatsappDigitos.length < 4 || whatsappUltimos4.length !== 4) {
    return NextResponse.json({ error: "Datos de registro incompletos o no válidos." }, { status: 400 });
  }
  if (!area || !parroquia || !iglesia) {
    return NextResponse.json({ error: "Parroquia / iglesia incompletos." }, { status: 400 });
  }
  if (!isModalidad(modalidad)) {
    return NextResponse.json({ error: "Modalidad de asistencia no válida." }, { status: 400 });
  }

  const comite = esMiembroComiteOrganizador(whatsapp);
  const whatsappDigitosNorm = normalizarWhatsappDigitos(whatsapp);

  try {
    const db = getAdminFirestore();
    const dup = await verificarRegistroDuplicadoAdmin(db, email, whatsapp, whatsappDigitos);
    if (dup.duplicado) {
      return NextResponse.json({ error: errorHttpRegistroDuplicado(dup) }, { status: 409 });
    }

    const ref = await db.collection("registros").add({
      nombre,
      email,
      whatsapp,
      whatsappDigitos: whatsappDigitosNorm,
      whatsappUltimos4,
      parroquia: {
        area,
        parroquia,
        iglesia,
        ...(par?.manual ? { manual: true } : {}),
      },
      modalidadRegistro: modalidad,
      ...(observaciones ? { observaciones } : {}),
      ...(comite ? datosComiteEnFirestore() : {}),
      estado: REGISTRO_ESTADOS.pendiente_pago,
      fecha: FieldValue.serverTimestamp(),
      [REGISTRO_ACEPTO_DATOS_EVENTO]: true,
      aceptoDatosEventoEn: FieldValue.serverTimestamp(),
    });

    if (isResendConfigured()) {
      void enviarConfirmacionRegistroEmail({
        registroId: ref.id,
        nombre,
        email,
        modalidadRegistro: modalidad,
        comite,
      }).catch((err) => {
        console.error("[api/registro] confirmacion email", err);
      });
      void avisarAdminNuevoRegistro({
        registroId: ref.id,
        nombre,
        email,
        whatsapp,
        modalidadRegistro: modalidad,
        comite,
        parroquiaLinea: [area, parroquia, iglesia].filter(Boolean).join(" · "),
        observaciones: observaciones || undefined,
      }).catch((err) => {
        console.error("[api/registro] aviso admin", err);
      });
    }

    return NextResponse.json({ id: ref.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error al guardar en Firestore.";
    console.error("[api/registro]", e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
