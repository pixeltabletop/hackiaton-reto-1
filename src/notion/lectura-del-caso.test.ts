import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CASOS } from '../data/casos';
import { planDe } from '../data/planes';
import { propiedadesDeCaso } from './mapeo';
import { casoDeLaFila, conIdentidadDeLaFila } from './lectura-del-caso';
import type { ProveedorModelo } from '../domain/lectura-modelo';

const base = CASOS[0];
const plan = planDe(base.planId);

/**
 * Una fila como la DEVUELVE la API de Notion: se escribe con `text.content` y se lee
 * con `plain_text`. Armar la prueba con la forma de escritura probaría otra cosa.
 */
function comoLoDevuelveNotion(propiedad: any): any {
  if (Array.isArray(propiedad?.rich_text)) {
    return { rich_text: propiedad.rich_text.map((t: any) => ({ ...t, plain_text: t.text.content })) };
  }
  if (Array.isArray(propiedad?.title)) {
    return { title: propiedad.title.map((t: any) => ({ ...t, plain_text: t.text.content })) };
  }
  return propiedad;
}

function fila(caso = base, cambios: Record<string, any> = {}) {
  const escritas = propiedadesDeCaso(caso);
  const leidas = Object.fromEntries(
    Object.entries(escritas).map(([nombre, valor]) => [nombre, comoLoDevuelveNotion(valor)]),
  );
  return { id: 'pagina-1', properties: { ...leidas, ...cambios } };
}

const proveedorQueNoResponde: ProveedorModelo = {
  nombre: 'modelo de prueba',
  completar: async () => {
    throw new Error('sin red');
  },
};

test('sin informe escrito, la fila se dictamina con sus columnas y lo dice', async () => {
  const sinInforme = fila(base, { Informe: { rich_text: [] } });
  const leido = await casoDeLaFila(sinInforme, plan, null);
  assert.equal(leido.origen, 'columnas');
  assert.match(leido.nota, /columnas/);
  assert.equal(leido.caso.procedimientoCups, base.procedimientoCups);
});

test('con informe y sin clave, el informe de Notion se lee por reglas', async () => {
  const leido = await casoDeLaFila(fila(), plan, null);
  assert.equal(leido.origen, 'reglas');
  assert.equal(leido.caso.procedimientoCups, base.procedimientoCups);
  assert.equal(leido.caso.montoEstimado, base.montoEstimado);
});

test('la identidad de la fila manda sobre lo que diga el informe', () => {
  const delInforme = { ...base, id: 'LEÍDO-SIN-ID', titulo: '', planId: 'PLAN-C', edad: 99 };
  const unido = conIdentidadDeLaFila(base, delInforme as typeof base);
  assert.equal(unido.id, base.id);
  assert.equal(unido.titulo, base.titulo);
  assert.equal(unido.planId, base.planId);
  assert.equal(unido.edad, 99, 'lo clínico sí sale del informe');
});

test('si el modelo no responde, el caso sale igual leído por reglas', async () => {
  const leido = await casoDeLaFila(fila(), plan, proveedorQueNoResponde);
  assert.equal(leido.origen, 'reglas');
  assert.equal(leido.caso.procedimientoCups, base.procedimientoCups);
  assert.match(leido.nota, /no respondió/);
});

test('un informe recortado no hereda de las columnas lo que ya no declara', async () => {
  const recortado = base.informeTexto.replace(/Monto estimado del procedimiento:[^\n]*\n?/, '');
  const leido = await casoDeLaFila(fila({ ...base, informeTexto: recortado }), plan, null);
  assert.equal(leido.caso.montoEstimado, 0, 'el monto de la columna no puede rellenar el hueco');
});
