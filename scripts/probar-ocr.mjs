/**
 * Prueba del lector de fotos: toma las imágenes de muestra y comprueba que el OCR
 * saca la cédula y el número de póliza exactos que están impresos en el documento.
 *
 *   node --import ./scripts/registro-ts.mjs scripts/probar-ocr.mjs
 */
import { readFile } from 'node:fs/promises';
import { leerFoto } from '../src/ocr/leer-documento.ts';
import { buscar } from '../src/domain/busqueda.ts';

const PRUEBAS = [
  {
    archivo: 'public/muestras/cedula-8-742-1593.png',
    espera: { tipo: 'cedula', numero: '87421593' },
  },
  {
    archivo: 'public/muestras/poliza-IS-A-2025-0871.png',
    espera: { tipo: 'poliza', numero: 'ISA20250871' },
  },
];

let fallos = 0;

for (const prueba of PRUEBAS) {
  const imagen = await readFile(prueba.archivo);
  const lectura = await leerFoto(imagen);

  const candidatos = [...lectura.polizas, ...lectura.cedulas].map((c) =>
    c.replace(/[^0-9A-Za-z]/g, '').toUpperCase(),
  );
  const acerto = candidatos.includes(prueba.espera.numero);

  // Y lo que hace la app con lo leído: buscar al asegurado.
  const encontrado = lectura.propuesta ? buscar(lectura.propuesta) : null;

  console.log(`\n=== ${prueba.archivo} ===`);
  console.log('  cédulas leídas: ', lectura.cedulas.join(', ') || '(ninguna)');
  console.log('  pólizas leídas: ', lectura.polizas.join(', ') || '(ninguna)');
  console.log('  propuesta:      ', lectura.propuesta ?? '(ninguna)');
  console.log('  buscado en la base:', encontrado?.coincidencias.length ?? 0, 'asegurado(s)');
  if (encontrado?.coincidencias.length) {
    for (const caso of encontrado.coincidencias) {
      console.log(`     · ${caso.id} · ${caso.pacienteRef} · cédula ${caso.cedula}`);
    }
  }
  if (lectura.error) console.log('  error:', lectura.error);

  if (!acerto) {
    fallos += 1;
    console.log(`  ✗ NO se leyó ${prueba.espera.numero}`);
    console.log('  texto que devolvió el OCR:\n', lectura.texto.slice(0, 400));
  } else {
    console.log(`  ✓ leyó ${prueba.espera.numero}`);
  }
}

console.log(`\nresultado: ${PRUEBAS.length - fallos}/${PRUEBAS.length} fotos leídas`);
process.exit(fallos === 0 ? 0 : 1);
