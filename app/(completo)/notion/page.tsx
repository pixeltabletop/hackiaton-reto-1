import Link from 'next/link';
import { formato } from '../../../src/domain/dinero';
import { dictaminar } from '../../../src/domain/motor';
import { CLASE_ESTADO, ETIQUETA_ESTADO } from '../../../src/domain/presentacion';
import type { Caso, Plan } from '../../../src/domain/tipos';
import { consultarFuente, hayToken, leerRelacion } from '../../../src/notion/cliente';
import { casoDesdeFila, planDesdeFila } from '../../../src/notion/mapeo';
import { casoDeLaFila } from '../../../src/notion/lectura-del-caso';

export const dynamic = 'force-dynamic';

const PASOS = [
  'notion.so/my-integrations → New connection (interna, con permiso de leer e insertar).',
  'Abre la página padre en Notion → menú "···" → Conexiones → añade la conexión.',
  'Guarda el token en .secrets/notion-token.txt y corre: npm run notion:preparar -- --pagina <id>.',
  'Copia las tres variables que imprime el script en .env.local (y en Vercel).',
];

function Aviso({ titulo, detalle }: { titulo: string; detalle: string }) {
  return (
    <div className="hoja">
      <h1>La integración con Notion</h1>
      <div className="bloque" style={{ marginTop: 22 }}>
        <h4>{titulo}</h4>
        <p style={{ marginTop: 0 }}>{detalle}</p>
        <ol className="motivos">
          {PASOS.map((paso, i) => (
            <li key={paso}>
              <span className="regla">paso {i + 1}</span>
              <p>{paso}</p>
            </li>
          ))}
        </ol>
        <p className="nota">
          La web de los seis casos sigue funcionando sin Notion, a propósito: el enlace público nunca
          depende de un token.
        </p>
      </div>
    </div>
  );
}

/** Lo que la ruta de dictaminar deja en la dirección al volver: se pinta arriba del todo. */
function Resultado({ ok, error, clausulas, lectura }: Record<string, string | undefined>) {
  if (!ok && !error) return null;
  return (
    <div className={`nota ${ok ? 'nota-buena' : 'nota-mala'}`} role="status">
      {ok ? (
        <>
          <b>Dictaminado en Notion:</b> {ok}. Cláusulas citadas: {clausulas || 'ninguna'}.
          {lectura ? <> Lectura del informe: {lectura}</> : null}
        </>
      ) : (
        <>
          <b>No se pudo dictaminar:</b> {error}
        </>
      )}
    </div>
  );
}

export default async function PaginaNotion({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const resultado = await searchParams;
  const fuenteCasos = process.env.NOTION_FUENTE_CASOS;
  const fuentePolizas = process.env.NOTION_FUENTE_POLIZAS;
  const fuenteDecisiones = process.env.NOTION_FUENTE_DECISIONES;

  if (!hayToken() || !fuenteCasos || !fuentePolizas) {
    return (
      <Aviso
        titulo="Notion todavía no está conectado"
        detalle="Falta el token o los identificadores de las bases. Son tres minutos:"
      />
    );
  }

  try {
    const planPorPagina = new Map<string, Plan>();
    for (const fila of (await consultarFuente(fuentePolizas)).results) {
      planPorPagina.set(fila.id, planDesdeFila(fila));
    }

    // La lista lee el INFORME de cada fila con las reglas (sin modelo, sin costo): así el
    // dictamen que se ve aquí es el mismo que sale del informe, y no el de unas columnas
    // que pueden haber perdido matices al viajar. El modelo entra al pulsar el botón.
    const filas = (
      await consultarFuente(fuenteCasos, { property: 'Estado', select: { equals: 'Pendiente' } })
    ).results;

    const pendientes: { paginaId: string; caso: Caso; plan: Plan | undefined }[] = await Promise.all(
      filas.map(async (fila: any) => {
        const plan = planPorPagina.get(leerRelacion(fila.properties['Póliza'])[0] ?? '');
        return {
          paginaId: fila.id,
          caso: plan ? (await casoDeLaFila(fila, plan, null)).caso : casoDesdeFila(fila),
          plan,
        };
      }),
    );

    const conPlan = pendientes.filter((p) => p.plan);
    const escritas = fuenteDecisiones
      ? (await consultarFuente(fuenteDecisiones)).results.slice(0, 6)
      : [];

    return (
      <div className="hoja">
        <h1>Casos pendientes leídos de Notion</h1>
        <Resultado {...resultado} />
        <p className="tesis">
          Estas filas viven en la base <strong>Casos</strong> de Notion. Al dictaminar, el modelo lee
          el <strong>informe escrito en la fila</strong> y cita cada dato; el motor aplica la póliza
          relacionada, escribe la decisión en la base <strong>Decisiones</strong> y deja el caso como
          dictaminado. La lista de abajo ya lee el informe de cada fila, pero con las reglas: el
          modelo entra al pulsar el botón, para no llamarlo cada vez que alguien abre esta pantalla.
        </p>

        {pendientes.length === 0 && (
          <div className="bloque">
            <h4>Sin casos pendientes</h4>
            <p style={{ marginBottom: 0 }}>
              Agrega una fila en la base Casos (o vuelve a poner una en estado «Pendiente») y aparecerá
              aquí.
            </p>
          </div>
        )}

        <div className="pared">
          {conPlan.map(({ paginaId, caso, plan }) => {
            const decision = dictaminar(caso, plan as Plan);
            const clausulas = [...new Set(decision.motivos.map((m) => m.clausula))];
            return (
              <div className={`tarjeta ${CLASE_ESTADO[decision.estado]}`} key={paginaId}>
                <span className="slug">
                  {caso.id} · {(plan as Plan).id} · {caso.hospital}
                </span>
                <h3>{caso.titulo || `CUPS ${caso.procedimientoCups}`}</h3>
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
                        <span>Documentos pendientes</span>
                        <b>{decision.faltantes.length}</b>
                      </>
                    )}
                  </span>
                </div>
                <p className="nota" style={{ marginTop: 12 }}>
                  {decision.motivos.length} reglas · cláusulas {clausulas.join(', ') || '—'} ·{' '}
                  {decision.tiempoMs} ms
                </p>
                <form action="/api/dictaminar" method="post" style={{ marginTop: 12 }}>
                  <input type="hidden" name="caso" value={paginaId} />
                  <button className="boton" type="submit">
                    Dictaminar y escribir en Notion
                  </button>
                </form>
              </div>
            );
          })}
        </div>

        {escritas.length > 0 && (
          <>
            <h2>Escrito en la base Decisiones</h2>
            <div className="bloque">
              <ul className="clausulas">
                {escritas.map((fila: any) => (
                  <li key={fila.id}>
                    <span className="id">
                      {String(fila.properties['Estado']?.select?.name ?? '')} ·{' '}
                      {String(fila.properties['Dictaminado el']?.date?.start ?? '')}
                    </span>
                    {String(fila.properties['Decisión']?.title?.[0]?.plain_text ?? '')} — cláusulas:{' '}
                    {String(
                      fila.properties['Cláusulas citadas']?.multi_select
                        ?.map((o: any) => o.name)
                        .join(', ') ?? '',
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        <footer>
          <p>
            <Link href="/" style={{ color: 'var(--acento)' }}>
              Ver los seis casos dictaminados
            </Link>
          </p>
        </footer>
      </div>
    );
  } catch (error) {
    return (
      <Aviso
        titulo="Notion respondió con un error"
        detalle={error instanceof Error ? error.message : String(error)}
      />
    );
  }
}
