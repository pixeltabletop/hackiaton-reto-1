import { formato, usd } from '../domain/dinero.ts';
import type { Caso } from '../domain/tipos.ts';

/**
 * Seis casos quirúrgicos sintéticos, escritos como llegan de verdad: un informe
 * del hospital en texto libre. El informe contiene LITERALMENTE cada dato que el
 * motor usa; sin esa cita textual, la decisión no se sostiene (corpus.test.ts lo
 * verifica caso por caso).
 */

const HOSPITAL_NACIONAL = 'Hospital Nacional de Panamá';
const COSTA_DEL_ESTE = 'Clínica Costa del Este';
const REGIONAL_AZUERO = 'Hospital Regional de Azuero';

export interface CasoCorpus extends Caso {
  // El informe completo que se muestra al jurado, con el mismo texto que se indexa.
  lecturaEsperada: string;
}

export const CASOS: CasoCorpus[] = [
  {
    id: 'PR-2026-0417',
    titulo: 'Colecistectomía en red, con todos los documentos',
    hospital: HOSPITAL_NACIONAL,
    fecha: '2026-09-10',
    pacienteRef: 'AF-2291',
    edad: 54,
    sexo: 'F',
    fechaAfiliacion: '2022-03-15',
    diagnosticoCie10: 'K80.20',
    procedimientoCups: '512301',
    cirujano: 'Dra. Mariela Cárdenas',
    caracter: 'electiva',
    montoEstimado: usd(4200),
    estudiosAdjuntos: ['ecografía abdominal del 2026-09-04'],
    documentosAdjuntos: ['R1', 'R2', 'R3', 'R4'],
    preexistenciasDeclaradas: [],
    planId: 'PLAN-A',
    estadoEsperado: 'PRE_APROBADO',
    lecturaEsperada: 'Procedimiento electivo, afiliada hace tres años, en hospital de la red y con todo adjunto.',
    informeTexto: `HOSPITAL NACIONAL DE PANAMÁ — SERVICIO DE CIRUGÍA GENERAL
Informe médico para solicitud de preautorización
Paciente: AF-2291 · 54 años · sexo femenino
Fecha: 2026-09-10 · Fecha de afiliación al plan: 2022-03-15
Diagnóstico: K80.20 — colelitiasis con colecistitis crónica
Procedimiento solicitado: CUPS 512301 — colecistectomía laparoscópica
Carácter: electiva
Cirujano tratante: Dra. Mariela Cárdenas
Monto estimado del procedimiento: ${formato(usd(4200))}
Estudios adjuntos: ecografía abdominal del 2026-09-04
Documentos adjuntos: informe del cirujano, estudio de imagen, orden de anestesiología, consentimiento informado
Antecedentes: dolor en hipocondrio derecho de seis meses de evolución. Sin antecedentes crónicos declarados.
Hallazgos: vesícula con múltiples cálculos, pared engrosada, sin dilatación de la vía biliar.`,
  },
  {
    id: 'PR-2026-0518',
    titulo: 'Artroscopia electiva con dos meses de afiliación',
    hospital: COSTA_DEL_ESTE,
    fecha: '2026-09-11',
    pacienteRef: 'AF-3310',
    edad: 41,
    sexo: 'M',
    fechaAfiliacion: '2026-06-20',
    diagnosticoCie10: 'M17.11',
    procedimientoCups: '793501',
    cirujano: 'Dr. Ignacio Sáez',
    caracter: 'electiva',
    montoEstimado: usd(3100),
    estudiosAdjuntos: ['resonancia magnética de rodilla del 2026-09-02'],
    documentosAdjuntos: ['R1', 'R2', 'R3', 'R4'],
    preexistenciasDeclaradas: [],
    planId: 'PLAN-A',
    estadoEsperado: 'CARENCIA_NO_CUMPLIDA',
    lecturaEsperada: 'Se afilió hace dos meses y la póliza pide tres para cirugía electiva.',
    informeTexto: `CLÍNICA COSTA DEL ESTE — SERVICIO DE ORTOPEDIA
Informe médico para solicitud de preautorización
Paciente: AF-3310 · 41 años · sexo masculino
Fecha: 2026-09-11 · Fecha de afiliación al plan: 2026-06-20
Diagnóstico: M17.11 — gonartrosis primaria unilateral
Procedimiento solicitado: CUPS 793501 — artroscopia de rodilla
Carácter: electiva
Cirujano tratante: Dr. Ignacio Sáez
Monto estimado del procedimiento: ${formato(usd(3100))}
Estudios adjuntos: resonancia magnética de rodilla del 2026-09-02
Documentos adjuntos: informe del cirujano, estudio de imagen, orden de anestesiología, consentimiento informado
Antecedentes: dolor mecánico de rodilla derecha de ocho meses, sin antecedentes crónicos declarados.
Hallazgos: lesión meniscal interna, sin derrame significativo.`,
  },
  {
    id: 'PR-2026-0633',
    titulo: 'Rinoplastia estética en plan ejecutivo',
    hospital: COSTA_DEL_ESTE,
    fecha: '2026-09-08',
    pacienteRef: 'AF-1204',
    edad: 33,
    sexo: 'F',
    fechaAfiliacion: '2020-01-10',
    diagnosticoCie10: 'Z41.1',
    procedimientoCups: '158001',
    cirujano: 'Dr. Alberto Quintero',
    caracter: 'electiva',
    montoEstimado: usd(3800),
    estudiosAdjuntos: ['valoración prequirúrgica del 2026-08-30'],
    documentosAdjuntos: ['R1', 'R2', 'R3', 'R4'],
    preexistenciasDeclaradas: [],
    planId: 'PLAN-C',
    estadoEsperado: 'NO_CUBIERTO',
    lecturaEsperada: 'Procedimiento con fines estéticos: la póliza lo excluye en la cláusula 5.1.',
    informeTexto: `CLÍNICA COSTA DEL ESTE — SERVICIO DE CIRUGÍA PLÁSTICA
Informe médico para solicitud de preautorización
Paciente: AF-1204 · 33 años · sexo femenino
Fecha: 2026-09-08 · Fecha de afiliación al plan: 2020-01-10
Diagnóstico: Z41.1 — procedimiento con fines estéticos
Procedimiento solicitado: CUPS 158001 — rinoplastia estética
Carácter: electiva
Cirujano tratante: Dr. Alberto Quintero
Monto estimado del procedimiento: ${formato(usd(3800))}
Estudios adjuntos: valoración prequirúrgica del 2026-08-30
Documentos adjuntos: informe del cirujano, estudio de imagen, orden de anestesiología, consentimiento informado
Antecedentes: solicitud de corrección de contorno nasal por razones de apariencia. Sin antecedentes crónicos declarados.
Hallazgos: dorso nasal con irregularidad leve, tabique central.`,
  },
  {
    id: 'PR-2026-0701',
    titulo: 'Colecistectomía sin estudio de imagen ni orden de anestesiología',
    hospital: HOSPITAL_NACIONAL,
    fecha: '2026-09-12',
    pacienteRef: 'AF-7788',
    edad: 62,
    sexo: 'M',
    fechaAfiliacion: '2023-05-02',
    diagnosticoCie10: 'K80.10',
    procedimientoCups: '512301',
    cirujano: 'Dra. Mariela Cárdenas',
    caracter: 'electiva',
    montoEstimado: usd(4200),
    estudiosAdjuntos: [],
    documentosAdjuntos: ['R1', 'R4'],
    preexistenciasDeclaradas: [],
    planId: 'PLAN-A',
    estadoEsperado: 'DOCUMENTOS_FALTANTES',
    lecturaEsperada: 'Llegó el informe del cirujano y el consentimiento, pero falta el estudio y la orden de anestesia.',
    informeTexto: `HOSPITAL NACIONAL DE PANAMÁ — SERVICIO DE CIRUGÍA GENERAL
Informe médico para solicitud de preautorización
Paciente: AF-7788 · 62 años · sexo masculino
Fecha: 2026-09-12 · Fecha de afiliación al plan: 2023-05-02
Diagnóstico: K80.10 — colelitiasis con otra colecistitis
Procedimiento solicitado: CUPS 512301 — colecistectomía laparoscópica
Carácter: electiva
Cirujano tratante: Dra. Mariela Cárdenas
Monto estimado del procedimiento: ${formato(usd(4200))}
Estudios adjuntos: no se adjuntaron
Documentos adjuntos: informe del cirujano y consentimiento informado
Antecedentes: cólico biliar recurrente. Sin antecedentes crónicos declarados.
Hallazgos: pendiente de completar con estudio de imagen.`,
  },
  {
    id: 'PR-2026-0744',
    titulo: 'Hernioplastia con preexistencia declarada',
    hospital: HOSPITAL_NACIONAL,
    fecha: '2026-09-12',
    pacienteRef: 'AF-5510',
    edad: 48,
    sexo: 'F',
    fechaAfiliacion: '2025-07-01',
    diagnosticoCie10: 'K40.90',
    procedimientoCups: '452101',
    cirujano: 'Dr. Ignacio Sáez',
    caracter: 'electiva',
    montoEstimado: usd(2300),
    estudiosAdjuntos: ['ecografía de pared abdominal del 2026-09-05'],
    documentosAdjuntos: ['R1', 'R2', 'R3', 'R4'],
    preexistenciasDeclaradas: ['Hipertensión arterial diagnosticada en 2024'],
    planId: 'PLAN-B',
    estadoEsperado: 'DERIVAR_A_MEDICO_AUDITOR',
    lecturaEsperada: 'Tiene 14 de los 24 meses que la póliza pide para condiciones preexistentes.',
    informeTexto: `HOSPITAL NACIONAL DE PANAMÁ — SERVICIO DE CIRUGÍA GENERAL
Informe médico para solicitud de preautorización
Paciente: AF-5510 · 48 años · sexo femenino
Fecha: 2026-09-12 · Fecha de afiliación al plan: 2025-07-01
Diagnóstico: K40.90 — hernia inguinal unilateral sin obstrucción
Procedimiento solicitado: CUPS 452101 — hernioplastia inguinal
Carácter: electiva
Cirujano tratante: Dr. Ignacio Sáez
Monto estimado del procedimiento: ${formato(usd(2300))}
Estudios adjuntos: ecografía de pared abdominal del 2026-09-05
Documentos adjuntos: informe del cirujano, estudio de imagen, orden de anestesiología, consentimiento informado
Preexistencias declaradas: Hipertensión arterial diagnosticada en 2024, en tratamiento desde entonces.
Hallazgos: defecto inguinal derecho de 2 cm, reductible.`,
  },
  {
    id: 'PR-2026-0790',
    titulo: 'Apendicectomía urgente fuera de la red',
    hospital: REGIONAL_AZUERO,
    fecha: '2026-09-13',
    pacienteRef: 'AF-9042',
    edad: 27,
    sexo: 'F',
    fechaAfiliacion: '2021-11-05',
    diagnosticoCie10: 'K35.80',
    procedimientoCups: '471201',
    cirujano: 'Dr. Alberto Quintero',
    caracter: 'urgente',
    montoEstimado: usd(2600),
    estudiosAdjuntos: ['tomografía de abdomen del 2026-09-13'],
    documentosAdjuntos: ['R5', 'R4'],
    preexistenciasDeclaradas: [],
    planId: 'PLAN-A',
    estadoEsperado: 'PRE_APROBADO_CON_CONDICIONES',
    lecturaEsperada: 'Urgencia vital en hospital fuera de la red: se cubre, con coaseguro de fuera de red.',
    informeTexto: `HOSPITAL REGIONAL DE AZUERO — SERVICIO DE EMERGENCIAS
Informe médico para solicitud de preautorización
Paciente: AF-9042 · 27 años · sexo femenino
Fecha: 2026-09-13 · Fecha de afiliación al plan: 2021-11-05
Diagnóstico: K35.80 — apendicitis aguda no especificada
Procedimiento solicitado: CUPS 471201 — apendicectomía por laparotomía
Carácter: urgente
Cirujano tratante: Dr. Alberto Quintero
Monto estimado del procedimiento: ${formato(usd(2600))}
Estudios adjuntos: tomografía de abdomen del 2026-09-13
Documentos adjuntos: informe de urgencias y consentimiento informado
Antecedentes: dolor abdominal de 14 horas, fiebre de 38.5 grados. Sin antecedentes crónicos declarados.
Hallazgos: apéndice de 12 mm con líquido periapendicular. Riesgo para la vida si no se opera.`,
  },
];

export function casoDe(id: string): CasoCorpus {
  const encontrado = CASOS.find((c) => c.id === id);
  if (!encontrado) throw new Error(`No existe el caso ${id}`);
  return encontrado;
}
