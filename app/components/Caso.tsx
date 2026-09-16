import { CLASE_ESTADO, ETIQUETA_ESTADO, type VistaCaso } from '../../src/domain/presentacion';
import { familiaDe, resumenDe } from '../../src/domain/resumen';
import { Contactos, Destinos, Dinero, Papel } from './Atencion';

/**
 * La respuesta completa a un caso, en seis preguntas y en el orden en que alguien las hace
 * de verdad: ¿está cubierto? ¿cuánto paga? ¿a dónde puede ir? ¿a quién llama? ¿qué papel
 * lleva? y, al final y plegado, ¿cómo se decidió?
 *
 * El orden es la pieza de diseño. Antes esta ficha empezaba por el razonamiento del motor
 * —ocho reglas con sus cláusulas— y el dinero quedaba al costado; eso está construido para
 * quien audita el sistema, no para quien está en admisiones con el paciente delante. El
 * razonamiento sigue entero, palabra por palabra, pero va al último y plegado: quien lo
 * necesita lo abre.
 *
 * Componente de servidor: se renderiza completo en el HTML, sin JavaScript en el cliente.
 */

export function Caso({
  vista,
  titulo,
  hojaPropia = false,
}: {
  vista: VistaCaso;
  titulo?: string;
  /**
   * ¿Este caso tiene hoja imprimible en /aval/<id>? Solo los del corpus local la tienen, y
   * quien pinta la ficha es el único que sabe de dónde vino: un caso de Notion puede traer
   * el mismo identificador que uno local y el enlace armaría el borrador del caso equivocado.
   */
  hojaPropia?: boolean;
}) {
  const { caso, plan, decision, segmentos, clausulas, procedimiento } = vista;
  const clase = CLASE_ESTADO[decision.estado];

  // Una cláusula se explica una vez: si dos reglas la usan, la segunda solo la referencia.
  const yaCitadas = new Set<string>();
  const pasos = decision.motivos.map((motivo, i) => {
    const clausula = clausulas.find((c) => c.clausula.id === motivo.clausula)?.clausula;
    const repetida = clausula ? yaCitadas.has(clausula.id) : false;
    if (clausula) yaCitadas.add(clausula.id);
    return { motivo, clausula, repetida, familia: familiaDe(motivo.regla), numero: i + 1 };
  });

  return (
    <article className={`caso ${clase}`} id={caso.id}>
      {/* 1. ¿Está cubierto? */}
      <section className="veredicto">
        <span className="chip">{ETIQUETA_ESTADO[decision.estado]}</span>
        <p className="veredicto-resumen">{resumenDe(decision)}</p>
        <span className="slug">
          {titulo ?? caso.titulo} · {procedimiento} · {caso.hospital}
        </span>
      </section>

      <div className="rejilla">
        {/* 2. ¿Cuánto paga? */}
        <Dinero decision={decision} plan={plan} />
        {/* 3. ¿A dónde puede ir? */}
        <Destinos caso={caso} plan={plan} decision={decision} />
      </div>

      <div className="rejilla">
        {/* 4. ¿A quién llamar? */}
        <Contactos caso={caso} plan={plan} decision={decision} />
        {/* 5. ¿Qué papel llevar? */}
        <Papel caso={caso} plan={plan} decision={decision} enlaceAval={hojaPropia} />
      </div>

      {/* 6. ¿Cómo se decidió? Entero, y plegado. */}
      <details className="bloque como-decidio">
        <summary>
          ¿Cómo se decidió?
          <span className="referencia">
            {decision.motivos.length} reglas · {decision.tiempoMs} ms
          </span>
        </summary>

        <ol className="motivos">
          {pasos.map(({ motivo, clausula, repetida, familia, numero }) => (
            <li className={`paso-${familia}`} key={`${motivo.regla}-${numero}`}>
              <span className="paso-numero" aria-hidden="true">
                {numero}
              </span>
              <div>
                <span className="regla">{motivo.regla}</span>
                <p>{motivo.resultado}</p>
                {clausula && !repetida && (
                  <blockquote>
                    <span className="clausula">Cláusula {clausula.id} de la póliza</span>
                    {clausula.texto}
                  </blockquote>
                )}
                {clausula && repetida && (
                  <span className="referencia">Cláusula {clausula.id} — ya citada arriba</span>
                )}
              </div>
            </li>
          ))}
        </ol>

        <h4>El informe, con la cita de cada dato</h4>
        <pre className="documento">
          {segmentos.map((segmento, i) =>
            segmento.campo ? (
              <mark key={i} title={`Dato extraído: ${segmento.campo}`}>
                {segmento.texto}
              </mark>
            ) : (
              <span key={i}>{segmento.texto}</span>
            ),
          )}
        </pre>
        <table className="campos">
          <thead>
            <tr>
              <th>Campo</th>
              <th>Valor</th>
              <th>Cita textual</th>
              <th>Pos.</th>
            </tr>
          </thead>
          <tbody>
            {decision.campos.map((campo) => (
              <tr key={campo.campo}>
                <td>{campo.campo}</td>
                <td>{campo.valor}</td>
                <td>{campo.cita}</td>
                <td>{campo.offset}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="nota">
          Si la cita no apareciera en el informe, el dato no se usaría.
        </p>

        <h4>Cláusulas aplicadas</h4>
        <ul className="clausulas">
          {clausulas.map(({ clausula, veces }) => (
            <li key={clausula.id}>
              <span className="id">
                Cláusula {clausula.id} · {veces} {veces === 1 ? 'vez' : 'veces'}
              </span>
              {clausula.texto}
            </li>
          ))}
        </ul>
      </details>
    </article>
  );
}
