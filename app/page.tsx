import Link from 'next/link';
import { Caso } from './components/Caso';
import { MARCA } from './marca';
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

  return (
    <div className="hoja">
      <header>
        <span className="ceja">
          {MARCA.evento} · {MARCA.equipo}
        </span>
        <h1>Pre-autorización quirúrgica en segundos</h1>
        <p className="tesis">
          El agente no autoriza: <strong>dictamina con la póliza en la mano</strong>. El modelo lee el
          informe del hospital y cita de dónde sacó cada dato; la cobertura la decide la póliza con
          reglas deterministas. Si un dato no tiene respaldo textual, el caso no se aprueba: cae a
          documentos faltantes.
        </p>
        <p>
          <Link className="chip" href="/leer" style={{ textDecoration: 'none' }}>
            Leer un informe propio →
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
                  ? `responde ${formato(decision.pagaAseguradora)}`
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
