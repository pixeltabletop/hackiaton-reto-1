import { formato, menos, min, porcentaje } from './dinero';
import { evidenciaDe, sinVerificar, type Evidencia } from './evidencia';
import { clausulaDe } from './poliza';
import type { Caso, Decision, Estado, Faltante, Motivo, Plan, Requisito } from './tipos';

/**
 * Motor de decisión. Determinista y sin IA a propósito: la cobertura la decide la
 * póliza, no un modelo. El modelo solo aporta la lectura del documento y, con cada
 * dato, la cita textual de donde salió (evidencia.ts).
 *
 * Orden de evaluación — el primer paso que falla cierra el caso:
 *   1. evidencia · 2. vigencia · 3. cobertura y exclusiones · 4. red
 *   5. preexistencias · 6. carencias · 7. requisitos documentales
 *   8. montos, tope y umbral de auditoría
 */

export function mesesEntre(desdeIso: string, hastaIso: string): number {
  const desde = new Date(`${desdeIso}T00:00:00Z`);
  const hasta = new Date(`${hastaIso}T00:00:00Z`);
  let meses =
    (hasta.getUTCFullYear() - desde.getUTCFullYear()) * 12 +
    (hasta.getUTCMonth() - desde.getUTCMonth());
  if (hasta.getUTCDate() < desde.getUTCDate()) meses -= 1;
  return meses;
}

export function sumarMeses(iso: string, meses: number): string {
  const fecha = new Date(`${iso}T00:00:00Z`);
  fecha.setUTCMonth(fecha.getUTCMonth() + meses);
  return fecha.toISOString().slice(0, 10);
}

function requisitosDe(plan: Plan, caracter: Caso['caracter']): Requisito[] {
  const grupo = plan.requisitos.find((r) => r.caracter === caracter);
  return grupo ? grupo.documentos : [];
}

export interface Montos {
  coaseguroPct: number;
  deducibleAplicado: number;
  coaseguroAplicado: number;
  pagaAseguradora: number;
  pagaPaciente: number;
}

export function calcularMontos(caso: Caso, plan: Plan, enRed: boolean): Montos {
  const coaseguroPct = enRed ? plan.coaseguroPct : plan.coaseguroFueraDeRedPct;
  const deducibleAplicado = min(plan.deducibleAnual, caso.montoEstimado);
  const base = menos(caso.montoEstimado, deducibleAplicado);
  const coaseguroAplicado = porcentaje(base, coaseguroPct);
  const pagaAseguradora = menos(base, coaseguroAplicado);
  return {
    coaseguroPct,
    deducibleAplicado,
    coaseguroAplicado,
    pagaAseguradora,
    pagaPaciente: caso.montoEstimado - pagaAseguradora,
  };
}

export function evidenciaDelCaso(caso: Caso): Evidencia[] {
  const cita = (campo: string, porDefecto: string) => caso.citas?.[campo] ?? porDefecto;
  return [
    evidenciaDe('pacienteRef', caso.pacienteRef, caso.informeTexto, cita('pacienteRef', caso.pacienteRef)),
    evidenciaDe('edad', String(caso.edad), caso.informeTexto, cita('edad', String(caso.edad))),
    evidenciaDe('hospital', caso.hospital, caso.informeTexto, cita('hospital', caso.hospital)),
    evidenciaDe('fecha', caso.fecha, caso.informeTexto, cita('fecha', caso.fecha)),
    evidenciaDe(
      'fechaAfiliacion',
      caso.fechaAfiliacion,
      caso.informeTexto,
      cita('fechaAfiliacion', caso.fechaAfiliacion),
    ),
    evidenciaDe(
      'diagnosticoCie10',
      caso.diagnosticoCie10,
      caso.informeTexto,
      cita('diagnosticoCie10', caso.diagnosticoCie10),
    ),
    evidenciaDe(
      'procedimientoCups',
      caso.procedimientoCups,
      caso.informeTexto,
      cita('procedimientoCups', caso.procedimientoCups),
    ),
    evidenciaDe('cirujano', caso.cirujano, caso.informeTexto, cita('cirujano', caso.cirujano)),
    evidenciaDe(
      'montoEstimado',
      formato(caso.montoEstimado),
      caso.informeTexto,
      cita('montoEstimado', formato(caso.montoEstimado)),
    ),
  ];
}

interface Opciones {
  /** Cuando se simula el caso con los faltantes resueltos, no se vuelve a simular. */
  contrafactual?: boolean;
}

