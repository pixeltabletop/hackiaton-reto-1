/**
 * Las 8 mutaciones del motor de la primera revisión: desactiva cada regla, una a la vez,
 * y exige que `npm run check` falle. Restaura el archivo siempre.
 *
 *   node revision-josue/pruebas/mutaciones-arreglos.mjs
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const MUTACIONES = [
  ['M1 quitar la vigencia', 'src/domain/motor.ts', 'caso.fecha < plan.vigenciaDesdeIso || caso.fecha > plan.vigenciaHastaIso', 'false'],
  ['M2 quitar el umbral de auditoría', 'src/domain/motor.ts', 'caso.montoEstimado > plan.umbralAuditoria', 'false'],
  ['M3 quitar el tope anual', 'src/domain/motor.ts', 'caso.montoEstimado > plan.topeAnual', 'false'],
  ['M4 quitar las exclusiones', 'src/domain/motor.ts', 'plan.exclusiones.find((e) => e.cups === caso.procedimientoCups)', 'undefined'],
  ['M5 cubrir electivas fuera de red', 'src/domain/motor.ts', "procedimiento.soloRed && !enRed && caso.caracter === 'electiva'", 'false'],
  ['M6 quitar la regla de evidencia', 'src/domain/motor.ts', 'if (sinCita.length > 0) {', 'if (false) {'],
  ['M7 no aplicar el deducible', 'src/domain/motor.ts', 'const deducibleAplicado = min(plan.deducibleAnual, caso.montoEstimado);', 'const deducibleAplicado = 0;'],
  ['M8 preexistencias a 12 meses en vez de 24', 'src/domain/motor.ts', 'mesesAfiliado < plan.carencias.preexistenciasMeses', 'mesesAfiliado < 12'],
];

const filas = [];
for (const [nombre, archivo, buscar, poner] of MUTACIONES) {
  const original = readFileSync(archivo, 'utf8');
  if (!original.includes(buscar)) {
    filas.push({ nombre, resultado: 'NO APLICA (el código cambió)' });
    continue;
  }
  try {
    writeFileSync(archivo, original.replace(buscar, poner));
    const pasa = spawnSync('npm run check', { shell: true, encoding: 'utf8' }).status === 0;
    filas.push({ nombre, resultado: pasa ? 'SOBREVIVE' : 'detectada' });
  } finally {
    writeFileSync(archivo, original);
  }
  console.log(`${filas.at(-1).resultado.padEnd(10)} ${nombre}`);
}
const detectadas = filas.filter((f) => f.resultado === 'detectada').length;
console.log(`\nDetectadas: ${detectadas}/${filas.length}`);
writeFileSync('revision-josue/pruebas/resultados/mutaciones-motor.json', JSON.stringify(filas, null, 2));
process.exit(detectadas === filas.length ? 0 : 1);
