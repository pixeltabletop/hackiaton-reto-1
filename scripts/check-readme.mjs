/**
 * El README no puede prometer lo que el repositorio no tiene.
 *
 *   node scripts/check-readme.mjs
 *
 * Comprueba tres cosas y sale con 1 si alguna falla:
 *   1. cada `npm run <algo>` que aparece en el README existe en package.json;
 *   2. cada enlace relativo del README apunta a un archivo que existe;
 *   3. cada archivo del repositorio que el README cita por ruta existe.
 *
 * Nació de una regla simple: un README que cita un comando borrado manda al evaluador
 * a un error, y eso pesa más que la función que faltaba.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');
const readme = readFileSync(join(raiz, 'README.md'), 'utf8');
const paquete = JSON.parse(readFileSync(join(raiz, 'package.json'), 'utf8'));

const fallos = [];
const visto = (lista) => [...new Set(lista)].sort();

/* 1. comandos */
const comandos = visto([...readme.matchAll(/`npm run ([a-z:]+)/g)].map((m) => m[1]));
for (const comando of comandos) {
  if (!paquete.scripts[comando]) fallos.push(`el README ofrece "npm run ${comando}" y no existe en package.json`);
}

/* 2. enlaces relativos del Markdown */
const enlaces = visto(
  [...readme.matchAll(/\]\((?!https?:|mailto:|#)([^)]+)\)/g)].map((m) => m[1].split('#')[0]),
).filter((ruta) => ruta && !ruta.startsWith('../../'));
for (const enlace of enlaces) {
  if (!existsSync(resolve(raiz, enlace))) fallos.push(`enlace roto en el README: ${enlace}`);
}

/* 3. rutas del repositorio citadas entre comillas invertidas */
const rutas = visto(
  [...readme.matchAll(/`((?:src|app|scripts|docs)\/[A-Za-z0-9_./-]+)`/g)].map((m) => m[1]),
).filter((ruta) => /\.[a-z]+$/.test(ruta));
for (const ruta of rutas) {
  if (!existsSync(resolve(raiz, ruta))) fallos.push(`el README cita un archivo que no existe: ${ruta}`);
}

console.log(`\nCHECK README — ${comandos.length} comandos, ${enlaces.length} enlaces, ${rutas.length} rutas citadas`);
for (const comando of comandos) console.log(`  ok  npm run ${comando}`);
for (const enlace of enlaces) console.log(`  ok  ${enlace}`);
for (const ruta of rutas) console.log(`  ok  ${ruta}`);

if (fallos.length > 0) {
  console.error('\nFALLOS:');
  for (const fallo of fallos) console.error(`  ✗ ${fallo}`);
  console.error('');
  process.exit(1);
}

console.log('\nCHECK README: OK — todo lo que promete el README existe\n');
