'use client';

import { useState, type ReactNode } from 'react';
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
  ocupado = 'Leyendo la foto…',
  titulo,
}: {
  etiqueta?: ReactNode;
  className?: string;
  /** Adónde vuelve el resultado: el modo ambulancia no debe sacar a nadie de su pantalla. */
  destino?: 'inicio' | 'emergencia';
  /** Lo que se anuncia mientras sube la foto. En un botón de ícono no cabe una frase. */
  ocupado?: ReactNode;
  /** Nombre accesible cuando la etiqueta es solo un ícono. */
  titulo?: string;
}) {
  const [enviando, setEnviando] = useState(false);

  return (
    <form action={buscarPorFoto} className="escanear">
      <input type="hidden" name="destino" value={destino} />
      <label aria-label={titulo} className={`${className} ${enviando ? 'ocupado' : ''}`} title={titulo}>
        {enviando ? ocupado : etiqueta}
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
