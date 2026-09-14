/**
 * Puerta de calidad del motor de decisión. Corre los seis casos del corpus y falla
 * (exit 1) si alguna decisión se sale del contrato:
 *
 *   1. todo caso debe dar el dictamen esperado
 *   2. ninguna decisión sin motivo y sin cláusula citada
 *   3. el motor debe ser determinista en dos corridas
 *   4. los montos de una aprobación tienen que cuadrar contra lo facturado
 *
 * Es el equivalente de `check-auditoria.mjs` en MAM: el hallazgo queda congelado
 * como comprobación permanente.
 */
import { CASOS } from '../src/data/casos';
import { planDe } from '../src/data/planes';
import { dictaminar } from '../src/domain/motor';
import { clausulaDe } from '../src/domain/poliza';
import { formato } from '../src/domain/dinero';

let fallos = 0;
const filas = [];

console.log('\nMOTOR DE PRE-AUTORIZACIÓN — DICTAMEN DE LOS SEIS CASOS\n');

for (const caso of CASOS) {
  const plan = planDe(caso.planId);
  const decision = dictaminar(caso, plan);
  const segunda = dictaminar(caso, plan);
  const problemas = [];

  if (decision.estado !== caso.estadoEsperado) {
    problemas.push(`dictamen ${decision.estado}, se esperaba ${caso.estadoEsperado}`);
  }
  if (decision.motivos.length === 0) problemas.push('decisión sin motivos');
  for (const motivo of decision.motivos) {
    try {
      clausulaDe(plan.clausulas, motivo.clausula);
    } catch {
      problemas.push(`cita la cláusula inexistente ${motivo.clausula}`);
    }
  }
  if (JSON.stringify({ ...decision, tiempoMs: 0 }) !== JSON.stringify({ ...segunda, tiempoMs: 0 })) {
    problemas.push('el motor no es determinista');
  }
  const aprobado = decision.estado.startsWith('PRE_APROBADO');
  if (
    aprobado &&
    decision.deducibleAplicado + decision.coaseguroAplicado + decision.pagaAseguradora !==
      decision.montoFacturado
  ) {
    problemas.push('los montos no cuadran');
  }

  fallos += problemas.length;
  filas.push({
    caso: caso.id,
    estado: decision.estado,
    clausulas: decision.motivos.length,
    aseguradora: aprobado ? formato(decision.pagaAseguradora) : '—',
    paciente: aprobado ? formato(decision.pagaPaciente) : '—',
    ms: decision.tiempoMs,
    problemas,
  });
}

for (const fila of filas) {
  const marca = fila.problemas.length === 0 ? 'OK  ' : 'FALLA';
  console.log(
    `${marca} ${fila.caso}  ${fila.estado.padEnd(28)} cláusulas=${fila.clausulas}  aseguradora=${fila.aseguradora}  paciente=${fila.paciente}  ${fila.ms} ms`,
  );
  for (const problema of fila.problemas) console.log(`        └─ ${problema}`);
}

const sinClausula = filas.filter((f) => f.clausulas === 0).length;
console.log(
  `\nDECISIONES: ${filas.length} · sin cláusula citada: ${sinClausula} · fallos: ${fallos}\n`,
);

if (fallos > 0 || sinClausula > 0) {
  console.error('CHECK: FALLA');
  process.exit(1);
}
console.log('CHECK: OK — cero decisiones sin cláusula, seis dictámenes conforme al contrato');
