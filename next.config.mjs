/**
 * Lo que necesita la lectura de fotos (OCR) dentro de la función del servidor: el modelo
 * de idioma, el worker, el wasm de Tesseract y las dos fotos de ejemplo. En Vercel,
 * `public/` se sirve desde la CDN y no llega sola a la función: por eso va incluida.
 */
const ARCHIVOS_DEL_OCR = [
  './src/ocr/idioma/eng.traineddata',
  './src/ocr/worker-node-local.cjs',
  // El paquete ENTERO, no solo el worker: dentro del worker se requieren otros archivos
  // del propio paquete, y si faltan el hilo muere sin error y la lectura se queda colgada.
  './node_modules/tesseract.js/**/*',
  './node_modules/tesseract.js-core/**/*',
  // Y sus dependencias, que el worker carga en caliente y el empaquetador no ve: la
  // primera vez en Vercel el hilo moría con «Cannot find module 'bmp-js'».
  './node_modules/bmp-js/**/*',
  './node_modules/zlibjs/**/*',
  './node_modules/is-url/**/*',
  './node_modules/node-fetch/**/*',
  './node_modules/whatwg-url/**/*',
  './node_modules/tr46/**/*',
  './node_modules/webidl-conversions/**/*',
  './node_modules/regenerator-runtime/**/*',
  './node_modules/wasm-feature-detect/**/*',
  './node_modules/idb-keyval/**/*',
  './public/muestras/*',
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // El OCR trae su propio wasm y sus workers: si el empaquetador lo mete en el
  // bundle, no encuentra sus archivos. Se deja como paquete externo y Node lo carga.
  serverExternalPackages: ['tesseract.js'],
  outputFileTracingIncludes: {
    '/': ARCHIVOS_DEL_OCR,
    '/emergencia': ARCHIVOS_DEL_OCR,
  },
  experimental: {
    // Por defecto una acción del servidor acepta 1 MB y una foto de celular pesa más.
    // 4 MB queda por debajo del corte de 4.5 MB de Vercel; el teléfono además la reduce.
    serverActions: { bodySizeLimit: '4mb' },
  },
  // Turbopack no trae .ts entre sus extensiones por defecto en esta versión.
  turbopack: {
    resolveExtensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.json'],
  },
};

export default nextConfig;
