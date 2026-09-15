import Link from 'next/link';
import { EJEMPLOS } from '../../src/domain/busqueda';

/**
 * La casilla. Una sola: cédula o número de póliza. Debajo, los valores de prueba,
 * porque en una demo nadie quiere inventarse una cédula para ver si funciona.
 */
export function Buscador({ valor = '' }: { valor?: string }) {
  return (
    <section className="buscador">
      <form className="buscador-form" action="/" method="get" role="search">
        <label className="etiqueta" htmlFor="q">
          Cédula o número de póliza
        </label>
        <div className="buscador-fila">
          <input
            autoComplete="off"
            autoFocus
            className="casilla"
            defaultValue={valor}
            id="q"
            name="q"
            placeholder="8-742-1593"
            spellCheck={false}
          />
          <button className="boton" type="submit">
            Buscar
          </button>
        </div>
      </form>

      <div className="ejemplos">
        <span className="lateral-titulo">Para probar, toque cualquiera de estos</span>
        <div className="chips">
          {EJEMPLOS.map((ejemplo) => (
            <Link
              className="chip-ejemplo"
              href={`/?q=${encodeURIComponent(ejemplo.valor)}`}
              key={ejemplo.valor}
            >
              <b>{ejemplo.valor}</b>
              <span>{ejemplo.etiqueta}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
