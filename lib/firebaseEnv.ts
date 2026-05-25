/** Comprueba variables NEXT_PUBLIC de Firebase (inlined en build de Vercel). */
export function getFirebaseConfigError(): string | null {
  const missing: string[] = [];
  if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim()) {
    missing.push("NEXT_PUBLIC_FIREBASE_API_KEY");
  }
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim()) {
    missing.push("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
  }
  if (!process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim()) {
    missing.push("NEXT_PUBLIC_FIREBASE_APP_ID");
  }
  if (missing.length === 0) return null;
  return (
    `Firebase no está configurado en este despliegue (faltan: ${missing.join(", ")}). ` +
    "En Vercel → Settings → Environment Variables, copia las mismas variables que en .env.local y vuelve a desplegar."
  );
}

export function getFirebaseProjectIdPublic(): string | undefined {
  return process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() || undefined;
}

/** Añade pistas si el error parece timeout en producción (dominio / Vercel). */
export function enrichRegistroError(message: string): string {
  if (!message.includes("superó") && !message.includes("35s")) return message;
  const project = getFirebaseProjectIdPublic();
  const extra = [
    "En Vercel: añade todas las variables NEXT_PUBLIC_FIREBASE_* y redespliega.",
    "En Google Cloud → Credenciales → tu API key: permite tu dominio (*.vercel.app y tu dominio custom), no solo localhost.",
    project ? `Proyecto en build: ${project}.` : "Proyecto Firebase: no detectado en el build (variables vacías).",
    "Alternativa: configura FIREBASE_SERVICE_ACCOUNT_JSON en Vercel (cuenta de servicio) para guardar por /api/registro.",
  ];
  return `${message} ${extra.join(" ")}`;
}
