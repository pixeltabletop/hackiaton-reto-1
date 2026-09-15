import Link from 'next/link';
import { CASOS } from '../../../src/data/casos';
import { TRAMPAS } from '../../../src/data/trampas';
import { planDe } from '../../../src/data/planes';
import { leerInforme } from '../../../src/domain/lectura';
import { dictaminar } from '../../../src/domain/motor';
import { recorrido } from '../../../src/domain/flujo';
import { resumenDe } from '../../../src/domain/resumen';
import { CLASE_ESTADO, ETIQUETA_ESTADO } from '../../../src/domain/presentacion';

// Cada variante se arma en el momento con el motor: una página estática mostraría
// siempre la misma, porque al generarla no existe la variante elegida.
export const dynamic = 'force-dynamic';

/**
 * El flujo, mostrado en vez de explicado.
 *
 * Las ocho reglas del motor se ven como ocho pasos, y cada variante enseña dónde se
 * detuvo y con qué cláusula. Las variantes de la derecha son el mismo informe con un
 * cambio pequeño —una negación, una orden escondida, un rótulo distinto— para que se
 * vea que el camino cambia por lo que dice el documento, no por quién lo mira.
 */

/** Variantes: los seis casos del corpus y cuatro informes trampa sobre el mismo texto. */
const TRAMPAS_MOSTRADAS = ['TR-02', 'TR-11', 'TR-16', 'TR-23'];

function variantes() {
  const delCorpus = CASOS.map((caso) => ({
    id: caso.id,
    etiqueta: caso.id.replace('PR-2026-', 'Caso '),
    titulo: caso.titulo,
    cambio: null as string | null,
    caso,
    planId: caso.planId,
  }));

  const trampas = TRAMPAS_MOSTRADAS.map((id) => {
    const trampa = TRAMPAS.find((t) => t.id === id)!;
    const base = CASOS.find((c) => c.id === trampa.casoBase)!;
    const plan = planDe(base.planId);
    let texto = base.informeTexto;
    for (const [buscar, poner] of trampa.cambios) texto = texto.replace(buscar, poner);
    const { caso } = leerInforme(texto, plan.id, plan.red.map((h) => h.hospital));
    return {
      id: trampa.id,
      etiqueta: trampa.id,
      titulo: trampa.titulo,
      cambio: trampa.cambios.map(([de, a]) => `«${de.trim()}» → «${a.trim() || '(se quita)'}»`).join(' · '),
      caso: { ...caso, id: `${base.id} · ${trampa.id}`, titulo: trampa.titulo },
      planId: base.planId,
    };
  });

  return [...delCorpus, ...trampas];
}

const CLASE_PASO = {
  cumplido: 'paso-cumplido',
  sin_observaciones: 'paso-cumplido',
  decidio: 'paso-decidio',
  no_evaluado: 'paso-no-evaluado',
};
const ROTULO_PASO = {
  cumplido: 'cumple',
  sin_observaciones: 'sin observaciones',
  decidio: 'aquí se decide',
  no_evaluado: 'no se llega',
};

export default async function Page({ searchParams }: { searchParams: Promise<{ v?: string }> }) {
  const { v } = await searchParams;
  const todas = variantes();
  const elegida = todas.find((x) => x.id === v) ?? todas[0];
  const plan = planDe(elegida.planId);
  const decision = dictaminar(elegida.caso, plan);
  const pasos = recorrido(decision);

  return (
    <div className="hoja">
      <header>
        <h1>Cómo decide, paso a paso</h1>
        <p className="problema">
          El motor evalúa ocho pasos, siempre en el mismo orden, y el primero que falla cierra el
          caso: lo que viene después no se adivina. Elija una variante y vea dónde se detiene.
        </p>
      </header>

      <div className="chips">
        {todas.map((x) => (
          <Link
            className={`chip chip-enlace ${x.id === elegida.id ? 'chip-activo' : ''}`}
            href={`/flujo?v=${encodeURIComponent(x.id)}`}
            key={x.id}
          >
            {x.etiqueta}
          </Link>
        ))}
      </div>

      <section className="bloque">
        <h4>{elegida.titulo}</h4>
        {elegida.cambio && (
          <p className="nota">
            Mismo informe del caso base, con un cambio: {elegida.cambio}
          </p>
        )}
        <p className={`chip chip-grande ${CLASE_ESTADO[decision.estado]}`}>
          {ETIQUETA_ESTADO[decision.estado]}
        </p>
        <p style={{ marginBottom: 0 }}>{resumenDe(decision)}</p>
      </section>

      <ol className="flujo">
        {pasos.map((paso) => (
          <li className={`flujo-paso ${CLASE_PASO[paso.estado]}`} key={paso.numero}>
            <div className="flujo-cabeza">
              <span className="flujo-numero">{paso.numero}</span>
              <b>{paso.nombre}</b>
              <span className="flujo-rotulo">{ROTULO_PASO[paso.estado]}</span>
            </div>
            <p className="flujo-pregunta">{paso.pregunta}</p>
            {paso.motivos.map((motivo, i) => (
              <p className="flujo-motivo" key={i}>
                {motivo.resultado} <span className="regla">cláusula {motivo.clausula}</span>
              </p>
            ))}
            {paso.motivos.length === 0 && (
              <p className="flujo-motivo flujo-apagado">
                {paso.estado === 'no_evaluado'
                  ? 'No se llegó a evaluar: el caso ya estaba cerrado antes.'
                  : 'Se evaluó y no había nada que señalar: el motor solo cita cuando hay algo que decir.'}
              </p>
            )}
          </li>
        ))}
      </ol>

      {decision.contrafactual && (
        <section className="bloque">
          <h4>Qué falta para aprobar</h4>
          <p style={{ marginBottom: 0 }}>{decision.contrafactual}</p>
        </section>
      )}

      <footer>
        <p>
          <Link href="/leer" style={{ color: 'var(--acento)' }}>
            Probarlo con un informe suyo →
          </Link>
        </p>
        <p>
          Los ocho pasos viven en <code>src/domain/motor.ts</code> y esta pantalla no repite ninguna
          regla: lee los motivos que el motor emitió.
        </p>
      </footer>
    </div>
  );
}
