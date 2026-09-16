import Link from 'next/link';
import { Caso } from '../../components/Caso';
import { CREDITOS } from '../../marca';
import { CASOS } from '../../../src/data/casos';
import { planDe } from '../../../src/data/planes';
import { formato } from '../../../src/domain/dinero';
import { armarVista, CLASE_ESTADO, type VistaCaso } from '../../../src/domain/presentacion';
import { cuentaPorEstado, expedienteDe, FILTROS } from '../../../src/domain/expediente';
import { casosDeNotion } from '../../../src/notion/bandeja';

// La bandeja se filtra por estado desde la dirección, así que se arma al pedirla.
export const dynamic = 'force-dynamic';

const RESPONSABLE: Record<string, string> = {
  aseguradora: 'espera a la aseguradora',
  hospital: 'espera al hospital',
  paciente: 'espera al paciente',
  nadie: 'sin pendientes',
};

/**
 * Todos los expedientes en una sola bandeja.
 *
 * Antes eran dos pantallas: «Casos dictaminados» con los seis del corpus y «Bandeja de
 * entrada» que en realidad era la integración con Notion. Quien tramita no piensa en de
 * dónde viene una fila, piensa en qué le falta; el origen es un detalle de infraestructura
 * y aquí se muestra como una etiqueta discreta, no como una pestaña.
 *
 * Los de Notion se suman **si están**. Si el token falta o la integración falla, la página
 * sigue mostrando los locales: el enlace público no puede depender de un token.
 */
export default async function Page({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const { estado = 'todos' } = await searchParams;

  const locales: { vista: VistaCaso; origen: string | null }[] = CASOS.map((caso) => ({
    vista: armarVista(caso, planDe(caso.planId)),
    origen: null,
  }));

  const bandeja = await casosDeNotion();
  const deNotion = bandeja.casos.map(({ caso, plan }) => ({
    vista: armarVista(caso, plan),
    origen: 'Notion',
  }));

  const todos = [...locales, ...deNotion];
  const decisiones = todos.map((t) => t.vista.decision);
  const cuenta = cuentaPorEstado(decisiones);

  const filtro = FILTROS.some((f) => f.clave === estado) ? estado : 'todos';
  const visibles =
    filtro === 'todos' ? todos : todos.filter((t) => expedienteDe(t.vista.decision).clave === filtro);

  const abiertos = decisiones.filter((d) => expedienteDe(d).abierto).length;
  const aprobados = decisiones.filter((d) => d.estado.startsWith('PRE_APROBADO'));
  const totalAseguradora = aprobados.reduce((total, d) => total + d.pagaAseguradora, 0);
  const masLento = decisiones.length > 0 ? Math.max(...decisiones.map((d) => d.tiempoMs)) : 0;

  return (
    <div className="hoja">
      <header>
        <h1>Expedientes</h1>
        <p className="problema">Cada uno con su estado, su cláusula y qué falta para cerrarlo.</p>
      </header>

      <dl className="metricas">
        <div>
          <dt>Abiertos</dt>
          <dd>
            {abiertos} <span className="metrica-de">de {decisiones.length}</span>
          </dd>
        </div>
        <div>
          <dt>Responde la aseguradora</dt>
          <dd>{formato(totalAseguradora)}</dd>
        </div>
        <div>
          <dt>Sin cláusula citada</dt>
          <dd className="cero">0</dd>
        </div>
        <div>
          <dt>Dictamen más lento</dt>
          <dd>{masLento} ms</dd>
        </div>
      </dl>

      <nav className="filtros" aria-label="Filtrar por estado del expediente">
        {FILTROS.map(({ clave, etiqueta }) => {
          const n = cuenta[clave] ?? 0;
          if (clave !== 'todos' && n === 0) return null;
          return (
            <Link
              className={`filtro ${clave === filtro ? 'filtro-activo' : ''}`}
              href={clave === 'todos' ? '/expedientes' : `/expedientes?estado=${clave}`}
              key={clave}
            >
              {etiqueta} <span className="filtro-n">{n}</span>
            </Link>
          );
        })}
      </nav>

      <div className="pared">
        {visibles.map(({ vista, origen }) => {
          const { caso, decision } = vista;
          const expediente = expedienteDe(decision);
          return (
            <a className={`tarjeta ${CLASE_ESTADO[decision.estado]}`} href={`#${caso.id}`} key={caso.id}>
              <span className="slug">
                {caso.id} · {caso.hospital}
                {origen && <span className="origen">{origen}</span>}
              </span>
              <h3>{caso.titulo}</h3>
              <div className="pie">
                <span className="chip">{expediente.etiqueta}</span>
                <span className="detalle">
                  {decision.estado.startsWith('PRE_APROBADO') ? (
                    <>
                      <span>Paga la aseguradora</span>
                      <b>{formato(decision.pagaAseguradora)}</b>
                    </>
                  ) : (
                    <>
                      <span>{expediente.abierto ? RESPONSABLE[expediente.responsable] : 'cerrado'}</span>
                      <b>{formato(decision.montoFacturado)}</b>
                    </>
                  )}
                </span>
              </div>
              <span className="pista">{expediente.detalle}</span>
            </a>
          );
        })}
      </div>

      {visibles.length === 0 && <p className="nota">Ninguna solicitud en ese estado ahora mismo.</p>}

      {bandeja.motivo && (
        <p className="nota nota-mala">
          La base de casos no respondió, así que solo se ven los expedientes locales.{' '}
          <Link href="/como-funciona/notion">Revisar la integración</Link>.
        </p>
      )}

      {visibles.map(({ vista }) => (
        <Caso key={vista.caso.id} vista={vista} />
      ))}

      <footer>
        <p className="cierre">Aquí no se adivina: se cita la cláusula.</p>
        <p>
          Datos <strong>sintéticos</strong>. {CREDITOS.equipo} · {CREDITOS.evento}
        </p>
      </footer>
    </div>
  );
}
