/**
 * Mutaciones del motor: desactiva una regla de `src/domain/motor.ts` a la vez y mira
 * si alguna verificación lo detecta. Una regla rota que pasa en verde es una regla
 * que nadie vigila.
 *
 *   node revision-josue/pruebas/mutaciones.mjs
 *
 * Para cada mutación corre dos cosas: `npm run check` tal como está en main, y la
 * puerta de informes trampa de esta carpeta. El archivo se restaura SIEMPRE, también
 * si algo falla o se interrumpe.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const MOTOR = 'src/domain/motor.ts';
const MUTACIONES = [
  ['M1', 'quitar la vigencia', 'caso.fecha < plan.vigenciaDesdeIso || caso.fecha > plan.vigenciaHastaIso', 'false'],
  ['M2', 'quitar el umbral de auditoría', 'caso.montoEstimado > plan.umbralAuditoria', 'false'],
  ['M3', 'quitar el tope anual', 'caso.montoEstimado > plan.topeAnual', 'false'],
  ['M4', 'quitar las exclusiones', 'plan.exclusiones.find((e) => e.cups === caso.procedimientoCups)', 'undefined'],
  ['M5', 'cubrir electivas fuera de red', "procedimiento.soloRed && !enRed && caso.caracter === 'electiva'", 'false'],
  ['M6', 'quitar la regla de evidencia', 'if (sinCita.length > 0) {', 'if (false) {'],
  ['M7', 'no aplicar el deducible', 'const deducibleAplicado = min(plan.deducibleAnual, caso.montoEstimado);', 'const deducibleAplicado = 0;'],
  ['M8', 'preexistencias a 12 meses en vez de 24', 'mesesAfiliado < plan.carencias.preexistenciasMeses', 'mesesAfiliado < 12'],
];

const original = readFileSync(MOTOR, 'utf8');
const restaurar = () => writeFileSync(MOTOR, original);
process.on('SIGINT', () => { restaurar(); process.exit(130); });

const corre = (comando) => spawnSync(comando, { shell: true, encoding: 'utf8' }).status === 0;
const filas = [];

try {
  for (const [id, nombre, buscar, poner] of MUTACIONES) {
    if (!original.includes(buscar)) {
      filas.push({ id, nombre, estado: 'no aplica: el código cambió' });
      continue;
    }
    writeFileSync(MOTOR, original.replace(buscar, poner));
    const checkMain = corre('npm run check');
    const trampas = corre('node --import ./scripts/registro-ts.mjs revision-josue/pruebas/check-informes-trampa.mjs');
    restaurar();
    filas.push({ id, nombre, detectaCheckMain: !checkMain, detectaTrampas: !trampas });
  }
} finally {
  restaurar();
}

console.log('\nMUTACIONES DEL MOTOR\n');
for (const f of filas) {
  if (f.estado) { console.log(`${f.id}  ${f.nombre}: ${f.estado}`); continue; }
  const marca = (b) => (b ? 'detecta ' : 'NO VE   ');
  console.log(`${f.id}  check de main: ${marca(f.detectaCheckMain)} · con trampas: ${marca(f.detectaCheckMain || f.detectaTrampas)} · ${f.nombre}`);
}
const n = (fn) => filas.filter(fn).length;
console.log(`\nDetectadas por npm run check: ${n((f) => f.detectaCheckMain)}/${filas.length} · sumando las trampas: ${n((f) => f.detectaCheckMain || f.detectaTrampas)}/${filas.length}`);
writeFileSync('revision-josue/pruebas/resultados/mutaciones.json', JSON.stringify({ commit: 'dfa78fa', filas }, null, 2));
