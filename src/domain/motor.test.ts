import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CASOS } from '../data/casos';
import { planDe } from '../data/planes';
import { dictaminar } from './motor';
import { clausulaDe } from './poliza';

test('los seis casos del corpus dan el dictamen esperado', () => {
  for (const caso of CASOS) {
    const decision = dictaminar(caso, planDe(caso.planId));
    assert.equal(
      decision.estado,
      caso.estadoEsperado,
      `${caso.id}: el motor dictó ${decision.estado} y se esperaba ${caso.estadoEsperado}`,
    );
  }
});

test('ninguna decisión sale sin motivos y sin cláusula citada', () => {
  for (const caso of CASOS) {
    const plan = planDe(caso.planId);
    const decision = dictaminar(caso, plan);
    assert.ok(decision.motivos.length > 0, `${caso.id}: decisión sin motivos`);
    for (const motivo of decision.motivos) {
      assert.doesNotThrow(
        () => clausulaDe(plan.clausulas, motivo.clausula),
        `${caso.id}: el motivo cita la cláusula ${motivo.clausula}, que no existe`,
      );
    }
  }
});

test('el motor es determinista: dos corridas dan la misma decisión', () => {
  for (const caso of CASOS) {
    const plan = planDe(caso.planId);
    const primera = dictaminar(caso, plan);
    const segunda = dictaminar(caso, plan);
    assert.deepEqual({ ...primera, tiempoMs: 0 }, { ...segunda, tiempoMs: 0 });
  }
});

test('los montos cuadran: deducible + coaseguro + pago de la aseguradora = facturado', () => {
  for (const caso of CASOS) {
    const decision = dictaminar(caso, planDe(caso.planId));
    const aprobado =
      decision.estado === 'PRE_APROBADO' || decision.estado === 'PRE_APROBADO_CON_CONDICIONES';
    if (!aprobado) continue;
    assert.equal(
      decision.deducibleAplicado + decision.coaseguroAplicado + decision.pagaAseguradora,
      decision.montoFacturado,
      `${caso.id}: las cuentas no cuadran`,
    );
    assert.ok(decision.pagaPaciente > 0, `${caso.id}: el paciente debería pagar algo`);
  }
});

test('un campo sin cita textual tumba la aprobación y cae a documentos faltantes', () => {
  const caso = CASOS[0];
  const plan = planDe(caso.planId);
  const decision = dictaminar({ ...caso, procedimientoCups: '999999' }, plan);
  assert.equal(decision.estado, 'DOCUMENTOS_FALTANTES');
  assert.ok(decision.motivos[0].regla === 'evidencia');
});

test('el caso con documentos faltantes explica qué falta para aprobar', () => {
  const caso = CASOS.find((c) => c.id === 'PR-2026-0701');
  assert.ok(caso, 'falta el caso de documentos faltantes en el corpus');
  const decision = dictaminar(caso, planDe(caso.planId));
  assert.equal(decision.estado, 'DOCUMENTOS_FALTANTES');
  assert.equal(decision.faltantes.length, 2, 'deberían faltar dos documentos');
  assert.ok(decision.contrafactual, 'debería traer el contrafactual');
  assert.match(decision.contrafactual, /PRE_APROBADO/);
});

test('la urgencia fuera de la red se aprueba con condiciones, no se rechaza', () => {
  const caso = CASOS.find((c) => c.caracter === 'urgente');
  assert.ok(caso, 'falta el caso de urgencia en el corpus');
  const decision = dictaminar(caso, planDe(caso.planId));
  assert.equal(decision.estado, 'PRE_APROBADO_CON_CONDICIONES');
  assert.equal(decision.enRed, false);
  assert.equal(
    decision.coaseguroAplicado,
    Math.floor((decision.pagaAseguradora + decision.coaseguroAplicado) * 0.4 + 0.5),
    'la urgencia fuera de red debería aplicar el coaseguro de fuera de red',
  );
});
