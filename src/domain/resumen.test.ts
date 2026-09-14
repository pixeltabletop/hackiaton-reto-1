import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CASOS } from '../data/casos';
import { planDe } from '../data/planes';
import { dictaminar } from './motor';
import { familiaDe, resumenDe } from './resumen';

test('cada decisión del corpus trae un veredicto de una línea, en palabras llanas', () => {
  for (const caso of CASOS) {
    const decision = dictaminar(caso, planDe(caso.planId));
    const resumen = resumenDe(decision);
    assert.ok(resumen.length > 20, `${caso.id}: el resumen quedó vacío`);
    assert.ok(!resumen.includes('undefined'), `${caso.id}: el resumen trae un undefined`);
    assert.ok(!resumen.startsWith('.'), `${caso.id}: el resumen empieza con punto`);
  }
});

test('el resumen de una aprobación dice cuánto paga cada quién', () => {
  const caso = CASOS.find((c) => c.estadoEsperado === 'PRE_APROBADO');
  assert.ok(caso);
  const resumen = resumenDe(dictaminar(caso, planDe(caso.planId)));
  assert.match(resumen, /aseguradora responde/);
  assert.match(resumen, /paciente paga/);
});

test('cada regla del motor cae en una familia visual, y ninguna queda suelta', () => {
  const familias = new Set<string>();
  for (const caso of CASOS) {
    for (const motivo of dictaminar(caso, planDe(caso.planId)).motivos) {
      const familia = familiaDe(motivo.regla);
      assert.notEqual(familia, 'neutro', `la regla ${motivo.regla} no tiene familia visual`);
      familias.add(familia);
    }
  }
  assert.ok(familias.size >= 3, 'las familias visuales quedaron todas del mismo color');
});
