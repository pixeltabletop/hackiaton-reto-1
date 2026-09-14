import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PLANES, planDe } from '../data/planes';
import { CASOS } from '../data/casos';
import { evidenciaDelCaso } from './motor';
import { clausulaDe } from './poliza';
import { procedimientoDe } from '../data/catalogo';

const miles = (centavos: number): string =>
  (centavos / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

test('cada póliza trae sus cláusulas indexadas, sin repetir y con offset real', () => {
  for (const plan of PLANES) {
    assert.ok(plan.clausulas.length >= 10, `${plan.id}: faltan cláusulas del contrato`);
    const ids = plan.clausulas.map((c) => c.id);
    assert.equal(new Set(ids).size, ids.length, `${plan.id}: hay cláusulas repetidas`);
    for (const clausula of plan.clausulas) {
      assert.ok(clausula.texto.length > 20, `${plan.id}: la cláusula ${clausula.id} quedó vacía`);
      assert.ok(
        plan.textoIntegral.slice(clausula.offset).trimStart().startsWith(clausula.texto.slice(0, 20)),
        `${plan.id}: el offset de la cláusula ${clausula.id} no apunta al texto`,
      );
    }
  }
});

test('toda cláusula que la póliza cita existe en su propio texto', () => {
  for (const plan of PLANES) {
    const citadas = [
      ...plan.procedimientos.map((p) => p.clausula),
      ...plan.exclusiones.map((e) => e.clausula),
      ...plan.requisitos.flatMap((r) => r.documentos.map((d) => d.clausula)),
    ];
    for (const id of citadas) {
      assert.doesNotThrow(() => clausulaDe(plan.clausulas, id), `${plan.id}: cita la cláusula ${id}`);
    }
  }
});

test('todo dato estructurado de la póliza aparece textualmente en el documento', () => {
  for (const plan of PLANES) {
    const esperados = [
      miles(plan.deducibleAnual),
      miles(plan.topeAnual),
      miles(plan.umbralAuditoria),
      `${plan.coaseguroPct} por ciento`,
      `${plan.coaseguroFueraDeRedPct} por ciento`,
      `${plan.carencias.cirugiaElectivaMeses} meses`,
      `${plan.carencias.preexistenciasMeses} meses`,
      ...plan.red.map((h) => h.hospital),
    ];
    for (const esperado of esperados) {
      assert.ok(
        plan.textoIntegral.includes(esperado),
        `${plan.id}: "${esperado}" no aparece en el texto de la póliza`,
      );
    }
  }
});

test('cada campo que el motor usa tiene cita textual verificada en el informe', () => {
  for (const caso of CASOS) {
    const campos = evidenciaDelCaso(caso);
    const sinCita = campos.filter((c) => !c.verificado);
    assert.deepEqual(
      sinCita.map((c) => c.campo),
      [],
      `${caso.id}: campos sin cita textual en el informe`,
    );
    for (const campo of campos) {
      assert.ok(
        campo.offset >= 0 && campo.offset < caso.informeTexto.length,
        `${caso.id}: offset fuera del informe en ${campo.campo}`,
      );
    }
  }
});

test('cada caso apunta a un plan existente y a un procedimiento del tarifario', () => {
  for (const caso of CASOS) {
    assert.doesNotThrow(() => planDe(caso.planId));
    assert.doesNotThrow(() => procedimientoDe(caso.procedimientoCups));
    assert.ok(caso.fechaAfiliacion <= caso.fecha, `${caso.id}: se afilió después de la cirugía`);
  }
});

test('los seis estados posibles están representados en el corpus', () => {
  const estados = new Set(CASOS.map((c) => c.estadoEsperado));
  assert.equal(estados.size, 6, 'el corpus no cubre los seis dictámenes del contrato');
});
