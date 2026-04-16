import { loadEnvConfig } from "@next/env";
import { v2 as cloudinary } from "cloudinary";

const projectDir = process.cwd();

let configured = false;

/** Interpreta `cloudinary://API_KEY:API_SECRET@CLOUD_NAME` (formato oficial). */
function parseCloudinaryUrl(raw: string): { cloud_name: string; api_key: string; api_secret: string } | null {
  const s = raw.trim();
  try {
    const u = new URL(s);
    if (u.protocol !== "cloudinary:") return null;
    const cloud_name = u.hostname;
    const api_key = decodeURIComponent(u.username);
    const api_secret = decodeURIComponent(u.password);
    if (cloud_name && api_key && api_secret) {
      return { cloud_name, api_key, api_secret };
    }
  } catch {
    /* formato no estándar */
  }
  return null;
}

/**
 * Solo importar en API Routes / Server Actions (nunca en el cliente).
 * Carga `.env.local` con `loadEnvConfig` para que `CLOUDINARY_URL` exista en el proceso
 * (evita fallos con Turbopack / orden de carga).
 */
export function ensureCloudinaryConfigured(): void {
  if (configured) return;

  loadEnvConfig(projectDir);

  const rawUrl = process.env.CLOUDINARY_URL?.trim();
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  let creds: { cloud_name: string; api_key: string; api_secret: string } | null = null;

  if (rawUrl) {
    creds = parseCloudinaryUrl(rawUrl);
    if (!creds) {
      throw new Error(
        "CLOUDINARY_URL no es válida. Formato: cloudinary://API_KEY:API_SECRET@CLOUD_NAME (sin espacios). Si el secret tiene caracteres especiales, usa CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET por separado.",
      );
    }
  } else if (cloudName && apiKey && apiSecret) {
    creds = { cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret };
  }

  if (!creds) {
    throw new Error(
      "Falta Cloudinary en el servidor. Añade en .env.local CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME o las tres variables CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET. Reinicia \"npm run dev\" tras guardar.",
    );
  }

  cloudinary.config({
    cloud_name: creds.cloud_name,
    api_key: creds.api_key,
    api_secret: creds.api_secret,
  });
  configured = true;
}

export { cloudinary };
