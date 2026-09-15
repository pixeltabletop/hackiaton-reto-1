/**
 * Reduce una foto en el teléfono antes de subirla.
 *
 * Una foto de celular pesa entre 2 y 6 MB. El servidor acepta hasta 4 MB por petición
 * (y Vercel corta a 4.5 MB), y el OCR no necesita más de 1.800 px de lado para leer una
 * cédula. Así la foto sube rápido con poca señal y nunca choca con el límite.
 *
 * Si el navegador no puede procesarla, se deja la original: el servidor dirá si pesa demasiado.
 */
const LADO_MAXIMO = 1800;

export async function reducirFoto(archivo: File): Promise<File> {
  try {
    const imagen = await createImageBitmap(archivo);
    const escala = Math.min(1, LADO_MAXIMO / Math.max(imagen.width, imagen.height));
    const lienzo = document.createElement('canvas');
    lienzo.width = Math.round(imagen.width * escala);
    lienzo.height = Math.round(imagen.height * escala);
    lienzo.getContext('2d')?.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
    imagen.close();

    const blob = await new Promise<Blob | null>((listo) => lienzo.toBlob(listo, 'image/jpeg', 0.85));
    if (!blob || blob.size >= archivo.size) return archivo;
    return new File([blob], archivo.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return archivo;
  }
}

/** Cambia el archivo elegido por su versión reducida, dentro del mismo campo del formulario. */
export async function reemplazarPorReducida(campo: HTMLInputElement): Promise<void> {
  const original = campo.files?.[0];
  if (!original) return;
  const reducida = await reducirFoto(original);
  if (reducida === original) return;
  try {
    const lista = new DataTransfer();
    lista.items.add(reducida);
    campo.files = lista.files;
  } catch {
    // Navegador sin DataTransfer: se sube la original.
  }
}
