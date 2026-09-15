import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CASOS } from '../data/casos';
import { planDe } from '../data/planes';
import { dictaminar } from './motor';
import { PASOS, recorrido } from './flujo';

const del = (id: string) => {
  const caso = CASOS.find((c) => c.id === id)!;
  return recorrido(dictaminar(caso, planDe(caso.planId)));
};

test('cada regla que emite el motor cae en alguno de los ocho pasos', () => {
  const conocidas = new Set(PASOS.flatMap((p) => p.reglas));
  for (const caso of CASOS) {
    for (const motivo of dictaminar(caso, planDe(caso.planId)).motivos) {
      assert.ok(conocidas.has(motivo.regla), `regla sin paso: ${motivo.regla}`);
    }
  }
});

test('un caso aprobado recorre los ocho pasos sin que ninguno decida en contra', () => {
  const pasos = del('PR-2026-0417');
  assert.equal(pasos.filter((p) => p.estado === 'decidio').length, 0);
  assert.equal(pasos.filter((p) => p.estado === 'no_evaluado').length, 0, 'un aprobado los pasa todos');
  assert.ok(pasos.some((p) => p.estado === 'cumplido'));
});

test('un paso evaluado sin motivo no se confunde con uno al que no se llegó', () => {
  const pasos = del('PR-2026-0701'); // cierra en documentos (paso 7)
  assert.equal(pasos.find((p) => p.nombre === 'Red')!.estado, 'sin_observaciones');
  assert.equal(pasos.find((p) => p.nombre === 'Tope y umbral')!.estado, 'no_evaluado');
});

test('el caso que cae por documentos marca ese paso como el que decidió, y los siguientes no se evalúan', () => {
  const pasos = del('PR-2026-0701');
  const documentos = pasos.find((p) => p.nombre === 'Documentos')!;
  assert.equal(documentos.estado, 'decidio');
  assert.equal(pasos.find((p) => p.nombre === 'Tope y umbral')!.estado, 'no_evaluado');
});

test('el caso excluido se decide en cobertura y ni siquiera mira la red', () => {
  const pasos = del('PR-2026-0633');
  assert.equal(pasos.find((p) => p.nombre === 'Cobertura')!.estado, 'decidio');
  assert.equal(pasos.find((p) => p.nombre === 'Red')!.estado, 'no_evaluado');
});

test('ningún paso queda sin su pregunta ni sin nombre', () => {
  for (const paso of PASOS) {
    assert.ok(paso.nombre.length > 2);
    assert.match(paso.pregunta, /\?/);
  }
});
