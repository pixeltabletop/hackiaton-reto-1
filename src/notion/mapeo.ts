import type { Caso, Plan } from '../domain/tipos';
import { usd } from '../domain/dinero';
import { compilarPoliza } from '../domain/poliza';
import {
  fecha,
  leerFecha,
  leerNumero,
  leerOpciones,
  leerSeleccion,
  leerTexto,
  numero,
  opciones,
  relacion,
  richText,
  seleccion,
  titulo,
} from './cliente';

/**
 * Puente entre Notion y el motor.
 *
 * La póliza viaja con su texto completo (para citar las cláusulas) y con su
 * estructura en JSON (lo que el motor consume hoy). Cuando la lectura con el
 * modelo esté puesta, ese JSON lo llenará el modelo citando cada campo; la
 * estructura de la fila no cambia.
 */

export interface FilaCaso {
  paginaId: string;
  caso: Caso;
}

/* ---------- Póliza ---------- */

export function propiedadesDePlan(plan: Plan) {
  const estructura = {
    id: plan.id,
    aseguradora: plan.aseguradora,
    plan: plan.plan,
    version: plan.version,
    vigenciaDesde: plan.vigenciaDesde,
    vigenciaHasta: plan.vigenciaHasta,
    vigenciaDesdeIso: plan.vigenciaDesdeIso,
    vigenciaHastaIso: plan.vigenciaHastaIso,
    red: plan.red,
    deducibleAnual: plan.deducibleAnual,
    coaseguroPct: plan.coaseguroPct,
    coaseguroFueraDeRedPct: plan.coaseguroFueraDeRedPct,
    topeAnual: plan.topeAnual,
    umbralAuditoria: plan.umbralAuditoria,
    carencias: plan.carencias,
    procedimientos: plan.procedimientos,
    exclusiones: plan.exclusiones,
    requisitos: plan.requisitos,
  };

  return {
    Plan: titulo(`${plan.id} · ${plan.plan}`),
    Aseguradora: richText(plan.aseguradora),
    'Vigencia desde': fecha(plan.vigenciaDesdeIso),
    'Vigencia hasta': fecha(plan.vigenciaHastaIso),
    Deducible: numero(plan.deducibleAnual / 100),
    'Coaseguro %': numero(plan.coaseguroPct),
    'Coaseguro fuera de red %': numero(plan.coaseguroFueraDeRedPct),
    'Tope anual': numero(plan.topeAnual / 100),
    'Umbral de auditoria': numero(plan.umbralAuditoria / 100),
    'Carencia cirugia electiva (meses)': numero(plan.carencias.cirugiaElectivaMeses),
    'Carencia preexistencias (meses)': numero(plan.carencias.preexistenciasMeses),
    'Carencia maternidad (meses)': numero(plan.carencias.maternidadMeses),
    Red: richText(plan.red.map((h) => `${h.hospital} (${h.ciudad}, nivel ${h.nivel})`).join(' · ')),
    'Texto de la poliza': richText(plan.textoIntegral),
    'Estructura (JSON)': richText(JSON.stringify(estructura)),
  };
}

export function planDesdeFila(fila: any): Plan {
  const propiedades = fila.properties;
  const estructura = JSON.parse(leerTexto(propiedades['Estructura (JSON)']));
  const textoIntegral = leerTexto(propiedades['Texto de la poliza']);
  // Las cláusulas se compilan del texto: sin ellas el motor no puede citar.
  return { ...estructura, clausulas: compilarPoliza(textoIntegral), textoIntegral } as Plan;
}

/* ---------- Caso ---------- */

