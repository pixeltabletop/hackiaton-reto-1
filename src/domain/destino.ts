import { calcularMontos } from './motor';
import { especialidadDe, fichaDe } from '../data/directorio';
import type { Centavos } from './dinero';
import type { Caso, Decision, Plan } from './tipos';

/**
 * A dónde puede ir el paciente, y cuánto paga en cada sitio.
 *
 * Es la pregunta que hoy se queda sin respuesta: el dictamen dice «fuera de la red» y ahí
 * termina. Quien está en la ambulancia necesita la otra mitad — qué hospitales tiene el
 * plan, cuál atiende lo que hace falta, cuál abre a esta hora y **cuánto cambia la cuenta**
 * si va a uno u otro.
 *
 * Lo que aquí se afirma sale de volver a correr `calcularMontos` con la condición de red
 * cambiada, que es el mismo cálculo que hizo el motor. **No se simula el dictamen**: el
 * hospital es un dato citado del informe y cambiarlo dejaría la cita apuntando a otro sitio.
 * Se simula el dinero, que sí depende solo de si el sitio está en la red.
 *
 * Por eso todos los hospitales de la red muestran la misma cifra: dentro de la red el plan
 * cobra igual en todos. Lo que los distingue es la especialidad, la urgencia y el teléfono.
 */

export interface OpcionDeAtencion {
  hospital: string;
  ciudad: string;
  nivel: 'A' | 'B' | 'C';
  enRed: boolean;
  /** Donde el informe dice que está el paciente ahora mismo. */
  esElActual: boolean;
  telefono: string | null;
  urgencias24h: boolean | null;
  zona: string | null;
  /** ¿Este hospital atiende la especialidad que pide el procedimiento? `null` si no se sabe. */
  atiendeLaEspecialidad: boolean | null;
  pagaPaciente: Centavos;
  pagaAseguradora: Centavos;
  /** Negativo = paga menos que donde está ahora. Cero en el hospital actual. */
  diferenciaVsActual: Centavos;
}

export interface Destinos {
  especialidad: string | null;
  opciones: OpcionDeAtencion[];
  /** El plan no declara red: no hay nada que ofrecer y se dice, en vez de mostrar una lista vacía. */
  sinRed: boolean;
}

export function opcionesDeAtencion(caso: Caso, plan: Plan, decision: Decision): Destinos {
  const especialidad = especialidadDe(caso.procedimientoCups);
  const montosActual = calcularMontos(caso, plan, decision.enRed);

  const arma = (
    hospital: string,
    ciudad: string,
    nivel: 'A' | 'B' | 'C',
    enRed: boolean,
  ): OpcionDeAtencion => {
    const ficha = fichaDe(hospital);
    const montos = calcularMontos(caso, plan, enRed);
    return {
      hospital,
      ciudad,
      nivel,
      enRed,
      esElActual: hospital === caso.hospital,
      telefono: ficha?.telefono ?? null,
      urgencias24h: ficha?.urgencias24h ?? null,
      zona: ficha?.zona ?? null,
      atiendeLaEspecialidad:
        especialidad === null || !ficha ? null : ficha.especialidades.includes(especialidad),
      pagaPaciente: montos.pagaPaciente,
      pagaAseguradora: montos.pagaAseguradora,
      diferenciaVsActual: montos.pagaPaciente - montosActual.pagaPaciente,
    };
  };

  const opciones = plan.red.map((h) => arma(h.hospital, h.ciudad, h.nivel, true));

  // Donde está ahora, si no es de la red: sin esta fila la comparación no tiene contra qué
  // compararse, y desaparecería justo el sitio donde el paciente ya se encuentra.
  if (!opciones.some((o) => o.esElActual)) {
    const ficha = fichaDe(caso.hospital);
    opciones.push({
      hospital: caso.hospital,
      ciudad: ficha?.zona.split(', ').pop() ?? '—',
      nivel: 'C',
      enRed: false,
      esElActual: true,
      telefono: ficha?.telefono ?? null,
      urgencias24h: ficha?.urgencias24h ?? null,
      zona: ficha?.zona ?? null,
      atiendeLaEspecialidad:
        especialidad === null || !ficha ? null : ficha.especialidades.includes(especialidad),
      pagaPaciente: montosActual.pagaPaciente,
      pagaAseguradora: montosActual.pagaAseguradora,
      diferenciaVsActual: 0,
    });
  }

  // Primero lo más barato para el paciente; a igual precio, el que atiende la especialidad.
  opciones.sort((a, b) => {
    if (a.pagaPaciente !== b.pagaPaciente) return a.pagaPaciente - b.pagaPaciente;
    return Number(b.atiendeLaEspecialidad ?? false) - Number(a.atiendeLaEspecialidad ?? false);
  });

  return { especialidad, opciones, sinRed: plan.red.length === 0 };
}
