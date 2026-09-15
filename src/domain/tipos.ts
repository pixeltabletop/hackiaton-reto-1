import type { Centavos } from './dinero';
import type { Evidencia } from './evidencia';

export type Caracter = 'electiva' | 'urgente' | 'emergencia';

export type Estado =
  | 'PRE_APROBADO'
  | 'PRE_APROBADO_CON_CONDICIONES'
  | 'DOCUMENTOS_FALTANTES'
  | 'NO_CUBIERTO'
  | 'CARENCIA_NO_CUMPLIDA'
  | 'DERIVAR_A_MEDICO_AUDITOR';

export interface Clausula {
  id: string;
  texto: string;
  offset: number;
}

export interface Hospital {
  hospital: string;
  ciudad: string;
  nivel: 'A' | 'B' | 'C';
}

export interface Carencias {
  cirugiaElectivaMeses: number;
  maternidadMeses: number;
  preexistenciasMeses: number;
  urgenciasMeses: number;
}

export interface Procedimiento {
  cups: string;
  nombre: string;
  cubierto: boolean;
  soloRed: boolean;
  requierePreautorizacion: boolean;
  tarifaReferencia: Centavos;
  clausula: string;
}

export interface Exclusion {
  id: string;
  cups: string | null;
  texto: string;
  clausula: string;
}

export interface Requisito {
  id: string;
  nombre: string;
  clausula: string;
}

export interface Plan {
  id: string;
  aseguradora: string;
  plan: string;
  version: string;
  vigenciaDesde: string;
  vigenciaHasta: string;
  vigenciaDesdeIso: string;
  vigenciaHastaIso: string;
  red: Hospital[];
  deducibleAnual: Centavos;
  coaseguroPct: number;
  coaseguroFueraDeRedPct: number;
  topeAnual: Centavos;
  umbralAuditoria: Centavos;
  carencias: Carencias;
  procedimientos: Procedimiento[];
  exclusiones: Exclusion[];
  requisitos: { caracter: Caracter; documentos: Requisito[] }[];
  clausulas: Clausula[];
  textoIntegral: string;
}

export interface Caso {
  id: string;
  titulo: string;
  hospital: string;
  fecha: string;
  pacienteRef: string;
  /** Cédula del asegurado, como se teclea en admisiones. */
  cedula: string;
  /** Número de póliza. Una póliza puede cubrir a más de un asegurado. */
  numeroPoliza: string;
  edad: number;
  sexo: 'F' | 'M';
  fechaAfiliacion: string;
  diagnosticoCie10: string;
  procedimientoCups: string;
  cirujano: string;
  caracter: Caracter;
  montoEstimado: Centavos;
  estudiosAdjuntos: string[];
  documentosAdjuntos: string[];
  preexistenciasDeclaradas: string[];
  informeTexto: string;
  planId: string;
  /**
   * Cita textual exacta de la que salió cada campo, cuando quien leyó el informe
   * conoce el fragmento literal (el lector por reglas o el modelo). Si falta, el
   * motor busca el propio valor como cita.
   */
  citas?: Record<string, string>;
  /**
   * El informe no dice si es electiva o de urgencia. De eso dependen la red, la
   * carencia y los documentos exigidos, así que no se adivina: deriva al auditor.
   */
  caracterSinDeclarar?: boolean;
  /**
   * El informe no declara preexistencias ni dice que no las haya. Si la afiliación
   * no cubre la carencia de preexistencias, el caso no se aprueba solo.
   */
  preexistenciasSinDeclarar?: boolean;
  // Lo que el corpus espera que el motor dicte. Es una prueba, no una promesa.
  estadoEsperado: Estado;
}

export interface Motivo {
  regla: string;
  resultado: string;
  clausula: string;
  evidencia: Evidencia | null;
}

export interface Faltante {
  documento: string;
  clausula: string;
}

export interface Decision {
  casoId: string;
  planId: string;
  estado: Estado;
  motivos: Motivo[];
  faltantes: Faltante[];
  campos: Evidencia[];
  montoFacturado: Centavos;
  deducibleAplicado: Centavos;
  coaseguroAplicado: Centavos;
  pagaAseguradora: Centavos;
  pagaPaciente: Centavos;
  enRed: boolean;
  mesesAfiliado: number;
  contrafactual: string | null;
  tiempoMs: number;
}