export function propiedadesDeCaso(caso: Caso, polizaPaginaId?: string) {
  return {
    Caso: titulo(caso.id),
    Título: richText(caso.titulo),
    Hospital: seleccion(caso.hospital),
    Fecha: fecha(caso.fecha),
    Paciente: richText(caso.pacienteRef),
    Cédula: richText(caso.cedula),
    Póliza: richText(caso.numeroPoliza),
    Edad: numero(caso.edad),
    Sexo: seleccion(caso.sexo),
    Afiliación: fecha(caso.fechaAfiliacion),
    Diagnóstico: richText(caso.diagnosticoCie10),
    CUPS: richText(caso.procedimientoCups),
    Cirujano: richText(caso.cirujano),
    Carácter: seleccion(caso.caracter),
    'Monto estimado': numero(caso.montoEstimado / 100),
    Estudios: richText(caso.estudiosAdjuntos.join(' · ')),
    Documentos: opciones(caso.documentosAdjuntos),
    Preexistencias: richText(caso.preexistenciasDeclaradas.join(' · ')),
    Informe: richText(caso.informeTexto),
    Estado: seleccion('Pendiente'),
    ...(polizaPaginaId ? { Póliza: relacion([polizaPaginaId]) } : {}),
  };
}

export function casoDesdeFila(fila: any): Caso {
  const p = fila.properties;
  const estudios = leerTexto(p['Estudios']);
  const preexistencias = leerTexto(p['Preexistencias']);
  return {
    id: leerTexto(p['Caso']),
    titulo: leerTexto(p['Título']),
    hospital: leerSeleccion(p['Hospital']),
    fecha: leerFecha(p['Fecha']),
    pacienteRef: leerTexto(p['Paciente']),
    cedula: leerTexto(p['Cédula']),
    numeroPoliza: leerTexto(p['Póliza']),
    edad: leerNumero(p['Edad']),
    sexo: (leerSeleccion(p['Sexo']) || 'F') as Caso['sexo'],
    fechaAfiliacion: leerFecha(p['Afiliación']),
    diagnosticoCie10: leerTexto(p['Diagnóstico']),
    procedimientoCups: leerTexto(p['CUPS']),
    cirujano: leerTexto(p['Cirujano']),
    caracter: (leerSeleccion(p['Carácter']) || 'electiva') as Caso['caracter'],
    montoEstimado: usd(leerNumero(p['Monto estimado'])),
    estudiosAdjuntos: estudios ? estudios.split(' · ') : [],
    documentosAdjuntos: leerOpciones(p['Documentos']),
    preexistenciasDeclaradas: preexistencias ? preexistencias.split(' · ') : [],
    informeTexto: leerTexto(p['Informe']),
    planId: '',
    estadoEsperado: 'PRE_APROBADO',
  };
}

/* ---------- Decisión (lo que el agente escribe) ---------- */

export function propiedadesDeDecision(decision: any, casoPaginaId: string, clausulas: string[]) {
  return {
    Decisión: titulo(`${decision.casoId} · ${decision.estado}`),
    Caso: relacion([casoPaginaId]),
    Estado: seleccion(decision.estado),
    Facturado: numero(decision.montoFacturado / 100),
    Deducible: numero(decision.deducibleAplicado / 100),
    Coaseguro: numero(decision.coaseguroAplicado / 100),
    'Paga la aseguradora': numero(decision.pagaAseguradora / 100),
    'Paga el paciente': numero(decision.pagaPaciente / 100),
    'Cláusulas citadas': opciones(clausulas),
    Motivos: richText(
      decision.motivos
        .map((m: any, i: number) => `${i + 1}. [${m.regla}] ${m.resultado} (cláusula ${m.clausula})`)
        .join('\n'),
    ),
    Faltantes: richText(decision.faltantes.map((f: any) => `${f.documento} (cláusula ${f.clausula})`).join('\n')),
    'Qué falta para aprobar': richText(decision.contrafactual ?? ''),
    'Tiempo (ms)': numero(decision.tiempoMs),
    'Dictaminado el': fecha(new Date().toISOString().slice(0, 10)),
    'Sin cláusula citada': numero(decision.motivos.length === 0 ? 1 : 0),
  };
}
