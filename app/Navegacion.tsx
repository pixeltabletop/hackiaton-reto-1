'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ENLACES = [
  { href: '/', texto: 'Buscar asegurado' },
  { href: '/leer', texto: 'Subir un informe' },
  { href: '/casos', texto: 'Casos dictaminados' },
  { href: '/notion', texto: 'Bandeja de entrada' },
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
