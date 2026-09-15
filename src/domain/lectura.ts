import { evidenciaDe, fechasEn, normalizarHospital, type Evidencia } from './evidencia';
import { formato, usd } from './dinero';
import { extraerNumeros } from './numeros';
import type { Caso, Caracter } from './tipos';

/**
 * Lectura del informe del hospital.
 *
 * Dos caminos, un mismo contrato: cada campo sale con la cita textual de donde
 * se tomó. Hoy la lectura es por reglas (determinista, sin costo y sin red);
 * cuando entra el modelo, llena exactamente estos mismos campos y con las mismas
 * citas. Si un campo no aparece en el documento, queda vacío y el caso no se
 * puede aprobar: cae a documentos faltantes.
 */

const REGLAS = {
  pacienteRef: /Paciente:\s*([^\s·]+)/i,
  edad: /(\d{1,3})\s*años/i,
  // Solo el encabezado (primera línea) y sin rótulos: antes cualquier línea con «—»
  // servía, y «Diagnóstico: K80.20 — …» terminaba leído como hospital fuera de red.
  hospital: /^\s*([A-ZÁÉÍÓÚÑ][^\n:—]*?)\s*—/,
  fecha: /Fecha:\s*(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})/gi,
  fechaAfiliacion: /Fecha de afiliaci[oó]n al plan:\s*(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})/gi,
  diagnosticoCie10: /Diagn[oó]stico:\s*([A-Z]\d{2}(?:\.\d{1,2})?)/,
  procedimientoCups: /CUPS\s*(\d{2}[.\s]\d{2}[.\s]\d{2}|\d{5,6})/gi,
  cirujano: /Cirujano tratante:\s*([^\n]+)/i,
  caracter: /Car[aá]cter:\s*(electiva|programada|urgente|urgencia|emergencia)/gi,
  montoEstimado: /Monto estimado del procedimiento:\s*((?:\$|USD|B\/\.)\s*[\d,]+\.\d{2})/gi,
  estudios: /Estudios adjuntos:\s*([^\n]+)/i,
  documentos: /Documentos adjuntos:\s*([^\n]+)/i,
  cedula:
    /(?:C[eé]dula(?: de identidad)?|C\.\s*I\.?|C[eé]d\.?)[^\S\r\n]*(?::[^\S\r\n]*)?((?:E|N|PE)-\d{1,2}-\d{3,6}|\d{1,2}-(?:AV|PI)-\d{1,4}-\d{3,6}|\d{1,2}-\d{1,4}-\d{3,6})/gi,
  numeroPoliza:
    /(?:P[oó]liza|N\.?\s*[º°o]\s*de\s+p[oó]liza|Certificado)[^\S\r\n]*(?::[^\S\r\n]*)?(IS[-.\s]?[A-Z][-.\s]?\d{4}[-.\s]?\d{3,5})/gi,
};

/** Rótulos bajo los que un hospital declara enfermedades previas. */
const ROTULOS_DE_PREEXISTENCIAS = /(?:Preexistencias declaradas|Antecedentes patol[oó]gicos|Antecedentes personales|Enfermedades previas|Comorbilidades):\s*([^\n]+)/i;

/** Frases que declaran expresamente que no hay preexistencias. */
const SIN_PREEXISTENCIAS = /sin antecedentes cr[oó]nicos|niega (?:enfermedades|antecedentes|preexistencias)|no (?:refiere|declara|presenta|tiene) (?:enfermedades|antecedentes|preexistencias)/i;

/** Una línea de preexistencias que empieza negando: «ninguna», «niega», «no refiere». */
const LINEA_SIN_PREEXISTENCIAS = /^(?:ninguna|ninguno|no (?:refiere|declara|tiene|presenta)|niega|sin preexistencias)/i;

/** Palabras que, delante de un documento en la misma frase, lo niegan. */
const NEGACION_DE_DOCUMENTO = /\b(?:pendiente|pendientes|falta|faltan|sin|no se adjunta|no se adjuntan|no se adjuntaron|a[uú]n no|se enviar[aá]n?)\b/i;

const CARACTER_DE: Record<string, Caracter> = {
  electiva: 'electiva',
  programada: 'electiva',
  urgente: 'urgente',
  urgencia: 'urgente',
  emergencia: 'emergencia',
};

export const NOMBRES_DE_DOCUMENTO: { id: string; pistas: RegExp }[] = [
  { id: 'R1', pistas: /informe del cirujano/i },
  { id: 'R2', pistas: /estudio de imagen/i },
  { id: 'R3', pistas: /orden de anestesiolog/i },
  { id: 'R4', pistas: /consentimiento informado/i },
  { id: 'R5', pistas: /informe de urgencias/i },
];

function buscar(texto: string, patron: RegExp): string {
  const coincidencia = new RegExp(patron.source, patron.flags.replace('g', '')).exec(texto);
  return coincidencia ? coincidencia[1].trim() : '';
}

