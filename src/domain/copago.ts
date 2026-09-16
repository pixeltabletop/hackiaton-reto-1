import { formato, type Centavos } from './dinero';
import type { Decision, Plan } from './tipos';

/**
 * Cuánto paga el paciente, contado línea por línea.
 *
 * El motor ya calcula las cifras; lo que faltaba era **explicarlas**. «Paga $ 1,800» sin
 * decir de dónde salen es un número que nadie puede discutir ni verificar. Aquí cada línea
 * dice qué es y bajo qué cláusula, y la suma tiene que dar exactamente lo que el motor
 * calculó: si algún día dejara de cuadrar, la prueba lo grita.
 *
 * Este módulo no calcula dinero. Lee el dictamen y lo narra.
 */

export interface LineaDeDinero {
  concepto: string;
  monto: Centavos;
  /** `null` = dato operativo, sin cláusula que lo respalde. Nunca se finge una. */
  clausula: string | null;
  nota?: string;
}

export interface Desglose {
  /**
   * Sin aprobación no hay reparto. Dos montos en cero se leen como «el paciente no paga
   * nada», que es lo contrario de lo que pasa.
   */
  aplica: boolean;
  porQueNoAplica?: string;
  costo: Centavos;
  lineas: LineaDeDinero[];
  pagaPaciente: Centavos;
  pagaAseguradora: Centavos;
  topeAnual: Centavos;
  enRed: boolean;
}

const SIN_REPARTO: Record<string, string> = {
  NO_CUBIERTO: 'La póliza no cubre este procedimiento: no hay reparto que hacer.',
  CARENCIA_NO_CUMPLIDA: 'Todavía no hay cobertura, así que no hay reparto que hacer.',
  DOCUMENTOS_FALTANTES: 'Falta documentación: el reparto se calcula cuando el caso se pueda dictaminar.',
  DERIVAR_A_MEDICO_AUDITOR: 'Lo decide el médico auditor: el reparto sale con su firma.',
};

export function desgloseDe(decision: Decision, plan: Plan): Desglose {
  const aplica = decision.estado.startsWith('PRE_APROBADO');
  const coaseguroPct = decision.enRed ? plan.coaseguroPct : plan.coaseguroFueraDeRedPct;

  const lineas: LineaDeDinero[] = aplica
    ? [
        {
          concepto: 'Deducible anual',
          monto: decision.deducibleAplicado,
          clausula: '7.1',
          nota: `El plan pide ${formato(plan.deducibleAnual)} al año antes de cubrir.`,
        },
        {
          concepto: decision.enRed
            ? `Coaseguro ${coaseguroPct} % en la red`
            : `Coaseguro ${coaseguroPct} % fuera de la red`,
          monto: decision.coaseguroAplicado,
          clausula: '7.2',
          nota: decision.enRed
            ? undefined
            : `Dentro de la red sería ${plan.coaseguroPct} %.`,
        },
      ]
    : [];

  return {
    aplica,
    porQueNoAplica: aplica ? undefined : (SIN_REPARTO[decision.estado] ?? 'Sin reparto todavía.'),
    costo: decision.montoFacturado,
    lineas,
    pagaPaciente: decision.pagaPaciente,
    pagaAseguradora: decision.pagaAseguradora,
    topeAnual: plan.topeAnual,
    enRed: decision.enRed,
  };
}
