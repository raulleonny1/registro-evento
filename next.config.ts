import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["cloudinary"],
  transpilePackages: ["html2pdf.js"],
};

export default nextConfig;
