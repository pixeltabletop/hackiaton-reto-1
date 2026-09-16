import type { Caso, Decision, Plan } from './tipos';
import { calcularMontos } from './motor';
import { formato } from './dinero';

/**
 * Qué puede hacer el paciente cuando la respuesta no es un sí.
 *
 * Un «no autorizado» a secas es lo que hoy hace perder días. Cada alternativa sale del
 * propio dictamen o de **volver a correr el motor** con una condición cambiada (otro
 * hospital de la red), así que ninguna promete algo que la póliza no daría. Lo que no se
 * puede calcular, no se dice.
 */

export interface Alternativa {
  titulo: string;
  detalle: string;
  /** La cifra que importa, cuando el motor la calcula. */
  cifra?: string;
  clausula?: string;
}

/**
 * Cuánto cambiaría el dinero si la atención ocurriera en la red, y en qué hospitales.
 *
 * No se simula el dictamen cambiándole el hospital al caso: el hospital es un dato **citado
 * del informe**, y cambiarlo dejaría la cita apuntando a otro sitio; el motor lo frena, con
 * razón. Lo que sí se puede afirmar es el reparto del dinero con el coaseguro de la red
 * (cláusula 7.2) y la lista de hospitales del plan (cláusula 4.1).
 */
export function opcionEnRed(
  caso: Caso,
  plan: Plan,
  decision: Decision,
): { hospitales: { hospital: string; ciudad: string }[]; pagariaLaAseguradora: string; diferencia: string } | null {
  if (decision.enRed || plan.red.length === 0) return null;

  const enRed = calcularMontos(caso, plan, true);
  return {
    hospitales: plan.red.map(({ hospital, ciudad }) => ({ hospital, ciudad })),
    pagariaLaAseguradora: formato(enRed.pagaAseguradora),
    diferencia: formato(enRed.pagaAseguradora - decision.pagaAseguradora),
  };
}

export function alternativasDe(caso: Caso, plan: Plan, decision: Decision): Alternativa[] {
  if (decision.estado === 'PRE_APROBADO') return [];

  const alternativas: Alternativa[] = [];
  const particular: Alternativa = {
    titulo: 'Seguir por cuenta propia',
    detalle: 'Sin cobertura, el hospital factura el procedimiento completo al paciente.',
    cifra: formato(caso.montoEstimado),
  };

  if (decision.estado === 'DOCUMENTOS_FALTANTES') {
    alternativas.push({
      titulo: 'Adjuntar lo que falta',
      detalle:
        decision.contrafactual ??
        `Faltan ${decision.faltantes.map((f) => f.documento.toLowerCase()).join(' y ')}: con esos documentos el caso se vuelve a dictaminar solo.`,
      clausula: decision.faltantes[0]?.clausula,
    });
  }

  if (decision.estado === 'CARENCIA_NO_CUMPLIDA') {
    const motivo = decision.motivos.find((m) => m.regla === 'carencias' || m.regla === 'preexistencias');
    alternativas.push({
      titulo: 'Esperar a que se cumpla la carencia',
      detalle: motivo?.resultado ?? 'La póliza exige más tiempo de afiliación para este procedimiento.',
      clausula: motivo?.clausula,
    });
    alternativas.push(particular);
  }

  if (decision.estado === 'NO_CUBIERTO') {
    const porQue = decision.motivos[decision.motivos.length - 1];
    alternativas.push({
      titulo: 'Por qué no entra en la póliza',
      detalle: porQue?.resultado ?? 'El procedimiento no figura como cubierto en este plan.',
      clausula: porQue?.clausula,
    });
    alternativas.push(particular);
  }

  if (decision.estado === 'DERIVAR_A_MEDICO_AUDITOR') {
    alternativas.push({
      titulo: 'Lo firma el médico auditor',
      detalle:
        'El expediente va con el informe leído, las cláusulas aplicadas y lo que falta por decidir: el paciente no tiene que hacer nada.',
    });
  }

  if (decision.estado === 'PRE_APROBADO_CON_CONDICIONES') {
    alternativas.push({
      titulo: 'Qué implica la condición',
      detalle: `Fuera de la red, el coaseguro sube a ${plan.coaseguroFueraDeRedPct} % y lo asume el paciente.`,
      cifra: `paga ${formato(decision.pagaPaciente)} de ${formato(decision.montoFacturado)}`,
      clausula: '4.1',
    });
  }

  const red = opcionEnRed(caso, plan, decision);
  if (red) {
    alternativas.push({
      titulo: 'Atenderse en la red del plan',
      detalle: `Con el coaseguro de la red (${plan.coaseguroPct} %), la aseguradora respondería ${red.pagariaLaAseguradora}. Hospitales del plan: ${red.hospitales
        .map((h) => `${h.hospital} (${h.ciudad})`)
        .join(' · ')}.`,
      cifra: `${red.diferencia} más que fuera de la red`,
      clausula: '4.1',
    });
  }

  return alternativas;
}