/**
 * Como buscar, pero si el mismo rótulo aparece dos veces con valores distintos no
 * elige ninguno: un informe que se contradice no puede sostener una aprobación.
 */
function buscarUnico(texto: string, patron: RegExp, comparable: (v: string) => string = normalizar) {
  const valores = [...texto.matchAll(new RegExp(patron.source, patron.flags.includes('g') ? patron.flags : patron.flags + 'g'))]
    .map((m) => m[1].trim());
  const distintos = new Set(valores.map(comparable));
  return { valor: distintos.size === 1 ? valores[0] : '', conflicto: distintos.size > 1 };
}

/**
 * Documentos que la línea da por adjuntos. La negación alcanza a todo lo que la sigue
 * dentro de la misma frase: en «…; pendiente estudio de imagen y orden de
 * anestesiología» no cuenta ninguno de los dos. Un documento negado en algún lugar
 * no cuenta, aunque también se nombre.
 */
function documentosDeLaLinea(linea: string): string[] {
  const afirmados = new Set<string>();
  const negados = new Set<string>();
  for (const frase of linea.split(/[;,()]/)) {
    const negacion = NEGACION_DE_DOCUMENTO.exec(frase);
    for (const { id, pistas } of NOMBRES_DE_DOCUMENTO) {
      const posicion = frase.search(pistas);
      if (posicion < 0) continue;
      if (negacion && negacion.index < posicion) negados.add(id);
      else afirmados.add(id);
    }
  }
  return NOMBRES_DE_DOCUMENTO.map((d) => d.id).filter((id) => afirmados.has(id) && !negados.has(id));
}

const normalizar = (texto: string): string =>
  texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const CONECTORES = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'el']);

/** «HOSPITAL NACIONAL DE PANAMÁ» → «Hospital Nacional de Panamá». */
function enTitulo(texto: string): string {
  return texto
    .toLowerCase()
    .split(' ')
    .map((palabra, i) =>
      i > 0 && CONECTORES.has(palabra) ? palabra : palabra.charAt(0).toUpperCase() + palabra.slice(1),
    )
    .join(' ');
}

/**
 * El hospital se normaliza contra la red de la póliza: el informe puede escribirlo
 * en mayúsculas y la póliza lo tiene en su forma canónica. Si no está en la red, se
 * conserva tal como se leyó (y el motor lo tratará como fuera de red).
 */
export function resolverHospital(crudo: string, conocidos: string[]): string {
  if (!crudo) return '';
  const encontrado = conocidos.find((h) => normalizarHospital(h) === normalizarHospital(crudo));
  return encontrado ?? enTitulo(crudo);
}

export interface Lectura {
  campos: Evidencia[];
  caso: Caso;
  avisos: string[];
  /** Campos que el informe trae con dos valores distintos. Nadie los llena después: ni el modelo. */
  conflictos: string[];
}

