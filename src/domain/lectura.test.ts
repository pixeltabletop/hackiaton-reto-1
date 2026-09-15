import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CASOS } from '../data/casos';
import { planDe } from '../data/planes';
import { dictaminar } from './motor';
import { leerInforme } from './lectura';

/**
 * La prueba que importa: el lector tiene que reconstruir, campo por campo y desde
 * el texto, cada caso del corpus. Si alguno se pierde, el motor no puede dictar.
 */

test('el lector reconstruye cada caso del corpus desde su informe', () => {
  for (const original of CASOS) {
    const plan = planDe(original.planId);
    const { caso, campos } = leerInforme(
      original.informeTexto,
      original.planId,
      plan.red.map((h) => h.hospital),
    );
    const problemas: string[] = [];

    if (caso.pacienteRef !== original.pacienteRef) problemas.push('pacienteRef');
    if (caso.edad !== original.edad) problemas.push('edad');
    if (caso.hospital !== original.hospital) problemas.push('hospital');
    if (caso.fecha !== original.fecha) problemas.push('fecha');
    if (caso.fechaAfiliacion !== original.fechaAfiliacion) problemas.push('fechaAfiliacion');
    if (caso.diagnosticoCie10 !== original.diagnosticoCie10) problemas.push('diagnosticoCie10');
    if (caso.procedimientoCups !== original.procedimientoCups) problemas.push('procedimientoCups');
    if (caso.cirujano !== original.cirujano) problemas.push('cirujano');
    if (caso.caracter !== original.caracter) problemas.push('caracter');
    if (caso.montoEstimado !== original.montoEstimado) problemas.push('montoEstimado');
    if (
      [...caso.documentosAdjuntos].sort().join(',') !==
      [...original.documentosAdjuntos].sort().join(',')
    ) {
      problemas.push(`documentos (${caso.documentosAdjuntos.join(',')})`);
    }

    assert.deepEqual(problemas, [], `${original.id}: no se pudo leer ${problemas.join(', ')}`);

    const sinCita = campos.filter((c) => !c.verificado).map((c) => c.campo);
    assert.deepEqual(sinCita, [], `${original.id}: campos sin cita textual`);
  }
});

test('lo que se lee de un informe nuevo dictamina igual que el caso original', () => {
  for (const original of CASOS) {
    const plan = planDe(original.planId);
    const { caso } = leerInforme(
      original.informeTexto,
      original.planId,
      plan.red.map((h) => h.hospital),
    );
    const decision = dictaminar(caso, plan);
    assert.equal(
      decision.estado,
      original.estadoEsperado,
      `${original.id}: leyendo el informe el motor dictó ${decision.estado}`,
    );
  }
});

test('un informe al que le falta un dato no se aprueba', () => {
  const original = CASOS[0];
  const roto = original.informeTexto.replace(/Monto estimado del procedimiento: .*/, '');
  const { caso, avisos } = leerInforme(roto, original.planId);
  const decision = dictaminar(caso, planDe(original.planId));
  assert.ok(avisos.some((a) => a.toLowerCase().includes('monto')), 'debería avisar del monto');
  assert.equal(decision.estado, 'DOCUMENTOS_FALTANTES');
});

test('la cédula y la póliza del informe exigen un rótulo en la misma línea', () => {
  const casos = [
    ['Fecha: 10-09-2026', '', ''],
    ['Afiliación 15.03.2022', '', ''],
    ['Tel. 6123-4567', '', ''],
    ['Teléfono 507 6123 4567', '', ''],
    ['Registro médico 1234567', '', ''],
    ['Lote 2026 0871', '', ''],
    ['Cédula E-8-123456', 'E-8-123456', ''],
    ['Cédula PE-12-345', 'PE-12-345', ''],
    ['Cédula 8-AV-123-456', '8-AV-123-456', ''],
    ['Expediente 8-742-1593', '', ''],
    [
      'Póliza IS-A-2025-0871 cédula 8-742-1593',
      '8-742-1593',
      'IS-A-2025-0871',
    ],
  ] as const;

  for (const [informe, cedula, numeroPoliza] of casos) {
    const lectura = leerInforme(informe, 'PLAN-A');
    assert.equal(lectura.caso.cedula, cedula, informe + ': cédula');
    assert.equal(lectura.caso.numeroPoliza, numeroPoliza, informe + ': póliza');
  }
});

test('se aceptan los rótulos de identidad y certificado definidos por el contrato', () => {
  const casos = [
    ['Cédula de identidad: E-8-123456', 'E-8-123456', ''],
    ['C.I. PE-12-345', 'PE-12-345', ''],
    ['Céd.: 8-AV-123-456', '8-AV-123-456', ''],
    ['N.º de póliza: IS-A-2025-0871', '', 'IS-A-2025-0871'],
    ['Certificado IS-A-2025-0871', '', 'IS-A-2025-0871'],
  ] as const;

  for (const [informe, cedula, numeroPoliza] of casos) {
    const lectura = leerInforme(informe, 'PLAN-A');
    assert.equal(lectura.caso.cedula, cedula, informe + ': cédula');
    assert.equal(lectura.caso.numeroPoliza, numeroPoliza, informe + ': póliza');
  }
});

test('dos rótulos de identificación que se contradicen dejan el campo vacío', () => {
  const informe = [
    'Cédula: 8-742-1593',
    'C.I.: PE-12-345',
    'Póliza: IS-A-2025-0871',
    'Certificado: IS-B-2026-0117',
  ].join('\n');
  const lectura = leerInforme(informe, 'PLAN-A');

  assert.equal(lectura.caso.cedula, '');
  assert.equal(lectura.caso.numeroPoliza, '');
  assert.ok(lectura.conflictos.includes('cedula'));
  assert.ok(lectura.conflictos.includes('numeroPoliza'));
});
