import Link from 'next/link';
import { Caso } from '../../components/Caso';
import { CREDITOS, MARCA } from '../../marca';
import { CASOS } from '../../../src/data/casos';
import { planDe } from '../../../src/data/planes';
import { formato } from '../../../src/domain/dinero';
import { armarVista, CLASE_ESTADO } from '../../../src/domain/presentacion';
import { cuentaPorEstado, expedienteDe, FILTROS } from '../../../src/domain/expediente';

// La bandeja se filtra por estado desde la dirección, así que se arma al pedirla.
export const dynamic = 'force-dynamic';

const RESPONSABLE: Record<string, string> = {
  aseguradora: 'espera a la aseguradora',
  hospital: 'espera al hospital',
  paciente: 'espera al paciente',
  nadie: 'sin pendientes',
};

export default async function Page({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const { estado = 'todos' } = await searchParams;
  const vistas = CASOS.map((caso) => armarVista(caso, planDe(caso.planId)));
  const decisiones = vistas.map((v) => v.decision);
  const cuenta = cuentaPorEstado(decisiones);

  const filtro = FILTROS.some((f) => f.clave === estado) ? estado : 'todos';
  const visibles =
    filtro === 'todos' ? vistas : vistas.filter((v) => expedienteDe(v.decision).clave === filtro);

  const abiertos = decisiones.filter((d) => expedienteDe(d).abierto).length;
  const aprobados = vistas.filter((v) => v.decision.estado.startsWith('PRE_APROBADO'));
  const totalAseguradora = aprobados.reduce((total, v) => total + v.decision.pagaAseguradora, 0);
  const masLento = Math.max(...decisiones.map((d) => d.tiempoMs));

  return (
    <div className="hoja">
      <header>
        <h1>Bandeja de solicitudes</h1>
        <p className="problema">
          <strong>{MARCA.nombre} no autoriza: dictamina.</strong> Cada solicitud trae su estado, la
          cláusula que la sostiene y qué hace falta para cerrarla.
        </p>
      </header>

      <dl className="metricas">
        <div>
          <dt>Expedientes abiertos</dt>
          <dd>
            {abiertos} <span className="metrica-de">de {decisiones.length}</span>
          </dd>
        </div>
        <div>
          <dt>Responde la aseguradora</dt>
          <dd>{formato(totalAseguradora)}</dd>
        </div>
        <div>
          <dt>Decisiones sin cláusula citada</dt>
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
              href={clave === 'todos' ? '/casos' : `/casos?estado=${clave}`}
              key={clave}
            >
              {etiqueta} <span className="filtro-n">{n}</span>
            </Link>
          );
        })}
      </nav>

      <div className="pared">
        {visibles.map(({ caso, decision }) => {
          const expediente = expedienteDe(decision);
          return (
            <a className={`tarjeta ${CLASE_ESTADO[decision.estado]}`} href={`#${caso.id}`} key={caso.id}>
              <span className="slug">
                {caso.id} · {caso.hospital}
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

      {visibles.length === 0 && (
        <p className="nota">Ninguna solicitud en ese estado ahora mismo.</p>
      )}

      {visibles.map((vista) => (
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
