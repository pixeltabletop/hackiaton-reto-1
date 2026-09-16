import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CASOS } from '../data/casos';
import { PLANES, planDe } from '../data/planes';
import { ASEGURADORAS, HOSPITALES, contactosDe, fichaDe } from '../data/directorio';
import { calcularMontos, dictaminar } from './motor';
import { desgloseDe } from './copago';
import { opcionesDeAtencion } from './destino';
import { aQuienLlamar } from './contacto';
import { solicitudDe } from './solicitud-aval';

const todos = CASOS.map((caso) => {
  const plan = planDe(caso.planId);
  return { caso, plan, decision: dictaminar(caso, plan) };
});

/* ---------- directorio: que no se desincronice de las pólizas ---------- */

test('cada hospital de cada red tiene ficha en el directorio', () => {
  for (const plan of PLANES) {
    for (const { hospital } of plan.red) {
      assert.ok(fichaDe(hospital), `sin ficha en el directorio: ${hospital} (${plan.id})`);
    }
  }
});

test('cada hospital donde el corpus atiende un caso tiene ficha, esté en red o no', () => {
  for (const { caso } of todos) {
    assert.ok(fichaDe(caso.hospital), `sin ficha en el directorio: ${caso.hospital}`);
  }
});

test('cada aseguradora tiene línea de atención y correo de autorizaciones', () => {
  for (const plan of PLANES) {
    const contactos = contactosDe(plan.aseguradora);
    assert.ok(contactos, `sin contactos: ${plan.aseguradora}`);
    assert.match(contactos!.linea24h, /^\+507 /);
    assert.match(contactos!.correoAutorizaciones, /@/);
  }
});

test('ninguna ficha del directorio se queda sin teléfono ni sin especialidades', () => {
  for (const ficha of HOSPITALES) {
    assert.match(ficha.telefono, /^\+507 \d{3}-\d{4}$/, `teléfono raro: ${ficha.hospital}`);
    assert.ok(ficha.especialidades.length > 0, `sin especialidades: ${ficha.hospital}`);
    assert.ok(ficha.zona.length > 3);
  }
  assert.ok(ASEGURADORAS.length > 0);
});

/* ---------- copago: el desglose tiene que cuadrar con el motor ---------- */

test('las líneas del desglose suman exactamente lo que el motor dice que paga el paciente', () => {
  for (const { plan, decision } of todos) {
    const desglose = desgloseDe(decision, plan);
    if (!desglose.aplica) continue;
    const suma = desglose.lineas.reduce((total, l) => total + l.monto, 0);
    assert.equal(suma, decision.pagaPaciente, `descuadre en ${decision.casoId}`);
  }
});

test('lo que paga el paciente más lo que paga la aseguradora es el costo completo', () => {
  for (const { plan, decision } of todos) {
    const desglose = desgloseDe(decision, plan);
    if (!desglose.aplica) continue;
    assert.equal(desglose.pagaPaciente + desglose.pagaAseguradora, desglose.costo);
  }
});

test('sin aprobación no hay reparto, y se dice por qué en vez de mostrar ceros', () => {
  for (const { plan, decision } of todos) {
    const desglose = desgloseDe(decision, plan);
    if (decision.estado.startsWith('PRE_APROBADO')) continue;
    assert.equal(desglose.aplica, false, `${decision.casoId} no está aprobado y reparte igual`);
    assert.equal(desglose.lineas.length, 0);
    assert.ok((desglose.porQueNoAplica ?? '').length > 10, `sin explicación: ${decision.estado}`);
  }
});

test('cada línea del desglose lleva cláusula, porque el dinero sale de la póliza', () => {
  for (const { plan, decision } of todos) {
    for (const linea of desgloseDe(decision, plan).lineas) {
      assert.ok(linea.clausula, `línea sin cláusula: ${linea.concepto}`);
    }
  }
});

/* ---------- destino: a dónde puede ir y cuánto paga ---------- */

test('el hospital donde está el paciente siempre aparece, y aparece marcado', () => {
  for (const { caso, plan, decision } of todos) {
    const { opciones } = opcionesDeAtencion(caso, plan, decision);
    const actual = opciones.filter((o) => o.esElActual);
    assert.equal(actual.length, 1, `el hospital actual no aparece una sola vez en ${caso.id}`);
    assert.equal(actual[0].hospital, caso.hospital);
    assert.equal(actual[0].diferenciaVsActual, 0);
  }
});

test('los montos de cada destino son los del motor, no un cálculo paralelo', () => {
  for (const { caso, plan, decision } of todos) {
    for (const opcion of opcionesDeAtencion(caso, plan, decision).opciones) {
      const esperado = calcularMontos(caso, plan, opcion.enRed);
      assert.equal(opcion.pagaPaciente, esperado.pagaPaciente, `${caso.id} · ${opcion.hospital}`);
      assert.equal(opcion.pagaAseguradora, esperado.pagaAseguradora, `${caso.id} · ${opcion.hospital}`);
    }
  }
});

