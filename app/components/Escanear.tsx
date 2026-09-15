'use client';

import { useState } from 'react';
import { buscarPorFoto } from '../buscar/acciones';

/**
 * Un solo toque: la persona toca, el teléfono abre la cámara (o el carrete), elige la
 * foto y la sube sola. Nadie va a elegir archivo, buscar un botón y después esperar
 * con una mano ocupada.
 */
export function Escanear({
  etiqueta = 'Escanear la cédula o la póliza',
  className = 'boton-grande-secundario',
}: {
  etiqueta?: string;
  className?: string;
}) {
  const [enviando, setEnviando] = useState(false);

  return (
    <form action={buscarPorFoto} className="escanear">
      <label className={`${className} ${enviando ? 'ocupado' : ''}`}>
        {enviando ? 'Leyendo la foto…' : etiqueta}
        <input
          accept="image/*"
          capture="environment"
          className="archivo-oculto"
          name="foto"
          onChange={(evento) => {
            if (evento.currentTarget.files?.length) {
              setEnviando(true);
              evento.currentTarget.form?.requestSubmit();
            }
          }}
          type="file"
        />
      </label>
    </form>
  );
}
