/**
 * Prueba del proveedor de modelo ANTES de publicar la URL.
 *
 *   ANTHROPIC_API_KEY=… | GOOGLE_API_KEY=… | GROQ_API_KEY=… | OPENAI_API_KEY=…  (y MODELO_LECTURA opcional)
 *   npm run probar:proveedor                # todos los informes
 *   npm run probar:proveedor -- --limite 3  # menos llamadas
 *   npm run probar:proveedor -- --simulado bueno|falla   # sin red ni clave, para probar la prueba
 *
 * Pasa informes con dictamen conocido por el MISMO camino que `/leer` (la acción del
 * servidor `dictaminarInforme`), con el proveedor que elija `proveedorDeEntorno()`.
 * Solo Claude Sonnet 5 está medido con el banco: si se publica con otra clave y ese modelo
 * no existe, falla o no respeta el formato, el sitio cae EN SILENCIO a la lectura por
 * reglas y los informes en prosa dejan de dictaminarse bien. Esta prueba lo hace visible.
 *
 * Salida: 0 sirve · 1 alguna aprobación indebida o el modelo cayó a reglas en más de un
 * informe · 2 no hay ninguna clave configurada.
 */
import { readFileSync } from 'node:fs';
import { CASOS } from '../src/data/casos';
import { TRAMPAS } from '../src/data/trampas';
import { dictaminarInforme } from '../app/(completo)/leer/acciones';
import { proveedorDeEntorno } from '../src/domain/lectura-modelo';
import { evaluarCorrida, esIndebida } from '../src/domain/prueba-proveedor';
import { INFORMES_PROSA } from './datos/informes-prosa.mjs';

const arg = (nombre) => {
  const i = process.argv.indexOf(nombre);
  return i >= 0 ? process.argv[i + 1] : undefined;
};
const CLAVES = ['ANTHROPIC_API_KEY', 'GOOGLE_API_KEY', 'GROQ_API_KEY', 'OPENAI_API_KEY'];

/* ---------- informes con dictamen conocido ---------- */

// Trampas donde el modelo podría empeorar lo que las reglas ya resuelven: una orden
// escondida de aprobar, documentos negados, preexistencias con otro rótulo o sin declarar.
const TRAMPAS_ELEGIDAS = ['TR-02', 'TR-06', 'TR-11', 'TR-13', 'TR-16', 'TR-23'];

function informesDePrueba() {
  const prosa = INFORMES_PROSA.map((i) => ({ id: i.id, planId: i.planId, esperados: i.esperado, texto: i.texto }));
  const trampas = TRAMPAS_ELEGIDAS.map((id) => {
    const trampa = TRAMPAS.find((t) => t.id === id);
    if (!trampa) throw new Error(`La trampa ${id} ya no existe en src/data/trampas.ts`);
    const base = CASOS.find((c) => c.id === trampa.casoBase);
    let texto = base.informeTexto;
    for (const [buscar, poner] of trampa.cambios) {
      if (!texto.includes(buscar)) throw new Error(`${id}: no encuentra «${buscar}» en ${base.id}`);
      texto = texto.replace(buscar, poner);
    }
    return { id, planId: base.planId, esperados: [trampa.esperado].flat(), texto };
  });
  return [...prosa, ...trampas];
}

/* ---------- modo simulado: la prueba de la prueba ---------- */

function simular(modo) {
  for (const clave of CLAVES) delete process.env[clave];
  delete process.env.MODELO_LECTURA;
  process.env.OPENAI_API_KEY = 'simulado';

  // Respuestas reales de Claude Sonnet 5 guardadas por el banco para los informes en prosa.
  const guardadas = JSON.parse(readFileSync(new URL('./datos/respuestas-simuladas.json', import.meta.url), 'utf8'));
  const vacia = JSON.stringify({ campos: [], documentos: [], preexistencias: [] });

  globalThis.fetch = async (_url, peticion) => {
    if (modo === 'falla') throw new Error('red simulada caída');
    const instruccion = JSON.parse(peticion.body).messages[0].content;
    const informe = INFORMES_PROSA.find((i) => instruccion.includes(i.texto));
    const contenido = informe ? guardadas[informe.id] : vacia;
    return new Response(JSON.stringify({ choices: [{ message: { content: contenido } }] }), { status: 200 });
  };
}

/* ---------- corrida ---------- */

const modoSimulado = arg('--simulado');
if (modoSimulado) {
  if (!['bueno', 'falla'].includes(modoSimulado)) {
    console.error('--simulado acepta «bueno» o «falla»');
    process.exit(2);
  }
  simular(modoSimulado);
}

const proveedor = proveedorDeEntorno();
if (!proveedor) {
  console.error(
    '\nPROBAR PROVEEDOR: no hay ninguna clave de modelo en el entorno.\n' +
      `Defina una de ${CLAVES.join(', ')} (y MODELO_LECTURA si quiere otro modelo) y vuelva a correr.\n` +
      'Sin clave, la URL pública solo lee por reglas y los informes en prosa no se dictaminan bien.\n',
  );
  process.exit(2);
}

const limite = Number(arg('--limite')) || Infinity;
const informes = informesDePrueba().slice(0, limite);

console.log(`\nPROBAR PROVEEDOR — ${proveedor.nombre}${modoSimulado ? ` · simulado: ${modoSimulado}` : ''}`);
console.log(`${informes.length} informes por el mismo camino que /leer\n`);

const resultados = [];
for (const informe of informes) {
  const datos = new FormData();
  datos.set('informe', informe.texto);
  datos.set('plan', informe.planId);

  const inicio = performance.now();
  const estado = await dictaminarInforme({ informe: '', planId: informe.planId, resultado: null, error: null }, datos);
  const ms = Math.round(performance.now() - inicio);

  if (!estado.resultado) {
    console.log(`ERROR  ${informe.id}  ${estado.error}`);
    resultados.push({ id: informe.id, esperados: informe.esperados, obtenido: 'SIN_RESULTADO', cayoAReglas: true, descartados: 0, ms });
    continue;
  }

  const nota = estado.resultado.nota ?? '';
  const fila = {
    id: informe.id,
    esperados: informe.esperados,
    obtenido: estado.resultado.vista.decision.estado,
    cayoAReglas: nota.includes('no respondió'),
    descartados: estado.resultado.descartados.length,
    ms,
  };
  resultados.push(fila);

  const marca = esIndebida(fila) ? 'APRUEBA DE MÁS' : fila.esperados.includes(fila.obtenido) ? 'OK' : 'DISTINTO';
  console.log(
    `${marca.padEnd(14)} ${fila.id.padEnd(6)} ${String(ms).padStart(6)} ms · ` +
      `obtenido ${fila.obtenido} · esperado ${fila.esperados.join(' o ')}` +
      `${fila.descartados ? ` · ${fila.descartados} campos descartados por su cita` : ''}` +
      `${fila.cayoAReglas ? `\n${' '.repeat(15)}CAYÓ A REGLAS: ${nota}` : ''}`,
  );
}

const veredicto = evaluarCorrida(resultados);
console.log(
  `\nAciertos ${veredicto.aciertos}/${resultados.length} · aprobaciones indebidas ${veredicto.indebidas} · ` +
    `cayó a reglas ${veredicto.caidas} · mediana ${veredicto.medianaMs} ms`,
);
console.log(
  veredicto.codigo === 0
    ? 'PROBAR PROVEEDOR: OK — se puede publicar con este proveedor.\n'
    : 'PROBAR PROVEEDOR: NO PUBLICAR con este proveedor — hay aprobaciones indebidas o el modelo no está leyendo.\n',
);
process.exit(veredicto.codigo);
