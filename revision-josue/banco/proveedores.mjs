/**
 * Proveedores del banco. Cada uno expone completar(instruccion, esquema) y devuelve
 * { texto, ms, entrada, salida, modelo }. `esquema` es opcional: si el proveedor
 * admite salida estructurada, se usa; si no, se confía en el prompt.
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Anthropic from '@anthropic-ai/sdk';

let cliente;
const anthropic = () => (cliente ??= new Anthropic({ maxRetries: 4 }));

function textoDe(respuesta) {
  return respuesta.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
}

export function proveedorClaude(modelo, { effort, conEsquema = true } = {}) {
  return {
    id: `${modelo}${effort ? `@${effort}` : ''}${conEsquema ? '' : '·sin-esquema'}`,
    completar: async (instruccion, esquema) => {
      const inicio = Date.now();
      const peticion = {
        model: modelo,
        max_tokens: 8000,
        messages: [{ role: 'user', content: instruccion }],
      };
      const output_config = {};
      if (effort) output_config.effort = effort;
      if (esquema && conEsquema) output_config.format = { type: 'json_schema', schema: esquema };
      if (Object.keys(output_config).length) peticion.output_config = output_config;
      const respuesta = await anthropic().messages.create(peticion);
      if (respuesta.stop_reason === 'refusal') throw new Error('refusal');
      return {
        texto: textoDe(respuesta),
        ms: Date.now() - inicio,
        entrada: respuesta.usage.input_tokens,
        salida: respuesta.usage.output_tokens,
        modelo: respuesta.model,
      };
    },
  };
}

export function proveedorOllama(modelo, { conEsquema = true } = {}) {
  return {
    id: `ollama:${modelo}${conEsquema ? '' : '·sin-esquema'}`,
    completar: async (instruccion, esquema) => {
      const inicio = Date.now();
      const r = await fetch('http://127.0.0.1:11434/api/generate', {
        method: 'POST',
        body: JSON.stringify({
          model: modelo,
          prompt: instruccion,
          stream: false,
          think: false,
          format: esquema && conEsquema ? esquema : 'json',
          options: { temperature: 0, num_ctx: 8192 },
        }),
      }).then((x) => x.json());
      if (r.error) throw new Error(r.error);
      return { texto: r.response, ms: Date.now() - inicio, entrada: r.prompt_eval_count ?? 0, salida: r.eval_count ?? 0, modelo };
    },
  };
}

const CODEX_JS = 'C:/Users/Josue Carrillo/AppData/Roaming/npm/node_modules/@openai/codex/bin/codex.js';

/** Codex por la CLI de la suscripción: sin clave de API, pero con el arranque del agente. */
export function proveedorCodex() {
  return {
    id: 'codex-cli',
    completar: (instruccion) =>
      new Promise((resolver, rechazar) => {
        const carpeta = mkdtempSync(join(tmpdir(), 'banco-codex-'));
        const salidaFinal = join(carpeta, 'ultimo.txt');
        const inicio = Date.now();
        const hijo = spawn(
          process.execPath,
          [CODEX_JS, 'exec', '--skip-git-repo-check', '--sandbox', 'read-only', '--ephemeral', '-o', salidaFinal,
            'Responde SOLO con el objeto JSON pedido, sin usar herramientas ni leer archivos.\n\n' + instruccion],
          // stdin cerrado: si queda abierto, codex espera «additional input» y nunca responde.
          { cwd: carpeta, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] },
        );
        let err = '';
        hijo.stderr.on('data', (d) => (err += d));
        hijo.stdout.on('data', (d) => (err += d));
        const limite = setTimeout(() => hijo.kill(), 240000);
        hijo.on('close', (codigo) => {
          clearTimeout(limite);
          try {
            if (codigo !== 0) throw new Error(`codex salió con ${codigo}: ${err.slice(-300)}`);
            const texto = readFileSync(salidaFinal, 'utf8');
            const tokens = Number((err.match(/tokens used\s*\n?\s*([\d,]+)/i)?.[1] ?? '0').replace(/,/g, ''));
            const modelo = err.match(/model:\s*(\S+)/i)?.[1] ?? 'codex';
            resolver({ texto, ms: Date.now() - inicio, entrada: tokens, salida: 0, modelo });
          } catch (e) {
            rechazar(e);
          } finally {
            rmSync(carpeta, { recursive: true, force: true });
          }
        });
      }),
  };
}
