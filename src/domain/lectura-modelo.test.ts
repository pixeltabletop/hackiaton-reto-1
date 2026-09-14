import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CASOS } from '../data/casos';
import { planDe } from '../data/planes';
import { dictaminar } from './motor';
import {
  CAMPOS,
  hayProveedor,
  leerInformeConModelo,
  proveedorAnthropic,
  proveedorDeEntorno,
  type ProveedorModelo,
} from './lectura-modelo';

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
  const enDolares = informeSano.replace('$ 4,200.00', '4,200.00 dólares');
  const respuesta = JSON.stringify({
    campos: [{ campo: 'montoEstimado', valor: '$ 1,000.00', cita: 'Monto estimado del procedimiento: 4,200.00 dólares' }],
  });
  const lectura = await leerInformeConModelo(enDolares, plan, proveedor(respuesta));
  assert.ok(lectura.descartados.some((d) => d.startsWith('montoEstimado')), 'debería descartar el monto');
  assert.equal(lectura.caso.montoEstimado, 0);
  assert.equal(dictaminar(lectura.caso, plan).estado, 'DOCUMENTOS_FALTANTES');
});

test('un monto que sí sale de su cita se acepta aunque las reglas no lo lean', async () => {
  const enDolares = informeSano.replace('$ 4,200.00', '4,200.00 dólares');
  const respuesta = JSON.stringify({
    campos: [{ campo: 'montoEstimado', valor: '4,200.00 dólares', cita: 'Monto estimado del procedimiento: 4,200.00 dólares' }],
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

/* ---------- lo que aporta el modelo se integra igual que lo de las reglas ---------- */

test('el hospital que lee el modelo se compara contra la red, con abreviaturas', async () => {
  const sinEncabezado = informeSano.replace(
    'HOSPITAL NACIONAL DE PANAMÁ — SERVICIO DE CIRUGÍA GENERAL',
    'Atendida en el HOSP. NACIONAL DE PANAMÁ, servicio de cirugía general.',
  );
  const respuesta = JSON.stringify({
    campos: [{ campo: 'hospital', valor: 'HOSP. NACIONAL DE PANAMÁ', cita: 'HOSP. NACIONAL DE PANAMÁ' }],
  });
  const lectura = await leerInformeConModelo(sinEncabezado, plan, proveedor(respuesta));
  assert.equal(lectura.caso.hospital, 'Hospital Nacional de Panamá');
  assert.equal(dictaminar(lectura.caso, plan).estado, 'PRE_APROBADO');
});

test('si el modelo cita el carácter que faltaba, el caso ya no deriva por falta de carácter', async () => {
  const urgencia = CASOS.find((c) => c.id === 'PR-2026-0790')!;
  const sinCaracter = urgencia.informeTexto.replace('Carácter: urgente\n', '');
  const respuesta = JSON.stringify({
    campos: [{ campo: 'caracter', valor: 'emergencia', cita: 'SERVICIO DE EMERGENCIAS' }],
  });
  const lectura = await leerInformeConModelo(sinCaracter, planDe(urgencia.planId), proveedor(respuesta));
  assert.equal(lectura.caso.caracterSinDeclarar, false);
  assert.equal(dictaminar(lectura.caso, planDe(urgencia.planId)).estado, 'PRE_APROBADO_CON_CONDICIONES');
});

/* ---------- hallazgos del banco de pruebas ---------- */

test('un monto en balboas que lee el modelo se convierte bien', async () => {
  const enProsa = informeSano.replace('Monto estimado del procedimiento: $ 4,200.00', 'Valor estimado: B/. 4,200.00');
  const respuesta = JSON.stringify({
    campos: [{ campo: 'montoEstimado', valor: 'B/. 4,200.00', cita: 'Valor estimado: B/. 4,200.00' }],
  });
  const lectura = await leerInformeConModelo(enProsa, plan, proveedor(respuesta));
  assert.equal(lectura.caso.montoEstimado, 420000);
  assert.equal(dictaminar(lectura.caso, plan).estado, 'PRE_APROBADO');
});

test('el modelo no llena un campo que las reglas dejaron vacío porque el informe se contradice', async () => {
  const dosMontos = informeSano.replace(
    'Monto estimado del procedimiento: $ 4,200.00',
    'Monto estimado del procedimiento: $ 4,200.00\nMonto estimado del procedimiento: $ 9,800.00 (corregido)',
  );
  const respuesta = JSON.stringify({
    campos: [{ campo: 'montoEstimado', valor: '$ 4,200.00', cita: 'Monto estimado del procedimiento: $ 4,200.00' }],
  });
  const lectura = await leerInformeConModelo(dosMontos, plan, proveedor(respuesta));
  assert.ok(lectura.descartados.some((d) => d.startsWith('montoEstimado') && d.includes('contradice')));
  assert.notEqual(dictaminar(lectura.caso, plan).estado, 'PRE_APROBADO');
});

/* ---------- proveedor Anthropic (Claude Sonnet 5) ---------- */

function conEntorno<T>(variables: Record<string, string | undefined>, fn: () => T): T {
  const previas = Object.fromEntries(Object.keys(variables).map((k) => [k, process.env[k]]));
  for (const [k, v] of Object.entries(variables)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  try {
    return fn();
  } finally {
    for (const [k, v] of Object.entries(previas)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  }
}

test('con ANTHROPIC_API_KEY el agente lee con Claude Sonnet 5, antes que con Gemini', () => {
  const proveedorElegido = conEntorno(
    { ANTHROPIC_API_KEY: 'clave-de-prueba', GOOGLE_API_KEY: 'otra-clave', MODELO_LECTURA: undefined },
    () => proveedorDeEntorno(),
  );
  assert.ok(proveedorElegido, 'debería haber proveedor');
  assert.match(proveedorElegido.nombre, /claude-sonnet-5/);
  assert.equal(conEntorno({ ANTHROPIC_API_KEY: 'x', GOOGLE_API_KEY: undefined, GROQ_API_KEY: undefined, OPENAI_API_KEY: undefined }, () => hayProveedor()), true);
});

test('el proveedor Anthropic pide salida estructurada con el esquema de lectura y esfuerzo bajo', async () => {
  let peticion: any = null;
  const cliente = {
    messages: {
      create: async (p: any) => {
        peticion = p;
        return { stop_reason: 'end_turn', content: [{ type: 'text', text: '{"campos":[],"documentos":[],"preexistencias":[]}' }] };
      },
    },
  };
  const claude = proveedorAnthropic('clave-de-prueba', { cliente });
  const texto = await claude.completar('instrucción');
  assert.equal(texto, '{"campos":[],"documentos":[],"preexistencias":[]}');
  assert.equal(peticion.model, 'claude-sonnet-5');
  assert.equal(peticion.output_config.effort, 'low');
  assert.equal(peticion.output_config.format.type, 'json_schema');
  assert.deepEqual(peticion.output_config.format.schema.properties.campos.items.properties.campo.enum, [...CAMPOS]);
  assert.equal('temperature' in peticion, false, 'Sonnet 5 rechaza temperature');
});

test('si Claude se niega a responder, la lectura cae a reglas y el dictamen sale igual', async () => {
  const cliente = { messages: { create: async () => ({ stop_reason: 'refusal', content: [] }) } };
  const lectura = await leerInformeConModelo(informeSano, plan, proveedorAnthropic('clave', { cliente }));
  assert.equal(lectura.origen, 'reglas');
  assert.match(lectura.nota, /no respondió/);
  assert.equal(dictaminar(lectura.caso, plan).estado, original.estadoEsperado);
});

/* ---------- lo que se ve en pantalla cuenta lo que pasó (prueba en vivo con Sonnet 5) ---------- */

const enProsaSinRotulos = `Hospital Nacional de Panamá, 2026-09-12. La paciente AF-5520, de 48 años, afiliada desde 2025-07-01, presenta hernia inguinal (K40.90). El Dr. Ignacio Sáez indica hernioplastia CUPS 452101, electiva, por $ 2,300.00. Se adjuntan informe del cirujano, estudio de imagen, orden de anestesiología y consentimiento informado.`;
const respuestaCompleta = JSON.stringify({
  campos: [
    { campo: 'pacienteRef', valor: 'AF-5520', cita: 'La paciente AF-5520' },
    { campo: 'cirujano', valor: 'Dr. Ignacio Sáez', cita: 'El Dr. Ignacio Sáez' },
  ],
});

test('lo que completa el modelo ya no aparece como «no se encontró»', async () => {
  const lectura = await leerInformeConModelo(enProsaSinRotulos, planDe('PLAN-B'), proveedor(respuestaCompleta));
  assert.ok(!lectura.avisos.some((a) => a.includes('pacienteRef')), 'pacienteRef ya lo leyó el modelo');
  assert.ok(!lectura.avisos.some((a) => a.includes('cirujano')), 'cirujano ya lo leyó el modelo');
});

test('el caso toma la referencia del paciente que leyó el modelo', async () => {
  const lectura = await leerInformeConModelo(enProsaSinRotulos, planDe('PLAN-B'), proveedor(respuestaCompleta));
  assert.equal(lectura.caso.id, 'AF-5520');
});

test('el resumen cuenta también los campos que citó el modelo', async () => {
  const lectura = await leerInformeConModelo(enProsaSinRotulos, planDe('PLAN-B'), proveedor(respuestaCompleta));
  const citados = lectura.campos.filter((c) => c.verificado).map((c) => c.campo);
  assert.ok(citados.includes('pacienteRef') && citados.includes('cirujano'));
});
