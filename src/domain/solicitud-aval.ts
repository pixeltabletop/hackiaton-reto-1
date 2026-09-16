import { formato } from './dinero';
import { contactosDe } from '../data/directorio';
import { procedimientoDe } from '../data/catalogo';
import { ETIQUETA_ESTADO } from './presentacion';
import type { Caso, Decision, Plan } from './tipos';

/**
 * El borrador de la **solicitud de aval**: el papel que el hospital le manda a la
 * aseguradora para adelantar el trámite.
 *
 * Es una solicitud, no una autorización, y la diferencia no es de palabras. Un documento
 * con monto, cláusulas y aire de carta oficial es algo que alguien presenta en admisiones;
 * si dijera «aval», este producto estaría emitiendo lo que dice no emitir. PRIOR AI
 * dictamina; quien avala es el médico auditor, con su firma. Por eso el documento pide, no
 * concede, y lo dice en su propio pie.
 *
 * Lo que adelanta es real: quien lo recibe ya tiene el caso armado, los datos citados, las
 * cláusulas aplicadas y la lista de lo que falta. Eso es lo que hoy toma horas de teléfono.
 */

export interface FilaAval {
  etiqueta: string;
  valor: string;
  /** Cláusula que respalda el dato, cuando la hay. Sin cláusula no se inventa una. */
  clausula?: string;
}

export interface BloqueAval {
  titulo: string;
  filas: FilaAval[];
}

export interface SolicitudAval {
  folio: string;
  fecha: string;
  para: string;
  correoDestino: string | null;
  de: string;
  asunto: string;
  bloques: BloqueAval[];
  /** Lo que falta para que la aseguradora pueda resolver. Vacío = no falta nada. */
  faltantes: { documento: string; clausula: string }[];
  clausulasCitadas: string[];
  /** El pie legal. No es decorativo: es lo que impide que esto se lea como una autorización. */
  advertencia: string;
}

const CARACTER: Record<string, string> = {
  electiva: 'Electiva (programada)',
  urgente: 'Urgencia',
  emergencia: 'Emergencia',
};

export const ADVERTENCIA =
  'Este documento es un BORRADOR DE SOLICITUD generado automáticamente a partir del informe ' +
  'y de la póliza. No es una autorización ni un aval: no obliga a la aseguradora ni compromete ' +
  'cobertura. La autorización la emite el médico auditor de la aseguradora, con su firma.';

export function solicitudDe(
  caso: Caso,
  plan: Plan,
  decision: Decision,
  hoy: string = caso.fecha,
): SolicitudAval {
  const contactos = contactosDe(plan.aseguradora);
  const procedimiento = procedimientoDe(caso.procedimientoCups);
  const clausulasCitadas = [...new Set(decision.motivos.map((m) => m.clausula))].sort();
  const reparte = decision.estado.startsWith('PRE_APROBADO');

  const bloques: BloqueAval[] = [
    {
      titulo: 'Asegurado',
      filas: [
        { etiqueta: 'Referencia', valor: caso.pacienteRef },
        { etiqueta: 'Cédula', valor: caso.cedula },
        { etiqueta: 'Edad y sexo', valor: `${caso.edad} años · ${caso.sexo}` },
        { etiqueta: 'Afiliado desde', valor: caso.fechaAfiliacion },
      ],
    },
    {
      titulo: 'Póliza',
      filas: [
        { etiqueta: 'Número', valor: caso.numeroPoliza },
        { etiqueta: 'Plan', valor: `${plan.plan} · ${plan.aseguradora}` },
        {
          etiqueta: 'Vigencia',
          valor: `del ${plan.vigenciaDesdeIso} al ${plan.vigenciaHastaIso}`,
          clausula: '1.1',
        },
      ],
    },
    {
      titulo: 'Atención solicitada',
      filas: [
        { etiqueta: 'Hospital', valor: caso.hospital, clausula: '4.1' },
        { etiqueta: 'Fecha del servicio', valor: caso.fecha },
        { etiqueta: 'Diagnóstico (CIE-10)', valor: caso.diagnosticoCie10 },
        {
          etiqueta: 'Procedimiento (CUPS)',
          valor: `${caso.procedimientoCups} · ${procedimiento.nombre}`,
          clausula: '2.1',
        },
        { etiqueta: 'Carácter', valor: CARACTER[caso.caracter] ?? caso.caracter },
        { etiqueta: 'Cirujano', valor: caso.cirujano },
        { etiqueta: 'Monto estimado', valor: formato(caso.montoEstimado) },
      ],
    },
    {
      titulo: 'Dictamen preliminar del sistema',
      filas: [
        { etiqueta: 'Resultado', valor: ETIQUETA_ESTADO[decision.estado] },
        { etiqueta: 'Red', valor: decision.enRed ? 'Hospital dentro de la red' : 'Hospital fuera de la red', clausula: '4.1' },
        { etiqueta: 'Meses de afiliación', valor: String(decision.mesesAfiliado), clausula: '3.1' },
        ...(reparte
          ? [
              { etiqueta: 'Deducible aplicado', valor: formato(decision.deducibleAplicado), clausula: '7.1' },
              { etiqueta: 'Coaseguro aplicado', valor: formato(decision.coaseguroAplicado), clausula: '7.2' },
              { etiqueta: 'Correspondería a la aseguradora', valor: formato(decision.pagaAseguradora) },
              { etiqueta: 'Correspondería al asegurado', valor: formato(decision.pagaPaciente) },
            ]
          : [{ etiqueta: 'Reparto', valor: 'Sin calcular: el caso no está aprobado.' }]),
      ],
    },
    {
      titulo: 'Motivos, cláusula por cláusula',
      filas: decision.motivos.map((m) => ({
        etiqueta: m.regla,
        valor: m.resultado,
        clausula: m.clausula,
      })),
    },
  ];

  return {
    folio: `SA-${caso.id}`,
    fecha: hoy,
    para: plan.aseguradora,
    correoDestino: contactos?.correoAutorizaciones ?? null,
    de: caso.hospital,
    asunto: `Solicitud de aval — ${procedimiento.nombre} — póliza ${caso.numeroPoliza}`,
    bloques,
    faltantes: decision.faltantes.map((f) => ({ documento: f.documento, clausula: f.clausula })),
    clausulasCitadas,
    advertencia: ADVERTENCIA,
  };
}
