/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // El OCR trae su propio wasm y sus workers: si el empaquetador lo mete en el
  // bundle, no encuentra sus archivos. Se deja como paquete externo y Node lo carga.
  serverExternalPackages: ['tesseract.js'],
  // Turbopack no trae .ts entre sus extensiones por defecto en esta versión.
  turbopack: {
    resolveExtensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.json'],
  },
};

export default nextConfig;
