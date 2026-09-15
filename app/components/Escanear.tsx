'use client';

import { useState } from 'react';
import { buscarPorFoto } from '../buscar/acciones';
import { reemplazarPorReducida } from './reducirFoto';

/**
 * Un solo toque: la persona toca, el teléfono abre la cámara (o el carrete), elige la
 * foto y la sube sola. Nadie va a elegir archivo, buscar un botón y después esperar
 * con una mano ocupada. La foto se reduce en el teléfono antes de subir.
 */
export function Escanear({
  etiqueta = 'Escanear la cédula o la póliza',
  className = 'boton-grande-secundario',
  destino = 'inicio',
}: {
  etiqueta?: string;
  className?: string;
  /** Adónde vuelve el resultado: el modo ambulancia no debe sacar a nadie de su pantalla. */
  destino?: 'inicio' | 'emergencia';
}) {
  const [enviando, setEnviando] = useState(false);

  return (
    <form action={buscarPorFoto} className="escanear">
      <input type="hidden" name="destino" value={destino} />
      <label className={`${className} ${enviando ? 'ocupado' : ''}`}>
        {enviando ? 'Leyendo la foto…' : etiqueta}
        <input
          accept="image/*"
          capture="environment"
          className="archivo-oculto"
          name="foto"
          onChange={async (evento) => {
            const campo = evento.currentTarget;
            if (!campo.files?.length) return;
            setEnviando(true);
            await reemplazarPorReducida(campo);
            campo.form?.requestSubmit();
          }}
          type="file"
        />
      </label>
    </form>
  );
}
