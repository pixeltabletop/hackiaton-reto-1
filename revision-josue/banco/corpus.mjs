/**
 * El corpus del banco: los 6 informes del proyecto, las 18 trampas y los 7 en prosa.
 * Cada elemento: { id, grupo, planId, texto, esperado[] }.
 */
import { CASOS } from '../../src/data/casos';
import { TRAMPAS } from '../../src/data/trampas';
import { INFORMES_PROSA } from './informes-prosa.mjs';

export function construirCorpus() {
  const corpus = [];
  for (const caso of CASOS) {
    corpus.push({ id: caso.id, grupo: 'corpus', planId: caso.planId, texto: caso.informeTexto, esperado: [caso.estadoEsperado], titulo: caso.titulo });
  }
  for (const trampa of TRAMPAS) {
    const base = CASOS.find((c) => c.id === trampa.casoBase);
    let texto = base.informeTexto;
    for (const [buscar, poner] of trampa.cambios) {
      if (!texto.includes(buscar)) throw new Error(`${trampa.id}: no encuentra su reemplazo`);
      texto = texto.replace(buscar, poner);
    }
    if (trampa.cambios.length === 0) continue; // TR-00 es el mismo informe que su caso base
    corpus.push({ id: trampa.id, grupo: 'trampa', planId: base.planId, texto, esperado: [trampa.esperado].flat(), titulo: trampa.titulo });
  }
  for (const informe of INFORMES_PROSA) {
    corpus.push({ id: informe.id, grupo: 'prosa', planId: informe.planId, texto: informe.texto, esperado: informe.esperado, titulo: informe.titulo });
  }
  return corpus;
}
