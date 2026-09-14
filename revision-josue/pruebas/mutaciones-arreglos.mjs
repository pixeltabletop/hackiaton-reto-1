/**
 * Mutaciones de los arreglos de la revisión: quita cada defensa nueva, una a la vez,
 * y exige que `npm run check` falle. Restaura el archivo siempre.
 *
 *   node revision-josue/pruebas/mutaciones-arreglos.mjs
 */
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const MUTACIONES = [
  ['A01 negación de documentos ignorada', 'src/domain/lectura.ts', 'if (negacion && negacion.index < posicion) negados.add(id);', 'afirmados.add(id);'],
  ['A02 conflicto de rótulos ignorado', 'src/domain/lectura.ts', "valor: distintos.size === 1 ? valores[0] : ''", "valor: valores[0] ?? ''"],
  ['A03 preexistencia anulada por cualquier «sin antecedentes»', 'src/domain/lectura.ts', 'const lineaNiega = LINEA_SIN_PREEXISTENCIAS.test(lineaPreexistencias);', 'const lineaNiega = /ninguna|sin antecedentes/i.test(lineaPreexistencias);'],
  ['A04 preexistencias sin declarar no marcan', 'src/domain/lectura.ts', 'const preexistenciasSinDeclarar = !lineaPreexistencias && !SIN_PREEXISTENCIAS.test(informe);', 'const preexistenciasSinDeclarar = false;'],
  ['A05 carácter sin declarar se asume electiva', 'src/domain/lectura.ts', 'const caracterSinDeclarar = !caracterLeido;', 'const caracterSinDeclarar = false;'],
  ['A06 hospital leído de cualquier línea', 'src/domain/lectura.ts', 'hospital: /^\\s*([A-ZÁÉÍÓÚÑ][^\\n:—]*?)\\s*—/,', 'hospital: /^([A-ZÁÉÍÓÚÑ][^\\n]*?)\\s*—/m,'],
  ['A07 monto en balboas mal convertido', 'src/domain/lectura.ts', "const cifra = montoCrudo.match(/[\\d,]+\\.\\d{2}/)?.[0] ?? '';", "const cifra = montoCrudo.replace(/[^\\d.]/g, '');"],
  ['A08 fechas dd/mm no equivalen', 'src/domain/evidencia.ts', 'fechas.push(`${m[3]}-${dos(m[2])}-${dos(m[1])}`);', ''],
  ['A09 abreviatura de hospital no se expande', 'src/domain/evidencia.ts', ".replace(/\\bhosp\\b\\.?/g, 'hospital')", ''],
  ['A10 motor no deriva sin carácter', 'src/domain/motor.ts', 'if (caso.caracterSinDeclarar) {', 'if (false) {'],
  ['A11 motor no deriva sin preexistencias declaradas', 'src/domain/motor.ts', 'if (caso.preexistenciasSinDeclarar && mesesAfiliado < plan.carencias.preexistenciasMeses) {', 'if (false) {'],
  ['A12 el modelo llena un campo en conflicto', 'src/domain/lectura-modelo.ts', 'if (enConflicto.includes(campo)) {', 'if (false) {'],
  ['A13 el hospital del modelo no se resuelve contra la red', 'src/domain/lectura-modelo.ts', 'caso.hospital = resolverHospital(valor, plan.red.map((h) => h.hospital));', 'caso.hospital = valor;'],
  ['A14 escritura en Notion sin validar origen', 'src/notion/seguridad.ts', "if (hostDeOrigen !== host) return { ok: false, motivo: 'La petición viene de otro sitio' };", ''],
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
writeFileSync('revision-josue/pruebas/resultados/mutaciones-arreglos.json', JSON.stringify(filas, null, 2));
process.exit(detectadas === filas.length ? 0 : 1);
