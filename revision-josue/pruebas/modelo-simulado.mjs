/**
 * El camino CON modelo (`leerInformeConModelo`), sin red ni clave: un proveedor
 * simulado devuelve respuestas que un modelo real puede dar, y se mira qué dictamina
 * el motor.
 *
 * Qué se quiere saber: si «el modelo no puede inventar» se cumple también cuando la
 * cita existe en el informe pero el VALOR no sale de esa cita, o cuando el modelo
 * aporta algo que no exige cita (documentos, carácter).
 *
 *   node --import ./scripts/registro-ts.mjs revision-josue/pruebas/modelo-simulado.mjs
 *
 * Sale con 1 si algún escenario termina en un dictamen distinto al correcto.
 */
import { writeFileSync } from 'node:fs';
import { CASOS } from '../../src/data/casos';
import { planDe } from '../../src/data/planes';
import { formato } from '../../src/domain/dinero';
import { leerInformeConModelo } from '../../src/domain/lectura-modelo';
import { dictaminar } from '../../src/domain/motor';

const base = (id) => CASOS.find((c) => c.id === id);
const simulado = (respuesta) => ({ nombre: 'modelo simulado', completar: async () => JSON.stringify(respuesta) });

const ESCENARIOS = [
  {
    id: 'MS-01',
    titulo: 'Carácter con valor distinto a su cita: "programada" citando "Carácter: electiva"',
    caso: 'PR-2026-0518',
    texto: (t) => t,
    respuesta: { campos: [{ campo: 'caracter', valor: 'programada', cita: 'Carácter: electiva' }] },
    esperado: ['CARENCIA_NO_CUMPLIDA'],
    porQue: 'El informe dice electiva con 2 de 3 meses: carencia (cláusula 3.1). Un carácter fuera del catálogo no puede saltarse la regla.',
  },
  {
    id: 'MS-02',
    titulo: 'Carácter "urgente" citando "Carácter: electiva", en hospital fuera de la red',
    caso: 'PR-2026-0417',
    texto: (t) => t.replace('HOSPITAL NACIONAL DE PANAMÁ — SERVICIO DE CIRUGÍA GENERAL', 'HOSPITAL REGIONAL DE AZUERO — SERVICIO DE CIRUGÍA GENERAL'),
    respuesta: { campos: [{ campo: 'caracter', valor: 'urgente', cita: 'Carácter: electiva' }] },
    esperado: ['NO_CUBIERTO'],
    porQue: 'Electiva fuera de red no está cubierta (cláusula 4.1). La cita dice electiva; el valor no sale de ella.',
  },
  {
    id: 'MS-03',
    titulo: 'Documentos que el modelo da por adjuntos sin cita, en un informe sin esa línea',
    caso: 'PR-2026-0701',
    texto: (t) => t.replace('Documentos adjuntos: informe del cirujano y consentimiento informado\n', ''),
    respuesta: { campos: [], documentos: ['R1', 'R2', 'R3', 'R4'] },
    esperado: ['DOCUMENTOS_FALTANTES'],
    porQue: 'El informe no lista ningún documento. La lista del modelo no trae cita y no debería contar.',
  },
  {
    id: 'MS-04',
    titulo: 'Monto con valor distinto a su cita, cuando las reglas no lo leyeron ("USD")',
    caso: 'PR-2026-0417',
    texto: (t) => t.replace('$ 4,200.00', 'USD 4,200.00'),
    respuesta: { campos: [{ campo: 'montoEstimado', valor: '$ 1,000.00', cita: 'Monto estimado del procedimiento: USD 4,200.00' }] },
    esperado: ['PRE_APROBADO', 'DOCUMENTOS_FALTANTES'],
    montoEsperado: 420000,
    porQue: 'Si aprueba, tiene que ser por los $ 4,200.00 del informe, no por un monto que el modelo escribió.',
  },
  {
    id: 'MS-05',
    titulo: 'Control: campo con cita que no existe en el informe',
    caso: 'PR-2026-0417',
    texto: (t) => t,
    respuesta: { campos: [{ campo: 'cirujano', valor: 'Dr. Inventado', cita: 'Cirujano tratante: Dr. Inventado' }] },
    esperado: ['PRE_APROBADO'],
    porQue: 'La cita no verifica: se descarta y el dictamen no cambia. Esto sí está protegido.',
  },
  {
    id: 'MS-06',
    titulo: 'Control: el modelo omite la preexistencia que las reglas sí leyeron',
    caso: 'PR-2026-0744',
    texto: (t) => t,
    respuesta: { campos: [], preexistencias: [] },
    esperado: ['DERIVAR_A_MEDICO_AUDITOR'],
    porQue: 'Una lista vacía del modelo no borra lo que leyeron las reglas. Esto sí está protegido.',
  },
];

let malos = 0;
const filas = [];
console.log('\nLECTURA CON MODELO SIMULADO — sin red, sin clave\n');
for (const e of ESCENARIOS) {
  const caso0 = base(e.caso);
  const plan = planDe(caso0.planId);
  const lectura = await leerInformeConModelo(e.texto(caso0.informeTexto), plan, simulado(e.respuesta));
  const d = dictaminar(lectura.caso, plan);
  let ok = e.esperado.includes(d.estado);
  let nota = '';
  if (ok && e.montoEsperado !== undefined && d.estado.startsWith('PRE_APROBADO') && d.montoFacturado !== e.montoEsperado) {
    ok = false;
    nota = ` · aprueba sobre ${formato(d.montoFacturado)} y el informe dice ${formato(e.montoEsperado)}`;
  }
  if (!ok) malos++;
  filas.push({ id: e.id, titulo: e.titulo, esperado: e.esperado, obtenido: d.estado, monto: d.montoFacturado, ok, nota: nota.replace(' · ', ''), porQue: e.porQue, notaLector: lectura.nota, descartados: lectura.descartados });
  console.log(`${ok ? 'OK   ' : 'FALLA'} ${e.id}  ${e.titulo}\n        esperado ${e.esperado.join(' o ')} · obtenido ${d.estado}${nota}\n        lector: ${lectura.nota}${lectura.descartados.length ? ' · descartó: ' + lectura.descartados.join('; ') : ''}`);
}
console.log(`\nRESULTADO: ${ESCENARIOS.length - malos}/${ESCENARIOS.length} correctos`);
writeFileSync(new URL('./resultados/modelo-simulado.json', import.meta.url), JSON.stringify({ commit: 'dfa78fa', filas }, null, 2));
process.exit(malos > 0 ? 1 : 0);
