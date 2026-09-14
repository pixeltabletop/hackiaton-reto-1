/**
 * Quién puede escribir en Notion desde la web pública.
 *
 * No hay inicio de sesión en la demostración, así que la escritura se limita a lo que
 * se puede comprobar sin él: que la petición salga de nuestro propio sitio (frena los
 * formularios de otras páginas), que la página sea un caso de la base Casos configurada
 * (nadie usa la integración para escribir en otra página) y que el caso siga
 * pendiente (no se duplican decisiones). Un script que falsifique Origin sigue
 * pudiendo dictaminar un caso pendiente: para eso haría falta autenticación real.
 */

export interface PeticionDeEscritura {
  origen: string | null;
  host: string | null;
  fuenteCasos: string | undefined;
  fila: any;
}

export type Resultado = { ok: true } | { ok: false; motivo: string };

/** Primer filtro, antes de tocar Notion: la petición tiene que salir de este mismo sitio. */
export function validarOrigen(origen: string | null, host: string | null): Resultado {
  if (!origen || !host) return { ok: false, motivo: 'La petición no dice de qué sitio viene' };
  let hostDeOrigen: string;
  try {
    hostDeOrigen = new URL(origen).host;
  } catch {
    return { ok: false, motivo: 'El origen de la petición no es válido' };
  }
  if (hostDeOrigen !== host) return { ok: false, motivo: 'La petición viene de otro sitio' };
  return { ok: true };
}

export function validarEscritura({ origen, host, fuenteCasos, fila }: PeticionDeEscritura): Resultado {
  const deOrigen = validarOrigen(origen, host);
  if (!deOrigen.ok) return deOrigen;

  if (!fuenteCasos) return { ok: false, motivo: 'La base Casos no está configurada (NOTION_FUENTE_CASOS)' };
  const padre = fila?.parent?.data_source_id ?? fila?.parent?.database_id;
  if (normalizarId(padre) !== normalizarId(fuenteCasos)) {
    return { ok: false, motivo: 'La página no pertenece a la base Casos' };
  }

  if (fila?.properties?.Estado?.select?.name === 'Dictaminado') {
    return { ok: false, motivo: 'El caso ya fue dictaminado' };
  }
  return { ok: true };
}

/** Notion devuelve los id con guiones y las variables de entorno pueden venir sin ellos. */
const normalizarId = (id: unknown): string => String(id ?? '').replace(/-/g, '').toLowerCase();
