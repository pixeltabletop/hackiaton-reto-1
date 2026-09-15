import test from 'node:test';
import assert from 'node:assert/strict';
import { buscar, aseguradosDe, normalizar, tipoDeConsulta, EJEMPLOS } from './busqueda.ts';
import { CASOS } from '../data/casos.ts';

/**
 * El mostrador: la persona teclea como puede y el sistema tiene que encontrar al
 * asegurado. Estas pruebas fijan lo que NO se puede romper: que una cédula se
 * encuentre escrita de cualquier forma, que una póliza traiga a todos sus
 * asegurados, y que un número que no existe diga que no existe.
 */

test('la cédula se encuentra con guiones, con espacios o pegada', () => {
  for (const forma of ['8-742-1593', '8 742 1593', '87421593', '  8.742.1593  ']) {
    const consulta = buscar(forma);
    assert.equal(consulta.coincidencias.length, 1, `no encontró "${forma}"`);
    assert.equal(consulta.coincidencias[0].pacienteRef, 'AF-2291');
    assert.equal(consulta.tipo, 'cedula');
  }
});

test('la póliza se encuentra escrita de cualquier forma y trae a toda la familia', () => {
  const consulta = buscar('is a 2025 0871');
  assert.equal(consulta.tipo, 'poliza');
  assert.equal(consulta.coincidencias.length, aseguradosDe('IS-A-2025-0871'));
  assert.equal(consulta.coincidencias.length, 2);
  const refs = consulta.coincidencias.map((caso) => caso.pacienteRef).sort();
  assert.deepEqual(refs, ['AF-2291', 'AF-9042']);
});

test('un número que no existe no se inventa: devuelve cero', () => {
  for (const inventado of ['9-999-9999', 'IS-Z-1999-0001', '123']) {
    assert.equal(buscar(inventado).coincidencias.length, 0, `inventó con "${inventado}"`);
  }
});

test('se distingue lo que es póliza de lo que es cédula, y no se adivina de más', () => {
  assert.equal(tipoDeConsulta('IS-A-2025-0871'), 'poliza');
  assert.equal(tipoDeConsulta('8-742-1593'), 'cedula');
  assert.equal(tipoDeConsulta(''), 'desconocido');
  assert.equal(tipoDeConsulta('%$#'), 'desconocido');
});

test('normalizar deja solo letras y dígitos en mayúscula', () => {
  assert.equal(normalizar(' 8-742-1593 '), '87421593');
  assert.equal(normalizar('is-a-2025-0871'), 'ISA20250871');
});

test('cada asegurado tiene cédula y póliza, y ninguna cédula se repite', () => {
  const cedulas = new Set<string>();
  for (const caso of CASOS) {
    assert.match(caso.cedula, /^\d{1,2}-\d{1,4}-\d{4}$/, `cédula rara: ${caso.cedula}`);
    assert.match(caso.numeroPoliza, /^IS-[A-C]-\d{4}-\d{4}$/, `póliza rara: ${caso.numeroPoliza}`);
    assert.ok(!cedulas.has(caso.cedula), `cédula repetida: ${caso.cedula}`);
    cedulas.add(caso.cedula);
  }
});

test('los ejemplos de la pantalla existen de verdad en la base', () => {
  for (const ejemplo of EJEMPLOS) {
    assert.ok(
      buscar(ejemplo.valor).coincidencias.length > 0,
      `el ejemplo "${ejemplo.valor}" no existe: sería un ejemplo que no funciona`,
    );
  }
});
