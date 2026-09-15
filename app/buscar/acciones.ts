'use server';

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { redirect } from 'next/navigation';
import { leerFoto } from '../../src/ocr/leer-documento';

/**
 * Lee la foto de la cédula o de la póliza y manda al buscador con el número leído.
 *
 * El OCR corre en el servidor: el teléfono solo sube la foto. Y nunca escribe en la
 * base: propone un número, el buscador lo resuelve y, si no existe, lo dice.
 */

/** Solo estas dos fotos de ejemplo se pueden leer del disco. Nada de rutas del usuario. */
const MUESTRAS: Record<string, string> = {
  cedula: 'cedula-8-742-1593.png',
  poliza: 'poliza-IS-A-2025-0871.png',
};

/**
 * Las acciones del servidor aceptan hasta 4 MB (next.config.mjs), por debajo del corte
 * de 4.5 MB de Vercel. El teléfono reduce la foto antes de subirla, así que esto solo
 * frena a un navegador que no pudo reducirla.
 */
const PESO_MAXIMO = 4 * 1024 * 1024;

/** Solo dos pantallas pueden recibir el resultado; cualquier otro valor vuelve al inicio. */
const DESTINOS: Record<string, string> = { inicio: '/', emergencia: '/emergencia' };

export async function buscarPorFoto(datos: FormData): Promise<void> {
  const destino = DESTINOS[String(datos.get('destino') ?? '')] ?? '/';
  const muestra = String(datos.get('muestra') ?? '');
  const foto = datos.get('foto');

  let imagen: Buffer | null = null;

  if (foto instanceof File && foto.size > 0) {
    if (foto.size > PESO_MAXIMO) redirect(`${destino}?error=archivo-grande`);
    imagen = Buffer.from(await foto.arrayBuffer());
  } else if (muestra in MUESTRAS) {
    imagen = await readFile(path.join(process.cwd(), 'public', 'muestras', MUESTRAS[muestra]));
  }

  if (imagen === null) redirect(`${destino}?error=sin-foto`);

  const lectura = await leerFoto(imagen);
  if (lectura.propuesta === null) redirect(`${destino}?error=no-leido`);

  redirect(`${destino}?q=${encodeURIComponent(lectura.propuesta)}&leido=1`);
}
