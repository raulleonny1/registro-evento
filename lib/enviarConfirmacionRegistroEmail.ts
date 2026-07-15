import { emailConfirmacionRegistro } from "@/lib/emailTemplates";
import {
  costoInscripcionEuros,
  etiquetaTarifaInscripcion,
  formatEuros,
  minimoPrimerDepositoEuros,
  type ModalidadRegistro,
} from "@/lib/eventoPrecio";
import { datosComiteEnFirestore } from "@/lib/comiteOrganizador";
import { isResendConfigured, sendEmail } from "@/lib/resendMail";

export type ConfirmacionRegistroInput = {
  registroId: string;
  nombre: string;
  email: string;
  modalidadRegistro: ModalidadRegistro;
  comite: boolean;
};

export async function enviarConfirmacionRegistroEmail(
  input: ConfirmacionRegistroInput,
): Promise<{ ok: true; id: string } | { ok: false; skipped?: boolean; error: string }> {
  if (!isResendConfigured()) {
    return { ok: false, skipped: true, error: "RESEND_API_KEY no configurada" };
  }

  const email = input.email.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { ok: false, error: "Correo no válido" };
  }

  const tarifa = {
    modalidadRegistro: input.modalidadRegistro,
    ...(input.comite ? datosComiteEnFirestore() : {}),
  };
  const plantilla = emailConfirmacionRegistro({
    nombre: input.nombre,
    registroId: input.registroId,
    etiquetaTarifa: etiquetaTarifaInscripcion(tarifa),
    importeTotal: formatEuros(costoInscripcionEuros(tarifa)),
    minimoDeposito: formatEuros(minimoPrimerDepositoEuros(tarifa)),
  });

  const res = await sendEmail({
    to: email,
    subject: plantilla.subject,
    html: plantilla.html,
    text: plantilla.text,
  });

  if (!res.ok) {
    return { ok: false, error: res.error };
  }
  return { ok: true, id: res.id };
}
