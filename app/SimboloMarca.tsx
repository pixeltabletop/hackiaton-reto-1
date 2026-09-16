/**
 * Símbolo de PRIOR AI: concepto F «P-Documento» (decisión M-02, 2026-09-15).
 *
 * Una P robusta construida como documento. Se lee primero la P; después aparecen
 * los dos detalles que explican el producto: la esquina superior derecha doblada
 * (el informe) y un único renglón grueso en negativo (la cláusula citada).
 *
 * Contrato de la marca, respetado aquí a propósito:
 *   - dibujo reconstruido a mano, no una lámina calcada;
 *   - una sola tinta, `currentColor`, para que herede el color del contexto;
 *   - sin degradados, sombras, filtros, texto, cruces médicas ni checks;
 *   - grosor mínimo de 6 unidades del viewBox, para sobrevivir a 16 px.
 *
 * Coordenadas (viewBox 64×64). Todas son múltiplos de 4, de modo que a 16 px
 * (÷4) y a 32 px (÷2) cada borde recto cae sobre un límite de píxel y no se
 * emborrona; el único borde suavizado es la diagonal del pliegue.
 *
 *   asta      x  8→24 (16 de ancho), y 8→56
 *   panza     x  8→52, y 8→36
 *   pliegue   diagonal de (40,8) a (52,20)   — 12 unidades
 *   renglón   x 24→40, y 20→28 (16×8, en negativo)
 *
 * Grosores resultantes: 16 sobre el asta, 12 encima del renglón, 8 debajo,
 * 12 a la derecha, y 8,5 de holgura perpendicular entre renglón y pliegue.
 */
export function SimboloMarca({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="currentColor"
      focusable="false"
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M8 8H40L52 20V36H24V56H8Z M24 20H40V28H24Z" fillRule="evenodd" />
    </svg>
  );
}
