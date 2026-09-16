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
        <h1>Cómo funciona</h1>
        <p className="problema">
          La máquina por dentro. Todo lo de esta página es proceso interno, no producto.
        </p>
      </header>

      <section className="bloque">
        <h4>El recorrido completo</h4>
        <ol className="lateral-pasos">
          <li>Entra un informe: pegado, leído de una foto o traído de la base de casos.</li>
          <li>El modelo lo lee y copia la cita textual de cada dato.</li>
          <li>El motor aplica la póliza en ocho pasos, en orden fijo.</li>
          <li>Sale el dictamen; el directorio añade a dónde ir y a quién llamar.</li>
          <li>Se arma el borrador de solicitud de aval para adelantar el trámite.</li>
        </ol>
        <p className="nota">
          El modelo lee y cita; nunca decide. Quien decide es el motor, y cada decisión suya queda
          atada al número de cláusula que la sostiene.
        </p>
      </section>

      <h2>Los ocho pasos, sobre un caso real</h2>
      <p className="nota nota-ceñida">
        Elija una variante: el primer paso que falla cierra el caso. Las variantes <b>TR-</b> son el
        mismo informe con un cambio pequeño, para ver que el camino cambia por lo que dice el
        documento y no por quién lo mira.
      </p>

      <div className="chips">
        {todas.map((x) => (
          <Link
            className={`chip chip-enlace ${x.id === elegida.id ? 'chip-activo' : ''}`}
            href={`/como-funciona?v=${encodeURIComponent(x.id)}`}
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

      <h2>De dónde salen los casos</h2>
      <div className="rejilla">
        <section className="bloque">
          <h4>La base de casos</h4>
          <p>
            Los casos pendientes viven en una base de Notion que hace de bandeja de la aseguradora.
            PRIOR AI lee el informe de cada fila, lo dictamina y escribe la decisión de vuelta con
            sus cláusulas.
          </p>
          <Link className="boton" href="/como-funciona/notion">
            Ver la integración
          </Link>
          <p className="nota">
            La web pública nunca depende de ese token: si Notion no responde, los expedientes locales
            se siguen viendo.
          </p>
        </section>

        <section className="bloque">
          <h4>Las puertas</h4>
          <ul className="clausulas">
            <li>
              <span className="id">npm run check</span>
              pruebas del motor, dictamen, informes trampa, contraste y README
            </li>
            <li>
              <span className="id">check:trampas --estricto</span>
              exige cero aprobaciones y cero negativas indebidas
            </li>
            <li>
              <span className="id">probar:proveedor</span>
              comprueba contra el modelo real que la lectura cita de verdad
            </li>
          </ul>
          <p className="nota">Las tres corren en la integración continua en cada cambio.</p>
        </section>
      </div>
    </div>
  );
}
