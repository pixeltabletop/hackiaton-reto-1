/**
 * Los números que identifican a una persona en un documento: la cédula y el número de
 * póliza. Vive aquí, y no dentro del OCR, para que lo pueda usar también el lector de
 * informes sin arrastrar el motor de OCR: buscar un número en un texto no es escanear.
 */

import { tipoDeConsulta } from './busqueda';

/** Cédula panameña: provincia, folio y serial, con o sin separadores. */
const CEDULA_EN_TEXTO = /\b\d{1,2}[-.\s]?\d{1,4}[-.\s]?\d{3,6}\b/g;
/** Póliza de Istmo Salud: IS-A-2025-0871, con o sin separadores. */
const POLIZA_EN_TEXTO = /\bIS[-.\s]?[A-Z][-.\s]?\d{4}[-.\s]?\d{3,5}\b/gi;

/** Arma la cédula en el formato del mostrador: 8-742-1593. */
export function formarCedula(digitos: string): string | null {
  const solo = digitos.replace(/\D/g, '');
  if (solo.length < 7 || solo.length > 10) return null;
  const folio = solo.slice(1, solo.length - 4);
  const serial = solo.slice(-4);
  return `${solo.slice(0, 1)}-${folio}-${serial}`;
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

  for (const encontrado of texto.match(CEDULA_EN_TEXTO) ?? []) {
    const formada = formarCedula(encontrado);
    if (formada && tipoDeConsulta(formada) === 'cedula') cedulas.add(formada);
  }

  for (const encontrado of texto.match(POLIZA_EN_TEXTO) ?? []) {
    polizas.add(formarPoliza(encontrado));
  }

  return { cedulas: [...cedulas], polizas: [...polizas] };
}
