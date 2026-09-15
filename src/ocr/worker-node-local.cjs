'use strict';

// Este worker no tiene permiso lógico para descargar modelos. Si una versión futura
// de Tesseract intenta usar una URL, el OCR falla cerrado en vez de salir a la red.
global.fetch = async (url) => {
  throw new Error('el OCR intentó acceder a la red: ' + String(url));
};

require('tesseract.js/src/worker-script/node/index.js');
