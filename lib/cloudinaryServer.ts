import { v2 as cloudinary } from "cloudinary";

/** Solo importar en API Routes / Server Actions (nunca en el cliente). */
export function ensureCloudinaryConfigured(): void {
  if (!process.env.CLOUDINARY_URL?.trim()) {
    throw new Error(
      "Falta CLOUDINARY_URL en el servidor (.env.local). Formato: cloudinary://API_KEY:API_SECRET@CLOUD_NAME",
    );
  }
  cloudinary.config();
}

export { cloudinary };
