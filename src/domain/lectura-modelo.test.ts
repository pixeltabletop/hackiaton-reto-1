import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CASOS } from '../data/casos';
import { planDe } from '../data/planes';
import { dictaminar } from './motor';
import { leerInformeConModelo, type ProveedorModelo } from './lectura-modelo';

const plan = planDe('PLAN-A');
const original = CASOS[0];
const informeSano = original.informeTexto;

function proveedor(respuesta: string): ProveedorModelo {
  return { nombre: 'Modelo de prueba', completar: async () => respuesta };
}

function proveedorQueFalla(): ProveedorModelo {
  return {
    nombre: 'Modelo caído',
    completar: async () => {
      throw new Error('429 cuota agotada');
    },
  };
}

test('una cita que no aparece en el informe se descarta', async () => {
  const respuesta = JSON.stringify({
    campos: [{ campo: 'cirujano', valor: 'Dra. Mariela Cárdenas', cita: 'Firmado por la Dra. Cárdenas' }],
  });
  const lectura = await leerInformeConModelo(informeSano, plan, proveedor(respuesta));
  assert.equal(lectura.descartados.length, 1);
  assert.match(lectura.descartados[0], /no aparece en el informe/);
  assert.equal(lectura.origen, 'reglas');
});

test('el modelo completa un campo que las reglas no encontraban', async () => {
  const sinCirujano = informeSano.replace('Cirujano tratante:', 'Médico tratante:');
  const respuesta = JSON.stringify({
    campos: [
      {
        campo: 'cirujano',
        valor: 'Dra. Mariela Cárdenas',
        cita: 'Médico tratante: Dra. Mariela Cárdenas',
      },
    ],
  });
  const lectura = await leerInformeConModelo(sinCirujano, plan, proveedor(respuesta));
  assert.equal(lectura.origen, 'modelo');
  assert.equal(lectura.caso.cirujano, 'Dra. Mariela Cárdenas');
  assert.equal(lectura.caso.citas?.cirujano, 'Médico tratante: Dra. Mariela Cárdenas');
});

test('si el modelo falla, la lectura por reglas sigue y el dictamen sale igual', async () => {
  const lectura = await leerInformeConModelo(informeSano, plan, proveedorQueFalla());
  assert.equal(lectura.origen, 'reglas');
  assert.match(lectura.nota, /no respondió/);
  assert.equal(dictaminar(lectura.caso, plan).estado, original.estadoEsperado);
});

test('el modelo no puede hacer aprobar un caso que no se puede citar', async () => {
  const sinMonto = informeSano.replace(/Monto estimado del procedimiento: .*/, '');
  const invencion = JSON.stringify({
    campos: [
      {
        campo: 'montoEstimado',
        valor: '$ 4,200.00',
        cita: 'Monto aprobado por la aseguradora: $ 4,200.00',
      },
    ],
  });
  const lectura = await leerInformeConModelo(sinMonto, plan, proveedor(invencion));
  assert.equal(lectura.caso.montoEstimado, 0);
  assert.equal(dictaminar(lectura.caso, plan).estado, 'DOCUMENTOS_FALTANTES');
});

test('el modelo no pisa lo que las reglas ya resolvieron con cita', async () => {
  const respuesta = JSON.stringify({
    campos: [{ campo: 'procedimientoCups', valor: '999999', cita: 'CUPS 512301' }],
  });
  const lectura = await leerInformeConModelo(informeSano, plan, proveedor(respuesta));
  assert.equal(lectura.caso.procedimientoCups, original.procedimientoCups);
});

test('con el modelo sano, los seis casos del corpus siguen dictando lo mismo', async () => {
  for (const caso of CASOS) {
    const planDelCaso = planDe(caso.planId);
    const lectura = await leerInformeConModelo(
      caso.informeTexto,
      planDelCaso,
      proveedor('{"campos":[]}'),
    );
    assert.equal(
      dictaminar(lectura.caso, planDelCaso).estado,
      caso.estadoEsperado,
      `${caso.id}: el camino con modelo cambió el dictamen`,
    );
  }
});
