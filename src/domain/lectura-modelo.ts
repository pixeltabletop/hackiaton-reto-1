import { usd } from './dinero';
import { verificarCita } from './evidencia';
import { leerInforme, type Lectura } from './lectura';
import type { Caso, Caracter, Plan } from './tipos';

/**
 * Lectura con modelo, con una regla que no se negocia:
 *
 *   **El modelo no puede inventar.** Cada dato que devuelve tiene que venir con el
 *   fragmento literal del informe del que salió, y ese fragmento se verifica como
 *   subcadena antes de aceptarlo. Lo que no se puede citar, se descarta.
 *
 * Y siempre hay una red debajo: primero se lee por reglas (determinista, sin costo,
 * sin red) y el modelo solo añade lo que a las reglas se les escapó. Si el modelo
 * falla, tarda o devuelve basura, el dictamen sale igual.
 */

export interface ProveedorModelo {
  nombre: string;
  /** Recibe la instrucción completa y devuelve el texto de la respuesta. */
  completar(instruccion: string): Promise<string>;
}

export const CAMPOS = [
  'pacienteRef',
  'edad',
  'hospital',
  'fecha',
  'fechaAfiliacion',
  'diagnosticoCie10',
  'procedimientoCups',
  'cirujano',
  'caracter',
  'montoEstimado',
] as const;

const CAMPOS_VALIDOS = new Set<string>([...CAMPOS, 'documentos', 'preexistencias']);

export function instruccionDeLectura(informe: string): string {
  return `Eres el lector de informes médicos de un agente de pre-autorización de seguros.

Devuelve SOLO un objeto JSON con esta forma:

{
  "campos": [
    { "campo": "procedimientoCups", "valor": "512301", "cita": "CUPS 512301" },
    { "campo": "montoEstimado", "valor": "$ 4,200.00", "cita": "Monto estimado del procedimiento: $ 4,200.00" }
  ],
  "documentos": ["R1", "R2"],
  "preexistencias": ["Hipertensión arterial diagnosticada en 2024"]
}

Reglas estrictas:
- Cada objeto necesita "cita": un fragmento COPIADO LITERALMENTE del informe, sin corregir
  ni completar nada. Si no puedes copiar una cita literal, NO incluyas ese campo.
- Campos escalares válidos: ${CAMPOS.join(', ')}.
- "edad" es un número. "caracter" es uno de: electiva, urgente, emergencia.
- "montoEstimado" es el texto del monto tal como aparece, con su símbolo.
- "documentos" solo puede contener identificadores de esta lista:
  R1 = informe del cirujano, R2 = estudio de imagen, R3 = orden de anestesiología,
  R4 = consentimiento informado, R5 = informe de urgencias.
  Incluye únicamente los que el informe diga que están adjuntos.
- No inventes datos. Si algo no está en el informe, omítelo.

INFORME:
"""
${informe}
"""`;
}

export function extraerJson(respuesta: string): any {
  const limpio = respuesta.replace(/```json/gi, '').replace(/```/g, '').trim();
  const inicio = limpio.indexOf('{');
  const fin = limpio.lastIndexOf('}');
  if (inicio < 0 || fin < inicio) throw new Error('La respuesta del modelo no trae JSON');
  return JSON.parse(limpio.slice(inicio, fin + 1));
}

export interface LecturaConOrigen extends Lectura {
  origen: 'reglas' | 'modelo';
  nota: string;
  descartados: string[];
}

interface Aceptado {
  campo: string;
  valor: string;
  cita: string;
}

export function aceptarDelModelo(respuesta: string, informe: string, citasDeReglas: Record<string, string>) {
  const datos = extraerJson(respuesta);
  const aceptados: Aceptado[] = [];
  const descartados: string[] = [];

  for (const crudo of Array.isArray(datos.campos) ? datos.campos : []) {
    const campo = String(crudo?.campo ?? '').trim();
    const valor = String(crudo?.valor ?? '').trim();
    const cita = String(crudo?.cita ?? '').trim();

    if (!CAMPOS_VALIDOS.has(campo)) {
      descartados.push(`${campo || '(sin campo)'}: campo no reconocido`);
      continue;
    }
    if (!valor || !cita) {
      descartados.push(`${campo}: sin valor o sin cita`);
      continue;
    }
    if (!verificarCita(informe, cita).verificado) {
      descartados.push(`${campo}: la cita no aparece en el informe`);
      continue;
    }
    if (citasDeReglas[campo]) {
      continue; // las reglas ya lo tenían resuelto; el modelo no pisa lo determinista
    }
    aceptados.push({ campo, valor, cita });
  }

  const documentos = (Array.isArray(datos.documentos) ? datos.documentos : [])
    .map((d: unknown) => String(d).trim().toUpperCase())
    .filter((d: string) => ['R1', 'R2', 'R3', 'R4', 'R5'].includes(d));

  const preexistencias = (Array.isArray(datos.preexistencias) ? datos.preexistencias : [])
    .map((p: unknown) => String(p).trim())
    .filter((p: string) => p.length > 0 && verificarCita(informe, p).verificado);

  return { aceptados, descartados, documentos, preexistencias };
}