test('cuando hay reparto, las opciones salen ordenadas por lo que paga el paciente', () => {
  for (const { caso, plan, decision } of todos) {
    const { opciones, aplicaElDinero } = opcionesDeAtencion(caso, plan, decision);
    if (!aplicaElDinero) continue;
    for (let i = 1; i < opciones.length; i += 1) {
      assert.ok(
        opciones[i - 1].pagaPaciente <= opciones[i].pagaPaciente,
        `desordenado en ${caso.id}`,
      );
    }
  }
});

test('los destinos callan el monto cuando el bloque del dinero dice que no hay reparto', () => {
  for (const { caso, plan, decision } of todos) {
    const { aplicaElDinero } = opcionesDeAtencion(caso, plan, decision);
    assert.equal(
      aplicaElDinero,
      desgloseDe(decision, plan).aplica,
      `destinos y copago se contradicen en ${caso.id} (${decision.estado})`,
    );
  }
});

test('sin reparto, los hospitales de la red van primero: lo que decide es si el sitio sirve', () => {
  for (const { caso, plan, decision } of todos) {
    const { opciones, aplicaElDinero } = opcionesDeAtencion(caso, plan, decision);
    if (aplicaElDinero) continue;
    const primerFuera = opciones.findIndex((o) => !o.enRed);
    const ultimoEnRed = opciones.map((o) => o.enRed).lastIndexOf(true);
    if (primerFuera !== -1 && ultimoEnRed !== -1) {
      assert.ok(primerFuera > ultimoEnRed, `red mezclada con fuera de red en ${caso.id}`);
    }
  }
});

test('toda la red del plan se ofrece, con teléfono y horario de urgencias', () => {
  for (const { caso, plan, decision } of todos) {
    const { opciones } = opcionesDeAtencion(caso, plan, decision);
    for (const { hospital } of plan.red) {
      const opcion = opciones.find((o) => o.hospital === hospital);
      assert.ok(opcion, `falta ${hospital} en las opciones de ${caso.id}`);
      assert.equal(opcion!.enRed, true);
      assert.ok(opcion!.telefono, `sin teléfono: ${hospital}`);
      assert.equal(typeof opcion!.urgencias24h, 'boolean');
    }
  }
});

test('un caso fuera de la red le cuesta al paciente más que la misma atención en la red', () => {
  const fuera = todos.find(({ decision }) => !decision.enRed && decision.estado.startsWith('PRE_APROBADO'));
  assert.ok(fuera, 'el corpus ya no tiene ningún caso aprobado fuera de la red');
  const { opciones } = opcionesDeAtencion(fuera!.caso, fuera!.plan, fuera!.decision);
  const actual = opciones.find((o) => o.esElActual)!;
  const enRed = opciones.find((o) => o.enRed)!;
  assert.ok(enRed.pagaPaciente < actual.pagaPaciente, 'la red no sale más barata: revisar el coaseguro');
  assert.ok(enRed.diferenciaVsActual < 0, 'la diferencia debería ser un ahorro');
});

test('la especialidad que pide el procedimiento se resuelve para todo el corpus', () => {
  for (const { caso, plan, decision } of todos) {
    const { especialidad } = opcionesDeAtencion(caso, plan, decision);
    assert.ok(especialidad, `sin especialidad para el CUPS ${caso.procedimientoCups}`);
  }
});

/* ---------- contacto: siempre hay a quién llamar ---------- */

test('todo dictamen del corpus devuelve al menos un contacto con teléfono marcable', () => {
  for (const { caso, plan, decision } of todos) {
    const contactos = aQuienLlamar(caso, plan, decision);
    assert.ok(contactos.length > 0, `sin contactos en ${caso.id}`);
    for (const contacto of contactos) {
      assert.match(contacto.marcable, /^\+507\d{7}$/, `no marcable: ${contacto.telefono}`);
      assert.ok(contacto.porQue.length > 10, `sin razón: ${contacto.quien}`);
    }
  }
});

test('la línea 24/7 de la aseguradora nunca falta', () => {
  for (const { caso, plan, decision } of todos) {
    const contactos = aQuienLlamar(caso, plan, decision);
    assert.ok(
      contactos.some((c) => c.quien.includes('24/7')),
      `sin línea 24/7 en ${caso.id} (${decision.estado})`,
    );
  }
});

test('los contactos vienen ordenados por prioridad', () => {
  for (const { caso, plan, decision } of todos) {
    const contactos = aQuienLlamar(caso, plan, decision);
    for (let i = 1; i < contactos.length; i += 1) {
      assert.ok(contactos[i - 1].prioridad <= contactos[i].prioridad, `desordenado en ${caso.id}`);
    }
  }
});

