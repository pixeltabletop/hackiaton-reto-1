import { buscarPorFoto } from '../buscar/acciones';
import { BotonEnviar } from './BotonEnviar';

/**
 * Subir una foto en vez de teclear. Dos caminos: la foto que trae la persona, o una
 * de las muestras ficticias del repo para probar sin exponer el documento de nadie.
 */
export function SubirFoto() {
  return (
    <div className="subir">
      <form action={buscarPorFoto} className="subir-fila">
        <label className="archivo-etiqueta" htmlFor="foto">
          …o suba una foto de la cédula o de la póliza
        </label>
        <input
          className="archivo"
          id="foto"
          name="foto"
          type="file"
          accept="image/*"
          capture="environment"
        />
        <BotonEnviar className="boton-secundario">Leer la foto</BotonEnviar>
      </form>

      <form action={buscarPorFoto}>
        <input type="hidden" name="muestra" value="cedula" />
        <BotonEnviar className="enlace-boton" ocupado="Leyendo la foto de ejemplo…">
          Probar con una cédula de ejemplo (ficticia)
        </BotonEnviar>
      </form>
    </div>
  );
}
