import { buscar, normalizar, tipoDeConsulta } from '../domain/busqueda';
import { extraerNumeros } from '../domain/numeros';

/**
 * Lee una foto de la cédula o de la póliza y saca los números.
 *
 * El OCR no es un adorno: es el paso que hace que un paramédico en una ambulancia
 * no tenga que teclear nada con una mano mientras el vehículo va en movimiento.
 * Lo que devuelve el OCR se pasa por las mismas reglas que lo tecleado a mano, así
 * que una foto nunca escribe en la base: solo propone lo que hay que buscar.
 */

export interface LecturaFoto {
  /** Todo lo que el OCR alcanzó a leer, para poder mostrarlo y auditar. */
  texto: string;
  /** Números de cédula candidatos, ya normalizados. */
  cedulas: string[];
  /** Números de póliza candidatos, ya normalizados. */
  polizas: string[];
  /** El que se va a buscar: prioriza la póliza, porque cubre a más de uno. */
  propuesta: string | null;
  error?: string;
}

/** Los números candidatos que el OCR alcanzó a ver. Las reglas viven en domain/numeros. */
export { extraerNumeros };

/**
 * OCR sobre una imagen. Tesseract corre en el servidor, así que el teléfono del
 * paramédico no tiene que descargar nada ni tener señal más allá de subir la foto.
 */
export async function leerFoto(imagen: Buffer): Promise<LecturaFoto> {
  let worker: Awaited<ReturnType<typeof import('tesseract.js').createWorker>> | null = null;
  try {
    const { createWorker } = await import('tesseract.js');
    worker = await createWorker('eng');
    // Los números son el objetivo: se le dice al OCR que no pierda tiempo con el resto.
    await worker.setParameters({
      tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-. ',
    });
    const { data } = await worker.recognize(imagen);
    const texto = data.text ?? '';
    const { cedulas, polizas } = extraerNumeros(texto);
    return {
      texto,
      cedulas,
      polizas,
      propuesta: elegirPropuesta({ cedulas, polizas }),
    };
  } catch (error) {
    return {
      texto: '',
      cedulas: [],
      polizas: [],
      propuesta: null,
      error: error instanceof Error ? error.message : 'no se pudo leer la foto',
    };
  } finally {
    await worker?.terminate().catch(() => undefined);
  }
}

/** Valida lo que alguien quiso decir con lo tecleado, sin inventar coincidencias. */
export function pareceNumero(texto: string): boolean {
  const limpio = normalizar(texto);
  return limpio.length >= 6 && tipoDeConsulta(texto) !== 'desconocido';
}

/**
 * De todos los números que el OCR alcanzó a ver, cuál se propone para buscar.
 *
 * El OCR se equivoca: un 8 puede ser un 3, y los dígitos de una póliza se pueden leer
 * como si fueran una cédula. Por eso se prefiere el candidato que EXISTE en la base y,
 * entre esos, la póliza, que es la que cubre a más de una persona. Si ninguno existe,
 * se propone el primero: que el buscador diga "no aparece" es una respuesta, no un error.
 */
export function elegirPropuesta(numeros: { cedulas: string[]; polizas: string[] }): string | null {
  const existe = (numero: string) => buscar(numero).coincidencias.length > 0;

  const polizaBuena = numeros.polizas.find(existe);
  if (polizaBuena) return polizaBuena;

  const cedulaBuena = numeros.cedulas.find(existe);
  if (cedulaBuena) return cedulaBuena;

  return numeros.polizas[0] ?? numeros.cedulas[0] ?? null;
}
