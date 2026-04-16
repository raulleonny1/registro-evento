import QRCode from "qrcode";

/** Código QR que codifica el ID del registro (data URL PNG). */
export function generateQrDataUrl(registroId: string, width = 320): Promise<string> {
  return QRCode.toDataURL(registroId, { width, margin: 2 });
}
