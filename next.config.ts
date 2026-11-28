import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // S-017 F0.4: sin typescript.ignoreBuildErrors — los errores de tipos son
  // errores de build (fail-closed); el tsc del repo es la misma vara.
  reactStrictMode: false,
  // Oculta el indicador flotante de desarrollo (la "N" del fondo) — a petición del fundador 2026-10-30
  devIndicators: false,
};

export default nextConfig;
