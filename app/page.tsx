import Link from 'next/link';
import { Caso } from './components/Caso';
import { CREDITOS } from './marca';
import { CASOS } from '../src/data/casos';
import { planDe } from '../src/data/planes';
import { formato } from '../src/domain/dinero';
import { armarVista, CLASE_ESTADO, ETIQUETA_ESTADO } from '../src/domain/presentacion';

export const dynamic = 'force-static';

export default function Page() {
  const vistas = CASOS.map((caso) => armarVista(caso, planDe(caso.planId)));
  const aprobados = vistas.filter((v) => v.decision.estado.startsWith('PRE_APROBADO'));
  const totalAseguradora = aprobados.reduce((total, v) => total + v.decision.pagaAseguradora, 0);
  const sinClausula = vistas.filter((v) => v.decision.motivos.length === 0).length;
  const masLento = Math.max(...vistas.map((v) => v.decision.tiempoMs));
  const clausulasCitadas = new Set(
    vistas.flatMap((v) => v.decision.motivos.map((m) => m.clausula)),
  ).size;

  return (
    <div className="hoja">
      <header>
        <h1>La cirugía no espera. La carta aval tampoco.</h1>
        <p className="problema">
          Hoy el paciente espera horas o días por la autorización, y el hospital no agenda una cirugía
          electiva hasta que llegue la carta aval.
        </p>
        <p className="tesis">
          <strong>Prior IA no autoriza: dictamina.</strong> Lee el informe y la póliza, cita la
          cláusula y dice quién paga qué —deducible, coaseguro y tope anual— sin llamadas de por medio.
        </p>
        <p>
          <Link className="chip chip-enlace" href="/leer">
            Dictaminar una solicitud →
          </Link>
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
          <dt>Cláusulas citadas</dt>
          <dd>{clausulasCitadas}</dd>
        </div>
        <div>
          <dt>Dictamen más lento</dt>
          <dd>{masLento} ms</dd>
        </div>
      </dl>

      <h2>Solicitudes dictaminadas</h2>
      <div className="pared">
        {vistas.map(({ caso, decision }) => (
          <a className={`tarjeta ${CLASE_ESTADO[decision.estado]}`} href={`#${caso.id}`} key={caso.id}>
            <span className="slug">{caso.id}</span>
            <h3>{caso.titulo}</h3>
            <div className="pie">
              <span className="chip">{ETIQUETA_ESTADO[decision.estado]}</span>
              <span className="detalle">
                {decision.estado.startsWith('PRE_APROBADO') ? (
                  <>
                    <span>Paga la aseguradora</span>
                    <b>{formato(decision.pagaAseguradora)}</b>
                  </>
                ) : (
                  <>
                    <span>Hospital</span>
                    <b>{caso.hospital}</b>
                  </>
                )}
              </span>
            </div>
          </a>
        ))}
      </div>

      {vistas.map((vista) => (
        <Caso key={vista.caso.id} vista={vista} />
      ))}

      <footer>
        <p className="cierre">Aquí no se adivina: se cita la cláusula.</p>
        <p>
          Seis dictámenes · {formato(totalAseguradora)} respondidos por la aseguradora en los casos
          aprobados · ninguna decisión sin cláusula citada · el mismo caso da siempre el mismo
          dictamen.
        </p>
        <p>
          Los datos son <strong>sintéticos</strong>: pólizas, hospitales, pacientes y montos son
          inventados. La calidad se audita con <code>npm run check</code>: si un caso cambia de
          dictamen, si una decisión sale sin cláusula o si los montos no cuadran contra lo facturado,
          la verificación falla.
        </p>
        <p>
          {CREDITOS.equipo} · {CREDITOS.evento}
        </p>
      </footer>
    </div>
  );
}
