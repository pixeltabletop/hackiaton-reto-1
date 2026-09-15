'use client';

import { reemplazarPorReducida } from './reducirFoto';

/** El campo de archivo del formulario de foto: reduce la imagen en cuanto se elige. */
export function CampoFoto() {
  return (
    <input
      className="archivo"
      id="foto"
      name="foto"
      type="file"
      accept="image/*"
      capture="environment"
      onChange={(evento) => {
        void reemplazarPorReducida(evento.currentTarget);
      }}
    />
  );
}