export function dictaminar(caso: Caso, plan: Plan, opciones: Opciones = {}): Decision {
  const inicio = Date.now();
  const motivos: Motivo[] = [];
  const faltantes: Faltante[] = [];
  const campos = evidenciaDelCaso(caso);
  const enRed = plan.red.some((h) => h.hospital === caso.hospital);
  const mesesAfiliado = mesesEntre(caso.fechaAfiliacion, caso.fecha);
  const exigido = (id: string) => clausulaDe(plan.clausulas, id).id;

  const motivo = (
    regla: string,
    resultado: string,
    clausulaId: string,
    evidencia: Evidencia | null = null,
  ): Motivo => {
    clausulaDe(plan.clausulas, clausulaId); // si la cláusula no existe, esto revienta
    return { regla, resultado, clausula: exigido(clausulaId), evidencia };
  };

  const montos = { coaseguroPct: 0, deducibleAplicado: 0, coaseguroAplicado: 0, pagaAseguradora: 0, pagaPaciente: 0 };

  const cerrar = (estado: Estado, extra: Partial<Decision> = {}): Decision => ({
    casoId: caso.id,
    planId: plan.id,
    estado,
    motivos,
    faltantes,
    campos,
    montoFacturado: caso.montoEstimado,
    deducibleAplicado: montos.deducibleAplicado,
    coaseguroAplicado: montos.coaseguroAplicado,
    pagaAseguradora: montos.pagaAseguradora,
    pagaPaciente: montos.pagaPaciente,
    enRed,
    mesesAfiliado,
    contrafactual: null,
    tiempoMs: Date.now() - inicio,
    ...extra,
  });

  // 1. Sin cita textual no hay dato. Un campo que no se puede citar no puede sostener una decisión.
  const sinCita = sinVerificar(campos);
  if (sinCita.length > 0) {
    const evidencia = campos.find((c) => c.campo === sinCita[0].campo) ?? null;
    motivos.push(
      motivo(
        'evidencia',
        `Sin cita textual en el informe: ${sinCita.map((c) => c.campo).join(', ')}`,
        '6.1',
        evidencia,
      ),
    );
    for (const campo of sinCita) {
      faltantes.push({ documento: `Cita textual del campo ${campo.campo}`, clausula: exigido('6.1') });
    }
    return cerrar('DOCUMENTOS_FALTANTES');
  }

  const camposPorNombre = new Map(campos.map((c) => [c.campo, c]));
  const cita = (campo: string): Evidencia | null => camposPorNombre.get(campo) ?? null;

  // 2. Vigencia
  if (caso.fecha < plan.vigenciaDesdeIso || caso.fecha > plan.vigenciaHastaIso) {
    motivos.push(
      motivo(
        'vigencia',
        `La póliza no estaba vigente el ${caso.fecha} (rige del ${plan.vigenciaDesdeIso} al ${plan.vigenciaHastaIso})`,
        '1.1',
        cita('fecha'),
      ),
    );
    return cerrar('NO_CUBIERTO');
  }
  motivos.push(motivo('vigencia', `Póliza vigente el día del servicio (${caso.fecha})`, '1.1', cita('fecha')));

  // 3. Cobertura y exclusiones
  const exclusion = plan.exclusiones.find((e) => e.cups === caso.procedimientoCups);
  if (exclusion) {
    motivos.push(
      motivo('cobertura', `Excluido: ${exclusion.texto}`, exclusion.clausula, cita('procedimientoCups')),
    );
    return cerrar('NO_CUBIERTO');
  }

  const procedimiento = plan.procedimientos.find((p) => p.cups === caso.procedimientoCups);
  if (!procedimiento) {
    motivos.push(
      motivo(
        'cobertura',
        `El procedimiento ${caso.procedimientoCups} no figura en el tarifario del plan: requiere revisión del médico auditor`,
        '2.1',
        cita('procedimientoCups'),
      ),
    );
    return cerrar('DERIVAR_A_MEDICO_AUDITOR');
  }
  motivos.push(
    motivo(
      'cobertura',
      `Figura en el tarifario del plan: ${procedimiento.nombre} (CUPS ${procedimiento.cups})`,
      procedimiento.clausula,
      cita('procedimientoCups'),
    ),
  );

  // 3b. Carácter sin declarar: la red, la carencia y los documentos dependen de si es
  // electiva o de urgencia. No se adivina «electiva»: decide una persona.
  if (caso.caracterSinDeclarar) {
    motivos.push(
      motivo(
        'carácter',
        'El informe no declara si el procedimiento es electivo o de urgencia; de eso dependen la red, la carencia y los documentos exigidos',
        '2.2',
        null,
      ),
    );
    return cerrar('DERIVAR_A_MEDICO_AUDITOR');
  }

  // 4. Red (la atención programada fuera de la red no está cubierta; la urgencia, sí)
  if (procedimiento.soloRed && !enRed && caso.caracter === 'electiva') {
    motivos.push(
      motivo(
        'red',
        `Atención programada en ${caso.hospital}, que no está en la red del plan`,
        '4.1',
        cita('hospital'),
      ),
    );
    return cerrar('NO_CUBIERTO');
  }

  // 5. Preexistencias
  if (
    caso.preexistenciasDeclaradas.length > 0 &&
    mesesAfiliado < plan.carencias.preexistenciasMeses
  ) {
    motivos.push(
      motivo(
        'preexistencias',
        `Preexistencia declarada con ${mesesAfiliado} de ${plan.carencias.preexistenciasMeses} meses de afiliación (${caso.preexistenciasDeclaradas.join('; ')})`,
        '3.2',
        cita('fechaAfiliacion'),
      ),
    );
    motivos.push(
      motivo(
        'aplicación de la carencia',
        `Cumplirá la carencia de preexistencias el ${sumarMeses(caso.fechaAfiliacion, plan.carencias.preexistenciasMeses)}`,
        '3.2',
        null,
      ),
    );
    return cerrar('DERIVAR_A_MEDICO_AUDITOR');
  }

  // 6. Carencia de cirugía electiva
  if (caso.caracter === 'electiva' && mesesAfiliado < plan.carencias.cirugiaElectivaMeses) {
    motivos.push(
      motivo(
        'carencias',
        `Cirugía electiva con ${mesesAfiliado} de ${plan.carencias.cirugiaElectivaMeses} meses de afiliación`,
        '3.1',
        cita('fechaAfiliacion'),
      ),
    );
    motivos.push(
      motivo(
        'aplicación de la carencia',
        `Aplicará desde el ${sumarMeses(caso.fechaAfiliacion, plan.carencias.cirugiaElectivaMeses)}`,
        '3.1',
        null,
      ),
    );
    return cerrar('CARENCIA_NO_CUMPLIDA');
  }

  // 7. Requisitos documentales
  for (const requisito of requisitosDe(plan, caso.caracter)) {
    if (!caso.documentosAdjuntos.includes(requisito.id)) {
      faltantes.push({ documento: requisito.nombre, clausula: exigido(requisito.clausula) });
    }
  }

  const montosCalculados = calcularMontos(caso, plan, enRed);
  Object.assign(montos, montosCalculados);

  if (faltantes.length > 0) {
    for (const faltante of faltantes) {
      motivos.push(
        motivo('documentos', `Falta: ${faltante.documento}`, faltante.clausula, null),
      );
    }
    let contrafactual: string | null = null;
    if (!opciones.contrafactual) {
      const completos = requisitosDe(plan, caso.caracter).map((r) => r.id);
      const simulado = dictaminar({ ...caso, documentosAdjuntos: completos }, plan, {
        contrafactual: true,
      });
      contrafactual = `Con esos documentos, el caso pasa a ${simulado.estado} y la aseguradora responde ${formato(simulado.pagaAseguradora)}.`;
    }
    return cerrar('DOCUMENTOS_FALTANTES', { contrafactual });
  }

  // 7b. Preexistencias sin declarar: si la afiliación no cubre la carencia de
  // preexistencias, no se puede descartar una y el caso no se aprueba solo. Va después
  // de carencias y documentos para no tapar un motivo más concreto.
  if (caso.preexistenciasSinDeclarar && mesesAfiliado < plan.carencias.preexistenciasMeses) {
    motivos.push(
      motivo(
        'preexistencias',
        `El informe no declara preexistencias ni dice que no las haya, y la afiliación (${mesesAfiliado} de ${plan.carencias.preexistenciasMeses} meses) no cubre esa carencia`,
        '3.2',
        cita('fechaAfiliacion'),
      ),
    );
    return cerrar('DERIVAR_A_MEDICO_AUDITOR');
  }

  // 8a. Tope anual, antes que el umbral: si va después, el umbral (siempre menor en
  // los planes) deriva primero y el tope nunca se aplica ni se cita.
  if (caso.montoEstimado > plan.topeAnual) {
    motivos.push(
      motivo('tope', `Monto sobre el tope anual de ${formato(plan.topeAnual)}`, '7.3', cita('montoEstimado')),
    );
    return cerrar('DERIVAR_A_MEDICO_AUDITOR');
  }

  // 8b. Umbral de auditoría
  if (caso.montoEstimado > plan.umbralAuditoria) {
    motivos.push(
      motivo(
        'auditoria',
        `Monto de ${formato(caso.montoEstimado)} sobre el umbral de ${formato(plan.umbralAuditoria)}: dictamina el médico auditor`,
        '8.1',
        cita('montoEstimado'),
      ),
    );
    return cerrar('DERIVAR_A_MEDICO_AUDITOR');
  }

  motivos.push(
    motivo(
      'montos',
      `Deducible ${formato(montos.deducibleAplicado)} · coaseguro ${motivoPorcentaje(montos.coaseguroPct)} sobre ${formato(menos(montos.montoFacturado, montos.deducibleAplicado))} = ${formato(montos.coaseguroAplicado)}`,
      '7.2',
      cita('montoEstimado'),
    ),
  );

  // 9. Urgencia fuera de la red: se cubre, con las condiciones de fuera de red
  if (!enRed) {
    motivos.push(
      motivo(
        'condiciones',
        `Urgencia atendida en ${caso.hospital} fuera de la red: coaseguro de fuera de red ${motivoPorcentaje(montos.coaseguroPct)}`,
        '2.2',
        cita('hospital'),
      ),
    );
    motivos.push(
      motivo('condiciones', 'Sujeto a autorización expresa de la aseguradora', '4.1', cita('hospital')),
    );
    return cerrar('PRE_APROBADO_CON_CONDICIONES');
  }

  return cerrar('PRE_APROBADO');
}

function motivoPorcentaje(pct: number): string {
  return `${pct}%`;
}
