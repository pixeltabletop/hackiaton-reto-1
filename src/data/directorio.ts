/**
 * El directorio operativo de la aseguradora: teléfonos, horarios de urgencias,
 * especialidades por hospital y a quién llamar.
 *
 * **Esto NO es la póliza y no se presenta como si lo fuera.** El texto de la póliza es un
 * documento contractual y sus cláusulas son lo único que el motor cita; un teléfono de
 * admisiones no vive ahí y meterlo obligaría a mover el texto legal, que es donde están
 * anclados los offsets de todas las citas. Vive aparte, a propósito, y la interfaz lo marca
 * como «Directorio» — sin número de cláusula, porque no lo tiene.
 *
 * Esa separación es la que permite mirar una pantalla y saber de un vistazo qué salió del
 * contrato y qué salió de la operación.
 *
 * Datos sintéticos, como todo el corpus: los teléfonos no existen.
 */

export interface FichaHospital {
  /** Debe coincidir carácter por carácter con `Hospital.hospital` de la red del plan. */
  hospital: string;
  telefono: string;
  urgencias24h: boolean;
  especialidades: string[];
  /** Referencia urbana, no dirección exacta: en una ambulancia sirve más el barrio. */
  zona: string;
}

export interface ContactosAseguradora {
  /** Debe coincidir con `Plan.aseguradora`. */
  aseguradora: string;
  linea24h: string;
  correoAutorizaciones: string;
}

/**
 * El intermediario es del **contratante**, no de la póliza: una misma póliza cambia de
 * corredor sin que el contrato se toque. Por eso cuelga del plan contratado y nunca se
 * presenta como dato citado.
 */
export interface ContactoContratante {
  planId: string;
  nombre: string;
  telefono: string;
  correo: string;
}

export const HOSPITALES: FichaHospital[] = [
  {
    hospital: 'Hospital Nacional de Panamá',
    telefono: '+507 300-6200',
    urgencias24h: true,
    especialidades: ['Cirugía general', 'Ortopedia', 'Ginecología y obstetricia'],
    zona: 'Calidonia, Ciudad de Panamá',
  },
  {
    hospital: 'Clínica Costa del Este',
    telefono: '+507 306-4100',
    urgencias24h: true,
    especialidades: ['Cirugía general', 'Ortopedia', 'Ginecología y obstetricia'],
    zona: 'Costa del Este, Ciudad de Panamá',
  },
  {
    hospital: 'Hospital Metropolitano del Istmo',
    telefono: '+507 264-7700',
    urgencias24h: true,
    especialidades: ['Cirugía general', 'Ginecología y obstetricia'],
    zona: 'San Francisco, Ciudad de Panamá',
  },
  {
    hospital: 'Hospital del Valle de Antón',
    telefono: '+507 983-5050',
    urgencias24h: false,
    especialidades: ['Cirugía general'],
    zona: 'Antón, Coclé',
  },
  {
    // No está en la red de ningún plan: es donde aparece uno de los casos del corpus.
    // El directorio igual lo conoce, porque la pregunta «¿dónde estoy?» no depende de
    // si la aseguradora tiene convenio.
    hospital: 'Hospital Regional de Azuero',
    telefono: '+507 996-4444',
    urgencias24h: true,
    especialidades: ['Cirugía general'],
    zona: 'Chitré, Herrera',
  },
];

export const ASEGURADORAS: ContactosAseguradora[] = [
  {
    aseguradora: 'Aseguradora Istmo Salud',
    linea24h: '+507 800-4357',
    correoAutorizaciones: 'autorizaciones@istmosalud.com.pa',
  },
];

export const CONTRATANTES: ContactoContratante[] = [
  {
    planId: 'PLAN-A',
    nombre: 'Corredores Bahía — póliza familiar',
    telefono: '+507 264-1180',
    correo: 'atencion@corredoresbahia.com.pa',
  },
  {
    planId: 'PLAN-B',
    nombre: 'Recursos Humanos del contratante',
    telefono: '+507 302-9070',
    correo: 'beneficios@contratante.com.pa',
  },
  {
    planId: 'PLAN-C',
    nombre: 'Corredores Bahía — cuenta ejecutiva',
    telefono: '+507 264-1185',
    correo: 'ejecutiva@corredoresbahia.com.pa',
  },
];

export function fichaDe(hospital: string): FichaHospital | null {
  return HOSPITALES.find((h) => h.hospital === hospital) ?? null;
}

export function contactosDe(aseguradora: string): ContactosAseguradora | null {
  return ASEGURADORAS.find((a) => a.aseguradora === aseguradora) ?? null;
}

export function contratanteDe(planId: string): ContactoContratante | null {
  return CONTRATANTES.find((c) => c.planId === planId) ?? null;
}

/**
 * Qué especialidad atiende cada procedimiento del tarifario.
 *
 * Vive en el directorio y no en el tarifario porque es un dato de **red**, no de precio:
 * sirve para responder «¿este hospital puede operarme esto?», que es la pregunta que se
 * hace alguien decidiendo a dónde ir. No se inventan médicos con nombre y apellido: sin
 * fuente, un nombre propio en una pantalla de salud es relleno.
 */
export const ESPECIALIDAD_POR_CUPS: Record<string, string> = {
  '512301': 'Cirugía general',
  '452101': 'Cirugía general',
  '793501': 'Ortopedia',
  '471201': 'Cirugía general',
  '892001': 'Ginecología y obstetricia',
  '158001': 'Cirugía plástica',
};

export function especialidadDe(cups: string): string | null {
  return ESPECIALIDAD_POR_CUPS[cups] ?? null;
}
