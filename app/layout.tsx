import type { Metadata } from 'next';
import { Atkinson_Hyperlegible_Mono, Atkinson_Hyperlegible_Next, Source_Serif_4 } from 'next/font/google';
import type { ReactNode } from 'react';
import './globals.css';

// Tres voces: el agente (sans), la póliza (serif) y el informe (mono). next/font las
// incrusta en la compilación: la página no pide nada a Google al abrirse.
const sans = Atkinson_Hyperlegible_Next({ subsets: ['latin', 'latin-ext'], variable: '--fuente-sans', display: 'swap' });
const serif = Source_Serif_4({ subsets: ['latin', 'latin-ext'], variable: '--fuente-serif', display: 'swap' });
const mono = Atkinson_Hyperlegible_Mono({ subsets: ['latin', 'latin-ext'], variable: '--fuente-mono', display: 'swap' });

export const metadata: Metadata = {
  title: 'Pre-autorización quirúrgica · Equipo Jajanken',
  description:
    'Agente que dictamina la pre-autorización de una cirugía con la cláusula de la póliza que lo sostiene. Reto 1 del hackIAthon Panamá 2026.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${sans.variable} ${serif.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
