import type { Metadata } from 'next';
import type { ReactNode } from 'react';
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
  title: `${MARCA.nombre} · ${MARCA.lema}`,
  description:
    'Solicitudes de pre-autorización quirúrgica dictaminadas contra la póliza, con la cláusula que sostiene cada decisión.',
};

/**
 * El armazón mínimo: tipografía, colores y nada más. La barra lateral vive en el
 * grupo (completo), para que el modo ambulancia pueda existir sin ella.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${texto.variable} ${codigo.variable}`}>
      <body>{children}</body>
    </html>
  );
}
