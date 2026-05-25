import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["cloudinary", "firebase-admin"],
  transpilePackages: ["html2pdf.js"],
};

export default nextConfig;
