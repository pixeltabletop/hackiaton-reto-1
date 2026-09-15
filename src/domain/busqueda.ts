import { CASOS, type CasoCorpus } from '../data/casos';

/**
 * El mostrador de admisiones. Alguien teclea una cédula o el número de una póliza y
 * el sistema tiene que encontrar al asegurado, aunque lo teclee con guiones, con
 * espacios o sin nada: para la máquina "8-742-1593", "8 742 1593" y "87421593" son
 * la misma persona.
 */

export type TipoConsulta = 'cedula' | 'poliza' | 'desconocido';

export interface Consulta {
  /** Lo que tecleó la persona, tal cual. */
  texto: string;
  tipo: TipoConsulta;
  coincidencias: CasoCorpus[];
}

/** Deja solo letras y dígitos, en mayúscula. Es la llave de comparación. */
export function normalizar(texto: string): string {
  return texto.replace(/[^0-9A-Za-z]/g, '').toUpperCase();
}

/**
 * Qué tecleó la persona. No se adivina: una póliza empieza con las letras de la
 * aseguradora (IS-A-2025-0871); una cédula es solo dígitos (8-742-1593).
 */
export function tipoDeConsulta(texto: string): TipoConsulta {
  const limpio = normalizar(texto);
  if (limpio.length === 0) return 'desconocido';
  if (/^(?:E|N|PE)\d{4,8}$/.test(limpio)) return 'cedula';
  if (/^\d{1,2}(?:AV|PI)\d{4,10}$/.test(limpio)) return 'cedula';
  if (/^[A-Z]/.test(limpio)) return 'poliza';
  if (/^\d{6,12}$/.test(limpio)) return 'cedula';
  return 'desconocido';
}

/** Busca por cédula y, si no hay, por número de póliza. */
export function buscar(texto: string): Consulta {
  const limpio = normalizar(texto ?? '');
  const tipo = tipoDeConsulta(texto ?? '');
  if (limpio.length === 0) return { texto: texto ?? '', tipo, coincidencias: [] };

  const porCedula = CASOS.filter((caso) => normalizar(caso.cedula) === limpio);
  if (porCedula.length > 0) return { texto, tipo: 'cedula', coincidencias: porCedula };

  const porPoliza = CASOS.filter((caso) => normalizar(caso.numeroPoliza) === limpio);
  if (porPoliza.length > 0) return { texto, tipo: 'poliza', coincidencias: porPoliza };

  return { texto, tipo, coincidencias: [] };
}

/** Un caso solo cuenta como seguro cuando lo dictamina la póliza, no la caja. */
export interface Asegurado {
  tipo: TipoConsulta;
  etiqueta: string;
  valor: string;
}

/**
 * Los valores de prueba que se muestran debajo de la casilla. En una demo nadie
 * quiere inventarse una cédula: se muestra la lista y se prueba con uno.
 */
export const EJEMPLOS: Asegurado[] = [
  ...CASOS.map((caso) => ({
    tipo: 'cedula' as TipoConsulta,
    etiqueta: caso.titulo.replace(/^[A-ZÁÉÍÓÚ]/, (letra) => letra.toLowerCase()),
    valor: caso.cedula,
  })),
  {
    tipo: 'poliza',
    etiqueta: 'una póliza familiar, con dos asegurados',
    valor: 'IS-A-2025-0871',
  },
];

/** Cuántos asegurados cubre una póliza: es lo que hace sonreír a un corredor. */
export function aseguradosDe(poliza: string): number {
  return CASOS.filter((caso) => normalizar(caso.numeroPoliza) === normalizar(poliza)).length;
}
