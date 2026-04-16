import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Check-in — Evento",
  description: "Validación de entrada por código QR",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function CheckInLayout({ children }: { children: ReactNode }) {
  return children;
}
