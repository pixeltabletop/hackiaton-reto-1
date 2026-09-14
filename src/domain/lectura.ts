import { evidenciaDe, type Evidencia } from './evidencia';
import { formato, usd } from './dinero';
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
  hospital: /^([A-ZÁÉÍÓÚÑ][^\n]*?)\s*—/m,
  fecha: /Fecha:\s*(\d{4}-\d{2}-\d{2})/i,
  fechaAfiliacion: /Fecha de afiliaci[oó]n al plan:\s*(\d{4}-\d{2}-\d{2})/i,
  diagnosticoCie10: /Diagn[oó]stico:\s*([A-Z]\d{2}(?:\.\d{1,2})?)/,
  procedimientoCups: /CUPS\s*(\d{5,6})/i,
  cirujano: /Cirujano tratante:\s*([^\n]+)/i,
  caracter: /Car[aá]cter:\s*(electiva|urgente|emergencia)/i,
  montoEstimado: /Monto estimado del procedimiento:\s*(\$\s*[\d,]+\.\d{2})/i,
  estudios: /Estudios adjuntos:\s*([^\n]+)/i,
  documentos: /Documentos adjuntos:\s*([^\n]+)/i,
  preexistencias: /Preexistencias declaradas:\s*([^\n]+)/i,
};

const NOMBRES_DE_DOCUMENTO: { id: string; pistas: RegExp }[] = [
  { id: 'R1', pistas: /informe del cirujano/i },
  { id: 'R2', pistas: /estudio de imagen/i },
  { id: 'R3', pistas: /orden de anestesiolog/i },
  { id: 'R4', pistas: /consentimiento informado/i },
  { id: 'R5', pistas: /informe de urgencias/i },
];

function buscar(texto: string, patron: RegExp): string {
  const coincidencia = texto.match(patron);
  return coincidencia ? coincidencia[1].trim() : '';
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
function resolverHospital(crudo: string, conocidos: string[]): string {
  if (!crudo) return '';
  const encontrado = conocidos.find((h) => normalizar(h) === normalizar(crudo));
  return encontrado ?? enTitulo(crudo);
}

export interface Lectura {
  campos: Evidencia[];
  caso: Caso;
  avisos: string[];
}

export function leerInforme(
  informe: string,
  planId: string,
  hospitalesConocidos: string[] = [],
): Lectura {
  const avisos: string[] = [];
  const campos: Evidencia[] = [];

  const anotar = (campo: string, valor: string, cita: string) => {
    if (!valor) {
      avisos.push(`No se encontró el campo ${campo} en el informe`);
      return;
    }
    campos.push(evidenciaDe(campo, valor, informe, cita));
  };

  const hospitalCrudo = buscar(informe, REGLAS.hospital);
  const hospital = resolverHospital(hospitalCrudo, hospitalesConocidos);

  anotar('pacienteRef', buscar(informe, REGLAS.pacienteRef), buscar(informe, REGLAS.pacienteRef));
  anotar('edad', buscar(informe, REGLAS.edad), buscar(informe, REGLAS.edad));
  anotar('hospital', hospital, hospitalCrudo);
  anotar('fecha', buscar(informe, REGLAS.fecha), buscar(informe, REGLAS.fecha));
  anotar(
    'fechaAfiliacion',
    buscar(informe, REGLAS.fechaAfiliacion),
    buscar(informe, REGLAS.fechaAfiliacion),
  );
  anotar(
    'diagnosticoCie10',
    buscar(informe, REGLAS.diagnosticoCie10),
    buscar(informe, REGLAS.diagnosticoCie10),
  );
  anotar(
    'procedimientoCups',
    buscar(informe, REGLAS.procedimientoCups),
    buscar(informe, REGLAS.procedimientoCups),
  );
  anotar('cirujano', buscar(informe, REGLAS.cirujano), buscar(informe, REGLAS.cirujano));
  anotar(
    'montoEstimado',
    buscar(informe, REGLAS.montoEstimado),
    buscar(informe, REGLAS.montoEstimado),
  );

  const lineaCaracter = buscar(informe, REGLAS.caracter).toLowerCase();
  const caracter: Caracter =
    lineaCaracter === 'urgente' || lineaCaracter === 'emergencia' ? lineaCaracter : 'electiva';
  if (!lineaCaracter) avisos.push('No se encontró el carácter del procedimiento; se asume electiva');

  const lineaDocumentos = buscar(informe, REGLAS.documentos);
  const documentosAdjuntos = NOMBRES_DE_DOCUMENTO.filter((d) => d.pistas.test(lineaDocumentos)).map(
    (d) => d.id,
  );
  if (!lineaDocumentos) avisos.push('No se encontró la lista de documentos adjuntos');

  const lineaEstudios = buscar(informe, REGLAS.estudios);
  const estudiosAdjuntos = /no se adjuntaron/i.test(lineaEstudios) || !lineaEstudios
    ? []
    : lineaEstudios.split('·').map((e) => e.trim());

  const lineaPreexistencias = buscar(informe, REGLAS.preexistencias);
  const preexistenciasDeclaradas = /ninguna|sin antecedentes/i.test(lineaPreexistencias) ||
    !lineaPreexistencias
    ? []
    : [lineaPreexistencias.split(',')[0].trim()];

  const montoTexto = buscar(informe, REGLAS.montoEstimado).replace(/[$\s,]/g, '');
  const montoEstimado = montoTexto ? usd(Number(montoTexto)) : 0;

  const caso: Caso = {
    id: buscar(informe, REGLAS.pacienteRef) || 'LEÍDO-SIN-ID',
    titulo: `Informe leído del hospital · CUPS ${buscar(informe, REGLAS.procedimientoCups) || '—'}`,
    hospital,
    fecha: buscar(informe, REGLAS.fecha),
    pacienteRef: buscar(informe, REGLAS.pacienteRef),
    edad: Number(buscar(informe, REGLAS.edad) || 0),
    sexo: /sexo femenino/i.test(informe) ? 'F' : 'M',
    fechaAfiliacion: buscar(informe, REGLAS.fechaAfiliacion),
    diagnosticoCie10: buscar(informe, REGLAS.diagnosticoCie10),
    procedimientoCups: buscar(informe, REGLAS.procedimientoCups),
    cirujano: buscar(informe, REGLAS.cirujano),
    caracter,
    montoEstimado,
    estudiosAdjuntos,
    documentosAdjuntos,
    preexistenciasDeclaradas,
    informeTexto: informe,
    planId,
    estadoEsperado: 'PRE_APROBADO',
  };

  if (montoEstimado === 0) avisos.push('No se encontró el monto estimado del procedimiento');

  return { campos, caso, avisos };
}

/** Resumen en una línea para la interfaz: qué se leyó y qué faltó. */
export function resumenLectura(lectura: Lectura): string {
  const verificados = lectura.campos.filter((c) => c.verificado).length;
  const monto = lectura.caso.montoEstimado ? formato(lectura.caso.montoEstimado) : 'sin monto';
  return `${verificados}/${lectura.campos.length} campos con cita textual · ${monto} · ${lectura.caso.documentosAdjuntos.length} documentos detectados`;
}
