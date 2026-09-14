/**
 * Ejecuta las llamadas a los modelos y las guarda en caché (cache/<proveedor>/<tarea>/<id>.json).
 * Dos tareas por informe:
 *   - lectura: la instrucción real del producto (instruccionDeLectura) → campos con cita.
 *   - decision: el modelo decide solo, con la póliza completa. Es la línea base que la
 *     tesis del proyecto dice evitar; se mide para ver si esa tesis se sostiene.
 *
 *   node --import ./scripts/registro-ts.mjs revision-josue/banco/correr.mjs --proveedores haiku,sonnet --paralelo 4
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { planDe } from '../../src/data/planes';
import { CAMPOS, instruccionDeLectura } from '../../src/domain/lectura-modelo';
import { construirCorpus } from './corpus.mjs';
import { proveedorClaude, proveedorCodex, proveedorOllama } from './proveedores.mjs';

const aqui = dirname(fileURLToPath(import.meta.url));
const arg = (nombre, defecto) => {
  const i = process.argv.indexOf(nombre);
  return i >= 0 ? process.argv[i + 1] : defecto;
};

export const PROVEEDORES = {
  haiku: () => proveedorClaude('claude-haiku-4-5'),
  sonnet: () => proveedorClaude('claude-sonnet-5', { effort: 'low' }),
  qwen: () => proveedorOllama('qwen3:1.7b'),
  'qwen-sin-esquema': () => proveedorOllama('qwen3:1.7b', { conEsquema: false }),
  codex: () => proveedorCodex(),
};

export const ESQUEMA_LECTURA = {
  type: 'object',
  additionalProperties: false,
  required: ['campos', 'documentos', 'preexistencias'],
  properties: {
    campos: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['campo', 'valor', 'cita'],
        properties: { campo: { type: 'string', enum: [...CAMPOS] }, valor: { type: 'string' }, cita: { type: 'string' } },
      },
    },
    documentos: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'cita'],
        properties: { id: { type: 'string', enum: ['R1', 'R2', 'R3', 'R4', 'R5'] }, cita: { type: 'string' } },
      },
    },
    preexistencias: { type: 'array', items: { type: 'string' } },
  },
};

export const ESTADOS = [
  'PRE_APROBADO', 'PRE_APROBADO_CON_CONDICIONES', 'DOCUMENTOS_FALTANTES',
  'NO_CUBIERTO', 'CARENCIA_NO_CUMPLIDA', 'DERIVAR_A_MEDICO_AUDITOR',
];

export const ESQUEMA_DECISION = {
  type: 'object',
  additionalProperties: false,
  required: ['estado', 'clausula', 'motivo'],
  properties: { estado: { type: 'string', enum: ESTADOS }, clausula: { type: 'string' }, motivo: { type: 'string' } },
};

export function instruccionDeDecision(informe, plan) {
  return `Eres el dictaminador de pre-autorizaciones quirúrgicas de una aseguradora.
Con la póliza y el informe del hospital, decide UNO de estos estados: ${ESTADOS.join(', ')}.
Datos del plan que no están en el texto legal: deducible USD ${plan.deducibleAnual / 100}, umbral de auditoría USD ${plan.umbralAuditoria / 100}, red: ${plan.red.map((h) => h.hospital).join(', ')}.
Procedimientos cubiertos (CUPS): ${plan.procedimientos.map((p) => `${p.cups} ${p.nombre}`).join('; ')}. Excluidos: ${plan.exclusiones.filter((e) => e.cups).map((e) => e.cups).join(', ')}.
Responde SOLO un objeto JSON: {"estado": "...", "clausula": "número de cláusula", "motivo": "una frase"}.

PÓLIZA:
"""
${plan.textoIntegral}
"""

INFORME:
"""
${informe}
"""`;
}

async function enParalelo(tareas, n) {
  const resultados = [];
  let siguiente = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (siguiente < tareas.length) {
        const i = siguiente++;
        resultados[i] = await tareas[i]();
      }
    }),
  );
  return resultados;
}

async function main() {
  const nombres = arg('--proveedores', 'haiku').split(',');
  const paralelo = Number(arg('--paralelo', '3'));
  const tareasPedidas = arg('--tareas', 'lectura,decision').split(',');
  const soloIds = arg('--ids', '') ? arg('--ids', '').split(',') : null;
  const corpus = construirCorpus().filter((c) => !soloIds || soloIds.includes(c.id));

  for (const nombre of nombres) {
    const proveedor = PROVEEDORES[nombre]();
    const tareas = [];
    for (const tarea of tareasPedidas) {
      for (const item of corpus) {
        const archivo = join(aqui, 'cache', nombre, tarea, `${item.id}.json`);
        if (existsSync(archivo)) continue;
        tareas.push(async () => {
          const plan = planDe(item.planId);
          const instruccion = tarea === 'lectura' ? instruccionDeLectura(item.texto) : instruccionDeDecision(item.texto, plan);
          const esquema = tarea === 'lectura' ? ESQUEMA_LECTURA : ESQUEMA_DECISION;
          let registro;
          try {
            registro = { ok: true, ...(await proveedor.completar(instruccion, esquema)) };
          } catch (error) {
            registro = { ok: false, error: String(error?.message ?? error).slice(0, 500) };
          }
          mkdirSync(dirname(archivo), { recursive: true });
          writeFileSync(archivo, JSON.stringify({ proveedor: proveedor.id, tarea, id: item.id, ...registro }, null, 2));
          console.log(`${nombre} ${tarea} ${item.id} ${registro.ok ? `${registro.ms} ms` : `ERROR ${registro.error.slice(0, 120)}`}`);
        });
      }
    }
    console.log(`\n${nombre}: ${tareas.length} llamadas pendientes (paralelo ${paralelo})`);
    await enParalelo(tareas, paralelo);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1].replace(/\//g, '\\')) await main();
else if (process.argv[1]?.endsWith('correr.mjs')) await main();
