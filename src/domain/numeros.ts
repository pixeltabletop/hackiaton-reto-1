/**
 * Los números que identifican a una persona en un documento: la cédula y el número de
 * póliza. Vive aquí, y no dentro del OCR, para que lo pueda usar también el lector de
 * informes sin arrastrar el motor de OCR: buscar un número en un texto no es escanear.
 */

import { tipoDeConsulta } from './busqueda';

/**
 * Cédulas panameñas escritas con su estructura visible. La forma ordinaria exige
 * sus dos guiones: aceptar dígitos pegados aquí convierte fechas, teléfonos y
 * registros internos en personas distintas.
 */
const CEDULA_EN_TEXTO =
  /(?<![0-9A-Z])(?:(?:E|N|PE)-\d{1,2}-\d{3,6}|\d{1,2}-(?:AV|PI)-\d{1,4}-\d{3,6}|\d{1,2}-\d{1,4}-\d{3,6})(?![0-9A-Z-])/gi;
/** Póliza de Istmo Salud: IS-A-2025-0871, con o sin separadores. */
const POLIZA_EN_TEXTO = /\bIS[-.\s]?[A-Z][-.\s]?\d{4}[-.\s]?\d{3,5}\b/gi;

const FECHA_DIA_PRIMERO = /^(\d{1,2})-(\d{1,2})-(\d{4})$/;

function esFecha(valor: string): boolean {
  const partes = FECHA_DIA_PRIMERO.exec(valor);
  if (!partes) return false;
  const dia = Number(partes[1]);
  const mes = Number(partes[2]);
  return dia >= 1 && dia <= 31 && mes >= 1 && mes <= 12;
}

/** Arma la cédula en el formato del mostrador: 8-742-1593. */
export function formarCedula(digitos: string): string | null {
  const estructurada = digitos.trim().toUpperCase();
  if (
    /^(?:E|N|PE)-\d{1,2}-\d{3,6}$/.test(estructurada) ||
    /^\d{1,2}-(?:AV|PI)-\d{1,4}-\d{3,6}$/.test(estructurada)
  ) {
    return estructurada;
  }

  const solo = digitos.replace(/\D/g, '');
  if (solo.length < 7 || solo.length > 10) return null;

  // Una cédula panameña empieza con la provincia: del 1 al 13. Si el primer grupo es
  // 0 o pasa de 13, lo que se leyó no es una cédula: son dígitos de otra cosa (una
  // fecha, un monto, el número de un estudio). Aquí se descarta antes de proponerlo.
  const provincia = Number(solo.slice(0, solo.length >= 9 ? 2 : 1));
  if (!Number.isInteger(provincia) || provincia < 1 || provincia > 13) return null;

  const folio = solo.slice(solo.length >= 9 ? 2 : 1, solo.length - 4);
  const serial = solo.slice(-4);
  if (folio.length === 0) return null;

  return `${provincia}-${folio}-${serial}`;
}

/** Arma la póliza en el formato del mostrador: IS-A-2025-0871. */
export function formarPoliza(encontrada: string): string {
  const forma = encontrada.toUpperCase().replace(/[^0-9A-Z]/g, '');
  return `${forma.slice(0, 2)}-${forma[2]}-${forma.slice(3, 7)}-${forma.slice(7)}`;
}

/** Saca los números candidatos de cualquier texto: un informe, una foto, un correo. */
export function extraerNumeros(texto: string): { cedulas: string[]; polizas: string[] } {
  const cedulas = new Set<string>();
  const polizas = new Set<string>();

  for (const encontrado of texto.match(POLIZA_EN_TEXTO) ?? []) {
    polizas.add(formarPoliza(encontrado));
  }

  // Los dígitos de una póliza no son una cédula. Y como el OCR los pega sin separadores,
  // pasa seguido: "IS-A-2025-0871" produce un candidato "2-025-0871". Se descarta el
  // candidato que vive DENTRO de una póliza ya reconocida.
  const digitosDePolizas = [...polizas].map((poliza) => poliza.replace(/\D/g, ''));

  for (const encontrado of texto.match(CEDULA_EN_TEXTO) ?? []) {
    if (esFecha(encontrado)) continue;
    const formada = formarCedula(encontrado);
    if (formada === null) continue;
    if (tipoDeConsulta(formada) !== 'cedula') continue;

    const digitos = formada.replace(/\D/g, '');
    const dentroDeUnaPoliza = digitosDePolizas.some((poliza) => poliza.includes(digitos));
    if (dentroDeUnaPoliza) continue;

    cedulas.add(formada);
  }

  return { cedulas: [...cedulas], polizas: [...polizas] };
}
