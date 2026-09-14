import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pre-autorización quirúrgica · Equipo Jajanken',
  description:
    'Agente que dictamina la pre-autorización de una cirugía con la cláusula de la póliza que lo sostiene. Reto 1 del hackIAthon Panamá 2026.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
