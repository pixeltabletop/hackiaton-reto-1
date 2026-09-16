import Link from 'next/link';
import { formato } from '../../src/domain/dinero';
import { desgloseDe } from '../../src/domain/copago';
import { opcionesDeAtencion } from '../../src/domain/destino';
import { aQuienLlamar } from '../../src/domain/contacto';
import { alternativasDe } from '../../src/domain/alternativas';
import type { Caso, Decision, Plan } from '../../src/domain/tipos';
import { IconoTelefono } from './Iconos';

/**
 * Los cuatro bloques que contestan lo que viene **después** del dictamen: cuánto paga, a
 * dónde puede ir, a quién llama y qué papel lleva.
 *
 * Todos son componentes de servidor y todos leen de dominio puro. La regla que los gobierna
 * es una sola: lo que sale de la póliza lleva su número de cláusula y lo que sale del
 * directorio lleva la etiqueta «Directorio». Nunca se disfraza uno de otro.
 */

/** La pastilla que dice de dónde salió un dato. Es la pieza que sostiene la honestidad. */
function Origen({ clausula }: { clausula: string | null }) {
  return clausula ? (
    <span className="referencia">cláusula {clausula}</span>
  ) : (
    <span className="referencia referencia-directorio">directorio</span>
  );
}

/* ---------- 2. ¿Cuánto paga? ---------- */

export function Dinero({ decision, plan }: { decision: Decision; plan: Plan }) {
  const desglose = desgloseDe(decision, plan);

  if (!desglose.aplica) {
    return (
      <section className="bloque dinero">
        <h4>¿Cuánto paga?</h4>
        <p className="sin-reparto">{desglose.porQueNoAplica}</p>
        <p className="dinero-costo">
          Costo del procedimiento <b>{formato(desglose.costo)}</b>
        </p>
      </section>
    );
  }

  return (
    <section className="bloque dinero">
      <h4>¿Cuánto paga?</h4>
      <p className="cifra-grande">
        {formato(desglose.pagaPaciente)} <span>el paciente</span>
      </p>
      <table>
        <tbody>
          <tr>
            <td>Costo del procedimiento</td>
            <td>{formato(desglose.costo)}</td>
          </tr>
          {desglose.lineas.map((linea) => (
            <tr key={linea.concepto}>
              <td>
                {linea.concepto} <Origen clausula={linea.clausula} />
                {linea.nota && <span className="linea-nota">{linea.nota}</span>}
              </td>
              <td>{formato(linea.monto)}</td>
            </tr>
          ))}
          <tr className="total">
            <td>Responde la aseguradora</td>
            <td>{formato(desglose.pagaAseguradora)}</td>
          </tr>
          <tr className="paciente">
            <td>Paga el paciente</td>
            <td>{formato(desglose.pagaPaciente)}</td>
          </tr>
        </tbody>
      </table>
      <p className="nota">
        Tope anual del plan: {formato(desglose.topeAnual)} <Origen clausula="7.3" />
      </p>
    </section>
  );
}

/* ---------- 3. ¿A dónde puede ir? ---------- */

