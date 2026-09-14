/**
 * Evalúa, sin llamar a ningún modelo, cinco maneras de combinar lector y motor sobre
 * las respuestas guardadas en cache/. Se puede repetir después de cada arreglo del
 * código: las llamadas ya están pagadas.
 *
 *   V0 reglas         — solo el lector por reglas (lo que sirve la URL sin clave).
 *   V1 relleno        — el producto hoy: reglas primero; el modelo completa lo que falta.
 *   V2 modelo primero — el modelo manda en todo lo que pueda citar; las reglas completan.
 *   V3 consenso       — reglas y modelo tienen que coincidir; si discrepan, no se aprueba solo.
 *   V4 modelo decide  — el modelo dictamina con la póliza completa, sin motor.
 *
 *   node --import ./scripts/registro-ts.mjs revision-josue/banco/evaluar.mjs
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { planDe } from '../../src/data/planes';
import { usd } from '../../src/domain/dinero';
import { valorRespaldadoPorCita } from '../../src/domain/evidencia';
import { leerInforme, resolverHospital } from '../../src/domain/lectura';
import { aceptarDelModelo, extraerJson, leerInformeConModelo } from '../../src/domain/lectura-modelo';
import { dictaminar } from '../../src/domain/motor';
import { construirCorpus } from './corpus.mjs';

const aqui = dirname(fileURLToPath(import.meta.url));
const PRECIOS = { haiku: [1, 5], sonnet: [2, 10] }; // USD por millón de tokens (entrada, salida)
const aprobado = (e) => e.startsWith('PRE_APROBADO');
const NEGATIVAS = new Set(['NO_CUBIERTO', 'CARENCIA_NO_CUMPLIDA']);

function riesgo(esperados, obtenido) {
  if (esperados.includes(obtenido)) return 'ok';
  if (!obtenido) return 'sin respuesta';
  if (aprobado(obtenido) && !esperados.some(aprobado)) return 'aprueba de más';
  if (NEGATIVAS.has(obtenido) && esperados.some(aprobado)) return 'niega de más';
  return 'frena de más';
}

function aplicar(caso, campo, valor, cita, red) {
  caso.citas = { ...(caso.citas ?? {}), [campo]: cita };
  switch (campo) {
    case 'edad': caso.edad = Number(valor.replace(/[^\d]/g, '')) || 0; break;
    case 'caracter': caso.caracter = valor.toLowerCase(); caso.caracterSinDeclarar = false; break;
    case 'hospital': caso.hospital = resolverHospital(valor, red); break;
    case 'montoEstimado': caso.montoEstimado = usd(Number(valor.replace(/[^\d.]/g, '')) || 0); break;
    case 'procedimientoCups': caso.procedimientoCups = valor.replace(/[^\d]/g, ''); break;
    case 'diagnosticoCie10': caso.diagnosticoCie10 = valor.split(/[\s—(]/)[0]; break;
    default: caso[campo] = valor;
  }
}

const valorDeRegla = (caso, campo) =>
  campo === 'montoEstimado' ? String(caso.montoEstimado / 100) : String(caso[campo] ?? '');
const coinciden = (campo, a, b) => valorRespaldadoPorCita(campo, a, b) || valorRespaldadoPorCita(campo, b, a);

function leerCache(proveedor, tarea, id) {
  const archivo = join(aqui, 'cache', proveedor, tarea, `${id}.json`);
  return existsSync(archivo) ? JSON.parse(readFileSync(archivo, 'utf8')) : null;
}

async function dictamenes(item, proveedor) {
  const plan = planDe(item.planId);
  const red = plan.red.map((h) => h.hospital);
  const reglas = leerInforme(item.texto, plan.id, red);
  const salida = {};
  const lectura = proveedor ? leerCache(proveedor, 'lectura', item.id) : null;

  if (!proveedor) {
    salida.V0 = dictaminar(reglas.caso, plan).estado;
    return salida;
  }

  // V1: el código del producto, con la respuesta guardada como si viniera del modelo.
  const falso = { nombre: proveedor, completar: async () => { if (!lectura?.ok) throw new Error('sin respuesta'); return lectura.texto; } };
  if (lectura) salida.V1 = dictaminar((await leerInformeConModelo(item.texto, plan, falso)).caso, plan).estado;

  let datos = null;
  try { if (lectura?.ok) datos = extraerJson(lectura.texto); } catch { datos = null; }

  if (lectura) {
    // V2: modelo primero.
    const caso2 = structuredClone(reglas.caso);
    if (datos) {
      const { aceptados, documentos, preexistencias } = aceptarDelModelo(lectura.texto, item.texto, {});
      for (const a of aceptados) aplicar(caso2, a.campo, a.valor, a.cita, red);
      if (Array.isArray(datos.documentos)) caso2.documentosAdjuntos = documentos;
      if (Array.isArray(datos.preexistencias)) caso2.preexistenciasDeclaradas = preexistencias;
    }
    salida.V2 = dictaminar(caso2, plan).estado;

    // V3: consenso conservador.
    const caso3 = structuredClone(reglas.caso);
    let conflicto = false;
    if (datos) {
      const { aceptados, documentos, preexistencias } = aceptarDelModelo(lectura.texto, item.texto, {});
      for (const a of aceptados) {
        const tieneRegla = Boolean(reglas.caso.citas?.[a.campo]);
        if (!tieneRegla) aplicar(caso3, a.campo, a.valor, a.cita, red);
        else if (!coinciden(a.campo, valorDeRegla(reglas.caso, a.campo), a.valor)) conflicto = true;
      }
      if (Array.isArray(datos.documentos)) {
        caso3.documentosAdjuntos = reglas.caso.documentosAdjuntos.length
          ? reglas.caso.documentosAdjuntos.filter((d) => documentos.includes(d))
          : documentos;
      }
      caso3.preexistenciasDeclaradas = [...new Set([...reglas.caso.preexistenciasDeclaradas, ...preexistencias])];
    }
    const estado3 = dictaminar(caso3, plan).estado;
    salida.V3 = conflicto && aprobado(estado3) ? 'DERIVAR_A_MEDICO_AUDITOR' : estado3;
  }

  const decision = leerCache(proveedor, 'decision', item.id);
  if (decision) {
    try { salida.V4 = decision.ok ? String(extraerJson(decision.texto).estado ?? '') : ''; } catch { salida.V4 = ''; }
  }
  return salida;
}

function mediana(xs) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

async function main() {
  const corpus = construirCorpus();
  const proveedores = existsSync(join(aqui, 'cache')) ? readdirSync(join(aqui, 'cache')) : [];
  const filas = [];
  const detalle = [];

  const acumular = (variante, proveedor, item, obtenido) => {
    const r = riesgo(item.esperado, obtenido);
    detalle.push({ variante, proveedor, id: item.id, grupo: item.grupo, esperado: item.esperado, obtenido, riesgo: r });
  };

  for (const item of corpus) acumular('V0', 'reglas', item, (await dictamenes(item, null)).V0);
  for (const proveedor of proveedores) {
    for (const item of corpus) {
      const d = await dictamenes(item, proveedor);
      for (const v of ['V1', 'V2', 'V3', 'V4']) if (v in d) acumular(v, proveedor, item, d[v]);
    }
  }

  const grupos = new Map();
  for (const d of detalle) {
    const clave = `${d.variante}|${d.proveedor}`;
    if (!grupos.has(clave)) grupos.set(clave, []);
    grupos.get(clave).push(d);
  }

  for (const [clave, ds] of grupos) {
    const [variante, proveedor] = clave.split('|');
    const cuenta = (r) => ds.filter((d) => d.riesgo === r).length;
    const tarea = variante === 'V4' ? 'decision' : 'lectura';
    const registros = proveedor === 'reglas' ? [] : corpus.map((i) => leerCache(proveedor, tarea, i.id)).filter((x) => x?.ok);
    const precio = PRECIOS[proveedor];
    const costo = precio && registros.length
      ? registros.reduce((t, r) => t + (r.entrada * precio[0] + r.salida * precio[1]) / 1e6, 0) / registros.length
      : null;
    filas.push({
      variante, proveedor, n: ds.length,
      correctos: cuenta('ok'),
      apruebaDeMas: cuenta('aprueba de más'),
      niegaDeMas: cuenta('niega de más'),
      frenaDeMas: cuenta('frena de más'),
      sinRespuesta: cuenta('sin respuesta'),
      porGrupo: Object.fromEntries(['corpus', 'trampa', 'prosa'].map((g) => [g, `${ds.filter((d) => d.grupo === g && d.riesgo === 'ok').length}/${ds.filter((d) => d.grupo === g).length}`])),
      msMediana: proveedor === 'reglas' ? 0 : mediana(registros.map((r) => r.ms)),
      tokensMedianos: proveedor === 'reglas' ? 0 : mediana(registros.map((r) => r.entrada + r.salida)),
      costoPorInforme: costo,
      llamadasOk: registros.length,
    });
  }
  filas.sort((a, b) => b.correctos - a.correctos || a.apruebaDeMas - b.apruebaDeMas);

  const md = [
    '| Variante | Proveedor | Correctos | Aprueba de más | Niega de más | Frena de más | Sin respuesta | corpus · trampas · prosa | Mediana ms | Tokens | USD/informe |',
    '|---|---|---|---|---|---|---|---|---|---|---|',
    ...filas.map((f) => `| ${f.variante} | ${f.proveedor} | ${f.correctos}/${f.n} | ${f.apruebaDeMas} | ${f.niegaDeMas} | ${f.frenaDeMas} | ${f.sinRespuesta} | ${f.porGrupo.corpus} · ${f.porGrupo.trampa} · ${f.porGrupo.prosa} | ${f.msMediana ?? '—'} | ${f.tokensMedianos ?? '—'} | ${f.costoPorInforme == null ? '—' : f.costoPorInforme.toFixed(4)} |`),
  ].join('\n');

  mkdirSync(join(aqui, 'resultados'), { recursive: true });
  writeFileSync(join(aqui, 'resultados', 'tabla.md'), md + '\n');
  writeFileSync(join(aqui, 'resultados', 'resumen.json'), JSON.stringify(filas, null, 2));
  writeFileSync(join(aqui, 'resultados', 'detalle.json'), JSON.stringify(detalle, null, 2));
  console.log(md);
}

await main();
