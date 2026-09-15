'use client';

import type { ReactNode } from 'react';
import { useFormStatus } from 'react-dom';

/**
 * El botón que sube una foto. Es lo único que necesita JavaScript además del menú:
 * mientras el OCR lee, el botón lo dice, para que nadie suba la misma foto tres veces.
 */
export function BotonEnviar({
  children,
  className = 'boton',
  ocupado = 'Leyendo la foto…',
}: {
  children: ReactNode;
  className?: string;
  ocupado?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button className={className} type="submit" disabled={pending}>
      {pending ? ocupado : children}
    </button>
  );
}
