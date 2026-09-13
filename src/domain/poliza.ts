import type { Clausula } from './tipos.ts';

/**
 * Compilador de pólizas: el texto legal en lenguaje natural se convierte en
 * cláusulas indexadas, cada una con su posición exacta en el documento.
 * Esto es lo que después permite citar (y auditar) cualquier decisión.
 *
 * Formato del texto: cada cláusula empieza con un marcador #4.2#
 */

const MARCADOR = /#([0-9]+(?:\.[0-9]+)*)#/g;

export function compilarPoliza(texto: string): Clausula[] {
  const marcadores: { id: string; desde: number; hasta: number }[] = [];
  for (const coincidencia of texto.matchAll(MARCADOR)) {
    marcadores.push({
      id: coincidencia[1],
      desde: coincidencia.index,
      hasta: coincidencia.index + coincidencia[0].length,
    });
  }

  return marcadores.map((marcador, i) => ({
    id: marcador.id,
    texto: texto
      .slice(marcador.hasta, marcadores[i + 1]?.desde ?? texto.length)
      .trim(),
    offset: marcador.hasta,
  }));
}

export function clausulaDe(clausulas: Clausula[], id: string): Clausula {
  const encontrada = clausulas.find((c) => c.id === id);
  if (!encontrada) {
    throw new Error(`La póliza cita la cláusula ${id}, que no existe en el documento`);
  }
  return encontrada;
}

export function idsDeClausulas(texto: string): string[] {
  return compilarPoliza(texto).map((c) => c.id);
}
