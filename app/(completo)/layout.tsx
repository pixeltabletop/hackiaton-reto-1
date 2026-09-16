import type { ReactNode } from 'react';
import Link from 'next/link';
import { Navegacion } from '../Navegacion';
import { SimboloMarca } from '../SimboloMarca';
import { MARCA } from '../marca';
import { CASOS } from '../../src/data/casos';
import { planDe } from '../../src/data/planes';
import { dictaminar } from '../../src/domain/motor';
import { hayProveedor } from '../../src/domain/lectura-modelo';
import { CLASE_ESTADO, ETIQUETA_ESTADO } from '../../src/domain/presentacion';
import { hayToken } from '../../src/notion/cliente';

/**
 * El armazón de trabajo: barra lateral fija con la marca, la navegación, el índice de
 * casos y los tres pasos de cómo dictamina.
 *
 * Este armazón es el de la demo y el de la web. El modo ambulancia vive afuera de este
 * grupo porque en una ambulancia sobra todo esto.
 */
export default function LayoutCompleto({ children }: { children: ReactNode }) {
  // El índice lateral se calcula con el mismo motor que dictamina: el estado que se
  // ve al costado es el dictamen real, no una etiqueta escrita a mano.
  const casos = CASOS.map((caso) => ({
    caso,
    decision: dictaminar(caso, planDe(caso.planId)),
  }));
  const modeloActivo = hayProveedor();
  const notionConectado =
    hayToken() &&
    Boolean(
      process.env.NOTION_FUENTE_CASOS &&
        process.env.NOTION_FUENTE_POLIZAS &&
        process.env.NOTION_FUENTE_DECISIONES,
    );

  return (
    <div className="marco">
      <aside className="lateral">
        <div className="lateral-marca-fila">
          <Link className="lateral-marca" href="/">
            <SimboloMarca className="marca-simbolo" />
            <span>{MARCA.nombre}</span>
          </Link>
          <span
            className="distintivo-beta"
            title="Beta: datos sintéticos y funciones en construcción."
          >
            Beta
          </span>
        </div>
        <p className="lateral-lema">{MARCA.lema}</p>
        <p className="lateral-entorno" title="Beta: datos sintéticos y funciones en construcción.">
          <span>{modeloActivo ? 'Modelo activo' : 'Modelo sin clave'}</span>
          <span>{notionConectado ? 'Notion conectado' : 'Notion no conectado'}</span>
        </p>

        <Navegacion />

        <Link className="lateral-ambulancia" href="/emergencia">
          Modo ambulancia →
        </Link>

        <div className="lateral-grupo">
          <span className="lateral-titulo">Casos</span>
          {casos.map(({ caso, decision }) => (
            <Link
              className={`lateral-caso ${CLASE_ESTADO[decision.estado]}`}
              href={`/casos/#${caso.id}`}
              key={caso.id}
              title={ETIQUETA_ESTADO[decision.estado]}
            >
              <span className="lateral-punto" aria-hidden="true" />
              <span className="lateral-caso-id">{caso.id}</span>
            </Link>
          ))}
        </div>

        <div className="lateral-tarjeta">
          <strong>Cómo dictamina</strong>
          <ol className="lateral-pasos">
            <li>Lee el informe del hospital y copia la cita de cada dato.</li>
            <li>Aplica la póliza cláusula por cláusula.</li>
            <li>Dice si cubre, o qué papel falta.</li>
          </ol>
        </div>

        <p className="lateral-datos">Datos sintéticos; no ingrese datos reales.</p>
      </aside>

      <main className="contenido">{children}</main>
    </div>
  );
}
