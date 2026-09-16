import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CASOS } from '../data/casos';
import { planDe } from '../data/planes';
import { dictaminar } from './motor';
import { cuentaPorEstado, expedienteDe, FILTROS } from './expediente';
import { alternativasDe, opcionEnRed } from './alternativas';

const decisiones = CASOS.map((caso) => dictaminar(caso, planDe(caso.planId)));
const del = (id: string) => {
  const caso = CASOS.find((c) => c.id === id)!;
  const plan = planDe(caso.planId);
  return { caso, plan, decision: dictaminar(caso, plan) };
};

/* ---------- expediente ---------- */

test('cada dictamen del corpus cae en un estado de expediente con etiqueta', () => {
  for (const decision of decisiones) {
    const expediente = expedienteDe(decision);
    assert.ok(expediente.etiqueta.length > 3, `sin etiqueta: ${decision.estado}`);
    assert.ok(expediente.detalle.length > 10);
  }
});

test('un caso aprobado está cerrado y uno que espera papeles sigue abierto', () => {
  assert.equal(expedienteDe(del('PR-2026-0417').decision).abierto, false);
  assert.equal(expedienteDe(del('PR-2026-0701').decision).abierto, true);
  assert.equal(expedienteDe(del('PR-2026-0701').decision).responsable, 'hospital');
});

test('los filtros de la bandeja cubren todos los estados que el corpus produce', () => {
  const claves = new Set(FILTROS.map((f) => f.clave));
  for (const decision of decisiones) {
    assert.ok(claves.has(expedienteDe(decision).clave), `falta filtro para ${decision.estado}`);
  }
});

test('la cuenta por estado suma el total', () => {
  const cuenta = cuentaPorEstado(decisiones);
  const suma = Object.entries(cuenta)
    .filter(([clave]) => clave !== 'todos')
    .reduce((total, [, n]) => total + n, 0);
  assert.equal(suma, cuenta.todos);
  assert.equal(cuenta.todos, CASOS.length);
});

/* ---------- alternativas ---------- */

test('un caso aprobado no necesita alternativas', () => {
  const { caso, plan, decision } = del('PR-2026-0417');
  assert.deepEqual(alternativasDe(caso, plan, decision), []);
});

test('el caso de documentos faltantes ofrece adjuntarlos, con la cifra del motor', () => {
  const { caso, plan, decision } = del('PR-2026-0701');
  const alternativas = alternativasDe(caso, plan, decision);
  assert.ok(alternativas.some((a) => /adjuntar/i.test(a.titulo)));
  assert.match(alternativas[0].detalle, /PRE_APROBADO|aprobado/i);
});

test('el caso de carencia dice desde cuándo, y cuánto costaría no esperar', () => {
  const { caso, plan, decision } = del('PR-2026-0518');
  const alternativas = alternativasDe(caso, plan, decision);
  assert.ok(alternativas.some((a) => /carencia/i.test(a.titulo)));
  const particular = alternativas.find((a) => /cuenta propia/i.test(a.titulo));
  assert.equal(particular?.cifra, '$ 3,100.00');
});

test('fuera de la red se dice cuánto pagaría la aseguradora en la red, y con qué hospitales', () => {
  const { caso, plan, decision } = del('PR-2026-0790'); // urgencia fuera de la red
  const red = opcionEnRed(caso, plan, decision);
  assert.ok(red, 'un caso fuera de la red debe ofrecer la opción de la red');
  assert.equal(red!.hospitales.length, plan.red.length);
  assert.match(red!.pagariaLaAseguradora, /^\$ /);
  assert.match(red!.diferencia, /^\$ /, 'la diferencia a favor del paciente se calcula, no se promete');
});

test('un caso que ya está en la red no recibe esa alternativa', () => {
  const { caso, plan, decision } = del('PR-2026-0417');
  assert.equal(opcionEnRed(caso, plan, decision), null);
});

test('la alternativa de la red no inventa un dictamen: cambiar el hospital dejaría el dato sin cita', () => {
  const { caso, plan } = del('PR-2026-0790');
  const simulado = dictaminar({ ...caso, hospital: plan.red[0].hospital }, plan);
  assert.equal(
    simulado.estado,
    'DOCUMENTOS_FALTANTES',
    'el motor frena un caso al que se le cambia el hospital sin cambiar el informe; por eso las alternativas hablan de dinero, no de dictamen',
  );
});
