import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validarEscritura, validarOrigen } from './seguridad';

const base = {
  origen: 'https://preautorizacion.vercel.app',
  host: 'preautorizacion.vercel.app',
  fuenteCasos: 'fuente-casos-123',
  fila: {
    parent: { type: 'data_source_id', data_source_id: 'fuente-casos-123' },
    properties: { Estado: { select: { name: 'Pendiente' } } },
  },
};

test('una petición del mismo sitio sobre un caso pendiente de la base Casos se acepta', () => {
  assert.deepEqual(validarEscritura(base), { ok: true });
});

test('una petición sin encabezado Origin se rechaza', () => {
  const r = validarEscritura({ ...base, origen: null });
  assert.equal(r.ok, false);
});

test('una petición desde otro sitio se rechaza', () => {
  const r = validarEscritura({ ...base, origen: 'https://otro-sitio.example' });
  assert.equal(r.ok, false);
});

test('una página que no pertenece a la base Casos se rechaza', () => {
  const r = validarEscritura({ ...base, fila: { ...base.fila, parent: { type: 'data_source_id', data_source_id: 'otra-base' } } });
  assert.equal(r.ok, false);
});

test('sin la base Casos configurada no se escribe nada', () => {
  const r = validarEscritura({ ...base, fuenteCasos: undefined });
  assert.equal(r.ok, false);
});

test('un caso ya dictaminado no se vuelve a escribir', () => {
  const r = validarEscritura({ ...base, fila: { ...base.fila, properties: { Estado: { select: { name: 'Dictaminado' } } } } });
  assert.equal(r.ok, false);
});

test('el filtro de origen solo, antes de leer Notion, rechaza otro sitio y acepta el propio', () => {
  assert.equal(validarOrigen('https://otro.example', 'preautorizacion.vercel.app').ok, false);
  assert.equal(validarOrigen('https://preautorizacion.vercel.app', 'preautorizacion.vercel.app').ok, true);
});
