/**
 * Puerta de color: mide el contraste WCAG de los pares que importan (tinta sobre
 * superficie, cada estado sobre su tinte) leyendo las variables de `app/globals.css`.
 *
 * Falla (exit 1) si un texto normal baja de 4.5:1 o un texto grande de 3:1. Así el
 * diseño no se puede volver bonito pero ilegible sin que alguien se entere.
 *
 *   node scripts/check-contraste.mjs
 */
import { readFileSync } from 'node:fs';

const CSS = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');

const variables = {};
for (const coincidencia of CSS.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
  variables[coincidencia[1]] = coincidencia[2];
}

const color = (nombre) => {
  const valor = variables[nombre];
  if (!valor) throw new Error(`No encontré la variable --${nombre} en globals.css`);
  return valor;
};

function aRgb(hex) {
  let valor = hex.replace('#', '');
  if (valor.length === 3) valor = valor.split('').map((c) => c + c).join('');
  const numero = parseInt(valor.slice(0, 6), 16);
  return [(numero >> 16) & 255, (numero >> 8) & 255, numero & 255];
}

function luminancia(hex) {
  const [r, g, b] = aRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contraste(uno, otro) {
  const [claro, oscuro] = [luminancia(uno), luminancia(otro)].sort((a, b) => b - a);
  return (claro + 0.05) / (oscuro + 0.05);
}

/** Texto normal pide 4.5:1; texto grande (≥24px, o ≥18.66px en negrita) pide 3:1. */
const PARES = [
  // [qué es, color de texto, color de fondo, ¿es texto grande?]
  ['Tinta sobre el fondo de la página', 'tinta', 'fondo', false],
  ['Tinta sobre superficie blanca', 'tinta', 'superficie', false],
  ['Texto secundario sobre superficie', 'tinta-2', 'superficie', false],
  ['Texto terciario sobre superficie', 'tinta-3', 'superficie', false],
  ['Texto terciario sobre el fondo', 'tinta-3', 'fondo', false],
  ['Acento sobre superficie (enlaces y cejas)', 'acento', 'superficie', false],
  ['Acentos de las cláusulas sobre blanco', 'fam-documentos', 'superficie', false],
  ['Etiqueta de estado: aprobado', 'aprobado', 'aprobado-tinte', false],
  ['Etiqueta de estado: con condiciones', 'condiciones', 'condiciones-tinte', false],
  ['Etiqueta de estado: faltantes', 'faltantes', 'faltantes-tinte', false],
  ['Etiqueta de estado: carencia', 'carencia', 'carencia-tinte', false],
  ['Etiqueta de estado: no cubierto', 'no-cubierto', 'no-cubierto-tinte', false],
  ['Etiqueta de estado: auditor', 'auditor', 'auditor-tinte', false],
  ['Familias: cumplimiento', 'fam-cumplimiento', 'fam-cumplimiento-tinte', false],
  ['Familias: cobertura', 'fam-cobertura', 'fam-cobertura-tinte', false],
  ['Familias: documentos', 'fam-documentos', 'fam-documentos-tinte', false],
  ['Familias: dinero', 'fam-dinero', 'fam-dinero-tinte', false],
  ['Título grande sobre el fondo', 'tinta', 'fondo', true],
  ['Cifra grande del veredicto', 'aprobado', 'aprobado-tinte', true],
];

const MINIMO = { normal: 4.5, grande: 3 };

let fallos = 0;
console.log('\nCONTRASTE (WCAG 2.1) — calculado sobre las variables de globals.css\n');

for (const [que, texto, fondo, grande] of PARES) {
  const ratio = contraste(color(texto), color(fondo));
  const minimo = grande ? MINIMO.grande : MINIMO.normal;
  const ok = ratio >= minimo;
  if (!ok) fallos += 1;
  console.log(
    `${ok ? 'OK  ' : 'FALLA'} ${ratio.toFixed(2).padStart(5)}:1  (mínimo ${minimo})  ${que}`,
  );
}

console.log(`\nPARES: ${PARES.length} · fallos: ${fallos}\n`);
if (fallos > 0) {
  console.error('CHECK COLOR: FALLA');
  process.exit(1);
}
console.log('CHECK COLOR: OK — ningún par por debajo del umbral');
