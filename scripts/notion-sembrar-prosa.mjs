/**
 * Carga en la base Casos de Notion los informes **en prosa** del banco de pruebas.
 *
 *   node --import ./scripts/registro-ts.mjs scripts/notion-sembrar-prosa.mjs
 *
 * Son informes escritos como los escribe un médico —sin los rótulos que espera el lector
 * por reglas— y cada fila entra **solo con el informe y su póliza**: ni CUPS, ni monto, ni
 * documentos. Así, al dictaminar desde Notion, lo que resuelve el caso es la lectura del
 * modelo, y se ve la diferencia con las reglas.
 *
 * El token se lee de NOTION_TOKEN o de .secrets/notion-token.txt; nunca se imprime.
 * Es idempotente: una fila que ya existe con el mismo código de caso no se duplica.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { INFORMES_PROSA } from './datos/informes-prosa.mjs';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

function cargarToken() {
  if (process.env.NOTION_TOKEN) return;
  const archivo = join(raiz, '.secrets', 'notion-token.txt');
  if (existsSync(archivo)) {
    const valor = readFileSync(archivo, 'utf8').trim();
    if (valor.length > 10) {
      process.env.NOTION_TOKEN = valor;
      return;
    }
  }
  console.error('\nFalta el token de Notion (NOTION_TOKEN o .secrets/notion-token.txt).\n');
  process.exit(2);
}

function cargarEnv() {
  const archivo = join(raiz, '.env.local');
  if (!existsSync(archivo)) return;
  for (const linea of readFileSync(archivo, 'utf8').split('\n')) {
    const corte = linea.indexOf('=');
    if (corte < 1 || linea.trim().startsWith('#')) continue;
    const nombre = linea.slice(0, corte).trim();
    if (!process.env[nombre]) process.env[nombre] = linea.slice(corte + 1).trim();
  }
}

cargarEnv();
cargarToken();

const fuenteCasos = process.env.NOTION_FUENTE_CASOS;
const fuentePolizas = process.env.NOTION_FUENTE_POLIZAS;
if (!fuenteCasos || !fuentePolizas) {
  console.error('\nFaltan NOTION_FUENTE_CASOS y NOTION_FUENTE_POLIZAS (las imprime notion:preparar).\n');
  process.exit(2);
}

const { consultarFuente, crearFila, richText, seleccion, titulo, relacion } = await import(
  '../src/notion/cliente.ts'
);

/* ---------- las pólizas, para relacionar cada caso con la suya ---------- */

const paginaDePlan = new Map();
for (const fila of (await consultarFuente(fuentePolizas)).results) {
  const nombre = fila.properties['Plan']?.title?.[0]?.plain_text ?? '';
  const id = nombre.split(' ')[0]; // «PLAN-A · Plan Familiar A» → PLAN-A
  if (id) paginaDePlan.set(id, fila.id);
}

/* ---------- lo que ya está cargado ---------- */

const yaEstan = new Set(
  (await consultarFuente(fuenteCasos)).results.map(
    (fila) => fila.properties['Caso']?.title?.[0]?.plain_text ?? '',
  ),
);

/* ---------- sembrar ---------- */

console.log(`\nSEMBRANDO INFORMES EN PROSA — ${INFORMES_PROSA.length} del banco de pruebas\n`);

let creados = 0;
for (const informe of INFORMES_PROSA) {
  const codigo = `PROSA-${informe.id}`;
  if (yaEstan.has(codigo)) {
    console.log(`  ya estaba  ${codigo}`);
    continue;
  }

  const paginaPoliza = paginaDePlan.get(informe.planId);
  if (!paginaPoliza) {
    console.log(`  SIN PÓLIZA ${codigo}: no se encontró ${informe.planId} en la base Pólizas`);
    continue;
  }

  await crearFila(fuenteCasos, {
    Caso: titulo(codigo),
    Título: richText(informe.titulo),
    Informe: richText(informe.texto),
    Estado: seleccion('Pendiente'),
    'Póliza': relacion([paginaPoliza]),
  });
  creados += 1;
  console.log(`  creado     ${codigo}  · esperado ${informe.esperado.join(' o ')}`);
}

console.log(`\n${creados} filas nuevas. Cada una trae solo el informe y su póliza:`);
console.log('el dictamen tiene que salir de la lectura, no de columnas ya llenas.\n');
