import { usd } from './dinero';
import { valorRespaldadoPorCita, verificarCita } from './evidencia';
import { evidenciaDelCaso } from './motor';
import { leerInforme, NOMBRES_DE_DOCUMENTO, resolverHospital, type Lectura } from './lectura';
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
const CARACTERES = new Set<string>(['electiva', 'urgente', 'emergencia']);

export function instruccionDeLectura(informe: string): string {
  return `Eres el lector de informes médicos de un agente de pre-autorización de seguros.

Devuelve SOLO un objeto JSON con esta forma:

{
  "campos": [
    { "campo": "procedimientoCups", "valor": "512301", "cita": "CUPS 512301" },
    { "campo": "montoEstimado", "valor": "$ 4,200.00", "cita": "Monto estimado del procedimiento: $ 4,200.00" }
  ],
  "documentos": [
    { "id": "R1", "cita": "informe del cirujano" },
    { "id": "R2", "cita": "estudio de imagen" }
  ],
  "preexistencias": ["Hipertensión arterial diagnosticada en 2024"]
}

Reglas estrictas:
- Cada objeto necesita "cita": un fragmento COPIADO LITERALMENTE del informe, sin corregir
  ni completar nada. Si no puedes copiar una cita literal, NO incluyas ese campo.
- Campos escalares válidos: ${CAMPOS.join(', ')}.
- "edad" es un número. "caracter" es uno de: electiva, urgente, emergencia.
- "montoEstimado" es el texto del monto tal como aparece, con su símbolo.
- El "valor" tiene que salir de su "cita": si la cita dice 4,200.00, el valor no puede ser otro.
- "documentos" es una lista de objetos { "id", "cita" }. El id solo puede ser uno de:
  R1 = informe del cirujano, R2 = estudio de imagen, R3 = orden de anestesiología,
  R4 = consentimiento informado, R5 = informe de urgencias.
  La cita es el fragmento literal que nombra ese documento como adjunto.
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

export function aceptarDelModelo(
  respuesta: string,
  informe: string,
  citasDeReglas: Record<string, string>,
  enConflicto: string[] = [],
) {
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
    if (campo === 'caracter' && !CARACTERES.has(valor.toLowerCase())) {
      descartados.push(`${campo}: «${valor}» no está en el catálogo (electiva, urgente, emergencia)`);
      continue;
    }
    if (!valorRespaldadoPorCita(campo, valor, cita)) {
      descartados.push(`${campo}: el valor «${valor}» no sale de la cita`);
      continue;
    }
    if (enConflicto.includes(campo)) {
      descartados.push(`${campo}: el informe se contradice en este dato; no lo resuelve el modelo`);
      continue;
    }
    if (citasDeReglas[campo]) {
      continue; // las reglas ya lo tenían resuelto; el modelo no pisa lo determinista
    }
    aceptados.push({ campo, valor, cita });
  }

  // Un documento cuenta solo con una cita literal que exista en el informe y que
  // nombre ese mismo documento. Un id suelto no es evidencia.
  const documentos: string[] = [];
  for (const crudo of Array.isArray(datos.documentos) ? datos.documentos : []) {
    const id = String(typeof crudo === 'object' && crudo !== null ? crudo.id : crudo).trim().toUpperCase();
    const cita = typeof crudo === 'object' && crudo !== null ? String(crudo.cita ?? '').trim() : '';
    const nombre = NOMBRES_DE_DOCUMENTO.find((d) => d.id === id);
    if (!nombre) {
      descartados.push(`documento ${id || '(sin id)'}: no está en el catálogo`);
    } else if (!cita) {
      descartados.push(`documento ${id}: sin cita`);
    } else if (!verificarCita(informe, cita).verificado) {
      descartados.push(`documento ${id}: la cita no aparece en el informe`);
    } else if (!nombre.pistas.test(cita)) {
      descartados.push(`documento ${id}: la cita no nombra ese documento`);
    } else if (!documentos.includes(id)) {
      documentos.push(id);
    }
  }

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
      base.conflictos,
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
          caso.caracterSinDeclarar = false;
          break;
        case 'montoEstimado': {
          // Solo la cifra: en «B/. 4,200.00» el punto del símbolo no es decimal.
          const cifra = valor.match(/[\d,]+(?:\.\d{1,2})?/)?.[0] ?? '';
          caso.montoEstimado = usd(Number(cifra.replace(/,/g, '')) || 0);
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
          if (caso.id === 'LEÍDO-SIN-ID') caso.id = valor;
          break;
        case 'hospital':
          // Igual que en las reglas: el nombre se resuelve contra la red del plan.
          caso.hospital = resolverHospital(valor, plan.red.map((h) => h.hospital));
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

    // Lo que el modelo aporta tiene que verse en la nota, también si no es un campo.
    const aportes = aceptados.map((a) => a.campo);
    if (documentos.length > 0 && caso.documentosAdjuntos.length === 0) {
      caso.documentosAdjuntos = documentos;
      aportes.push(`documentos ${documentos.join(', ')}`);
    }
    if (preexistencias.length > 0) {
      caso.preexistenciasDeclaradas = preexistencias;
      caso.preexistenciasSinDeclarar = false;
      aportes.push('preexistencias');
    }

    return {
      // Evidencia y avisos se recalculan: lo que completó el modelo ya no figura como faltante.
      campos: evidenciaDelCaso(caso),
      caso,
      avisos: base.avisos.filter((aviso) => {
        if (aceptados.some((a) => aviso === `No se encontró el campo ${a.campo} en el informe`)) return false;
        if (aviso.startsWith('No se encontró el monto') && aceptados.some((a) => a.campo === 'montoEstimado')) return false;
        if (aviso.startsWith('El informe no declara si') && caso.caracterSinDeclarar === false) return false;
        if (aviso.startsWith('No se encontró la lista de documentos') && caso.documentosAdjuntos.length > 0) return false;
        if (aviso.startsWith('El informe no declara preexistencias') && caso.preexistenciasSinDeclarar === false) return false;
        return true;
      }),
      conflictos: base.conflictos,
      origen: aportes.length > 0 ? 'modelo' : 'reglas',
      nota:
        aportes.length > 0
          ? `${proveedor.nombre} completó lo que las reglas no encontraban: ${aportes.join('; ')}.`
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

/** Esquema de la lectura: los catálogos van en `enum`, no solo en la instrucción. */
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
        properties: {
          campo: { type: 'string', enum: [...CAMPOS] },
          valor: { type: 'string' },
          cita: { type: 'string' },
        },
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
} as const;

interface ClienteMensajes {
  messages: { create: (peticion: any) => Promise<any> };
}

/**
 * Claude (Sonnet 5 por defecto) con el SDK oficial. Elegido con el banco de la revisión
 * de Josué: 36/36 y 0 aprobaciones indebidas en 36 informes, mediana de 5 s con
 * esfuerzo bajo. Salida estructurada con el esquema de lectura; Sonnet 5 no acepta
 * `temperature`. Una negativa del modelo o un error lanza, y la lectura cae a reglas.
 */
export function proveedorAnthropic(
  clave: string,
  { modelo = 'claude-sonnet-5', esfuerzo = 'low', cliente }: { modelo?: string; esfuerzo?: string; cliente?: ClienteMensajes } = {},
): ProveedorModelo {
  let anthropic: ClienteMensajes | undefined = cliente;
  return {
    nombre: `Claude ${modelo}`,
    completar: async (instruccion) => {
      // Import diferido: el SDK solo se carga si hay clave, y las pruebas inyectan un cliente.
      anthropic ??= new (await import('@anthropic-ai/sdk')).default({ apiKey: clave, timeout: 30_000, maxRetries: 2 });
      const respuesta = await anthropic.messages.create({
        model: modelo,
        max_tokens: 4000,
        messages: [{ role: 'user', content: instruccion }],
        output_config: { effort: esfuerzo, format: { type: 'json_schema', schema: ESQUEMA_LECTURA } },
      });
      if (respuesta.stop_reason === 'refusal') throw new Error('el modelo se negó a responder');
      return respuesta.content
        .filter((bloque: any) => bloque.type === 'text')
        .map((bloque: any) => bloque.text)
        .join('');
    },
  };
}

export function proveedorDeEntorno(): ProveedorModelo | null {
  if (process.env.ANTHROPIC_API_KEY) {
    return proveedorAnthropic(process.env.ANTHROPIC_API_KEY, { modelo: process.env.MODELO_LECTURA ?? 'claude-sonnet-5' });
  }
  if (process.env.GOOGLE_API_KEY) {
    return proveedorGemini(process.env.GOOGLE_API_KEY, process.env.MODELO_LECTURA ?? 'gemini-2.5-flash');
  }
  if (process.env.GROQ_API_KEY) {
    return proveedorCompatible(
      process.env.GROQ_API_KEY,
      'https://api.groq.com/openai/v1',
      // Groq retiró llama-3.3-70b-versatile el 16-ago-2026 en los planes gratuito y de
      // desarrollo: con ese nombre respondía 404 y la lectura caía a reglas sin avisar.
      // Reemplazo recomendado por Groq; no está medido con el banco: correr probar:proveedor.
      process.env.MODELO_LECTURA ?? 'openai/gpt-oss-120b',
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
  return Boolean(
    process.env.ANTHROPIC_API_KEY || process.env.GOOGLE_API_KEY || process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY,
  );
}
