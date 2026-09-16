import { contactosDe, contratanteDe, fichaDe } from '../data/directorio';
import type { Caso, Decision, Plan } from './tipos';

/**
 * A quién llamar, ahora.
 *
 * Un dictamen que no dice a quién marcar deja al paciente exactamente donde estaba: con una
 * respuesta y sin salida. Quién resuelve el caso depende del estado — el hospital manda los
 * papeles que faltan, la línea de la aseguradora mueve al médico auditor, el contratante
 * conoce las otras coberturas — así que la lista cambia con el dictamen, no es una ficha fija.
 *
 * Todos estos datos salen del **directorio**, no de la póliza: no llevan cláusula y la
 * interfaz no debe fingir que la tienen.
 */

export interface Contacto {
  quien: string;
  telefono: string;
  /** Por qué a este y no a otro. Una línea corta: se lee de pie. */
  porQue: string;
  prioridad: 1 | 2 | 3;
  /** Para el enlace `tel:`: sin espacios ni guiones. */
  marcable: string;
}

const marcable = (telefono: string) => telefono.replace(/[^+\d]/g, '');

export function aQuienLlamar(caso: Caso, plan: Plan, decision: Decision): Contacto[] {
  const aseguradora = contactosDe(plan.aseguradora);
  const contratante = contratanteDe(plan.id);
  const hospital = fichaDe(caso.hospital);

  const lista: Contacto[] = [];
  const agregar = (quien: string, telefono: string | undefined | null, porQue: string, prioridad: 1 | 2 | 3) => {
    if (!telefono) return;
    lista.push({ quien, telefono, porQue, prioridad, marcable: marcable(telefono) });
  };

  const linea24h = (porQue: string, prioridad: 1 | 2 | 3) =>
    agregar(`${plan.aseguradora} · línea 24/7`, aseguradora?.linea24h, porQue, prioridad);
  const alHospital = (porQue: string, prioridad: 1 | 2 | 3) =>
    agregar(caso.hospital, hospital?.telefono, porQue, prioridad);
  const alContratante = (porQue: string, prioridad: 1 | 2 | 3) =>
    agregar(contratante?.nombre ?? 'Contacto del contratante', contratante?.telefono, porQue, prioridad);

  switch (decision.estado) {
    case 'DOCUMENTOS_FALTANTES':
      alHospital('Los papeles que faltan los emite el hospital.', 1);
      linea24h('Confirmar a qué correo mandarlos.', 2);
      break;

    case 'DERIVAR_A_MEDICO_AUDITOR':
      linea24h('Este caso lo firma el médico auditor de la aseguradora.', 1);
      alHospital('Avisar que la solicitud está en revisión médica.', 2);
      break;

    case 'CARENCIA_NO_CUMPLIDA':
      alContratante('Sabe si hay otra cobertura o convenio mientras corre la carencia.', 1);
      linea24h('Confirmar la fecha exacta en que se cumple.', 2);
      break;

    case 'NO_CUBIERTO':
      alContratante('Revisar si el contratante tiene otro plan que sí lo cubra.', 1);
      alHospital('Pedir el costo particular del procedimiento.', 2);
      // Va de última, pero va: nadie debería pagar de su bolsillo sin confirmar la
      // exclusión con quien emitió la póliza.
      linea24h('Confirmar la exclusión antes de pagar por cuenta propia.', 3);
      break;

    case 'PRE_APROBADO_CON_CONDICIONES':
      linea24h('Fuera de la red hace falta la autorización expresa (cláusula 4.1).', 1);
      alHospital('Coordinar el ingreso con la condición aceptada.', 2);
      break;

    case 'PRE_APROBADO':
      alHospital('Agendar el procedimiento.', 1);
      linea24h('Cualquier duda sobre el reparto del monto.', 2);
      break;
  }

  // Invariante: nunca se devuelve una lista vacía. Aunque el directorio no conozca el
  // hospital, la línea de la aseguradora siempre está.
  if (lista.length === 0) linea24h('Atención al asegurado, las 24 horas.', 1);

  return lista.sort((a, b) => a.prioridad - b.prioridad);
}
