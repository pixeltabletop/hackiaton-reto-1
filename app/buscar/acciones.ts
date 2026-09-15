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

export async function buscarPorFoto(datos: FormData): Promise<void> {
  const muestra = String(datos.get('muestra') ?? '');
  const foto = datos.get('foto');

  let imagen: Buffer | null = null;

  if (foto instanceof File && foto.size > 0) {
    if (foto.size > 12 * 1024 * 1024) redirect('/?error=archivo-grande');
    imagen = Buffer.from(await foto.arrayBuffer());
  } else if (muestra in MUESTRAS) {
    imagen = await readFile(path.join(process.cwd(), 'public', 'muestras', MUESTRAS[muestra]));
  }

  if (imagen === null) redirect('/?error=sin-foto');

  const lectura = await leerFoto(imagen);
  if (lectura.propuesta === null) redirect('/?error=no-leido');

  redirect(`/?q=${encodeURIComponent(lectura.propuesta)}&leido=1`);
}