export function leerInforme(
  informe: string,
  planId: string,
  hospitalesConocidos: string[] = [],
): Lectura {
  const avisos: string[] = [];
  const campos: Evidencia[] = [];
  const citas: Record<string, string> = {};
  const conflictos: string[] = [];

  const anotar = (campo: string, valor: string, cita: string) => {
    if (!valor) {
      avisos.push(`No se encontró el campo ${campo} en el informe`);
      return;
    }
    if (cita) citas[campo] = cita;
    campos.push(evidenciaDe(campo, valor, informe, cita));
  };

  const hospitalCrudo = buscar(informe, REGLAS.hospital);
  const hospital = resolverHospital(hospitalCrudo, hospitalesConocidos);

  /** Un rótulo repetido con valores distintos no se lee: queda sin cita y el caso no se aprueba. */
  const unico = (campo: string, patron: RegExp, comparable?: (v: string) => string): string => {
    const { valor, conflicto } = buscarUnico(informe, patron, comparable);
    if (conflicto) {
      conflictos.push(campo);
      avisos.push(`El informe trae dos valores distintos para ${campo}: no se usa ninguno`);
    }
    return valor;
  };
  const isoDe = (texto: string): string => fechasEn(texto)[0] ?? '';
  const digitos = (texto: string): string => texto.replace(/\D/g, '');

  const fechaCruda = unico('fecha', REGLAS.fecha, isoDe);
  const afiliacionCruda = unico('fechaAfiliacion', REGLAS.fechaAfiliacion, isoDe);
  const cupsCrudo = unico('procedimientoCups', REGLAS.procedimientoCups, digitos);
  const montoCrudo = unico('montoEstimado', REGLAS.montoEstimado, digitos);
  const caracterCrudo = unico('caracter', REGLAS.caracter, (v) => CARACTER_DE[normalizar(v)] ?? v);
  const cedula = unico('cedula', REGLAS.cedula);
  const polizaCruda = unico('numeroPoliza', REGLAS.numeroPoliza);
  const numeroPoliza = polizaCruda ? extraerNumeros(polizaCruda).polizas[0] ?? '' : '';

  const fecha = isoDe(fechaCruda);
  const fechaAfiliacion = isoDe(afiliacionCruda);
  const procedimientoCups = digitos(cupsCrudo);

  anotar('pacienteRef', buscar(informe, REGLAS.pacienteRef), buscar(informe, REGLAS.pacienteRef));
  anotar('edad', buscar(informe, REGLAS.edad), buscar(informe, REGLAS.edad));
  anotar('hospital', hospital, hospitalCrudo);
  anotar('fecha', fecha, fechaCruda);
  anotar('fechaAfiliacion', fechaAfiliacion, afiliacionCruda);
  anotar(
    'diagnosticoCie10',
    buscar(informe, REGLAS.diagnosticoCie10),
    buscar(informe, REGLAS.diagnosticoCie10),
  );
  anotar('procedimientoCups', procedimientoCups, cupsCrudo);
  anotar('cirujano', buscar(informe, REGLAS.cirujano), buscar(informe, REGLAS.cirujano));
  anotar('montoEstimado', montoCrudo, montoCrudo);

  // Sin carácter no se adivina «electiva»: de él dependen la red, la carencia y los documentos.
  const caracterLeido = CARACTER_DE[normalizar(caracterCrudo)];
  const caracter: Caracter = caracterLeido ?? 'electiva';
  const caracterSinDeclarar = !caracterLeido;
  if (caracterSinDeclarar) avisos.push('El informe no declara si el procedimiento es electivo o de urgencia');
  // Con cita registrada, el modelo no puede pisar un carácter que las reglas ya leyeron.
  else citas.caracter = caracterCrudo;

  const lineaDocumentos = buscar(informe, REGLAS.documentos);
  const documentosAdjuntos = documentosDeLaLinea(lineaDocumentos);
  if (!lineaDocumentos) avisos.push('No se encontró la lista de documentos adjuntos');

  const lineaEstudios = buscar(informe, REGLAS.estudios);
  const estudiosAdjuntos = /no se adjuntaron/i.test(lineaEstudios) || !lineaEstudios
    ? []
    : lineaEstudios.split('·').map((e) => e.trim());

  // Preexistencias: una línea que las declara cuenta aunque diga «sin antecedentes
  // quirúrgicos» más adelante; solo la anula si EMPIEZA negando. Sin línea y sin una
  // frase que diga que no hay, queda sin declarar (el motor no aprueba solo).
  const lineaPreexistencias = buscar(informe, ROTULOS_DE_PREEXISTENCIAS);
  const lineaNiega = LINEA_SIN_PREEXISTENCIAS.test(lineaPreexistencias);
  const preexistenciasDeclaradas =
    lineaPreexistencias && !lineaNiega ? [lineaPreexistencias.split(',')[0].trim()] : [];
  const preexistenciasSinDeclarar = !lineaPreexistencias && !SIN_PREEXISTENCIAS.test(informe);
  if (preexistenciasSinDeclarar) avisos.push('El informe no declara preexistencias ni dice que no las haya');

  // Solo la cifra: en «B/. 4,200.00» el punto del símbolo no es decimal.
  const cifra = montoCrudo.match(/[\d,]+\.\d{2}/)?.[0] ?? '';
  const montoEstimado = cifra ? usd(Number(cifra.replace(/,/g, ''))) : 0;

  const caso: Caso = {
    id: buscar(informe, REGLAS.pacienteRef) || 'LEÍDO-SIN-ID',
    titulo: `Informe leído del hospital · CUPS ${procedimientoCups || '—'}`,
    hospital,
    fecha,
    pacienteRef: buscar(informe, REGLAS.pacienteRef),
    // En informes médicos solo cuentan junto a su rótulo. El OCR usa el extractor
    // general porque una foto recortada puede no conservar el encabezado.
    cedula,
    numeroPoliza,
    edad: Number(buscar(informe, REGLAS.edad) || 0),
    sexo: /sexo femenino/i.test(informe) ? 'F' : 'M',
    fechaAfiliacion,
    diagnosticoCie10: buscar(informe, REGLAS.diagnosticoCie10),
    procedimientoCups,
    cirujano: buscar(informe, REGLAS.cirujano),
    caracter,
    caracterSinDeclarar,
    montoEstimado,
    estudiosAdjuntos,
    documentosAdjuntos,
    preexistenciasDeclaradas,
    preexistenciasSinDeclarar,
    informeTexto: informe,
    planId,
    citas,
    estadoEsperado: 'PRE_APROBADO',
  };

  if (montoEstimado === 0) avisos.push('No se encontró el monto estimado del procedimiento');

  return { campos, caso, avisos, conflictos };
}

/** Resumen en una línea para la interfaz: qué se leyó y qué faltó. */
export function resumenLectura(lectura: Lectura): string {
  const verificados = lectura.campos.filter((c) => c.verificado).length;
  const monto = lectura.caso.montoEstimado ? formato(lectura.caso.montoEstimado) : 'sin monto';
  return `${verificados}/${lectura.campos.length} datos con respaldo textual · ${monto} · ${lectura.caso.documentosAdjuntos.length} documentos adjuntos`;
}
