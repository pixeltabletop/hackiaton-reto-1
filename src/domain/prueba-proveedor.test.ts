import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluarCorrida, type ResultadoInforme } from './prueba-proveedor';

const fila = (parcial: Partial<ResultadoInforme>): ResultadoInforme => ({
  id: 'X',
  esperados: ['DOCUMENTOS_FALTANTES'],
  obtenido: 'DOCUMENTOS_FALTANTES',
  cayoAReglas: false,
  descartados: 0,
  ms: 100,
  ...parcial,
});

test('todo acertado y el modelo leyendo: sale con 0', () => {
  const r = evaluarCorrida([fila({ id: 'A' }), fila({ id: 'B', ms: 300 })]);
  assert.equal(r.codigo, 0);
  assert.equal(r.aciertos, 2);
  assert.equal(r.medianaMs, 200);
});

test('una sola aprobación indebida hace fallar la prueba, aunque el resto acierte', () => {
  const r = evaluarCorrida([
    fila({ id: 'A' }),
    fila({ id: 'B', esperados: ['DERIVAR_A_MEDICO_AUDITOR'], obtenido: 'PRE_APROBADO' }),
  ]);
  assert.equal(r.indebidas, 1);
  assert.equal(r.codigo, 1);
});

test('un dictamen distinto que no aprueba no es indebido, pero tampoco es acierto', () => {
  const r = evaluarCorrida([fila({ esperados: ['PRE_APROBADO'], obtenido: 'DOCUMENTOS_FALTANTES' })]);
  assert.equal(r.indebidas, 0);
  assert.equal(r.aciertos, 0);
  assert.equal(r.codigo, 0);
});

test('si el modelo cae a reglas en más de un informe, falla: el sitio no estaría leyendo con IA', () => {
  assert.equal(evaluarCorrida([fila({ cayoAReglas: true }), fila({})]).codigo, 0);
  assert.equal(evaluarCorrida([fila({ cayoAReglas: true }), fila({ cayoAReglas: true })]).codigo, 1);
});

test('una corrida vacía no aprueba nada', () => {
  assert.equal(evaluarCorrida([]).codigo, 1);
});
