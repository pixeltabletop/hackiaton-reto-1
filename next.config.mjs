/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // El OCR trae su propio wasm y sus workers: si el empaquetador lo mete en el
  // bundle, no encuentra sus archivos. Se deja como paquete externo y Node lo carga.
  serverExternalPackages: ['tesseract.js'],
  outputFileTracingIncludes: {
    '/': [
      './src/ocr/idioma/eng.traineddata',
      './src/ocr/worker-node-local.cjs',
      './node_modules/tesseract.js/src/worker-script/node/**/*',
      './node_modules/tesseract.js-core/**/*',
    ],
    '/emergencia': [
      './src/ocr/idioma/eng.traineddata',
      './src/ocr/worker-node-local.cjs',
      './node_modules/tesseract.js/src/worker-script/node/**/*',
      './node_modules/tesseract.js-core/**/*',
    ],
  },
  // Turbopack no trae .ts entre sus extensiones por defecto en esta versión.
  turbopack: {
    resolveExtensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.json'],
  },
};

export default nextConfig;
