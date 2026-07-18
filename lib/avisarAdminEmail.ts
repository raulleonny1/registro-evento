import {
  emailAvisoAdminComprobante,
  emailAvisoAdminNuevoRegistro,
} from "@/lib/emailTemplates";
import {
  etiquetaTarifaInscripcion,
  formatEuros,
  type ModalidadRegistro,
} from "@/lib/eventoPrecio";
import { datosComiteEnFirestore } from "@/lib/comiteOrganizador";
import { isResendConfigured, sendEmail } from "@/lib/resendMail";

/** Correo de la administradora (Jessica) para avisos internos. */
export const ADMIN_ALERT_EMAIL = "jescoello70@gmail.com";

export async function avisarAdminNuevoRegistro(input: {
  registroId: string;
  nombre: string;
  email: string;
  whatsapp?: string;
  modalidadRegistro: ModalidadRegistro;
  comite: boolean;
  parroquiaLinea?: string;
  observaciones?: string;
}): Promise<void> {
  if (!isResendConfigured()) return;

  const tarifa = {
    modalidadRegistro: input.modalidadRegistro,
    ...(input.comite ? datosComiteEnFirestore() : {}),
  };
  const plantilla = emailAvisoAdminNuevoRegistro({
    nombre: input.nombre,
    email: input.email,
    whatsapp: input.whatsapp,
    registroId: input.registroId,
    etiquetaTarifa: etiquetaTarifaInscripcion(tarifa),
    parroquiaLinea: input.parroquiaLinea,
    observaciones: input.observaciones,
  });

  const res = await sendEmail({
    to: ADMIN_ALERT_EMAIL,
    subject: plantilla.subject,
    html: plantilla.html,
    text: plantilla.text,
  });
  if (!res.ok) {
    console.error("[avisarAdmin] nuevo registro", res.error);
  }
}

export async function avisarAdminComprobante(input: {
  registroId: string;
  nombre: string;
  email: string;
  montoDepositadoEuros?: number;
  comprobanteURL?: string;
}): Promise<void> {
  if (!isResendConfigured()) return;

  const monto =
    typeof input.montoDepositadoEuros === "number" &&
    Number.isFinite(input.montoDepositadoEuros)
      ? formatEuros(input.montoDepositadoEuros)
      : undefined;

  const plantilla = emailAvisoAdminComprobante({
    nombre: input.nombre,
    email: input.email,
    registroId: input.registroId,
    montoDepositado: monto,
    comprobanteURL: input.comprobanteURL,
  });

  const res = await sendEmail({
    to: ADMIN_ALERT_EMAIL,
    subject: plantilla.subject,
    html: plantilla.html,
    text: plantilla.text,
  });
  if (!res.ok) {
    console.error("[avisarAdmin] comprobante", res.error);
  }
}
