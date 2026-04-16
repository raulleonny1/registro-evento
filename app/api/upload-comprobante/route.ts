import { NextRequest, NextResponse } from "next/server";
import { ensureCloudinaryConfigured, cloudinary } from "@/lib/cloudinaryServer";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_BYTES = 15 * 1024 * 1024;

const ALLOWED_PREFIX = [
  "image/",
  "application/pdf",
  "application/x-pdf",
];

function isAllowedMime(mime: string): boolean {
  const m = mime.toLowerCase();
  if (ALLOWED_PREFIX.some((p) => m.startsWith(p))) return true;
  if (m === "application/octet-stream") return true;
  return false;
}

export async function POST(request: NextRequest) {
  try {
    ensureCloudinaryConfigured();
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Cloudinary no configurado" },
      { status: 503 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "No se pudo leer el formulario." }, { status: 400 });
  }

  const file = formData.get("file");
  const registroIdRaw = formData.get("registroId");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo." }, { status: 400 });
  }

  const registroId =
    typeof registroIdRaw === "string" ? registroIdRaw.trim() : String(registroIdRaw ?? "").trim();
  if (!registroId || registroId.length > 128 || /[\r\n\0]/.test(registroId)) {
    return NextResponse.json({ error: "ID de registro no válido." }, { status: 400 });
  }

  if (!file.size) {
    return NextResponse.json({ error: "Archivo vacío." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `Archivo demasiado grande (máx. ${Math.round(MAX_BYTES / (1024 * 1024))} MB).` },
      { status: 400 },
    );
  }

  const mime = file.type || "application/octet-stream";
  if (!isAllowedMime(mime)) {
    return NextResponse.json(
      { error: "Tipo no permitido. Usa imagen (JPG, PNG, etc.) o PDF." },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const folder = `registro-evento/comprobantes/${registroId}`;

  const result = await new Promise<{ secure_url: string }>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "auto",
        use_filename: true,
        unique_filename: true,
        overwrite: false,
      },
      (err, res) => {
        if (err) {
          reject(err);
          return;
        }
        if (!res?.secure_url) {
          reject(new Error("Cloudinary no devolvió URL."));
          return;
        }
        resolve({ secure_url: res.secure_url });
      },
    );
    stream.end(buffer);
  });

  return NextResponse.json({ url: result.secure_url });
}
