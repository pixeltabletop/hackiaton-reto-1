/**
 * Los cuatro íconos de la interfaz, dibujados a mano en SVG.
 *
 * Sin librería: son cuatro trazos y una dependencia menos que auditar. Heredan el color
 * del texto (`currentColor`) y el tamaño se pasa desde afuera, así que un ícono dentro de
 * un botón oscuro se ve solo. Ninguno lleva texto alternativo: van siempre acompañados de
 * una etiqueta accesible en el elemento que los contiene.
 */

interface PropsIcono {
  tam?: number;
  className?: string;
}

const base = (tam: number) => ({
  width: tam,
  height: tam,
  viewBox: '0 0 24 24',
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false as const,
});

export function IconoLupa({ tam = 20, className }: PropsIcono) {
  return (
    <svg {...base(tam)} className={className}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function IconoClip({ tam = 20, className }: PropsIcono) {
  return (
    <svg {...base(tam)} className={className}>
      <path d="M21 11.5 12.5 20a5 5 0 0 1-7-7l8-8a3.5 3.5 0 0 1 5 5l-8 8a2 2 0 0 1-3-3l7.5-7.5" />
    </svg>
  );
}

export function IconoCamara({ tam = 20, className }: PropsIcono) {
  return (
    <svg {...base(tam)} className={className}>
      <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.2l1.2-2h8.2l1.2 2h2.2A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z" />
      <circle cx="12" cy="13" r="3.2" />
    </svg>
  );
}

export function IconoTelefono({ tam = 18, className }: PropsIcono) {
  return (
    <svg {...base(tam)} className={className}>
      <path d="M6.5 3h3l1.5 4-2 1.5a12 12 0 0 0 6.5 6.5L17 13l4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4 6.2 2 2 0 0 1 6 4z" />
    </svg>
  );
}