export async function leerInformeConModelo(
  informe: string,
  plan: Plan,
  proveedor: ProveedorModelo,
): Promise<LecturaConOrigen> {
  const base = leerInforme(
    informe,
    plan.id,
    plan.red.map((h) => h.hospital),
  );

  try {
    const respuesta = await proveedor.completar(instruccionDeLectura(informe));
    const { aceptados, descartados, documentos, preexistencias } = aceptarDelModelo(
      respuesta,
      informe,
      base.caso.citas ?? {},
    );

    const caso: Caso = { ...base.caso, citas: { ...(base.caso.citas ?? {}) } };
    for (const { campo, valor, cita } of aceptados) {
      caso.citas![campo] = cita;
      switch (campo) {
        case 'edad':
          caso.edad = Number(valor.replace(/[^\d]/g, '')) || 0;
          break;
        case 'caracter':
          caso.caracter = valor.toLowerCase() as Caracter;
          break;
        case 'montoEstimado': {
          const numeros = valor.replace(/[^\d.]/g, '');
          caso.montoEstimado = usd(Number(numeros) || 0);
          break;
        }
        case 'procedimientoCups':
          caso.procedimientoCups = valor.replace(/[^\d]/g, '');
          break;
        case 'diagnosticoCie10':
          caso.diagnosticoCie10 = valor.split(/[\s—(]/)[0];
          break;
        case 'pacienteRef':
          caso.pacienteRef = valor;
          break;
        case 'hospital':
          caso.hospital = valor;
          break;
        case 'fecha':
          caso.fecha = valor;
          break;
        case 'fechaAfiliacion':
          caso.fechaAfiliacion = valor;
          break;
        case 'cirujano':
          caso.cirujano = valor;
          break;
        default:
          break;
      }
    }

    if (documentos.length > 0 && caso.documentosAdjuntos.length === 0) {
      caso.documentosAdjuntos = documentos;
    }
    if (preexistencias.length > 0) {
      caso.preexistenciasDeclaradas = preexistencias;
    }

    const nuevos = aceptados.map((a) => a.campo);
    return {
      campos: base.campos,
      caso,
      avisos: base.avisos,
      origen: aceptados.length > 0 ? 'modelo' : 'reglas',
      nota:
        aceptados.length > 0
          ? `${proveedor.nombre} completó ${aceptados.length} campo(s) que las reglas no encontraban: ${nuevos.join(', ')}.`
          : `${proveedor.nombre} no aportó nada nuevo; la lectura por reglas ya estaba completa.`,
      descartados,
    };
  } catch (error) {
    return {
      ...base,
      origen: 'reglas',
      nota: `${proveedor.nombre} no respondió (${error instanceof Error ? error.message : String(error)}). Se usó la lectura por reglas.`,
      descartados: [],
    };
  }
}

/* ---------- proveedores ---------- */

export function proveedorGemini(clave: string, modelo = 'gemini-2.5-flash'): ProveedorModelo {
  return {
    nombre: `Gemini ${modelo}`,
    completar: async (instruccion) => {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`;
      const respuesta = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': clave },
        body: JSON.stringify({
          contents: [{ parts: [{ text: instruccion }] }],
          generationConfig: { temperature: 0, responseMimeType: 'application/json' },
        }),
      });
      if (!respuesta.ok) {
        throw new Error(`Gemini ${respuesta.status}: ${(await respuesta.text()).slice(0, 200)}`);
      }
      const datos: any = await respuesta.json();
      return datos.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    },
  };
}

export function proveedorCompatible(
  clave: string,
  baseUrl: string,
  modelo: string,
  nombre = `OpenAI compatible (${modelo})`,
): ProveedorModelo {
  return {
    nombre,
    completar: async (instruccion) => {
      const respuesta = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${clave}` },
        body: JSON.stringify({
          model: modelo,
          temperature: 0,
          messages: [{ role: 'user', content: instruccion }],
        }),
      });
      if (!respuesta.ok) {
        throw new Error(`${respuesta.status}: ${(await respuesta.text()).slice(0, 200)}`);
      }
      const datos: any = await respuesta.json();
      return datos.choices?.[0]?.message?.content ?? '';
    },
  };
}

export function proveedorDeEntorno(): ProveedorModelo | null {
  if (process.env.GOOGLE_API_KEY) {
    return proveedorGemini(process.env.GOOGLE_API_KEY, process.env.MODELO_LECTURA ?? 'gemini-2.5-flash');
  }
  if (process.env.GROQ_API_KEY) {
    return proveedorCompatible(
      process.env.GROQ_API_KEY,
      'https://api.groq.com/openai/v1',
      process.env.MODELO_LECTURA ?? 'llama-3.3-70b-versatile',
      'Groq',
    );
  }
  if (process.env.OPENAI_API_KEY) {
    return proveedorCompatible(
      process.env.OPENAI_API_KEY,
      'https://api.openai.com/v1',
      process.env.MODELO_LECTURA ?? 'gpt-4o-mini',
      'OpenAI',
    );
  }
  return null;
}

export function hayProveedor(): boolean {
  return Boolean(process.env.GOOGLE_API_KEY || process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY);
}
