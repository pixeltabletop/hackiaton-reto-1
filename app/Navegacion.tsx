'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Tres entradas, no cinco.
 *
 * Las dos que sobraban —«Bandeja de entrada», que en realidad era la integración con
 * Notion, y «Cómo decide, paso a paso»— mostraban el motor y la plomería como si fueran
 * producto. Ahora viven juntas en «Cómo funciona», declaradas como lo que son: la
 * explicación de la máquina, para quien la quiera auditar.
 */
const ENLACES = [
  { href: '/', texto: 'Atender' },
  { href: '/leer', texto: 'Leer un informe' },
  { href: '/expedientes', texto: 'Expedientes' },
  { href: '/como-funciona', texto: 'Cómo funciona' },
];

/** Marca dónde está uno parado. Es lo único que necesita JavaScript en toda la app. */
export function Navegacion() {
  const ruta = usePathname();

  return (
    <nav className="lateral-nav" aria-label="Navegación principal">
      {ENLACES.map(({ href, texto }) => {
        const activo = href === '/' ? ruta === '/' : ruta.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={activo ? 'activo' : undefined}
            aria-current={activo ? 'page' : undefined}
          >
            {texto}
          </Link>
        );
      })}
    </nav>
  );
}
