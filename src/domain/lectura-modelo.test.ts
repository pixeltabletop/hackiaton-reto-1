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


/* ---------- H-01: el valor tiene que salir de su cita ---------- */

const artroscopia = CASOS.find((c) => c.id === 'PR-2026-0518')!;

test('un carácter fuera del catálogo se descarta y no se salta la carencia', async () => {
  const respuesta = JSON.stringify({
    campos: [{ campo: 'caracter', valor: 'programada', cita: 'Carácter: electiva' }],
  });
  const lectura = await leerInformeConModelo(artroscopia.informeTexto, plan, proveedor(respuesta));
  assert.equal(lectura.caso.caracter, 'electiva');
  assert.ok(
    lectura.descartados.some((d) => d.startsWith('caracter') && d.includes('no está en el catálogo')),
    'debería descartar el carácter diciendo que no está en el catálogo',
  );
  assert.equal(dictaminar(lectura.caso, plan).estado, 'CARENCIA_NO_CUMPLIDA');
});

test('el modelo no pisa el carácter que las reglas ya leyeron', async () => {
  const conMencion = informeSano.replace('Antecedentes:', 'Antecedentes: consulta urgente previa descartada.');
  const respuesta = JSON.stringify({
    campos: [{ campo: 'caracter', valor: 'urgente', cita: 'consulta urgente' }],
  });
  const lectura = await leerInformeConModelo(conMencion, plan, proveedor(respuesta));
  assert.equal(lectura.caso.caracter, 'electiva');
});

test('un monto cuyo valor no sale de su cita se descarta', async () => {
  const enDolares = informeSano.replace('$ 4,200.00', 'USD 4,200.00');
  const respuesta = JSON.stringify({
    campos: [{ campo: 'montoEstimado', valor: '$ 1,000.00', cita: 'Monto estimado del procedimiento: USD 4,200.00' }],
  });
  const lectura = await leerInformeConModelo(enDolares, plan, proveedor(respuesta));
  assert.ok(lectura.descartados.some((d) => d.startsWith('montoEstimado')), 'debería descartar el monto');
  assert.equal(lectura.caso.montoEstimado, 0);
  assert.equal(dictaminar(lectura.caso, plan).estado, 'DOCUMENTOS_FALTANTES');
});

test('un monto que sí sale de su cita se acepta aunque las reglas no lo leyeran', async () => {
  const enDolares = informeSano.replace('$ 4,200.00', 'USD 4,200.00');
  const respuesta = JSON.stringify({
    campos: [{ campo: 'montoEstimado', valor: 'USD 4,200.00', cita: 'Monto estimado del procedimiento: USD 4,200.00' }],
  });
  const lectura = await leerInformeConModelo(enDolares, plan, proveedor(respuesta));
  assert.equal(lectura.caso.montoEstimado, 420000);
  assert.equal(dictaminar(lectura.caso, plan).estado, 'PRE_APROBADO');
});

/* ---------- H-02: los documentos del modelo exigen cita ---------- */

const sinDocumentos = CASOS.find((c) => c.id === 'PR-2026-0701')!;
const informeSinLista = sinDocumentos.informeTexto.replace(
  'Documentos adjuntos: informe del cirujano y consentimiento informado\n',
  '',
);

test('los documentos que el modelo declara sin cita no cuentan', async () => {
  const respuesta = JSON.stringify({ campos: [], documentos: ['R1', 'R2', 'R3', 'R4'] });
  const lectura = await leerInformeConModelo(informeSinLista, plan, proveedor(respuesta));
  assert.deepEqual(lectura.caso.documentosAdjuntos, []);
  assert.equal(
    lectura.descartados.filter((d) => d.startsWith('documento') && d.endsWith('sin cita')).length,
    4,
    'debería descartar los cuatro documentos por no traer cita',
  );
  assert.equal(dictaminar(lectura.caso, plan).estado, 'DOCUMENTOS_FALTANTES');
});

test('un documento con cita verificada que lo nombra sí cuenta', async () => {
  const conProsa = informeSinLista.replace(
    'Antecedentes:',
    'Se adjuntan el informe del cirujano, el estudio de imagen, la orden de anestesiología y el consentimiento informado.\nAntecedentes:',
  );
  const respuesta = JSON.stringify({
    campos: [],
    documentos: [
      { id: 'R1', cita: 'el informe del cirujano' },
      { id: 'R2', cita: 'el estudio de imagen' },
      { id: 'R3', cita: 'la orden de anestesiología' },
      { id: 'R4', cita: 'el consentimiento informado' },
    ],
  });
  const lectura = await leerInformeConModelo(conProsa, plan, proveedor(respuesta));
  assert.deepEqual([...lectura.caso.documentosAdjuntos].sort(), ['R1', 'R2', 'R3', 'R4']);
  assert.equal(lectura.origen, 'modelo');
  assert.match(lectura.nota, /documento/);
});

test('un documento cuya cita nombra otro documento no cuenta', async () => {
  const conProsa = informeSinLista.replace('Antecedentes:', 'Se adjunta el informe del cirujano.\nAntecedentes:');
  const respuesta = JSON.stringify({ campos: [], documentos: [{ id: 'R2', cita: 'el informe del cirujano' }] });
  const lectura = await leerInformeConModelo(conProsa, plan, proveedor(respuesta));
  assert.deepEqual(lectura.caso.documentosAdjuntos, []);
});
