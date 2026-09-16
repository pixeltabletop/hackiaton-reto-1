import { consultarFuente, hayToken, leerRelacion } from './cliente';
import { planDesdeFila } from './mapeo';
import { casoDeLaFila } from './lectura-del-caso';
import type { Caso, Plan } from '../domain/tipos';

/**
 * Los casos que viven en la base de Notion, traídos para la bandeja de expedientes.
 *
 * La regla que gobierna esta pieza es que **la web pública nunca depende del token**. Si
 * Notion no está configurado, tarda, cambia de esquema o devuelve un error, esto entrega
 * una lista vacía y un motivo, y la bandeja sigue mostrando los expedientes locales. Nunca
 * lanza: una integración caída no puede tumbar la página que el jurado va a abrir.
 *
 * El informe de cada fila se lee con las reglas, sin modelo y sin costo: abrir la bandeja
 * no debe gastar una llamada al proveedor por cada caso.
 */

export interface CasoDeNotion {
  paginaId: string;
  caso: Caso;
  plan: Plan;
}

export interface Bandeja {
  casos: CasoDeNotion[];
  /** `null` = todo bien. Si no, por qué no hay nada que mostrar. */
  motivo: string | null;
  conectado: boolean;
}

const VACIA = (motivo: string | null, conectado = false): Bandeja => ({ casos: [], motivo, conectado });

export async function casosDeNotion(): Promise<Bandeja> {
  const fuenteCasos = process.env.NOTION_FUENTE_CASOS;
  const fuentePolizas = process.env.NOTION_FUENTE_POLIZAS;

  if (!hayToken() || !fuenteCasos || !fuentePolizas) {
    return VACIA(null);
  }

  try {
    const planPorPagina = new Map<string, Plan>();
    for (const fila of (await consultarFuente(fuentePolizas)).results) {
      planPorPagina.set(fila.id, planDesdeFila(fila));
    }

    const filas = (await consultarFuente(fuenteCasos)).results;
    const casos: CasoDeNotion[] = [];
    for (const fila of filas as any[]) {
      const plan = planPorPagina.get(leerRelacion(fila.properties['Póliza'])[0] ?? '');
      if (!plan) continue;
      const { caso } = await casoDeLaFila(fila, plan, null);
      casos.push({ paginaId: fila.id, caso, plan });
    }
    return { casos, motivo: null, conectado: true };
  } catch (error) {
    // Deliberadamente silencioso hacia afuera: se informa en la página, no se rompe.
    return VACIA(error instanceof Error ? error.message : String(error), true);
  }
}
