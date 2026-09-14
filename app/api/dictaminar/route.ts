import { dictaminar } from '../../../src/domain/motor';
import {
  actualizarPagina,
  crearFila,
  leerPagina,
  leerRelacion,
  seleccion,
} from '../../../src/notion/cliente';
import { casoDesdeFila, planDesdeFila, propiedadesDeDecision } from '../../../src/notion/mapeo';
import { validarEscritura, validarOrigen } from '../../../src/notion/seguridad';

export const dynamic = 'force-dynamic';

/**
 * Dictamina un caso que vive en Notion y escribe la decisión de vuelta:
 *   1. lee la fila del caso y su póliza relacionada
 *   2. dictamina con el motor determinista
 *   3. crea la fila en Decisiones y marca el caso como dictaminado
 *
 * Es un formulario HTML normal: funciona sin JavaScript en el cliente.
 */
export async function POST(peticion: Request) {
  const datos = await peticion.formData();
  const paginaCaso = String(datos.get('caso') ?? '');
  const destino = new URL('/notion', peticion.url);

  if (!paginaCaso) {
    destino.searchParams.set('error', 'Falta el caso');
    return Response.redirect(destino, 303);
  }

  const host = peticion.headers.get('x-forwarded-host') ?? peticion.headers.get('host');
  const deOrigen = validarOrigen(peticion.headers.get('origin'), host);
  if (!deOrigen.ok) {
    destino.searchParams.set('error', deOrigen.motivo);
    return Response.redirect(destino, 303);
  }

  try {
    const fuenteDecisiones = process.env.NOTION_FUENTE_DECISIONES;

    const filaCaso = await leerPagina(paginaCaso);
    const permiso = validarEscritura({
      origen: peticion.headers.get('origin'),
      host,
      fuenteCasos: process.env.NOTION_FUENTE_CASOS,
      fila: filaCaso,
    });
    if (!permiso.ok) throw new Error(permiso.motivo);
    const caso = casoDesdeFila(filaCaso);

    const paginaPoliza = leerRelacion(filaCaso.properties['Póliza'])[0];
    if (!paginaPoliza) throw new Error(`El caso ${caso.id} no tiene una póliza relacionada`);
    const plan = planDesdeFila(await leerPagina(paginaPoliza));

    const decision = dictaminar(caso, plan);
    const clausulas = [...new Set(decision.motivos.map((m) => m.clausula))];

    if (fuenteDecisiones) {
      await crearFila(fuenteDecisiones, propiedadesDeDecision(decision, paginaCaso, clausulas));
    }

    await actualizarPagina(paginaCaso, { Estado: seleccion('Dictaminado') });

    destino.searchParams.set('ok', `${caso.id} → ${decision.estado}`);
    destino.searchParams.set('clausulas', clausulas.join(', ') || 'ninguna');
  } catch (error) {
    destino.searchParams.set('error', error instanceof Error ? error.message : String(error));
  }

  return Response.redirect(destino, 303);
}

export async function GET() {
  return new Response(
    JSON.stringify({
      ok: true,
      uso: 'POST con el campo caso=<id de la página en Notion>',
      motor: 'determinista · el modelo solo lee y cita',
    }),
    { headers: { 'content-type': 'application/json' } },
  );
}
