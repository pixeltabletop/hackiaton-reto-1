import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CASOS } from '../data/casos';
import { planDe } from '../data/planes';
import { formato } from './dinero';
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


test('un campo cuya cita no respalda su valor tumba la aprobación', () => {
  const caso = CASOS[0];
  const plan = planDe(caso.planId);
  const decision = dictaminar(
    { ...caso, montoEstimado: 100000, citas: { montoEstimado: 'Monto estimado del procedimiento: $ 4,200.00' } },
    plan,
  );
  assert.equal(decision.estado, 'DOCUMENTOS_FALTANTES');
  assert.equal(decision.motivos[0].regla, 'evidencia');
});

/* ---------- lo que el informe no declara no se adivina ---------- */

test('si el informe no declara el carácter, el caso deriva al auditor', () => {
  const caso = CASOS.find((c) => c.id === 'PR-2026-0790')!;
  const decision = dictaminar({ ...caso, caracter: 'electiva', caracterSinDeclarar: true }, planDe(caso.planId));
  assert.equal(decision.estado, 'DERIVAR_A_MEDICO_AUDITOR');
  assert.ok(decision.motivos.some((m) => m.regla === 'carácter'), 'debería explicar que falta el carácter');
});

test('sin declaración de preexistencias y dentro de la carencia, no se aprueba solo', () => {
  const caso = CASOS.find((c) => c.id === 'PR-2026-0744')!;
  const decision = dictaminar(
    { ...caso, preexistenciasDeclaradas: [], preexistenciasSinDeclarar: true },
    planDe(caso.planId),
  );
  assert.equal(decision.estado, 'DERIVAR_A_MEDICO_AUDITOR');
  assert.ok(decision.motivos.some((m) => m.regla === 'preexistencias' && m.clausula === '3.2'));
});

test('sin declaración de preexistencias no tapa una carencia electiva que ya falla', () => {
  const caso = CASOS.find((c) => c.id === 'PR-2026-0518')!;
  const decision = dictaminar({ ...caso, preexistenciasSinDeclarar: true }, planDe(caso.planId));
  assert.equal(decision.estado, 'CARENCIA_NO_CUMPLIDA');
});

test('sin declaración de preexistencias pero con la carencia de preexistencias cumplida, se aprueba', () => {
  const caso = CASOS.find((c) => c.id === 'PR-2026-0417')!;
  const decision = dictaminar({ ...caso, preexistenciasSinDeclarar: true }, planDe(caso.planId));
  assert.equal(decision.estado, 'PRE_APROBADO');
});

/* ---------- montos escritos a mano, no recalculados ---------- */

test('0417 en red: deducible $ 1,200.00, coaseguro $ 600.00, aseguradora $ 2,400.00', () => {
  const caso = CASOS.find((c) => c.id === 'PR-2026-0417')!;
  const d = dictaminar(caso, planDe(caso.planId));
  assert.deepEqual(
    [d.deducibleAplicado, d.coaseguroAplicado, d.pagaAseguradora, d.pagaPaciente],
    [120000, 60000, 240000, 180000],
  );
});

test('0790 urgencia fuera de red: deducible $ 1,200.00, coaseguro 40% $ 560.00, aseguradora $ 840.00', () => {
  const caso = CASOS.find((c) => c.id === 'PR-2026-0790')!;
  const d = dictaminar(caso, planDe(caso.planId));
  assert.deepEqual(
    [d.deducibleAplicado, d.coaseguroAplicado, d.pagaAseguradora, d.pagaPaciente],
    [120000, 56000, 84000, 176000],
  );
});

test('un monto sobre el tope anual deriva citando el tope, no solo el umbral', () => {
  const caso = CASOS.find((c) => c.id === 'PR-2026-0417')!;
  const plan = planDe(caso.planId);
  const monto = plan.topeAnual + 100;
  const informeTexto = caso.informeTexto.replace('$ 4,200.00', formato(monto));
  const decision = dictaminar({ ...caso, montoEstimado: monto, informeTexto }, plan);
  assert.equal(decision.estado, 'DERIVAR_A_MEDICO_AUDITOR');
  assert.ok(decision.motivos.some((m) => m.regla === 'tope' && m.clausula === '7.3'), 'debería citar la cláusula 7.3');
});
