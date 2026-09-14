/**
 * Cliente de Notion, a mano y con `fetch`: sin SDK, sin dependencias que envejezcan.
 *
 * La API cambió en la versión 2025-09-03: las bases de datos y las "fuentes de
 * datos" (data sources) se separaron. Una base contiene fuentes, y las filas se
 * crean colgando de la FUENTE, no de la base. Aquí se trabaja con ese modelo.
 */

const VERSION = '2026-03-11';
const BASE = 'https://api.notion.com/v1';

export function token(): string {
  const valor = process.env.NOTION_TOKEN;
  if (!valor) {
    throw new Error(
      'Falta NOTION_TOKEN. Guárdalo en .env.local (local) o como variable de entorno en Vercel.',
    );
  }
  return valor;
}

export function hayToken(): boolean {
  return Boolean(process.env.NOTION_TOKEN);
}

async function llamar(
  metodo: 'GET' | 'POST' | 'PATCH',
  ruta: string,
  cuerpo?: unknown,
): Promise<any> {
  const respuesta = await fetch(`${BASE}${ruta}`, {
    method: metodo,
    headers: {
      Authorization: `Bearer ${token()}`,
      'Notion-Version': VERSION,
      'Content-Type': 'application/json',
    },
    body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    cache: 'no-store',
  });

  const texto = await respuesta.text();
  const datos = texto ? JSON.parse(texto) : {};
  if (!respuesta.ok) {
    throw new Error(`Notion ${respuesta.status} en ${metodo} ${ruta}: ${datos.message ?? texto}`);
  }
  return datos;
}

/* ---------- construcción de propiedades ---------- */

const LIMITE_TEXTO = 1900;

/** Notion corta el texto en piezas de 2000 caracteres: aquí se trocea solo. */
export function richText(contenido: string) {
  const limpio = contenido && contenido.length > 0 ? contenido : ' ';
  const piezas = [];
  for (let i = 0; i < limpio.length; i += LIMITE_TEXTO) {
    piezas.push({ type: 'text', text: { content: limpio.slice(i, i + LIMITE_TEXTO) } });
  }
  return { rich_text: piezas };
}

export function titulo(contenido: string) {
  return { title: [{ type: 'text', text: { content: contenido.slice(0, 1900) } }] };
}

export function numero(valor: number) {
  return { number: valor };
}

export function siNo(valor: boolean) {
  return { checkbox: valor };
}

export function fecha(iso: string) {
  return { date: { start: iso } };
}

export function seleccion(nombre: string) {
  return { select: { name: nombre } };
}

export function opciones(nombres: string[]) {
  return { multi_select: nombres.map((name) => ({ name })) };
}

export function relacion(ids: string[]) {
  return { relation: ids.map((id) => ({ id })) };
}

/* ---------- lectura de propiedades ---------- */

export function leerTexto(propiedad: any): string {
  if (!propiedad) return '';
  if (Array.isArray(propiedad.rich_text)) {
    return propiedad.rich_text.map((t: any) => t.plain_text ?? '').join('');
  }
  if (Array.isArray(propiedad.title)) {
    return propiedad.title.map((t: any) => t.plain_text ?? '').join('');
  }
  return '';
}

export function leerNumero(propiedad: any): number {
  return typeof propiedad?.number === 'number' ? propiedad.number : 0;
}

export function leerSeleccion(propiedad: any): string {
  return propiedad?.select?.name ?? '';
}

export function leerOpciones(propiedad: any): string[] {
  return Array.isArray(propiedad?.multi_select)
    ? propiedad.multi_select.map((o: any) => o.name)
    : [];
}

export function leerFecha(propiedad: any): string {
  return propiedad?.date?.start ?? '';
}

export function leerRelacion(propiedad: any): string[] {
  return Array.isArray(propiedad?.relation) ? propiedad.relation.map((r: any) => r.id) : [];
}

/* ---------- operaciones ---------- */

export async function buscarPagina(consulta: string) {
  return llamar('POST', '/search', {
    query: consulta,
    filter: { property: 'object', value: 'page' },
    page_size: 10,
  });
}

export async function buscarBases(consulta: string) {
  return llamar('POST', '/search', {
    query: consulta,
    filter: { property: 'object', value: 'data_source' },
    page_size: 20,
  });
}

export async function crearBaseDeDatos(
  paginaPadreId: string,
  tituloBase: string,
  propiedades: Record<string, unknown>,
) {
  return llamar('POST', '/databases', {
    parent: { type: 'page_id', page_id: paginaPadreId },
    title: [{ type: 'text', text: { content: tituloBase } }],
    initial_data_source: { properties: propiedades },
  });
}

export function fuenteDeBase(base: any): string {
  const id = base?.data_sources?.[0]?.id;
  if (!id) throw new Error(`La base ${base?.id} no devolvió ninguna fuente de datos`);
  return id;
}

export async function crearFila(fuenteId: string, propiedades: Record<string, unknown>) {
  return llamar('POST', '/pages', {
    parent: { type: 'data_source_id', data_source_id: fuenteId },
    properties: propiedades,
  });
}

export async function consultarFuente(
  fuenteId: string,
  filtro?: unknown,
  orden?: unknown,
) {
  return llamar('POST', `/data_sources/${fuenteId}/query`, {
    ...(filtro ? { filter: filtro } : {}),
    ...(orden ? { sorts: orden } : {}),
    page_size: 50,
  });
}

export async function actualizarPagina(paginaId: string, propiedades: Record<string, unknown>) {
  return llamar('PATCH', `/pages/${paginaId}`, { properties: propiedades });
}

export async function leerPagina(paginaId: string) {
  return llamar('GET', `/pages/${paginaId}`);
}
