import { CASOS } from '../src/data/casos';
import { planDe } from '../src/data/planes';
import { formato } from '../src/domain/dinero';
import { armarVista, CLASE_ESTADO, ETIQUETA_ESTADO, type VistaCaso } from '../src/domain/presentacion';

export const dynamic = 'force-static';

function Dinero({ vista }: { vista: VistaCaso }) {
  const { decision, plan } = vista;
  const aprobado = decision.estado.startsWith('PRE_APROBADO');

  if (!aprobado) {
    return (
      <section className="bloque dinero">
        <h4>Reparto del monto</h4>
        <p className="sin-reparto">
          Sin reparto: no se superó la cobertura.
        </p>
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

function Caso({ vista }: { vista: VistaCaso }) {
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
          <h3>{caso.titulo}</h3>
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

export default function Page() {
  const vistas = CASOS.map((caso) => armarVista(caso, planDe(caso.planId)));
  const aprobados = vistas.filter((v) => v.decision.estado.startsWith('PRE_APROBADO'));
  const totalAseguradora = aprobados.reduce((total, v) => total + v.decision.pagaAseguradora, 0);
  const sinClausula = vistas.filter((v) => v.decision.motivos.length === 0).length;
  const masLento = Math.max(...vistas.map((v) => v.decision.tiempoMs));

  return (
    <div className="hoja">
      <header>
        <span className="ceja">hackIAthon Panamá 2026 · Reto 1 · Equipo Jajanken</span>
        <h1>Pre-autorización quirúrgica en segundos</h1>
        <p className="tesis">
          El agente no autoriza: <strong>dictamina con la póliza en la mano</strong>. El modelo lee el
          informe del hospital y cita de dónde sacó cada dato; la cobertura la decide la póliza con
          reglas deterministas. Si un dato no tiene respaldo textual, el caso no se aprueba: cae a
          documentos faltantes.
        </p>
      </header>

      <dl className="metricas">
        <div>
          <dt>Casos dictaminados</dt>
          <dd>6 de 6</dd>
        </div>
        <div>
          <dt>Decisiones sin cláusula citada</dt>
          <dd className="cero">{sinClausula}</dd>
        </div>
        <div>
          <dt>Dictamen más lento</dt>
          <dd>{masLento} ms</dd>
        </div>
        <div>
          <dt>Origen de los datos</dt>
          <dd className="palabra">Sintético</dd>
        </div>
      </dl>

      <h2>Los seis casos</h2>
      <div className="pared">
        {vistas.map(({ caso, decision }) => (
          <a className={`tarjeta ${CLASE_ESTADO[decision.estado]}`} href={`#${caso.id}`} key={caso.id}>
            <span className="slug">{caso.id}</span>
            <h3>{caso.titulo}</h3>
            <div className="pie">
              <span className="chip">{ETIQUETA_ESTADO[decision.estado]}</span>
              <span>
                {decision.estado.startsWith('PRE_APROBADO')
                  ? formato(decision.pagaAseguradora)
                  : caso.hospital}
              </span>
            </div>
            <span className="pista">Ver el dictamen completo ↓</span>
          </a>
        ))}
      </div>

      {vistas.map((vista) => (
        <Caso key={vista.caso.id} vista={vista} />
      ))}

      <footer>
        <p>
          Seis dictámenes · {formato(totalAseguradora)} respondidos por la aseguradora en los casos
          aprobados · cero decisiones sin cláusula citada · motor determinista: el mismo caso da
          siempre el mismo dictamen.
        </p>
        <p>
          Pólizas, hospitales, pacientes y montos son <strong>sintéticos</strong>. El motor se audita
          con <code>npm run check</code>: falla si un caso da un dictamen distinto al esperado, si una
          decisión sale sin cláusula o si los montos no cuadran contra lo facturado.
        </p>
      </footer>
    </div>
  );
}