export function Destinos({ caso, plan, decision }: { caso: Caso; plan: Plan; decision: Decision }) {
  const { opciones, especialidad, sinRed, aplicaElDinero } = opcionesDeAtencion(caso, plan, decision);

  if (sinRed) {
    return (
      <section className="bloque">
        <h4>¿A dónde puede ir?</h4>
        <p className="nota">Este plan no declara red de proveedores.</p>
      </section>
    );
  }

  return (
    <section className="bloque destinos">
      <h4>¿A dónde puede ir?</h4>
      {especialidad && (
        <p className="nota nota-ceñida">
          Necesita {especialidad.toLowerCase()} <Origen clausula={null} />
        </p>
      )}
      <ul className="destinos-lista">
        {opciones.map((opcion) => (
          <li className={opcion.esElActual ? 'destino destino-actual' : 'destino'} key={opcion.hospital}>
            <div className="destino-cabeza">
              <b>{opcion.hospital}</b>
              {opcion.esElActual && <span className="chip chip-chico">está aquí</span>}
              <span className={`chip chip-chico ${opcion.enRed ? 'chip-red' : 'chip-fuera'}`}>
                {opcion.enRed ? 'en red' : 'fuera de red'}
              </span>
            </div>
            <span className="destino-datos">
              {opcion.zona ?? opcion.ciudad}
              {opcion.urgencias24h !== null && ` · ${opcion.urgencias24h ? 'urgencias 24 h' : 'sin urgencias 24 h'}`}
              {opcion.atiendeLaEspecialidad === false && especialidad && ` · no atiende ${especialidad.toLowerCase()}`}
            </span>
            {aplicaElDinero && (
              <span className="destino-cifra">
                paga <b>{formato(opcion.pagaPaciente)}</b>
                {opcion.diferenciaVsActual !== 0 && (
                  <em className={opcion.diferenciaVsActual < 0 ? 'ahorra' : 'cuesta'}>
                    {opcion.diferenciaVsActual < 0 ? '−' : '+'}
                    {formato(Math.abs(opcion.diferenciaVsActual)).replace('$ ', '$')}
                  </em>
                )}
              </span>
            )}
            {opcion.telefono && (
              <a className="destino-tel" href={`tel:${opcion.telefono.replace(/[^+\d]/g, '')}`}>
                <IconoTelefono /> {opcion.telefono}
              </a>
            )}
          </li>
        ))}
      </ul>
      <p className="nota">
        {aplicaElDinero
          ? 'Dentro de la red el plan cobra igual en todos: lo que cambia entre estos hospitales es la especialidad, la urgencia y la distancia.'
          : 'Sin cobertura resuelta no se muestra cuánto pagaría en cada uno: sería una cifra que la póliza todavía no respalda.'}{' '}
        <Origen clausula="4.1" />
      </p>
    </section>
  );
}

/* ---------- 4. ¿A quién llamar? ---------- */

export function Contactos({ caso, plan, decision }: { caso: Caso; plan: Plan; decision: Decision }) {
  const contactos = aQuienLlamar(caso, plan, decision);

  return (
    <section className="bloque contactos">
      <h4>¿A quién llamar?</h4>
      <ul className="contactos-lista">
        {contactos.map((contacto) => (
          <li key={contacto.quien + contacto.telefono}>
            <a className="contacto-boton" href={`tel:${contacto.marcable}`}>
              <IconoTelefono />
              <span>
                <b>{contacto.quien}</b>
                <em>{contacto.telefono}</em>
              </span>
            </a>
            <p>{contacto.porQue}</p>
          </li>
        ))}
      </ul>
      <p className="nota">
        Teléfonos del directorio de la aseguradora, no de la póliza. Datos sintéticos: no marcan a
        ningún número real.
      </p>
    </section>
  );
}

/* ---------- 5. ¿Qué papel llevar? ---------- */

export function Papel({
  caso,
  plan,
  decision,
  enlaceAval = true,
}: {
  caso: Caso;
  plan: Plan;
  decision: Decision;
  enlaceAval?: boolean;
}) {
  const alternativas = alternativasDe(caso, plan, decision);

  return (
    <section className="bloque papel">
      <h4>¿Qué papel llevar?</h4>

      {decision.faltantes.length > 0 ? (
        <>
          <p className="papel-falta">Falta esto para que la aseguradora pueda resolver:</p>
          <ul className="faltantes-lista">
            {decision.faltantes.map((faltante) => (
              <li key={faltante.documento}>
                {faltante.documento} <Origen clausula={faltante.clausula} />
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="papel-falta">No falta ningún documento de los que exige la póliza.</p>
      )}

      {alternativas.length > 0 && (
        <ul className="alternativas-lista">
          {alternativas.map((alternativa) => (
            <li key={alternativa.titulo}>
              <b>{alternativa.titulo}</b>
              <p>{alternativa.detalle}</p>
              {alternativa.cifra && <span className="alternativa-cifra">{alternativa.cifra}</span>}
              {alternativa.clausula && <Origen clausula={alternativa.clausula} />}
            </li>
          ))}
        </ul>
      )}

      {enlaceAval && (
        <Link className="boton boton-papel" href={`/aval/${caso.id}`}>
          Borrador de solicitud de aval
        </Link>
      )}
      {enlaceAval && (
        <p className="nota">
          Es una solicitud, no una autorización: el aval lo firma el médico auditor.
        </p>
      )}
    </section>
  );
}
