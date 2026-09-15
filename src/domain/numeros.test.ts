import test from 'node:test';
import assert from 'node:assert/strict';
import { extraerNumeros, formarCedula, formarPoliza } from './numeros.ts';

/**
 * Lo que el OCR alcanza a ver. Un lector que propone números falsos es un lector que
 * hace perder tiempo en el mostrador: estas pruebas fijan que solo salga lo que de
 * verdad es una cédula o una póliza.
 */

test('la cédula se arma en el formato del mostrador', () => {
  assert.equal(formarCedula('8-742-1593'), '8-742-1593');
  assert.equal(formarCedula('87421593'), '8-742-1593');
  assert.equal(formarCedula('8 742 1593'), '8-742-1593');
});

test('una provincia imposible no es una cédula: ni 0, ni 14, ni 99', () => {
  assert.equal(formarCedula('0-101-2026'), null);
  assert.equal(formarCedula('14-118-5471'), null);
  assert.equal(formarCedula('99-233-6604'), null);
  assert.equal(formarCedula('123'), null);
});

test('la póliza se arma en su formato', () => {
  assert.equal(formarPoliza('IS-A-2025-0871'), 'IS-A-2025-0871');
  assert.equal(formarPoliza('ISA20250871'), 'IS-A-2025-0871');
});

test('los dígitos de una póliza no se proponen como cédula', () => {
  const { cedulas, polizas } = extraerNumeros('Certificado No. IS-A-2025-0871 · titular');
  assert.deepEqual(polizas, ['IS-A-2025-0871']);
  assert.deepEqual(cedulas, [], `propuso cédulas falsas: ${cedulas.join(', ')}`);
});

test('una fecha no se propone como cédula', () => {
  const { cedulas } = extraerNumeros('Fecha: 2026-09-10 · vence 2030-04-18 · folio 0-101-2026');
  assert.deepEqual(cedulas, [], `propuso cédulas falsas: ${cedulas.join(', ')}`);
});

test('en una cédula de verdad salen la cédula y la póliza, y nada más', () => {
  const texto = [
    'REPÚBLICA DE PANAMÁ · TRIBUNAL ELECTORAL',
    'CÉDULA 8-742-1593',
    'FECHA DE NACIMIENTO 1972-04-18',
    'PÓLIZA DE SALUD IS-A-2025-0871',
    'VENCE 2030-04-18',
  ].join('\n');

  const { cedulas, polizas } = extraerNumeros(texto);
  assert.deepEqual(cedulas, ['8-742-1593']);
  assert.deepEqual(polizas, ['IS-A-2025-0871']);
});

test('sin números no se inventa nada', () => {
  const { cedulas, polizas } = extraerNumeros('Informe médico sin datos de identificación.');
  assert.deepEqual(cedulas, []);
  assert.deepEqual(polizas, []);
});
