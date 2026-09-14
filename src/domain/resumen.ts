import type { Decision } from './tipos';
import { formato } from './dinero';

/**
 * Lo que la web necesita para presentar una decisión sin inventar nada: la familia
 * de cada regla (para agrupar visualmente) y el veredicto en una línea, en palabras
 * de todos los días.
 */

export type Familia = 'cumplimiento' | 'cobertura' | 'documentos' | 'dinero' | 'neutro';

const FAMILIA_POR_REGLA: Record<string, Familia> = {
  vigencia: 'cumplimiento',
  preexistencias: 'cumplimiento',
  carencias: 'cumplimiento',
  'aplicación de la carencia': 'cumplimiento',
  carácter: 'cumplimiento',
  evidencia: 'cumplimiento',
  cobertura: 'cobertura',
  red: 'cobertura',
  condiciones: 'cobertura',
  documentos: 'documentos',
  montos: 'dinero',
  tope: 'dinero',
  auditoria: 'dinero',
};

export function familiaDe(regla: string): Familia {
  return FAMILIA_POR_REGLA[regla] ?? 'neutro';
}

const sinPuntoFinal = (texto: string): string => texto.replace(/\.\s*$/, '');

export function resumenDe(decision: Decision): string {
  const faltantes = decision.faltantes.length;

  switch (decision.estado) {
    case 'PRE_APROBADO':
      return `Cubierto: la aseguradora responde ${formato(decision.pagaAseguradora)} y el paciente paga ${formato(decision.pagaPaciente)}.`;

    case 'PRE_APROBADO_CON_CONDICIONES':
      return `Cubierto con condiciones por ser atención fuera de la red: la aseguradora responde ${formato(decision.pagaAseguradora)}.`;

    case 'DOCUMENTOS_FALTANTES':
      return faltantes === 1
        ? 'Falta un documento para poder aprobarlo.'
        : `Faltan ${faltantes} documentos para poder aprobarlo.`;

    case 'CARENCIA_NO_CUMPLIDA': {
      const desde = decision.motivos.find((m) => m.resultado.startsWith('Aplicará desde'));
      return desde
        ? `Todavía no aplica: ${desde.resultado.charAt(0).toLowerCase()}${desde.resultado.slice(1)}.`
        : 'Todavía no aplica: no cumple el tiempo de afiliación que exige la póliza.';
    }

    case 'NO_CUBIERTO': {
      const ultimo = decision.motivos[decision.motivos.length - 1];
      return `${sinPuntoFinal(ultimo?.resultado ?? 'No cubierto por la póliza')}.`;
    }

    case 'DERIVAR_A_MEDICO_AUDITOR': {
      const ultimo = decision.motivos[decision.motivos.length - 1];
      const detalle = ultimo ? `: ${ultimo.resultado.charAt(0).toLowerCase()}${ultimo.resultado.slice(1)}` : '';
      return `Pasa a revisión del médico auditor${sinPuntoFinal(detalle)}.`;
    }
  }
}
