/**
 * Puerta de los informes trampa. Pasa cada informe de `revision-josue/pruebas/trampas.ts` por el
 * mismo camino que `/leer` sin clave de modelo (lector por reglas → motor) y falla
 * (exit 1) si:
 *
 *   1. una trampa sin deuda da un dictamen distinto al correcto;
 *   2. una trampa con deuda ya pasa: hay que quitarle la deuda, para que la lista
 *      solo baje;
 *   3. un reemplazo no encuentra su texto en el informe base: esa trampa no estaría
 *      probando nada;
 *   4. con `--estricto`, queda cualquier deuda. Es el modo para antes de entregar.
 *
 * Por qué existe: la revisión del 14 de septiembre encontró que 5 de 16 informes
 * realistas terminaban en PRE_APROBADO cuando no debían (negaciones, preexistencias
 * con otro rótulo, montos corregidos), mientras las 22 pruebas y la puerta del
 * dictamen seguían en verde. Las pruebas cubrían los seis informes del corpus, que
 * están escritos a la medida del lector.
 */
import { readFileSync } from 'node:fs';
import { CASOS } from '../../src/data/casos';
import { planDe } from '../../src/data/planes';
import { TRAMPAS } from './trampas';
import { leerInforme } from '../../src/domain/lectura';
import { dictaminar } from '../../src/domain/motor';

const estricto = process.argv.includes('--estricto');
const ARCHIVO = 'revision-josue/pruebas/trampas.ts';
const fuente = readFileSync(new URL('./trampas.ts', import.meta.url), 'utf8').split('\n');
const lineaDe = (id) => fuente.findIndex((l) => l.includes(`id: '${id}'`)) + 1;

const aprobado = (estado) => estado.startsWith('PRE_APROBADO');
const NEGATIVAS = new Set(['NO_CUBIERTO', 'CARENCIA_NO_CUMPLIDA']);

function riesgo(esperados, obtenido) {
  if (aprobado(obtenido) && !esperados.some(aprobado)) return 'APRUEBA DE MÁS';
  if (NEGATIVAS.has(obtenido) && esperados.some(aprobado)) return 'NIEGA DE MÁS';
  return 'FRENA DE MÁS';
}

const fallos = [];
const deudaVigente = [];
const vistas = new Set();

console.log(`\nINFORMES TRAMPA — ${TRAMPAS.length} casos${estricto ? ' · modo estricto' : ''}\n`);

for (const trampa of TRAMPAS) {
  const donde = `${ARCHIVO}:${lineaDe(trampa.id)}`;
  const esperados = [trampa.esperado].flat();

  if (vistas.has(trampa.id)) {
    fallos.push(`${trampa.id} (${donde}): id repetido`);
    continue;
  }
  vistas.add(trampa.id);

  const base = CASOS.find((c) => c.id === trampa.casoBase);
  if (!base) {
    fallos.push(`${trampa.id} (${donde}): el caso base ${trampa.casoBase} no existe en el corpus`);
    continue;
  }

  let texto = base.informeTexto;
  const perdidos = trampa.cambios.filter(([buscar]) => !texto.includes(buscar));
  if (perdidos.length > 0) {
    fallos.push(
      `${trampa.id} (${donde}): no encuentra «${perdidos[0][0]}» en ${base.id}. ` +
        'La trampa no estaría probando nada: ¿cambió el informe base?',
    );
    continue;
  }
  for (const [buscar, poner] of trampa.cambios) texto = texto.replace(buscar, poner);

  const plan = planDe(base.planId);
  const { caso } = leerInforme(texto, plan.id, plan.red.map((h) => h.hospital));
  const obtenido = dictaminar(caso, plan).estado;
  const correcto = esperados.includes(obtenido);
  const detalle = `esperado ${esperados.join(' o ')} · obtenido ${obtenido}`;

  if (correcto && trampa.deuda) {
    console.log(`SALDADA ${trampa.id}  ${trampa.titulo}`);
    fallos.push(
      `${trampa.id} (${donde}): ya da el dictamen correcto. Quita su campo «deuda» para que no pueda volver a romperse en silencio.`,
    );
  } else if (correcto) {
    console.log(`OK      ${trampa.id}  ${trampa.titulo}`);
  } else if (trampa.deuda) {
    const r = riesgo(esperados, obtenido);
    deudaVigente.push({ trampa, r });
    console.log(`DEUDA   ${trampa.id}  ${trampa.titulo}\n        └─ ${r} · ${detalle}\n        └─ ${trampa.deuda}`);
    if (estricto) fallos.push(`${trampa.id} (${donde}): ${r} · ${detalle} · deuda: ${trampa.deuda}`);
  } else {
    const r = riesgo(esperados, obtenido);
    console.log(`FALLA   ${trampa.id}  ${trampa.titulo}\n        └─ ${r} · ${detalle}`);
    fallos.push(`${trampa.id} (${donde}): ${r} · ${detalle}. ${trampa.porQue}`);
  }
}

const cuenta = (r) => deudaVigente.filter((d) => d.r === r).length;
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
console.log(
  `\nDEUDA: ${plural(deudaVigente.length, 'caso', 'casos')} · ` +
    `${plural(cuenta('APRUEBA DE MÁS'), 'aprobación indebida', 'aprobaciones indebidas')} · ` +
    `${plural(cuenta('NIEGA DE MÁS'), 'negativa indebida', 'negativas indebidas')} · ` +
    `${plural(cuenta('FRENA DE MÁS'), 'freno de más', 'frenos de más')}`,
);

if (fallos.length > 0) {
  console.error('\nCHECK TRAMPAS: FALLA\n');
  for (const fallo of fallos) console.error(`  ✗ ${fallo}`);
  console.error('');
  process.exit(1);
}

console.log(
  estricto
    ? '\nCHECK TRAMPAS: OK — ninguna trampa en deuda'
    : `\nCHECK TRAMPAS: OK — ninguna regresión; ${deudaVigente.length} en deuda (--estricto exige cero)`,
);
