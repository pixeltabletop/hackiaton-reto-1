import type { Caso, Plan } from '../domain/tipos';
import { leerInforme } from '../domain/lectura';
import { leerInformeConModelo, type ProveedorModelo } from '../domain/lectura-modelo';
import { casoDesdeFila } from './mapeo';

/**
 * De una fila de la base Casos de Notion al caso que se dictamina.
 *
 * El reto pide que el informe médico viva en Notion y que la IA lo analice. La fila
 * trae el informe completo en la propiedad «Informe» y, además, columnas ya
 * estructuradas. **Manda el informe**: si hay clave de modelo, el informe se lee como
 * si lo acabara de pegar un hospital, con la cita de cada dato. Las columnas solo
 * aportan la identidad de la fila (el código del caso, su título y su póliza), que no
 * son datos clínicos y no cambian el dictamen.
 *
 * Sin clave de modelo, el informe se lee por reglas. Sin informe escrito, se usan las
 * columnas: es lo único que hay.
 */

export type OrigenDelCaso = 'modelo' | 'reglas' | 'columnas';

export interface CasoDeNotion {
  caso: Caso;
  origen: OrigenDelCaso;
  nota: string;
  descartados: string[];
}

/** Lo que identifica a la fila y nunca sale del informe. */
export function conIdentidadDeLaFila(deLaFila: Caso, delInforme: Caso): Caso {
  return {
    ...delInforme,
    id: deLaFila.id,
    titulo: deLaFila.titulo,
    planId: deLaFila.planId,
    informeTexto: deLaFila.informeTexto,
  };
}

export async function casoDeLaFila(
  fila: any,
  plan: Plan,
  proveedor: ProveedorModelo | null,
): Promise<CasoDeNotion> {
  const deLaFila = casoDesdeFila(fila);
  const informe = (deLaFila.informeTexto ?? '').trim();

  if (!informe) {
    return {
      caso: deLaFila,
      origen: 'columnas',
      nota: 'La fila no trae el informe escrito: se dictaminó con las columnas de Notion.',
      descartados: [],
    };
  }

  const hospitales = plan.red.map((h) => h.hospital);

  if (!proveedor) {
    const porReglas = leerInforme(informe, plan.id, hospitales);
    return {
      caso: conIdentidadDeLaFila(deLaFila, porReglas.caso),
      origen: 'reglas',
      nota: 'Sin clave de modelo: el informe de Notion se leyó con las reglas del lector.',
      descartados: [],
    };
  }

  const lectura = await leerInformeConModelo(informe, plan, proveedor);
  return {
    caso: conIdentidadDeLaFila(deLaFila, lectura.caso),
    origen: lectura.origen === 'modelo' ? 'modelo' : 'reglas',
    nota: lectura.nota,
    descartados: lectura.descartados ?? [],
  };
}
