'use client';

import { useActionState, useState } from 'react';
import { Caso } from '../../components/Caso';
import { SimboloMarca } from '../../SimboloMarca';
import { MARCA } from '../../marca';
import { dictaminarInforme, type EstadoLectura } from './acciones';

interface Opcion {
  id: string;
  etiqueta: string;
}

interface Ejemplo {
  id: string;
  titulo: string;
  planId: string;
  informe: string;
}

export function FormularioLeer({ ejemplo, planes, ejemplos }: { ejemplo: string; planes: Opcion[]; ejemplos: Ejemplo[] }) {
  const inicial: EstadoLectura = { informe: '', planId: 'PLAN-A', resultado: null, error: null };
  const [estado, accion, enCurso] = useActionState(dictaminarInforme, inicial);
  const [ayudaFotoVisible, setAyudaFotoVisible] = useState(false);
  const r = estado.resultado;
  // La clave cambia con cada informe dictaminado, así el cuadro muestra lo que se leyó.
  const clave = `${estado.planId}:${estado.informe.length}:${estado.informe.slice(0, 40)}`;

  return (
    <>
      <form className="bloque formulario-lectura" action={accion} style={{ marginTop: 22 }}>
        <h4>Informe del hospital</h4>
        <p className="nota" style={{ marginTop: 0, marginBottom: 12 }}>
          Pegue aquí el informe. Se evalúa literalmente como está escrito: cada dato que sostenga el
          dictamen tiene que aparecer en este texto, con esas palabras. El contenido se envía al
          servidor y no queda en la dirección de la página.
        </p>
        <textarea
          key={`texto-${clave}`}
          id="informe"
          className="entrada"
          name="informe"
          rows={16}
          defaultValue={estado.informe || ejemplo}
          spellCheck={false}
        />
        <div className="foto-informe">
          <span
            className="control-foto-informe"
            role="button"
            aria-disabled="true"
            aria-describedby="ayuda-foto-informe"
            tabIndex={0}
            onClick={() => setAyudaFotoVisible((visible) => !visible)}
            onKeyDown={(evento) => {
              if (evento.key === 'Enter' || evento.key === ' ') {
                evento.preventDefault();
                setAyudaFotoVisible((visible) => !visible);
              }
            }}
          >
            <button
              className="boton-secundario boton-foto-informe"
              type="button"
              disabled
              aria-disabled="true"
              tabIndex={-1}
            >
              Tomar fotografía del informe
            </button>
            <span
              className={`burbuja-foto ${ayudaFotoVisible ? 'burbuja-foto-visible' : ''}`}
              id="ayuda-foto-informe"
              role="tooltip"
            >
              El modelo todavía no extrae datos desde la foto de un informe. Por ahora, pegue el texto.
            </span>
          </span>
        </div>
        <div className="fila-formulario">
          <label className="etiqueta" htmlFor="plan">
            Póliza del paciente
          </label>
          <select key={`plan-${clave}`} className="select" name="plan" id="plan" defaultValue={estado.planId}>
            {planes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.etiqueta}
              </option>
            ))}
          </select>
          <button className="boton" type="submit" disabled={enCurso}>
            {enCurso ? 'Dictaminando…' : 'Dictaminar solicitud'}
          </button>
        </div>
        {estado.error && (
          <p className="nota" role="alert" style={{ marginBottom: 0 }}>
            {estado.error}
          </p>
        )}
      </form>

      {r && (
        <>
          <div
            className="bloque datos-leidos resultado-entrada"
            style={{ marginTop: 18 }}
            aria-live="polite"
            key={`datos-${clave}`}
          >
            <h4>Datos leídos del informe</h4>
            <p style={{ marginTop: 0 }}>{r.resumen}</p>
            {r.nota && (
              <p className="nota" style={{ marginTop: 0 }}>
                {r.nota}
              </p>
            )}
            {r.descartados.length > 0 && (
              <ul className="faltantes-lista">
                {r.descartados.map((descartado) => (
                  <li key={descartado}>Sin respaldo en el informe — {descartado}</li>
                ))}
              </ul>
            )}
            {r.avisos.length > 0 ? (
              <ul className="faltantes-lista">
                {r.avisos.map((aviso) => (
                  <li key={aviso}>{aviso}</li>
                ))}
              </ul>
            ) : (
              <p className="nota" style={{ marginBottom: 0 }}>
                Todos los datos del dictamen tienen respaldo textual en el informe.
              </p>
            )}
          </div>

          <div className="reporte-acciones">
            <button className="boton boton-imprimir" type="button" onClick={() => window.print()}>
              Emitir reporte
            </button>
          </div>

          <header className="reporte-cabecera">
            <div>
              <SimboloMarca className="marca-simbolo" />
              <b>{MARCA.nombre}</b>
            </div>
            <time>
              {new Intl.DateTimeFormat('es-PA', {
                dateStyle: 'long',
                timeZone: 'America/Panama',
              }).format(new Date())}
            </time>
          </header>

          <div className="resultado-dictamen resultado-entrada" key={`dictamen-${clave}`}>
            <Caso vista={r.vista} titulo={`Informe leído · CUPS ${r.vista.caso.procedimientoCups || '—'}`} />
          </div>
        </>
      )}

      <section className="ejemplos-lectura">
        <h2>Solicitudes de ejemplo</h2>
        <div className="pared">
          {ejemplos.map((caso) => (
            <form action={accion} key={caso.id}>
              <input type="hidden" name="plan" value={caso.planId} />
              <input type="hidden" name="informe" value={caso.informe} />
              <button className="tarjeta boton-tarjeta" type="submit" disabled={enCurso}>
                <span className="slug">{caso.id}</span>
                <h3>{caso.titulo}</h3>
                <span className="pista">Dictaminar esta solicitud →</span>
              </button>
            </form>
          ))}
        </div>
      </section>
    </>
  );
}
