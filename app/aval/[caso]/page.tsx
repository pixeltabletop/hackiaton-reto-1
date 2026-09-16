import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CASOS } from '../../../src/data/casos';
import { planDe } from '../../../src/data/planes';
import { dictaminar } from '../../../src/domain/motor';
import { solicitudDe } from '../../../src/domain/solicitud-aval';
import { MARCA } from '../../marca';
import { SimboloMarca } from '../../SimboloMarca';

/**
 * El borrador de solicitud de aval, en una hoja que se imprime.
 *
 * Vive fuera del armazón con barra lateral porque lo que se imprime es el documento, no la
 * aplicación. El CSS de impresión está en `globals.css` bajo `@media print`.
 *
 * Lo que este papel adelanta es el trabajo que hoy se hace por teléfono: quien lo recibe ya
 * tiene el caso armado, con los datos citados, las cláusulas aplicadas y la lista de lo que
 * falta. Lo que **no** hace es autorizar, y lo dice en su propio pie.
 */
export const dynamic = 'force-dynamic';

export default async function PaginaAval({ params }: { params: Promise<{ caso: string }> }) {
  const { caso: id } = await params;
  const caso = CASOS.find((c) => c.id === decodeURIComponent(id));
  if (!caso) notFound();

  const plan = planDe(caso.planId);
  const decision = dictaminar(caso, plan);
  const hoy = new Date().toISOString().slice(0, 10);
  const solicitud = solicitudDe(caso, plan, decision, hoy);

  return (
    <main className="hoja-aval">
      <nav className="aval-acciones">
        <Link href={`/?q=${encodeURIComponent(caso.cedula)}`}>← Volver al caso</Link>
        <span className="nota">Para guardarlo en PDF: imprimir y elegir «Guardar como PDF».</span>
      </nav>

      <article className="documento-aval">
        <header className="aval-cabeza">
          <div className="aval-marca">
            <SimboloMarca className="marca-simbolo" />
            <div>
              <b>{MARCA.nombre}</b>
              <span>Borrador generado automáticamente</span>
            </div>
          </div>
          <dl className="aval-folio">
            <div>
              <dt>Folio</dt>
              <dd>{solicitud.folio}</dd>
            </div>
            <div>
              <dt>Fecha</dt>
              <dd>{solicitud.fecha}</dd>
            </div>
          </dl>
        </header>

        <h1>Solicitud de aval</h1>

        <dl className="aval-sobre">
          <div>
            <dt>Para</dt>
            <dd>
              {solicitud.para}
              {solicitud.correoDestino && <span> · {solicitud.correoDestino}</span>}
            </dd>
          </div>
          <div>
            <dt>De</dt>
            <dd>{solicitud.de}</dd>
          </div>
          <div>
            <dt>Asunto</dt>
            <dd>{solicitud.asunto}</dd>
          </div>
        </dl>

        {solicitud.bloques.map((bloque) => (
          <section className="aval-bloque" key={bloque.titulo}>
            <h2>{bloque.titulo}</h2>
            <table>
              <tbody>
                {bloque.filas.map((fila, i) => (
                  <tr key={`${fila.etiqueta}-${i}`}>
                    <th scope="row">{fila.etiqueta}</th>
                    <td>
                      {fila.valor}
                      {fila.clausula && <span className="referencia">cláusula {fila.clausula}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}

        {solicitud.faltantes.length > 0 && (
          <section className="aval-bloque">
            <h2>Documentación pendiente</h2>
            <ul>
              {solicitud.faltantes.map((falta) => (
                <li key={falta.documento}>
                  {falta.documento} <span className="referencia">cláusula {falta.clausula}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="aval-bloque">
          <h2>Cláusulas citadas</h2>
          <p>{solicitud.clausulasCitadas.join(' · ')}</p>
        </section>

        <section className="aval-firma">
          <div>
            <span className="aval-linea-firma" />
            <span>Médico auditor de la aseguradora</span>
          </div>
          <div>
            <span className="aval-linea-firma" />
            <span>Fecha de la autorización</span>
          </div>
        </section>

        <p className="aval-advertencia">{solicitud.advertencia}</p>
        <p className="aval-pie">
          Datos sintéticos de demostración: el asegurado, la póliza, el hospital y los montos son
          ficticios.
        </p>
      </article>
    </main>
  );
}
