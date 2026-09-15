import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { Navegacion } from './Navegacion';
import { MARCA } from './marca';
import { CASOS } from '../src/data/casos';
import { planDe } from '../src/data/planes';
import { dictaminar } from '../src/domain/motor';
import { CLASE_ESTADO, ETIQUETA_ESTADO } from '../src/domain/presentacion';
import './globals.css';

/**
 * Las fuentes se descargan y se sirven desde este mismo sitio (no se piden a un
 * servidor de terceros cuando alguien abre la página). Inter para leer, JetBrains
 * Mono para los códigos, las cifras y los documentos.
 */
const texto = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--fuente-texto',
});

const codigo = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--fuente-codigo',
});

export const metadata: Metadata = {
  title: `${MARCA.nombre} · ${MARCA.lema}`,
  description:
    'Solicitudes de pre-autorización quirúrgica dictaminadas contra la póliza, con la cláusula que sostiene cada decisión.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  // El índice lateral se calcula con el mismo motor que dictamina: el estado que se
  // ve al costado es el dictamen real, no una etiqueta escrita a mano.
  const casos = CASOS.map((caso) => ({
    caso,
    decision: dictaminar(caso, planDe(caso.planId)),
  }));

  return (
    <html lang="es" className={`${texto.variable} ${codigo.variable}`}>
      <body>
        <div className="marco">
          <aside className="lateral">
            <Link className="lateral-marca" href="/">
              <span className="lateral-punto-marca" aria-hidden="true" />
              <span>{MARCA.nombre}</span>
            </Link>
            <p className="lateral-lema">{MARCA.lema}</p>

            <Navegacion />

            <div className="lateral-grupo">
              <span className="lateral-titulo">Casos</span>
              {casos.map(({ caso, decision }) => (
                <Link
                  className={`lateral-caso ${CLASE_ESTADO[decision.estado]}`}
                  href={`/#${caso.id}`}
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
          </aside>

          <main className="contenido">{children}</main>
        </div>
      </body>
    </html>
  );
}
