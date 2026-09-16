import type { Decision, Estado } from './tipos';

/**
 * El estado del expediente, que es lo que mira quien trabaja con estos casos todo el día.
 *
 * El dictamen dice qué resolvió la póliza; el expediente dice **qué hay que hacer con la
 * solicitud**: si está cerrada, si espera un papel, si la revisa una persona o si el
 * paciente todavía no cumple una condición. Sale del dictamen, no de un campo aparte: dos
 * verdades separadas se contradicen solas.
 */

export type ClaveExpediente = 'aprobado' | 'condiciones' | 'documentos' | 'auditor' | 'espera' | 'cerrado';

export interface Expediente {
  clave: ClaveExpediente;
  etiqueta: string;
  /** Qué significa para la oficina que lo tramita. */
  detalle: string;
  /** Abierto = todavía hay algo que hacer. */
  abierto: boolean;
  /** De quién depende el siguiente paso. */
  responsable: 'aseguradora' | 'hospital' | 'paciente' | 'nadie';
}

const POR_ESTADO: Record<Estado, Omit<Expediente, 'clave'> & { clave: ClaveExpediente }> = {
  PRE_APROBADO: {
    clave: 'aprobado',
    etiqueta: 'Aprobado',
    detalle: 'Listo para agendar la cirugía.',
    abierto: false,
    responsable: 'nadie',
  },
  PRE_APROBADO_CON_CONDICIONES: {
    clave: 'condiciones',
    etiqueta: 'Aprobado con condiciones',
    detalle: 'Cubierto, con condiciones que hay que aceptar por escrito.',
    abierto: true,
    responsable: 'aseguradora',
  },
  DOCUMENTOS_FALTANTES: {
    clave: 'documentos',
    etiqueta: 'Faltan documentos',
    detalle: 'Espera papeles del hospital; con ellos se vuelve a dictaminar solo.',
    abierto: true,
    responsable: 'hospital',
  },
  DERIVAR_A_MEDICO_AUDITOR: {
    clave: 'auditor',
    etiqueta: 'En revisión médica',
    detalle: 'Hay criterio médico de por medio: lo firma una persona.',
    abierto: true,
    responsable: 'aseguradora',
  },
  CARENCIA_NO_CUMPLIDA: {
    clave: 'espera',
    etiqueta: 'En espera de carencia',
    detalle: 'Todavía no: la póliza pide más tiempo de afiliación.',
    abierto: true,
    responsable: 'paciente',
  },
  NO_CUBIERTO: {
    clave: 'cerrado',
    etiqueta: 'Cerrado, no cubierto',
    detalle: 'La póliza lo excluye. Queda la vía particular.',
    abierto: false,
    responsable: 'nadie',
  },
};

export function expedienteDe(decision: Decision): Expediente {
  return POR_ESTADO[decision.estado];
}

/** Los filtros de la bandeja, en el orden en que los mira una oficina: primero lo que espera algo. */
export const FILTROS: { clave: 'todos' | ClaveExpediente; etiqueta: string }[] = [
  { clave: 'todos', etiqueta: 'Todos' },
  { clave: 'documentos', etiqueta: 'Faltan documentos' },
  { clave: 'auditor', etiqueta: 'En revisión médica' },
  { clave: 'espera', etiqueta: 'En espera de carencia' },
  { clave: 'condiciones', etiqueta: 'Con condiciones' },
  { clave: 'aprobado', etiqueta: 'Aprobados' },
  { clave: 'cerrado', etiqueta: 'Cerrados' },
];

export function cuentaPorEstado(decisiones: Decision[]): Record<string, number> {
  const cuenta: Record<string, number> = { todos: decisiones.length };
  for (const decision of decisiones) {
    const { clave } = expedienteDe(decision);
    cuenta[clave] = (cuenta[clave] ?? 0) + 1;
  }
  return cuenta;
}
