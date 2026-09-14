import Link from 'next/link';
import { Caso } from '../components/Caso';
import { CASOS } from '../../src/data/casos';
import { PLANES, planDe } from '../../src/data/planes';
import { formato } from '../../src/domain/dinero';
import { leerInforme, resumenLectura } from '../../src/domain/lectura';
import { armarVista } from '../../src/domain/presentacion';

export const dynamic = 'force-dynamic';

const EJEMPLO = `CLÍNICA COSTA DEL ESTE — SERVICIO DE ORTOPEDIA
Informe médico para solicitud de preautorización
Paciente: AF-9921 · 38 años · sexo masculino
Fecha: 2026-09-14 · Fecha de afiliación al plan: 2025-02-10
Diagnóstico: M23.20 — lesión de menisco interno
Procedimiento solicitado: CUPS 793501 — artroscopia de rodilla
Carácter: electiva
Cirujano tratante: Dr. Ignacio Sáez
Monto estimado del procedimiento: $ 3,100.00
Estudios adjuntos: resonancia magnética del 2026-09-09
Documentos adjuntos: informe del cirujano, estudio de imagen
Antecedentes: dolor con bloqueos de rodilla. Sin antecedentes crónicos declarados.
Hallazgos: rotura meniscal interna, sin derrame.`;

export default async function PaginaLeer({
  searchParams,
}: {
  searchParams: Promise<{ informe?: string; plan?: string }>;
}) {
  const parametros = await searchParams;
  const informe = (parametros.informe ?? '').trim();
  const planId = parametros.plan ?? 'PLAN-A';
  const plan = planDe(planId);

  const lectura = informe
    ? leerInforme(
        informe,
        planId,
        plan.red.map((h) => h.hospital),
      )
    : null;

  return (
    <div className="hoja">
      <span className="ceja">Reto 1 · lectura del informe · Equipo Jajanken</span>
      <h1>Pegue un informe y el agente lo dictamina</h1>
      <p className="tesis">
        El agente lee el informe, saca cada dato <strong>con la cita textual de donde salió</strong> y
        después la póliza decide con reglas. Si un dato no está en el documento, el caso no se aprueba:
        cae a documentos faltantes. Puede probar con un informe inventado.
      </p>

      <form className="bloque" method="get" action="/leer" style={{ marginTop: 22 }}>
        <h4>Informe del hospital</h4>
        <textarea
          className="entrada"
          name="informe"
          rows={16}
          defaultValue={informe || EJEMPLO}
          spellCheck={false}
        />
        <div className="fila-formulario">
          <label className="etiqueta" htmlFor="plan">
            Póliza del paciente
          </label>
          <select className="select" name="plan" id="plan" defaultValue={planId}>
            {PLANES.map((p) => (
              <option key={p.id} value={p.id}>
                {p.id} · {p.plan} · deducible {formato(p.deducibleAnual)} · coaseguro{' '}
                {p.coaseguroPct}% en red
              </option>
            ))}
          </select>
          <button className="boton" type="submit">
            Leer y dictaminar
          </button>
        </div>
      </form>

      {lectura && (
        <>
          <div className="bloque" style={{ marginTop: 18 }}>
            <h4>Qué leyó el agente</h4>
            <p style={{ marginTop: 0 }}>{resumenLectura(lectura)}</p>
            {lectura.avisos.length > 0 ? (
              <ul className="faltantes-lista">
                {lectura.avisos.map((aviso) => (
                  <li key={aviso}>{aviso}</li>
                ))}
              </ul>
            ) : (
              <p className="nota" style={{ marginBottom: 0 }}>
                Todos los datos del informe se encontraron con su cita textual.
              </p>
            )}
          </div>

          <Caso
            vista={armarVista(lectura.caso, plan)}
            titulo={`Informe leído · CUPS ${lectura.caso.procedimientoCups || '—'}`}
          />
        </>
      )}

      <h2>O empiece por un informe de ejemplo</h2>
      <div className="pared">
        {CASOS.map((caso) => (
          <form method="get" action="/leer" key={caso.id}>
            <input type="hidden" name="plan" value={caso.planId} />
            <input type="hidden" name="informe" value={caso.informeTexto} />
            <button className="tarjeta boton-tarjeta" type="submit">
              <span className="slug">{caso.id}</span>
              <h3>{caso.titulo}</h3>
              <span className="pista">Leer y dictaminar este informe →</span>
            </button>
          </form>
        ))}
      </div>

      <footer>
        <p>
          <Link href="/" style={{ color: 'var(--acento)' }}>
            Volver a los seis casos dictaminados
          </Link>
        </p>
      </footer>
    </div>
  );
}
