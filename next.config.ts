import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Oculta el indicador flotante de desarrollo (la "N" del fondo) — a petición del fundador 2026-10-30
  devIndicators: false,
};

export default nextConfig;
