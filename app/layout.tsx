import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { MARCA } from './marca';
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
  title: `${MARCA.nombre} · ${MARCA.equipo}`,
  description: MARCA.lema,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${texto.variable} ${codigo.variable}`}>
      <body>
        <nav className="barra">
          <Link className="barra-marca" href="/">
            <span className="barra-punto" aria-hidden="true" />
            <span>{MARCA.nombre}</span>
          </Link>
          <div className="barra-enlaces">
            <Link href="/">Los seis casos</Link>
            <Link href="/leer">Leer un informe</Link>
            <Link href="/notion">Notion</Link>
          </div>
        </nav>
        {children}
      </body>
    </html>
  );
}
