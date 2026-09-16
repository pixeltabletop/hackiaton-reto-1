import Link from 'next/link';
import { EJEMPLOS } from '../../src/domain/busqueda';
import { Escanear } from './Escanear';
import { IconoCamara, IconoLupa } from './Iconos';

/**
 * La entrada de la aplicación: un campo, una lupa y una cámara.
 *
 * Antes eran una etiqueta, una casilla, un botón que decía «Buscar» y debajo otro botón
 * que decía «Escanear la cédula o la póliza». Cuatro textos para una sola acción. Quien
 * usa esto tiene una mano ocupada: lo que necesita es escribir o apuntar la cámara, y los
 * dos gestos caben en la misma píldora.
 *
 * La lupa es el botón de enviar. La cámara es un formulario aparte —no se pueden anidar
 * formularios— pero vive dentro de la misma píldora, así que a la vista es un solo control.
 */
export function Compositor({
  valor = '',
  destino = 'inicio',
  accion = '/',
}: {
  valor?: string;
  destino?: 'inicio' | 'emergencia';
  accion?: string;
}) {
  return (
    <section className="buscador">
      <div className="compositor">
        <form className="compositor-campo" action={accion} method="get" role="search">
          <label className="visualmente-oculto" htmlFor="q">
            Cédula o número de póliza
          </label>
          <input
            autoComplete="off"
            autoFocus
            defaultValue={valor}
            id="q"
            name="q"
            placeholder="Cédula o número de póliza"
            spellCheck={false}
          />
          <button
            aria-label="Buscar"
            className="compositor-accion compositor-enviar"
            title="Buscar"
            type="submit"
          >
            <IconoLupa />
          </button>
        </form>

        <Escanear
          className="compositor-accion"
          destino={destino}
          etiqueta={<IconoCamara />}
          ocupado={<span className="compositor-leyendo">…</span>}
          titulo="Tomar foto de la cédula o la póliza"
        />
      </div>

      <div className="compositor-pie">
        <span>Probar con</span>
        {EJEMPLOS.map((ejemplo) => (
          <Link className="chip-enlace" href={`${accion}?q=${encodeURIComponent(ejemplo.valor)}`} key={ejemplo.valor}>
            {ejemplo.valor}
          </Link>
        ))}
      </div>
    </section>
  );
}
