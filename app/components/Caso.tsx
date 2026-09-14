import { formato } from '../../src/domain/dinero';
import { CLASE_ESTADO, ETIQUETA_ESTADO, type VistaCaso } from '../../src/domain/presentacion';

/**
 * La ficha de un caso: el veredicto, el porqué con sus cláusulas, el reparto del
 * monto, lo que falta y los dos desplegables con el informe citado y la póliza.
 *
 * Es un componente de servidor: se renderiza completo en el HTML, sin JavaScript
 * en el cliente. Se usa igual en la demostración y en la lectura de un informe.
 */

export function Dinero({ vista }: { vista: VistaCaso }) {
  const { decision, plan } = vista;
  const aprobado = decision.estado.startsWith('PRE_APROBADO');

  if (!aprobado) {
    return (
      <section className="bloque dinero">
        <h4>Reparto del monto</h4>
        <p className="sin-reparto">Sin reparto: no se superó la cobertura.</p>
        <table>
          <tbody>
            <tr>
              <td>Facturado por el hospital</td>
              <td>{formato(decision.montoFacturado)}</td>
            </tr>
            <tr>
              <td>Paga la aseguradora</td>
              <td className="no-aplica">no aplica</td>
            </tr>
            <tr className="paciente">
              <td>Paga el paciente</td>
              <td className="no-aplica">no aplica</td>
            </tr>
          </tbody>
        </table>
        <p className="nota">
          El motor resuelve primero la cobertura y después el dinero: si el caso no pasa cobertura,
          no hay nada que repartir.
        </p>
      </section>
    );
  }

  const pct = decision.enRed ? plan.coaseguroPct : plan.coaseguroFueraDeRedPct;
  return (
    <section className="bloque dinero">
      <h4>Reparto del monto</h4>
      <table>
        <tbody>
          <tr>
            <td>Facturado por el hospital</td>
            <td>{formato(decision.montoFacturado)}</td>
          </tr>
          <tr>
            <td>Deducible anual aplicado</td>
            <td>− {formato(decision.deducibleAplicado)}</td>
          </tr>
          <tr>
            <td>
              Coaseguro del paciente ({pct}% {decision.enRed ? 'en red' : 'fuera de red'})
            </td>
            <td>− {formato(decision.coaseguroAplicado)}</td>
          </tr>
          <tr className="total">
            <td>Responde la aseguradora</td>
            <td>{formato(decision.pagaAseguradora)}</td>
          </tr>
          <tr className="paciente">
            <td>Paga el paciente</td>
            <td>{formato(decision.pagaPaciente)}</td>
          </tr>
        </tbody>
      </table>
      <p className="nota">
        Todo en centavos enteros. Deducible + coaseguro + aseguradora = facturado, y se verifica en
        cada corrida.
      </p>
    </section>
  );
}

export function Caso({ vista, titulo }: { vista: VistaCaso; titulo?: string }) {
  const { caso, plan, decision, segmentos, clausulas, procedimiento } = vista;
  const clase = CLASE_ESTADO[decision.estado];

  // Una cláusula se explica una vez: si dos reglas la usan, la segunda solo la referencia.
  const yaCitadas = new Set<string>();
  const pasos = decision.motivos.map((motivo, i) => {
    const clausula = clausulas.find((c) => c.clausula.id === motivo.clausula)?.clausula;
    const repetida = clausula ? yaCitadas.has(clausula.id) : false;
    if (clausula) yaCitadas.add(clausula.id);
    return { motivo, clausula, repetida, clave: `${motivo.regla}-${i}` };
  });

  return (
    <article className={`caso ${clase}`} id={caso.id}>
      <header>
        <div>
          <span className="slug">
            {caso.id} · {plan.plan} · {plan.aseguradora}
          </span>
          <h3>{titulo ?? caso.titulo}</h3>
          <p className="sub">
            {caso.hospital} · {procedimiento} (CUPS {caso.procedimientoCups}) · {caso.caracter} ·
            paciente {caso.pacienteRef} de {caso.edad} años · afiliación {caso.fechaAfiliacion} (
            {decision.mesesAfiliado} meses)
          </p>
        </div>
        <div className="veredicto">
          <span className="chip">{ETIQUETA_ESTADO[decision.estado]}</span>
          <span className="reloj">
            <b>{decision.enRed ? 'en red' : 'fuera de red'}</b> ·{' '}
            <b>{decision.motivos.length} reglas aplicadas</b> · <b>{decision.tiempoMs} ms</b>
          </span>
        </div>
      </header>

      <div className="rejilla">
        <section className="bloque">
          <h4>¿Por qué? — cada paso con su cláusula</h4>
          <ol className="motivos">
            {pasos.map(({ motivo, clausula, repetida, clave }) => (
              <li key={clave}>
                <span className="regla">{motivo.regla}</span>
                <p>{motivo.resultado}</p>
                {clausula && !repetida && (
                  <blockquote>
                    <span className="clausula">Cláusula {clausula.id} de la póliza</span>
                    {clausula.texto}
                  </blockquote>
                )}
                {clausula && repetida && (
                  <span className="referencia">
                    Cláusula {clausula.id} — ya citada en el paso anterior
                  </span>
                )}
              </li>
            ))}
          </ol>
        </section>
        <Dinero vista={vista} />
      </div>

      {decision.faltantes.length > 0 && (
        <section className="bloque" style={{ marginTop: 18 }}>
          <h4>Lo que falta para poder dictaminar</h4>
          <ul className="faltantes-lista">
            {decision.faltantes.map((faltante) => (
              <li key={faltante.documento}>
                {faltante.documento}{' '}
                <span className="slug">(lo exige la cláusula {faltante.clausula})</span>
              </li>
            ))}
          </ul>
          {decision.contrafactual && (
            <p className="contrafactual">
              <b>Qué falta para aprobar:</b> {decision.contrafactual}
            </p>
          )}
        </section>
      )}

      <details className="bloque">
        <summary>Informe del hospital, con la cita textual de cada dato</summary>
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
              <th>Campo extraído</th>
              <th>Valor</th>
              <th>Cita textual</th>
              <th>Posición</th>
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
      </details>

      <details className="bloque">
        <summary>Cláusulas de la póliza aplicadas a este caso</summary>
        <ul className="clausulas">
          {clausulas.map(({ clausula, veces }) => (
            <li key={clausula.id}>
              <span className="id">
                Cláusula {clausula.id} · aplicada {veces} {veces === 1 ? 'vez' : 'veces'}
              </span>
              {clausula.texto}
            </li>
          ))}
        </ul>
      </details>
    </article>
  );
}