test('cuando faltan papeles, el primero al que se llama es el hospital', () => {
  const conFaltantes = todos.find(({ decision }) => decision.estado === 'DOCUMENTOS_FALTANTES');
  assert.ok(conFaltantes, 'el corpus ya no tiene ningún caso con documentos faltantes');
  const primero = aQuienLlamar(conFaltantes!.caso, conFaltantes!.plan, conFaltantes!.decision)[0];
  assert.equal(primero.quien, conFaltantes!.caso.hospital);
});

/* ---------- solicitud de aval: adelanta el trámite sin fingir que autoriza ---------- */

test('el borrador siempre declara que no es una autorización', () => {
  for (const { caso, plan, decision } of todos) {
    const solicitud = solicitudDe(caso, plan, decision);
    assert.match(solicitud.advertencia, /no es una autorización ni un aval/i);
    assert.match(solicitud.advertencia, /BORRADOR DE SOLICITUD/);
  }
});

test('el borrador lleva todas las cláusulas que el dictamen citó', () => {
  for (const { caso, plan, decision } of todos) {
    const solicitud = solicitudDe(caso, plan, decision);
    for (const motivo of decision.motivos) {
      assert.ok(
        solicitud.clausulasCitadas.includes(motivo.clausula),
        `falta la cláusula ${motivo.clausula} en el borrador de ${caso.id}`,
      );
    }
  }
});

test('el borrador identifica al asegurado, la póliza y el procedimiento', () => {
  for (const { caso, plan, decision } of todos) {
    const solicitud = solicitudDe(caso, plan, decision);
    const valores = solicitud.bloques.flatMap((b) => b.filas.map((f) => f.valor)).join(' | ');
    assert.ok(valores.includes(caso.cedula), `sin cédula: ${caso.id}`);
    assert.ok(valores.includes(caso.numeroPoliza), `sin póliza: ${caso.id}`);
    assert.ok(valores.includes(caso.procedimientoCups), `sin CUPS: ${caso.id}`);
    assert.ok(valores.includes(caso.hospital), `sin hospital: ${caso.id}`);
    assert.equal(solicitud.de, caso.hospital);
    assert.equal(solicitud.para, plan.aseguradora);
  }
});

test('un caso sin aprobar no reparte dinero en el borrador', () => {
  for (const { caso, plan, decision } of todos) {
    if (decision.estado.startsWith('PRE_APROBADO')) continue;
    const filas = solicitudDe(caso, plan, decision).bloques.flatMap((b) => b.filas);
    assert.ok(
      !filas.some((f) => f.etiqueta === 'Correspondería al asegurado'),
      `${caso.id} reparte dinero sin estar aprobado`,
    );
  }
});

test('lo que falta viaja en el borrador, con su cláusula', () => {
  const conFaltantes = todos.find(({ decision }) => decision.faltantes.length > 0);
  assert.ok(conFaltantes, 'el corpus ya no tiene ningún caso con faltantes');
  const solicitud = solicitudDe(conFaltantes!.caso, conFaltantes!.plan, conFaltantes!.decision);
  assert.equal(solicitud.faltantes.length, conFaltantes!.decision.faltantes.length);
  for (const falta of solicitud.faltantes) assert.ok(falta.clausula.length > 0);
});

test('el borrador sabe a qué correo va, y el folio identifica el caso', () => {
  for (const { caso, plan, decision } of todos) {
    const solicitud = solicitudDe(caso, plan, decision);
    assert.match(solicitud.correoDestino ?? '', /@/, `sin correo de destino: ${caso.id}`);
    assert.equal(solicitud.folio, `SA-${caso.id}`);
  }
});

/* ---------- degradaciones que Codex encontró en la auditoría del 16-sep ---------- */

test('un hospital y una aseguradora que el directorio no conoce no dejan el bloque vacío', () => {
  const { caso, plan, decision } = todos[0];
  const desconocido = {
    ...plan,
    id: 'PLAN-INVENTADO',
    aseguradora: 'Aseguradora Que No Existe',
  };
  const contactos = aQuienLlamar({ ...caso, hospital: 'Hospital Que No Existe' }, desconocido, decision);
  assert.ok(contactos.length > 0, 'se quedó sin contactos y sin explicación');
  assert.ok(contactos[0].porQue.length > 20, 'no dice por qué no hay a quién llamar');
  assert.equal(contactos[0].marcable, '', 'no puede ofrecer un número que no tiene');
});

test('cuando falta el teléfono pero hay correo de autorizaciones, se ofrece el correo', () => {
  const { caso, plan, decision } = todos[0];
  const contactos = aQuienLlamar({ ...caso, hospital: 'Hospital Que No Existe' }, { ...plan, id: 'PLAN-INVENTADO' }, decision);
  assert.ok(contactos.some((c) => c.telefono.includes('@') || c.marcable.length > 0));
});
