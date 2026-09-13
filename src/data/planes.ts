import { compilarPoliza } from '../domain/poliza.ts';
import { usd, type Centavos } from '../domain/dinero.ts';
import type { Caracter, Carencias, Hospital, Plan } from '../domain/tipos.ts';
import { procedimientoDe } from './catalogo.ts';

/**
 * Las tres pólizas del corpus son sintéticas, pero están escritas como una póliza
 * real: el texto legal es la fuente de verdad y TODOS los datos estructurados que
 * el motor usa aparecen literalmente en ese texto (lo verifica corpus.test.ts).
 *
 * En el producto real, esos datos los extrae el modelo leyendo el documento y cada
 * uno viaja con su cita. Aquí están escritos a mano al lado del texto para que el
 * motor pueda probarse sin depender del LLM.
 */

interface DatosPoliza {
  id: string;
  aseguradora: string;
  plan: string;
  version: string;
  vigenciaDesde: string;
  vigenciaHasta: string;
  vigenciaDesdeIso: string;
  vigenciaHastaIso: string;
  red: Hospital[];
  deducible: Centavos;
  coaseguroPct: number;
  fueraDeRedPct: number;
  tope: Centavos;
  umbralAuditoria: Centavos;
  carencias: Carencias;
  cubiertos: { cups: string; soloRed: boolean; clausula: string }[];
  excluidos: { cups: string | null; texto: string; clausula: string }[];
}

const REQUISITOS_ELECTIVA = [
  { id: 'R1', nombre: 'Informe del cirujano con diagnóstico y procedimiento', clausula: '6.1' },
  { id: 'R2', nombre: 'Estudio de imagen que respalda la indicación', clausula: '6.1' },
  { id: 'R3', nombre: 'Orden de anestesiología', clausula: '6.1' },
  { id: 'R4', nombre: 'Consentimiento informado firmado', clausula: '6.1' },
];

const REQUISITOS_URGENCIA = [
  { id: 'R5', nombre: 'Informe de urgencias', clausula: '6.2' },
  { id: 'R4', nombre: 'Consentimiento informado firmado', clausula: '6.2' },
];

