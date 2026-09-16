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

  // Si el directorio no conoce ni al hospital ni a la aseguradora, no hay teléfono que
  // inventar. Repetir aquí la línea 24/7 no arregla nada —es la misma que ya faltó— y
  // dejaría el bloque en blanco, que se lee como «no hay a quién llamar». Se dice qué
  // pasa y adónde mirar: un correo de autorizaciones sí puede existir sin teléfono.
  if (lista.length === 0) {
    const correo = aseguradora?.correoAutorizaciones;
    return [
      {
        quien: correo ? `Escribir a ${correo}` : `Sin teléfono en el directorio`,
        telefono: correo ?? '—',
        porQue: correo
          ? 'El directorio no tiene teléfono para esta póliza; el correo de autorizaciones sí.'
          : 'El directorio no tiene contactos para esta aseguradora ni para este hospital.',
        prioridad: 1,
        marcable: '',
      },
    ];
  }

  return lista.sort((a, b) => a.prioridad - b.prioridad);
}
