import type { Caso, Clausula, Decision, Plan } from './tipos';
import { clausulaDe } from './poliza';
import { dictaminar } from './motor';

/**
 * Todo lo que la web necesita para pintar un caso, ya resuelto: nada de lógica en
 * los componentes. La página es un componente de servidor, sin JavaScript en el
 * cliente, así que abrir el enlace es instantáneo y no depende del navegador.
 */

export const ETIQUETA_ESTADO: Record<Decision['estado'], string> = {
  PRE_APROBADO: 'Pre-aprobado',
  PRE_APROBADO_CON_CONDICIONES: 'Pre-aprobado con condiciones',
  DOCUMENTOS_FALTANTES: 'Documentos faltantes',
  NO_CUBIERTO: 'No cubierto',
  CARENCIA_NO_CUMPLIDA: 'Carencia no cumplida',
  DERIVAR_A_MEDICO_AUDITOR: 'Deriva al médico auditor',
};

export const CLASE_ESTADO: Record<Decision['estado'], string> = {
  PRE_APROBADO: 'aprobado',
  PRE_APROBADO_CON_CONDICIONES: 'condiciones',
  DOCUMENTOS_FALTANTES: 'faltantes',
  NO_CUBIERTO: 'no-cubierto',
  CARENCIA_NO_CUMPLIDA: 'carencia',
  DERIVAR_A_MEDICO_AUDITOR: 'auditor',
};

export interface Segmento {
  texto: string;
  campo: string | null;
}

/** Corta el documento en tramos, marcando los que están respaldados por una cita. */
export function segmentosDeInforme(caso: Caso, decision: Decision): Segmento[] {
  const rangos = decision.campos
    .filter((campo) => campo.verificado && campo.offset >= 0)
    .map((campo) => ({
      campo: campo.campo,
      desde: campo.offset,
      hasta: campo.offset + campo.cita.length,
    }))
    .sort((a, b) => a.desde - b.desde);

  const segmentos: Segmento[] = [];
  let cursor = 0;
  for (const rango of rangos) {
    if (rango.desde < cursor) continue; // solapados: se conserva el primero
    if (rango.desde > cursor) {
      segmentos.push({ texto: caso.informeTexto.slice(cursor, rango.desde), campo: null });
    }
    segmentos.push({
      texto: caso.informeTexto.slice(rango.desde, rango.hasta),
      campo: rango.campo,
    });
    cursor = rango.hasta;
  }
  segmentos.push({ texto: caso.informeTexto.slice(cursor), campo: null });
  return segmentos;
}

export interface ClausulaAplicada {
  clausula: Clausula;
  veces: number;
}

export function clausulasAplicadas(plan: Plan, decision: Decision): ClausulaAplicada[] {
  const cuenta = new Map<string, number>();
  for (const motivo of decision.motivos) {
    cuenta.set(motivo.clausula, (cuenta.get(motivo.clausula) ?? 0) + 1);
  }
  return [...cuenta.entries()]
    .map(([id, veces]) => ({ clausula: clausulaDe(plan.clausulas, id), veces }))
    .sort((a, b) => a.clausula.id.localeCompare(b.clausula.id));
}

export interface VistaCaso {
  caso: Caso;
  plan: Plan;
  decision: Decision;
  segmentos: Segmento[];
  clausulas: ClausulaAplicada[];
  procedimiento: string;
}

export function armarVista(caso: Caso, plan: Plan): VistaCaso {
  const decision = dictaminar(caso, plan);
  const procedimiento =
    plan.procedimientos.find((p) => p.cups === caso.procedimientoCups)?.nombre ??
    plan.exclusiones.find((e) => e.cups === caso.procedimientoCups)?.texto ??
    'Procedimiento fuera del tarifario';
  return {
    caso,
    plan,
    decision,
    segmentos: segmentosDeInforme(caso, decision),
    clausulas: clausulasAplicadas(plan, decision),
    procedimiento,
  };
}
