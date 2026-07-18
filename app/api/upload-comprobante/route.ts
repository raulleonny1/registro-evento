import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Antes usaba Cloudinary. Los comprobantes van ahora a Firebase Storage
 * desde el cliente (components/SubirComprobante.tsx).
 * Se mantiene la ruta para no romper despliegues antiguos; responde 410.
 */
export async function POST(_request: NextRequest) {
  return NextResponse.json(
    {
      error:
        "La subida de comprobantes usa Firebase Storage en el navegador. Actualiza la web o vuelve a desplegar.",
    },
    { status: 410 },
  );
}