function miles(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function textoPoliza(d: DatosPoliza): string {
  return `PÓLIZA DE SALUD COLECTIVA — ${d.plan.toUpperCase()}
Aseguradora: ${d.aseguradora}. Versión ${d.version}. Documento contractual.

#1.1# Vigencia. La presente póliza rige desde el ${d.vigenciaDesde} hasta el ${d.vigenciaHasta}, siempre que la prima anual haya sido pagada.

#2.1# Cobertura quirúrgica electiva. Se cubren los procedimientos quirúrgicos programados que figuren en el tarifario del plan y que cuenten con preautorización previa emitida por la aseguradora.

#2.2# Urgencias y emergencias. La atención de urgencia o emergencia está cubierta en cualquier hospital, dentro o fuera de la red, cuando exista riesgo para la vida o para la función de un órgano.

#3.1# Carencia de cirugía electiva. Los procedimientos quirúrgicos electivos requieren ${d.carencias.cirugiaElectivaMeses} meses de afiliación continua. Los procedimientos de urgencia no tienen carencia.

#3.2# Carencias de preexistencias y maternidad. Toda condición diagnosticada o tratada antes de la afiliación requiere ${d.carencias.preexistenciasMeses} meses de afiliación continua para ser cubierta. La atención de parto y cesárea requiere ${d.carencias.maternidadMeses} meses de afiliación continua.

#4.1# Red de proveedores. La atención programada debe realizarse en un hospital de la red del plan: ${d.red.map((h) => `${h.hospital} (${h.ciudad})`).join(', ')}. Fuera de la red, la atención programada no está cubierta salvo autorización expresa de la aseguradora.

#5.1# Exclusiones. No se cubren los procedimientos con fines estéticos, de embellecimiento o de cambio de apariencia, ni los experimentales, ni los que no guarden relación con el diagnóstico reportado.

#6.1# Requisitos documentales de cirugía electiva. La solicitud debe acompañarse del informe del cirujano con diagnóstico y procedimiento, del estudio de imagen que respalde la indicación, de la orden de anestesiología y del consentimiento informado firmado.

#6.2# Requisitos documentales de urgencia. La solicitud debe acompañarse del informe de urgencias y del consentimiento informado firmado.

#7.1# Deducible. El asegurado asume un deducible anual de USD ${miles(d.deducible / 100)} por persona antes de que la aseguradora cubra cualquier procedimiento.

#7.2# Coaseguro. Una vez satisfecho el deducible, el asegurado asume el ${d.coaseguroPct} por ciento (${d.coaseguroPct}%) del monto restante dentro de la red y el ${d.fueraDeRedPct} por ciento (${d.fueraDeRedPct}%) fuera de la red.

#7.3# Tope anual. La aseguradora responde hasta un tope anual de USD ${miles(d.tope / 100)} por persona por año de vigencia.

#8.1# Preautorización y auditoría. Los procedimientos que requieran preautorización y las solicitudes por montos superiores a USD ${miles(d.umbralAuditoria / 100)} deben ser dictaminados por el médico auditor de la aseguradora antes de emitir la respuesta al hospital.
`;
}

function construirPlan(d: DatosPoliza): Plan {
  const textoIntegral = textoPoliza(d);
  return {
    id: d.id,
    aseguradora: d.aseguradora,
    plan: d.plan,
    version: d.version,
    vigenciaDesde: d.vigenciaDesde,
    vigenciaHasta: d.vigenciaHasta,
    vigenciaDesdeIso: d.vigenciaDesdeIso,
    vigenciaHastaIso: d.vigenciaHastaIso,
    red: d.red,
    deducibleAnual: d.deducible,
    coaseguroPct: d.coaseguroPct,
    coaseguroFueraDeRedPct: d.fueraDeRedPct,
    topeAnual: d.tope,
    umbralAuditoria: d.umbralAuditoria,
    carencias: d.carencias,
    procedimientos: d.cubiertos.map((p) => {
      const tarifario = procedimientoDe(p.cups);
      return {
        cups: p.cups,
        nombre: tarifario.nombre,
        cubierto: true,
        soloRed: p.soloRed,
        requierePreautorizacion: true,
        tarifaReferencia: tarifario.tarifaReferencia,
        clausula: p.clausula,
      };
    }),
    exclusiones: d.excluidos.map((e, i) => ({
      id: `X${i + 1}`,
      cups: e.cups,
      texto: e.texto,
      clausula: e.clausula,
    })),
    requisitos: [
      { caracter: 'electiva' as Caracter, documentos: REQUISITOS_ELECTIVA },
      { caracter: 'urgente' as Caracter, documentos: REQUISITOS_URGENCIA },
      { caracter: 'emergencia' as Caracter, documentos: REQUISITOS_URGENCIA },
    ],
    clausulas: compilarPoliza(textoIntegral),
    textoIntegral,
  };
}

const RED_ISTMO: Hospital[] = [
  { hospital: 'Hospital Nacional de Panamá', ciudad: 'Ciudad de Panamá', nivel: 'A' },
  { hospital: 'Clínica Costa del Este', ciudad: 'Ciudad de Panamá', nivel: 'A' },
  { hospital: 'Hospital Metropolitano del Istmo', ciudad: 'Ciudad de Panamá', nivel: 'B' },
];

export const PLAN_A = construirPlan({
  id: 'PLAN-A',
  aseguradora: 'Aseguradora Istmo Salud',
  plan: 'Plan Familiar A',
  version: '2026-01',
  vigenciaDesde: '1 de enero de 2025',
  vigenciaHasta: '31 de diciembre de 2026',
  vigenciaDesdeIso: '2025-01-01',
  vigenciaHastaIso: '2026-12-31',
  red: RED_ISTMO,
  deducible: usd(1200),
  coaseguroPct: 20,
  fueraDeRedPct: 40,
  tope: usd(60000),
  umbralAuditoria: usd(5000),
  carencias: { cirugiaElectivaMeses: 3, maternidadMeses: 10, preexistenciasMeses: 24, urgenciasMeses: 0 },
  cubiertos: [
    { cups: '512301', soloRed: true, clausula: '2.1' },
    { cups: '452101', soloRed: true, clausula: '2.1' },
    { cups: '793501', soloRed: true, clausula: '2.1' },
    { cups: '471201', soloRed: false, clausula: '2.2' },
    { cups: '892001', soloRed: true, clausula: '2.1' },
  ],
  excluidos: [
    {
      cups: '158001',
      texto: 'No se cubren los procedimientos con fines estéticos, de embellecimiento o de cambio de apariencia.',
      clausula: '5.1',
    },
    {
      cups: null,
      texto: 'No se cubren los procedimientos experimentales.',
      clausula: '5.1',
    },
  ],
});

export const PLAN_B = construirPlan({
  id: 'PLAN-B',
  aseguradora: 'Aseguradora Istmo Salud',
  plan: 'Plan Empresarial B',
  version: '2026-01',
  vigenciaDesde: '1 de julio de 2025',
  vigenciaHasta: '30 de junio de 2027',
  vigenciaDesdeIso: '2025-07-01',
  vigenciaHastaIso: '2027-06-30',
  red: [
    { hospital: 'Hospital Nacional de Panamá', ciudad: 'Ciudad de Panamá', nivel: 'A' },
    { hospital: 'Hospital del Valle de Antón', ciudad: 'Antón', nivel: 'C' },
  ],
  deducible: usd(2500),
  coaseguroPct: 25,
  fueraDeRedPct: 50,
  tope: usd(40000),
  umbralAuditoria: usd(3000),
  carencias: { cirugiaElectivaMeses: 3, maternidadMeses: 12, preexistenciasMeses: 24, urgenciasMeses: 0 },
  cubiertos: [
    { cups: '512301', soloRed: true, clausula: '2.1' },
    { cups: '452101', soloRed: true, clausula: '2.1' },
    { cups: '471201', soloRed: false, clausula: '2.2' },
  ],
  excluidos: [
    {
      cups: '158001',
      texto: 'No se cubren los procedimientos con fines estéticos, de embellecimiento o de cambio de apariencia.',
      clausula: '5.1',
    },
    { cups: null, texto: 'No se cubren los procedimientos experimentales.', clausula: '5.1' },
  ],
});

export const PLAN_C = construirPlan({
  id: 'PLAN-C',
  aseguradora: 'Aseguradora Istmo Salud',
  plan: 'Plan Ejecutivo C',
  version: '2026-01',
  vigenciaDesde: '1 de marzo de 2026',
  vigenciaHasta: '28 de febrero de 2027',
  vigenciaDesdeIso: '2026-03-01',
  vigenciaHastaIso: '2027-02-28',
  red: [{ hospital: 'Clínica Costa del Este', ciudad: 'Ciudad de Panamá', nivel: 'A' }],
  deducible: usd(800),
  coaseguroPct: 15,
  fueraDeRedPct: 40,
  tope: usd(100000),
  umbralAuditoria: usd(6000),
  carencias: { cirugiaElectivaMeses: 3, maternidadMeses: 10, preexistenciasMeses: 24, urgenciasMeses: 0 },
  cubiertos: [
    { cups: '512301', soloRed: true, clausula: '2.1' },
    { cups: '793501', soloRed: true, clausula: '2.1' },
    { cups: '892001', soloRed: true, clausula: '2.1' },
    { cups: '471201', soloRed: false, clausula: '2.2' },
  ],
  excluidos: [
    {
      cups: '158001',
      texto: 'No se cubren los procedimientos con fines estéticos, de embellecimiento o de cambio de apariencia.',
      clausula: '5.1',
    },
    {
      cups: null,
      texto: 'No se cubren los tratamientos de ortodoncia ni los experimentales.',
      clausula: '5.1',
    },
  ],
});

export const PLANES: Plan[] = [PLAN_A, PLAN_B, PLAN_C];

export function planDe(id: string): Plan {
  const encontrado = PLANES.find((p) => p.id === id);
  if (!encontrado) throw new Error(`No existe la póliza ${id}`);
  return encontrado;
}
