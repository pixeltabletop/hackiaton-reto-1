import Link from 'next/link';
import { Escanear } from '../components/Escanear';
import { MARCA } from '../marca';
import { buscar, EJEMPLOS } from '../../src/domain/busqueda';
import { CASOS } from '../../src/data/casos';
import { planDe } from '../../src/data/planes';
import { dictaminar } from '../../src/domain/motor';
import { formato } from '../../src/domain/dinero';
import { resumenDe } from '../../src/domain/resumen';
import { CLASE_ESTADO, ETIQUETA_ESTADO } from '../../src/domain/presentacion';

/**
 * Modo ambulancia.
 *
 * Una pantalla, un campo, un botón. Existe aparte del armazón con barra lateral porque
 * aquí quien escribe va con una mano ocupada y el vehículo en movimiento: lo único que
 * importa es si esa persona está cubierta, cuánto paga y con qué cláusula se sostiene.
 *
 * Cada consulta se resuelve contra el corpus en el momento.
 */
export const dynamic = 'force-dynamic';

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; leido?: string; error?: string }>;
}) {
  const { q = '', leido, error } = await searchParams;
  const consulta = buscar(q);
  const encontrados = consulta.coincidencias;
  const hayConsulta = q.trim() !== '';

  return (
    <main className="ambulancia">
      <header className="ambulancia-barra">
        <span className="lateral-punto-marca" aria-hidden="true" />
        <b>{MARCA.nombre}</b>
        <Link className="ambulancia-salir" href="/">
          Modo completo
        </Link>
      </header>

      <h1>¿A quién llevamos?</h1>
      <p className="ambulancia-ayuda">
        Cédula o número de póliza. Si no tiene el número, escanee la cédula o la póliza.
      </p>

      <form className="ambulancia-form" action="/emergencia" method="get" role="search">
        <label className="etiqueta" htmlFor="q">
          Cédula o póliza
        </label>
        <input
          autoComplete="off"
          autoFocus
          className="casilla-grande"
          defaultValue={q}
          id="q"
          name="q"
          placeholder="000-000-0000 o IS-A-0000-0000"
          spellCheck={false}
        />
        <button className="boton-grande" type="submit">
          Buscar
        </button>
      </form>

      <Escanear destino="emergencia" />

      {leido && <p className="ambulancia-aviso">Número leído de la foto: {q}. Confírmelo antes de actuar.</p>}
      {error === 'no-leido' && (
        <p className="ambulancia-aviso ambulancia-aviso-malo">
          No se pudo leer ningún número en la foto. Escriba la cédula o el número de póliza.
        </p>
      )}
      {error === 'sin-foto' && (
        <p className="ambulancia-aviso ambulancia-aviso-malo">No llegó ninguna foto. Intente otra vez.</p>
      )}
      {error === 'archivo-grande' && (
        <p className="ambulancia-aviso ambulancia-aviso-malo">
          La foto pesa más de 4 MB. Tómela de nuevo o recórtela.
        </p>
      )}

      {hayConsulta && encontrados.length === 0 && (
        <section className="ambulancia-ficha no-cubierto">
          <span className="chip chip-grande">Sin resultados</span>
          <p className="ambulancia-resumen">
            {q} no corresponde a ningún asegurado de esta base. Revise los dígitos: el OCR puede
            confundir un 8 con un 3 o un 0 con una O.
          </p>
        </section>
      )}

      {encontrados.map((caso) => {
        const plan = planDe(caso.planId);
        const decision = dictaminar(caso, plan);
        const primerMotivo = decision.motivos[0];

        return (
          <section className={`ambulancia-ficha ${CLASE_ESTADO[decision.estado]}`} key={caso.id}>
            <span className="chip chip-grande">{ETIQUETA_ESTADO[decision.estado]}</span>
            <p className="ambulancia-resumen">{resumenDe(decision)}</p>

            <ul className="ambulancia-datos">
              <li>
                <span>Asegurado</span>
                <b>
                  {caso.pacienteRef} · {caso.edad} años · cédula {caso.cedula}
                </b>
              </li>
              <li>
                <span>Póliza</span>
                <b>
                  {caso.numeroPoliza} · {plan.aseguradora}
                </b>
              </li>
              <li>
                <span>Vigencia del plan</span>
                <b>
                  del {plan.vigenciaDesdeIso} al {plan.vigenciaHastaIso}
                </b>
              </li>
              <li>
                <span>{decision.enRed ? 'En red' : 'Fuera de la red'}</span>
                <b>
                  {decision.motivos.length} reglas aplicadas · {decision.tiempoMs} ms
                </b>
              </li>
            </ul>

            {primerMotivo && (
              <p className="ambulancia-clausula">
                <b>{primerMotivo.regla}</b> · cláusula {primerMotivo.clausula}: {primerMotivo.resultado}
              </p>
            )}

            {decision.faltantes.length > 0 && (
              <p className="ambulancia-falta">
                Falta para poder dictaminar: {decision.faltantes.map((f) => f.documento).join(', ')}.
              </p>
            )}

            {/* Sin aprobación no hay reparto: dos montos en cero se leerían como «el paciente no paga». */}
            {decision.estado.startsWith('PRE_APROBADO') ? (
              <p className="ambulancia-montos">
                <span>
                  Paga la aseguradora <b>{formato(decision.pagaAseguradora)}</b>
                </span>
                <span>
                  Paga el paciente <b>{formato(decision.pagaPaciente)}</b>
                </span>
              </p>
            ) : (
              <p className="ambulancia-montos">
                <span>
                  Sin reparto todavía: facturado <b>{formato(decision.montoFacturado)}</b>
                </span>
              </p>
            )}

            <Link className="ambulancia-detalle" href={`/?q=${encodeURIComponent(caso.cedula)}`}>
              Ver el dictamen completo →
            </Link>
          </section>
        );
      })}

      {!hayConsulta && (
        <details className="ambulancia-ejemplos">
          <summary>Probar con un asegurado de ejemplo</summary>
          <div className="chips">
            {EJEMPLOS.filter((e) => e.tipo === 'cedula').map((ejemplo) => (
              <Link
                className="chip-ejemplo"
                href={`/emergencia?q=${encodeURIComponent(ejemplo.valor)}`}
                key={ejemplo.valor}
              >
                <b>{ejemplo.valor}</b>
                <span>{ejemplo.etiqueta}</span>
              </Link>
            ))}
          </div>
          <p className="nota">
            Son {CASOS.length} asegurados ficticios. En la vida real, aquí no habría nada que tocar:
            el número sale del carné o de la foto.
          </p>
        </details>
      )}

      <footer className="ambulancia-pie">
        <p>
          Datos sintéticos de una demostración: <b>no ingrese datos reales de nadie</b>. En producción,
          esta pantalla pide credencial de la aseguradora.
        </p>
      </footer>
    </main>
  );
}
