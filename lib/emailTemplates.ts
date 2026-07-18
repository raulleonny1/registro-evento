import {
  CUENTA_DEPOSITO_IBAN,
  CUENTA_DEPOSITO_TITULAR,
  CUENTA_DEPOSITO_TITULAR_HINT,
} from "@/lib/cuentaDeposito";
import { getAppBaseUrl } from "@/lib/resendMail";
import { etiquetaFase, faseRecordatorio, type FaseRecordatorio } from "@/lib/recordatorioFrecuencia";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function layoutEmail(opts: {
  preheader: string;
  title: string;
  bodyHtml: string;
}): string {
  const base = getAppBaseUrl();
  const logoUrl = `${base}/logo-iere.jpg`;
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(opts.title)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f0ee;font-family:Georgia,'Times New Roman',serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(opts.preheader)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f0ee;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #ead9d6;box-shadow:0 8px 24px rgba(136,19,55,0.08);">
          <tr>
            <td style="background:linear-gradient(180deg,#fff5f5 0%,#ffffff 100%);padding:28px 28px 16px;text-align:center;border-bottom:1px solid #f3e2e0;">
              <img src="${logoUrl}" alt="IERE — Iglesia Española Reformada Episcopal" width="180" style="display:inline-block;max-width:180px;height:auto;border:0;" />
              <p style="margin:14px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#9f1239;font-weight:700;">
                Encuentro Nacional de Mujeres · 2026
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 28px 8px;color:#1c1917;">
              <h1 style="margin:0 0 16px;font-size:22px;line-height:1.35;font-weight:700;color:#881337;">
                ${escapeHtml(opts.title)}
              </h1>
              ${opts.bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:8px 28px 28px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fffbeb;border:1px solid #fde68a;border-radius:12px;">
                <tr>
                  <td style="padding:14px 16px;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.55;color:#78350f;">
                    <strong style="display:block;margin-bottom:4px;">Este correo es automático</strong>
                    No respondas a este mensaje: las respuestas no se atienden ni llegan al equipo organizador.
                    Si necesitas ayuda, utiliza la web del registro o contacta por los canales oficiales del evento.
                  </td>
                </tr>
              </table>
              <p style="margin:18px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.5;color:#a8a29e;text-align:center;">
                IERE · Encuentro Nacional de Mujeres · 25 al 27 de septiembre de 2026<br />
                «Cada Don, una Misión»
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function botonCta(href: string, label: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:22px 0 8px;">
    <tr>
      <td style="border-radius:10px;background:#9f1239;">
        <a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 22px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">
          ${escapeHtml(label)}
        </a>
      </td>
    </tr>
  </table>`;
}

export function emailRecordatorioDeposito(opts: {
  nombre: string;
  registroId?: string;
  fase?: FaseRecordatorio;
  esUltimoAviso?: boolean;
}): { subject: string; html: string; text: string } {
  const base = getAppBaseUrl();
  const continuarUrl = `${base}/registro/continuar`;
  const estadoUrl = opts.registroId ? `${base}/estado/${encodeURIComponent(opts.registroId)}` : null;
  const nombre = opts.nombre.trim() || "hermana";
  const fase = opts.fase ?? "lejos";
  const frecuenciaTxt = etiquetaFase(fase);
  const esUltimo = Boolean(opts.esUltimoAviso);

  const subject = esUltimo
    ? "Último recordatorio: depósito pendiente — Encuentro IERE 2026 (25–27 sept)"
    : "Recordatorio: depósito pendiente — Encuentro IERE 2026";

  const introUrgencia = esUltimo
    ? `<p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:#9f1239;">
        <strong>Quedan menos de 24 horas para el inicio del Encuentro (25 de septiembre de 2026).</strong>
        Este es el <strong>último recordatorio automático</strong> si aún no figura ningún depósito en el sistema.
      </p>`
    : `<p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:#44403c;">
        El Encuentro se celebra del <strong style="color:#1c1917;">25 al 27 de septiembre de 2026</strong>.
        Te escribimos porque tu inscripción <strong style="color:#1c1917;">aún no tiene ningún depósito registrado</strong>.
      </p>`;

  const bodyHtml = `
    <p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:#44403c;">
      Estimada <strong style="color:#1c1917;">${escapeHtml(nombre)}</strong>,
    </p>
    ${introUrgencia}
    <p style="margin:0 0 18px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:#44403c;">
      Para asegurar tu plaza, te invitamos a realizar la transferencia o el depósito y a subir el comprobante en la web.
    </p>

    <h2 style="margin:0 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;color:#9f1239;">
      Pasos a seguir
    </h2>
    <ol style="margin:0 0 18px;padding-left:20px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.7;color:#44403c;">
      <li style="margin-bottom:8px;"><strong>Realiza el pago</strong> (reserva mínima o importe completo según tu inscripción) a la cuenta indicada abajo.</li>
      <li style="margin-bottom:8px;">En el <strong>concepto</strong> escribe tu <strong>nombre y apellidos</strong>.</li>
      <li style="margin-bottom:8px;">Entra en la web → <strong>Continuar registro</strong>.</li>
      <li style="margin-bottom:8px;">Localiza tu ficha con los <strong>últimos 4 dígitos</strong> de tu móvil o con tu ID de registro.</li>
      <li style="margin-bottom:8px;"><strong>Sube el comprobante</strong> (foto o PDF) e indica el importe depositado.</li>
      <li>Espera la <strong>revisión del equipo</strong>. Cuando aprueben el pago podrás obtener tu código QR.</li>
    </ol>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 16px;background:#fafafa;border:1px solid #e7e5e4;border-radius:12px;">
      <tr>
        <td style="padding:16px 18px;">
          <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#9f1239;font-weight:700;">
            Cuenta para el pago
          </p>
          <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#1c1917;">
            ${escapeHtml(CUENTA_DEPOSITO_TITULAR)}
          </p>
          <p style="margin:0;font-family:Consolas,'Courier New',monospace;font-size:16px;font-weight:700;letter-spacing:0.04em;color:#1c1917;">
            ${CUENTA_DEPOSITO_IBAN}
          </p>
          <p style="margin:10px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#78716c;">
            ${escapeHtml(CUENTA_DEPOSITO_TITULAR_HINT)}
          </p>
        </td>
      </tr>
    </table>

    ${botonCta(continuarUrl, "Ir a Continuar registro")}
    ${
      estadoUrl
        ? `<p style="margin:8px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#78716c;">
            También puedes ver el estado de tu inscripción:<br />
            <a href="${escapeHtml(estadoUrl)}" style="color:#9f1239;">${escapeHtml(estadoUrl)}</a>
          </p>`
        : ""
    }

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:22px 0 0;background:#fff1f2;border:1px solid #fecdd3;border-radius:12px;">
      <tr>
        <td style="padding:14px 16px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.55;color:#9f1239;">
          <strong>Aviso sobre estos recordatorios</strong><br />
          Enviado: <strong>25 al 27 de septiembre de 2026</strong>. Mientras no haya depósito, la frecuencia será
          <strong>${escapeHtml(frecuenciaTxt)}</strong> según la proximidad a la fecha.
          Cuando subas un comprobante válido, <strong>dejarás de recibir</strong> estos avisos
          y te enviaremos un correo confirmando la recepción del depósito.
        </td>
      </tr>
    </table>
  `;

  const text = [
    `Estimada ${nombre},`,
    "",
    esUltimo
      ? "Último recordatorio: quedan menos de 24 h para el inicio (25 de septiembre de 2026) y aún no hay depósito."
      : "El Encuentro es del 25 al 27 de septiembre de 2026. Tu inscripción aún no tiene depósito registrado.",
    "",
    "Pasos:",
    "1. Realiza el pago a la cuenta indicada.",
    "2. Concepto: tu nombre y apellidos.",
    "3. Entra en Continuar registro en la web.",
    "4. Localiza tu ficha (últimos 4 dígitos del móvil o ID).",
    "5. Sube el comprobante.",
    "6. Espera la revisión del equipo para el código QR.",
    "",
    `Titular: ${CUENTA_DEPOSITO_TITULAR}`,
    `Cuenta: ${CUENTA_DEPOSITO_IBAN}`,
    CUENTA_DEPOSITO_TITULAR_HINT,
    "",
    `Continuar registro: ${continuarUrl}`,
    "",
    `Frecuencia de avisos mientras no haya pago: ${frecuenciaTxt}.`,
    "Este correo es automático: no respondas a este mensaje.",
  ].join("\n");

  return {
    subject,
    html: layoutEmail({
      preheader: esUltimo
        ? "Último aviso: depósito pendiente antes del Encuentro IERE 2026."
        : "Tu inscripción aún no tiene depósito. Te indicamos la cuenta y los pasos.",
      title: esUltimo ? "Último recordatorio de depósito" : "Depósito pendiente de tu inscripción",
      bodyHtml,
    }),
    text,
  };
}

export function emailConfirmacionRegistro(opts: {
  nombre: string;
  registroId: string;
  etiquetaTarifa: string;
  importeTotal: string;
  minimoDeposito: string;
}): { subject: string; html: string; text: string } {
  const base = getAppBaseUrl();
  const continuarUrl = `${base}/registro/continuar`;
  const estadoUrl = `${base}/estado/${encodeURIComponent(opts.registroId)}`;
  const nombre = opts.nombre.trim() || "hermana";
  const frecuenciaTxt = etiquetaFase(faseRecordatorio());

  const subject = "Inscripción recibida — Encuentro IERE 2026 (25–27 sept)";

  const bodyHtml = `
    <p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:#44403c;">
      Estimada <strong style="color:#1c1917;">${escapeHtml(nombre)}</strong>,
    </p>
    <p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:#44403c;">
      Tu inscripción al <strong style="color:#1c1917;">Encuentro Nacional de Mujeres IERE 2026</strong>
      (del <strong>25 al 27 de septiembre de 2026</strong>) se ha guardado correctamente en el sistema.
    </p>
    <p style="margin:0 0 18px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:#44403c;">
      El siguiente paso es realizar el <strong>depósito o transferencia</strong> y subir el comprobante en la web.
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 18px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;">
      <tr>
        <td style="padding:14px 16px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.55;color:#166534;">
          <strong>Tu inscripción</strong><br />
          ${escapeHtml(opts.etiquetaTarifa)} · importe total <strong>${escapeHtml(opts.importeTotal)}</strong><br />
          Reserva mínima para el primer depósito: <strong>${escapeHtml(opts.minimoDeposito)}</strong>
        </td>
      </tr>
    </table>

    <h2 style="margin:0 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;color:#9f1239;">
      Pasos a seguir
    </h2>
    <ol style="margin:0 0 18px;padding-left:20px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.7;color:#44403c;">
      <li style="margin-bottom:8px;"><strong>Realiza el pago</strong> (reserva mínima o importe completo) a la cuenta indicada abajo.</li>
      <li style="margin-bottom:8px;">En el <strong>concepto</strong> escribe tu <strong>nombre y apellidos</strong>.</li>
      <li style="margin-bottom:8px;">Entra en la web → <strong>Continuar registro</strong>.</li>
      <li style="margin-bottom:8px;">Localiza tu ficha con los <strong>últimos 4 dígitos</strong> de tu móvil o con tu ID de registro.</li>
      <li style="margin-bottom:8px;"><strong>Sube el comprobante</strong> (foto o PDF) e indica el importe depositado.</li>
      <li>Espera la <strong>revisión del equipo</strong>. Cuando aprueben el pago podrás obtener tu código QR.</li>
    </ol>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 16px;background:#fafafa;border:1px solid #e7e5e4;border-radius:12px;">
      <tr>
        <td style="padding:16px 18px;">
          <p style="margin:0 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#9f1239;font-weight:700;">
            Cuenta para el pago
          </p>
          <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#1c1917;">
            ${escapeHtml(CUENTA_DEPOSITO_TITULAR)}
          </p>
          <p style="margin:0;font-family:Consolas,'Courier New',monospace;font-size:16px;font-weight:700;letter-spacing:0.04em;color:#1c1917;">
            ${CUENTA_DEPOSITO_IBAN}
          </p>
          <p style="margin:10px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:#78716c;">
            ${escapeHtml(CUENTA_DEPOSITO_TITULAR_HINT)}
          </p>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 8px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#78716c;">
      ID de registro (guárdalo por si lo necesitas):<br />
      <strong style="font-family:Consolas,'Courier New',monospace;color:#1c1917;">${escapeHtml(opts.registroId)}</strong>
    </p>

    ${botonCta(continuarUrl, "Ir a Continuar registro")}
    <p style="margin:8px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#78716c;">
      También puedes ver el estado de tu inscripción:<br />
      <a href="${escapeHtml(estadoUrl)}" style="color:#9f1239;">${escapeHtml(estadoUrl)}</a>
    </p>

    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:22px 0 0;background:#fff1f2;border:1px solid #fecdd3;border-radius:12px;">
      <tr>
        <td style="padding:14px 16px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.55;color:#9f1239;">
          <strong>Recordatorios automáticos</strong><br />
          Si aún no has subido ningún comprobante, recibirás correos de recordatorio con esta misma cuenta bancaria.
          La frecuencia será de <strong>${escapeHtml(frecuenciaTxt)}</strong> según la proximidad al Encuentro
          (25 al 27 de septiembre de 2026). Al subir un comprobante válido, dejarás de recibirlos.
        </td>
      </tr>
    </table>
  `;

  const text = [
    `Estimada ${nombre},`,
    "",
    "Tu inscripción al Encuentro Nacional de Mujeres IERE 2026 (25 al 27 de septiembre de 2026) se ha guardado correctamente.",
    "",
    `Inscripción: ${opts.etiquetaTarifa} · total ${opts.importeTotal} · reserva mínima ${opts.minimoDeposito}`,
    "",
    "Pasos:",
    "1. Realiza el pago a la cuenta indicada.",
    "2. Concepto: tu nombre y apellidos.",
    "3. Entra en Continuar registro en la web.",
    "4. Localiza tu ficha (últimos 4 dígitos del móvil o ID).",
    "5. Sube el comprobante.",
    "6. Espera la revisión del equipo para el código QR.",
    "",
    `Titular: ${CUENTA_DEPOSITO_TITULAR}`,
    `Cuenta: ${CUENTA_DEPOSITO_IBAN}`,
    CUENTA_DEPOSITO_TITULAR_HINT,
    "",
    `ID de registro: ${opts.registroId}`,
    `Continuar registro: ${continuarUrl}`,
    `Estado: ${estadoUrl}`,
    "",
    `Recordatorios si no hay depósito: ${frecuenciaTxt}.`,
    "Este correo es automático: no respondas a este mensaje.",
  ].join("\n");

  return {
    subject,
    html: layoutEmail({
      preheader: "Inscripción recibida. Te indicamos la cuenta y los pasos para completar el pago.",
      title: "Tu inscripción ha sido recibida",
      bodyHtml,
    }),
    text,
  };
}

export function emailComprobanteRecibido(opts: {
  nombre: string;
  registroId: string;
}): { subject: string; html: string; text: string } {
  const base = getAppBaseUrl();
  const estadoUrl = `${base}/estado/${encodeURIComponent(opts.registroId)}`;
  const codigoUrl = `${base}/registro/codigo`;
  const nombre = opts.nombre.trim() || "hermana";

  const subject = "Comprobante recibido — ya puedes completar tu inscripción IERE 2026";

  const bodyHtml = `
    <p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:#44403c;">
      Estimada <strong style="color:#1c1917;">${escapeHtml(nombre)}</strong>,
    </p>
    <p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:#44403c;">
      Hemos registrado en el sistema el <strong style="color:#1c1917;">comprobante de depósito</strong> asociado a tu inscripción.
      Gracias por dar este paso.
    </p>
    <p style="margin:0 0 18px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:#44403c;">
      Tu ficha ha pasado a <strong>revisión</strong>. El equipo comprobará el pago.
      Cuando esté <strong>aprobado</strong>, podrás <strong>completar tu acceso al evento</strong> obteniendo el código QR.
    </p>

    <h2 style="margin:0 0 10px;font-family:Arial,Helvetica,sans-serif;font-size:13px;letter-spacing:0.12em;text-transform:uppercase;color:#9f1239;">
      Qué puedes hacer ahora
    </h2>
    <ol style="margin:0 0 18px;padding-left:20px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.7;color:#44403c;">
      <li style="margin-bottom:8px;">Consulta el <strong>estado de tu registro</strong> en la web.</li>
      <li style="margin-bottom:8px;">Espera la aprobación del comprobante (te recomendamos revisar el estado periódicamente).</li>
      <li style="margin-bottom:8px;">Cuando figure como <strong>aprobado</strong>, entra a obtener tu <strong>código QR</strong> para el acceso al Encuentro.</li>
      <li>Guarda tu ID de registro por si lo necesitas: <strong style="font-family:Consolas,'Courier New',monospace;">${escapeHtml(opts.registroId)}</strong></li>
    </ol>

    ${botonCta(estadoUrl, "Ver estado de mi inscripción")}
    <p style="margin:12px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#78716c;">
      Código del evento (cuando esté aprobado):<br />
      <a href="${escapeHtml(codigoUrl)}" style="color:#9f1239;">${escapeHtml(codigoUrl)}</a>
    </p>

    <p style="margin:20px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.65;color:#44403c;">
      A partir de ahora <strong>ya no recibirás recordatorios de depósito pendiente</strong>,
      porque el sistema ya ha detectado tu pago.
    </p>
  `;

  const text = [
    `Estimada ${nombre},`,
    "",
    "Hemos recibido tu comprobante de depósito. Tu ficha está en revisión.",
    "Cuando el pago esté aprobado podrás completar tu acceso al evento con el código QR.",
    "",
    `Estado: ${estadoUrl}`,
    `Código (cuando esté aprobado): ${codigoUrl}`,
    `ID: ${opts.registroId}`,
    "",
    "Ya no recibirás recordatorios de depósito pendiente.",
    "",
    "Este correo es automático: no respondas a este mensaje.",
  ].join("\n");

  return {
    subject,
    html: layoutEmail({
      preheader: "Comprobante recibido. Consulta el estado y completa tu acceso al Encuentro.",
      title: "Comprobante recibido correctamente",
      bodyHtml,
    }),
    text,
  };
}

/** Aviso interno para la administradora (Jessica). */
export function emailAvisoAdminNuevoRegistro(opts: {
  nombre: string;
  email: string;
  whatsapp?: string;
  registroId: string;
  etiquetaTarifa?: string;
  parroquiaLinea?: string;
  observaciones?: string;
}): { subject: string; html: string; text: string } {
  const base = getAppBaseUrl();
  const adminUrl = `${base}/admin`;
  const estadoUrl = `${base}/estado/${encodeURIComponent(opts.registroId)}`;
  const nombre = opts.nombre.trim() || "(sin nombre)";
  const email = opts.email.trim() || "(sin correo)";
  const whatsapp = (opts.whatsapp ?? "").trim();
  const tarifa = (opts.etiquetaTarifa ?? "").trim();
  const parroquia = (opts.parroquiaLinea ?? "").trim();
  const observaciones = (opts.observaciones ?? "").trim();

  const subject = `Nueva inscripción: ${nombre}`;

  const bodyHtml = `
    <p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:#44403c;">
      Hola Jessica,
    </p>
    <p style="margin:0 0 18px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:#44403c;">
      Hay una <strong style="color:#1c1917;">nueva inscripción</strong> en el Encuentro IERE 2026.
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 16px;background:#fafafa;border:1px solid #e7e5e4;border-radius:12px;">
      <tr>
        <td style="padding:16px 18px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.7;color:#44403c;">
          <strong>Nombre:</strong> ${escapeHtml(nombre)}<br />
          <strong>Correo:</strong> ${escapeHtml(email)}<br />
          ${whatsapp ? `<strong>Móvil:</strong> ${escapeHtml(whatsapp)}<br />` : ""}
          ${tarifa ? `<strong>Tarifa:</strong> ${escapeHtml(tarifa)}<br />` : ""}
          ${parroquia ? `<strong>Parroquia:</strong> ${escapeHtml(parroquia)}<br />` : ""}
          ${observaciones ? `<strong>Observaciones:</strong> ${escapeHtml(observaciones)}<br />` : ""}
          <strong>ID:</strong> <span style="font-family:Consolas,'Courier New',monospace;">${escapeHtml(opts.registroId)}</span>
        </td>
      </tr>
    </table>
    ${botonCta(adminUrl, "Abrir panel de administración")}
    <p style="margin:12px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#78716c;">
      Ficha: <a href="${escapeHtml(estadoUrl)}" style="color:#9f1239;">${escapeHtml(estadoUrl)}</a>
    </p>
  `;

  const text = [
    "Hola Jessica,",
    "",
    "Nueva inscripción en el Encuentro IERE 2026.",
    `Nombre: ${nombre}`,
    `Correo: ${email}`,
    whatsapp ? `Móvil: ${whatsapp}` : "",
    tarifa ? `Tarifa: ${tarifa}` : "",
    parroquia ? `Parroquia: ${parroquia}` : "",
    observaciones ? `Observaciones: ${observaciones}` : "",
    `ID: ${opts.registroId}`,
    "",
    `Admin: ${adminUrl}`,
    `Estado: ${estadoUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    subject,
    html: layoutEmail({
      preheader: `Nueva inscripción de ${nombre}.`,
      title: "Nueva inscripción recibida",
      bodyHtml,
    }),
    text,
  };
}

export function emailAvisoAdminComprobante(opts: {
  nombre: string;
  email: string;
  registroId: string;
  montoDepositado?: string;
  comprobanteURL?: string;
}): { subject: string; html: string; text: string } {
  const base = getAppBaseUrl();
  const adminUrl = `${base}/admin`;
  const estadoUrl = `${base}/estado/${encodeURIComponent(opts.registroId)}`;
  const nombre = opts.nombre.trim() || "(sin nombre)";
  const email = opts.email.trim() || "(sin correo)";
  const monto = (opts.montoDepositado ?? "").trim();
  const url = (opts.comprobanteURL ?? "").trim();

  const subject = `Comprobante subido: ${nombre}`;

  const bodyHtml = `
    <p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:#44403c;">
      Hola Jessica,
    </p>
    <p style="margin:0 0 18px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:#44403c;">
      Se ha subido un <strong style="color:#1c1917;">comprobante de pago</strong> y la ficha está en revisión.
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 16px;background:#fafafa;border:1px solid #e7e5e4;border-radius:12px;">
      <tr>
        <td style="padding:16px 18px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.7;color:#44403c;">
          <strong>Nombre:</strong> ${escapeHtml(nombre)}<br />
          <strong>Correo:</strong> ${escapeHtml(email)}<br />
          ${monto ? `<strong>Importe acumulado registrado:</strong> ${escapeHtml(monto)}<br />` : ""}
          <strong>ID:</strong> <span style="font-family:Consolas,'Courier New',monospace;">${escapeHtml(opts.registroId)}</span>
        </td>
      </tr>
    </table>
    ${botonCta(adminUrl, "Revisar en el panel")}
    ${
      url
        ? `<p style="margin:12px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#78716c;">
            Comprobante:<br />
            <a href="${escapeHtml(url)}" style="color:#9f1239;">${escapeHtml(url)}</a>
          </p>`
        : ""
    }
    <p style="margin:12px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#78716c;">
      Ficha: <a href="${escapeHtml(estadoUrl)}" style="color:#9f1239;">${escapeHtml(estadoUrl)}</a>
    </p>
  `;

  const text = [
    "Hola Jessica,",
    "",
    "Se ha subido un comprobante de pago (ficha en revisión).",
    `Nombre: ${nombre}`,
    `Correo: ${email}`,
    monto ? `Importe acumulado: ${monto}` : "",
    `ID: ${opts.registroId}`,
    url ? `Comprobante: ${url}` : "",
    "",
    `Admin: ${adminUrl}`,
    `Estado: ${estadoUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    subject,
    html: layoutEmail({
      preheader: `Comprobante de ${nombre} listo para revisar.`,
      title: "Comprobante subido",
      bodyHtml,
    }),
    text,
  };
}
