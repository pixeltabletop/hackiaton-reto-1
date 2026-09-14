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
