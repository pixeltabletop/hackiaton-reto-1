import type { Decision, Motivo } from './tipos';

/**
 * El camino que recorrió un caso dentro del motor, paso a paso.
 *
 * El motor evalúa en un orden fijo y **el primer paso que falla cierra el caso**: los
 * siguientes no se adivinan. Esta pieza no decide nada; solo traduce los motivos que
 * el motor ya emitió a los ocho pasos del contrato, para poder mostrarlos.
 */

export interface Paso {
  numero: number;
  nombre: string;
  /** Qué comprueba, en una línea, para quien no conoce el dominio. */
  pregunta: string;
  /** Nombres de regla del motor que pertenecen a este paso. */
  reglas: string[];
}

export const PASOS: Paso[] = [
  { numero: 1, nombre: 'Evidencia', pregunta: '¿Cada dato que se va a usar está citado textualmente en el informe?', reglas: ['evidencia'] },
  { numero: 2, nombre: 'Vigencia', pregunta: '¿La póliza estaba vigente el día del servicio?', reglas: ['vigencia'] },
  { numero: 3, nombre: 'Cobertura', pregunta: '¿El procedimiento está en el tarifario y no es una exclusión?', reglas: ['cobertura', 'carácter'] },
  { numero: 4, nombre: 'Red', pregunta: '¿El hospital está en la red? (la urgencia se cubre igual)', reglas: ['red', 'condiciones'] },
  { numero: 5, nombre: 'Preexistencias', pregunta: '¿Hay una condición previa declarada dentro de su carencia?', reglas: ['preexistencias'] },
  { numero: 6, nombre: 'Carencias', pregunta: '¿La afiliación cumple el tiempo mínimo que pide la póliza?', reglas: ['carencias', 'aplicación de la carencia'] },
  { numero: 7, nombre: 'Documentos', pregunta: '¿Están todos los papeles que exige la póliza para este carácter?', reglas: ['documentos'] },
  { numero: 8, nombre: 'Tope y umbral', pregunta: '¿El monto cabe en el tope anual y bajo el umbral del auditor?', reglas: ['tope', 'auditoria', 'montos'] },
];

/**
 * - `decidio`: aquí se cerró el caso.
 * - `cumplido`: se evaluó y dejó un motivo citado.
 * - `sin_observaciones`: se evaluó y no había nada que señalar (el motor solo emite motivo
 *   cuando hay algo que decir; que no diga nada no significa que no haya mirado).
 * - `no_evaluado`: viene después del paso que cerró el caso, así que no se llegó a mirar.
 */
export type EstadoPaso = 'cumplido' | 'sin_observaciones' | 'decidio' | 'no_evaluado';

export interface PasoRecorrido extends Paso {
  estado: EstadoPaso;
  motivos: Motivo[];
}

const CIERRA: Record<string, boolean> = {
  NO_CUBIERTO: true,
  CARENCIA_NO_CUMPLIDA: true,
  DOCUMENTOS_FALTANTES: true,
  DERIVAR_A_MEDICO_AUDITOR: true,
};

/**
 * Reparte los motivos del dictamen entre los ocho pasos. El paso donde vive el último
 * motivo es el que decidió, salvo que el caso se haya aprobado: entonces se recorrió entero
 * y todos los pasos cuentan como evaluados.
 */
export function recorrido(decision: Decision): PasoRecorrido[] {
  const pasoDeRegla = new Map<string, number>();
  for (const paso of PASOS) for (const regla of paso.reglas) pasoDeRegla.set(regla, paso.numero);

  const porPaso = new Map<number, Motivo[]>();
  let ultimo = 0;
  for (const motivo of decision.motivos) {
    const numero = pasoDeRegla.get(motivo.regla) ?? 8;
    if (!porPaso.has(numero)) porPaso.set(numero, []);
    porPaso.get(numero)!.push(motivo);
    ultimo = Math.max(ultimo, numero);
  }

  const cierra = CIERRA[decision.estado] === true;

  // Un caso aprobado pasó por los ocho; uno cerrado, hasta el paso que lo cerró.
  const hastaDonde = cierra ? ultimo : PASOS.length;

  return PASOS.map((paso) => {
    const motivos = porPaso.get(paso.numero) ?? [];
    let estado: EstadoPaso;
    if (paso.numero > hastaDonde) estado = 'no_evaluado';
    else if (paso.numero === ultimo && cierra) estado = 'decidio';
    else estado = motivos.length > 0 ? 'cumplido' : 'sin_observaciones';
    return { ...paso, estado, motivos };
  });
}
