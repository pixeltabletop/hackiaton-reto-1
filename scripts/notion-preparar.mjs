/**
 * Prepara Notion para el reto: crea las tres bases con su esquema exacto, carga el
 * corpus (3 pólizas y los 6 casos) y deja listo el archivo de configuración local.
 *
 *   node --import ./scripts/registro-ts.mjs scripts/notion-preparar.mjs --pagina <id-o-url>
 *
 * El token se lee de la variable de entorno NOTION_TOKEN o de .secrets/notion-token.txt.
 * Nunca se imprime ni se escribe en el repositorio.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

function cargarToken() {
  if (process.env.NOTION_TOKEN) return process.env.NOTION_TOKEN;
  const archivo = join(raiz, '.secrets', 'notion-token.txt');
  if (existsSync(archivo)) {
    const valor = readFileSync(archivo, 'utf8').trim();
    if (valor.length > 10) {
      process.env.NOTION_TOKEN = valor;
      console.log('token: leído de .secrets/notion-token.txt');
      return valor;
    }
  }
  console.error(`
FALTA EL TOKEN DE NOTION

  1. Entra a https://www.notion.so/my-integrations y crea una conexión interna
     ("New connection"), con capacidad de leer e insertar contenido.
  2. Copia el token y guárdalo en: ${join(raiz, '.secrets', 'notion-token.txt')}
  3. En Notion, abre la página padre y en el menú "···" añade esa conexión
     (sin este paso la API responde 404 aunque el token esté bien).
  4. Vuelve a correr este script pasando la página padre:  --pagina <id-o-url>
`);
  process.exit(1);
}

function idDeEntrada(valor) {
  if (!valor) return '';
  const limpio = valor.trim();
  const coincidencia = limpio.match(/[0-9a-fA-F]{32}/);
  if (coincidencia) return coincidencia[0];
  const conGuiones = limpio.match(
    /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/,
  );
  return conGuiones ? conGuiones[0] : limpio;
}

const argumentos = process.argv.slice(2);
const indicePagina = argumentos.indexOf('--pagina');
const paginaDeArgumento = indicePagina >= 0 ? argumentos[indicePagina + 1] : undefined;

cargarToken();

const { PLANES } = await import('../src/data/planes.ts');
const { CASOS } = await import('../src/data/casos.ts');
const {
  buscarBases,
  crearBaseDeDatos,
  crearFila,
  fuenteDeBase,
  leerPagina,
} = await import('../src/notion/cliente.ts');
const { propiedadesDePlan, propiedadesDeCaso } = await import('../src/notion/mapeo.ts');

const paginaPadre = idDeEntrada(paginaDeArgumento ?? process.env.NOTION_PAGINA_PADRE ?? '');
if (!paginaPadre) {
  console.error('Falta la página padre:  --pagina <id-o-url de la página de Notion>');
  process.exit(1);
}

console.log(`\nPREPARANDO NOTION · página padre ${paginaPadre}\n`);

/* ---------- 1. Las tres bases ---------- */

const ESQUEMA_POLIZAS = {
  Plan: { title: {} },
  Aseguradora: { rich_text: {} },
  'Vigencia desde': { date: {} },
  'Vigencia hasta': { date: {} },
  Deducible: { number: { format: 'number' } },
  'Coaseguro %': { number: { format: 'number' } },
  'Coaseguro fuera de red %': { number: { format: 'number' } },
  'Tope anual': { number: { format: 'number' } },
  'Umbral de auditoria': { number: { format: 'number' } },
  'Carencia cirugia electiva (meses)': { number: { format: 'number' } },
  'Carencia preexistencias (meses)': { number: { format: 'number' } },
  'Carencia maternidad (meses)': { number: { format: 'number' } },
  Red: { rich_text: {} },
  'Texto de la poliza': { rich_text: {} },
  'Estructura (JSON)': { rich_text: {} },
};

