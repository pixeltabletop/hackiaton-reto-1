'use server';

import { PLANES, planDe } from '../../src/data/planes';
import { leerInforme, resumenLectura } from '../../src/domain/lectura';
import { leerInformeConModelo, proveedorDeEntorno } from '../../src/domain/lectura-modelo';
import { armarVista, type VistaCaso } from '../../src/domain/presentacion';

/**
 * Lee y dictamina un informe pegado. Corre en el servidor y recibe el informe por
 * POST: antes viajaba en la URL (GET) y quedaba en el historial, en los registros del
 * hosting y en cualquier enlace compartido, además de chocar con el límite de longitud.
 * La clave del modelo, si existe, nunca sale del servidor.
 */

export interface EstadoLectura {
  informe: string;
  planId: string;
  resultado: null | {
    vista: VistaCaso;
    resumen: string;
    avisos: string[];
    nota: string | null;
    descartados: string[];
  };
  error: string | null;
}

/** Un informe real rara vez pasa de 10.000 caracteres; más que eso no se procesa. */
const LIMITE = 20000;

export async function dictaminarInforme(_previo: EstadoLectura, datos: FormData): Promise<EstadoLectura> {
  const informe = String(datos.get('informe') ?? '').trim();
  const pedido = String(datos.get('plan') ?? 'PLAN-A');
  const planId = PLANES.some((p) => p.id === pedido) ? pedido : 'PLAN-A';

  if (!informe) return { informe, planId, resultado: null, error: 'Pegue el texto del informe para dictaminarlo.' };
  if (informe.length > LIMITE) {
    return { informe: '', planId, resultado: null, error: `El informe tiene ${informe.length} caracteres; el límite es ${LIMITE}.` };
  }

  const plan = planDe(planId);
  const proveedor = proveedorDeEntorno();
  const lectura = proveedor
    ? await leerInformeConModelo(informe, plan, proveedor)
    : { ...leerInforme(informe, planId, plan.red.map((h) => h.hospital)), nota: null, descartados: [] };

  return {
    informe,
    planId,
    error: null,
    resultado: {
      vista: armarVista(lectura.caso, plan),
      resumen: resumenLectura(lectura),
      avisos: lectura.avisos,
      nota: lectura.nota ?? null,
      descartados: lectura.descartados ?? [],
    },
  };
}