function esquemaCasos(fuentePolizas) {
  return {
    Caso: { title: {} },
    Título: { rich_text: {} },
    Hospital: { select: { options: [] } },
    Fecha: { date: {} },
    Paciente: { rich_text: {} },
    Cédula: { rich_text: {} },
    Póliza: { rich_text: {} },
    Edad: { number: { format: 'number' } },
    Sexo: { select: { options: [] } },
    Afiliación: { date: {} },
    Diagnóstico: { rich_text: {} },
    CUPS: { rich_text: {} },
    Cirujano: { rich_text: {} },
    Carácter: { select: { options: [] } },
    'Monto estimado': { number: { format: 'number' } },
    Estudios: { rich_text: {} },
    Documentos: { multi_select: { options: [] } },
    Preexistencias: { rich_text: {} },
    Informe: { rich_text: {} },
    Estado: {
      select: {
        options: [
          { name: 'Pendiente', color: 'yellow' },
          { name: 'Dictaminado', color: 'green' },
        ],
      },
    },
    Póliza: {
      relation: { data_source_id: fuentePolizas, type: 'single_property', single_property: {} },
    },
  };
}

function esquemaDecisiones(fuenteCasos) {
  return {
    Decisión: { title: {} },
    Caso: {
      relation: { data_source_id: fuenteCasos, type: 'single_property', single_property: {} },
    },
    Estado: { select: { options: [] } },
    Facturado: { number: { format: 'number' } },
    Deducible: { number: { format: 'number' } },
    Coaseguro: { number: { format: 'number' } },
    'Paga la aseguradora': { number: { format: 'number' } },
    'Paga el paciente': { number: { format: 'number' } },
    'Cláusulas citadas': { multi_select: { options: [] } },
    Motivos: { rich_text: {} },
    Faltantes: { rich_text: {} },
    'Qué falta para aprobar': { rich_text: {} },
    'Tiempo (ms)': { number: { format: 'number' } },
    'Sin cláusula citada': { number: { format: 'number' } },
    'Dictaminado el': { date: {} },
  };
}

async function crear(titulo, propiedades) {
  const base = await crearBaseDeDatos(paginaPadre, titulo, propiedades);
  const fuente = fuenteDeBase(base);
  console.log(`base creada: ${titulo}  → base ${base.id} · fuente ${fuente}`);
  return { baseId: base.id, fuenteId: fuente, url: base.url };
}

const polizas = await crear('Pólizas', ESQUEMA_POLIZAS);
const casos = await crear('Casos', esquemaCasos(polizas.fuenteId));
const decisiones = await crear('Decisiones', esquemaDecisiones(casos.fuenteId));

/* ---------- 2. El corpus ---------- */

const paginasDePlan = {};
for (const plan of PLANES) {
  const fila = await crearFila(polizas.fuenteId, propiedadesDePlan(plan));
  paginasDePlan[plan.id] = fila.id;
  console.log(`póliza cargada: ${plan.id} (${plan.plan})`);
}

for (const caso of CASOS) {
  const fila = await crearFila(casos.fuenteId, propiedadesDeCaso(caso, paginasDePlan[caso.planId]));
  console.log(`caso cargado: ${caso.id}  → ${caso.titulo}`);
}

/* ---------- 3. Configuración local ---------- */

const configuracion = {
  paginaPadre,
  polizas,
  casos,
  decisiones,
  paginasDePlan,
  preparadoEl: new Date().toISOString(),
};

const archivoConfig = join(raiz, 'notion.config.json');
writeFileSync(archivoConfig, JSON.stringify(configuracion, null, 2));
console.log(`\nconfiguración local escrita en: ${archivoConfig}`);

console.log(`
VARIABLES DE ENTORNO QUE HAY QUE PONER (local en .env.local y en Vercel):

  NOTION_TOKEN=${'<tu token, solo en el archivo de secretos>'}
  NOTION_FUENTE_CASOS=${casos.fuenteId}
  NOTION_FUENTE_POLIZAS=${polizas.fuenteId}
  NOTION_FUENTE_DECISIONES=${decisiones.fuenteId}

Páginas de Notion:
  Pólizas:    ${polizas.url}
  Casos:      ${casos.url}
  Decisiones: ${decisiones.url}
`);

// Referencia para que el import de leerPagina no quede sin usar en la verificación.
void leerPagina;
void buscarBases;
