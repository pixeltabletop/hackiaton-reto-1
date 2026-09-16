import Link from 'next/link';
import { Compositor } from '../components/Compositor';
import { Caso } from '../components/Caso';
import { CREDITOS } from '../marca';
import { buscar } from '../../src/domain/busqueda';
import { planDe } from '../../src/data/planes';
import { armarVista } from '../../src/domain/presentacion';

// Cada consulta se resuelve contra el corpus en el momento: aquí no hay nada cacheado.
export const dynamic = 'force-dynamic';

// El OCR arranca Tesseract (wasm + modelo de idioma) dentro de la funcion: en frio
// puede pasar de 20 s. El limite por defecto de Vercel lo mataria a mitad de camino.
export const maxDuration = 60;

const AVISOS: Record<string, string> = {
  'sin-foto': 'No llegó ninguna foto.',
  'no-leido': 'No se leyó ningún número. Escriba la cédula.',
  'archivo-grande': 'La foto pesa más de 4 MB. Recórtela.',
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; leido?: string; error?: string }>;
}) {
  const { q = '', leido, error } = await searchParams;
  const consulta = buscar(q);
  const encontrados = consulta.coincidencias;
  const vacio = q.trim() === '';

  return (
    <div className="hoja">
      <header>
        <h1>¿A quién atendemos?</h1>
        <p className="problema">Cédula o póliza. El resto sale solo.</p>
      </header>

      <Compositor valor={q} />

      {leido && (
        <p className="nota nota-buena">
          Leído de la foto: <b>{q}</b>. Verifíquelo contra el documento.
        </p>
      )}
      {error && AVISOS[error] && <p className="nota nota-mala">{AVISOS[error]}</p>}

      {vacio && (
        <Link className="tarjeta entrada-leer" href="/leer">
          <h3>¿Ya llegó el informe del hospital?</h3>
          <span className="detalle">Péguelo tal como lo escribió el médico.</span>
          <span className="pista">Leer un informe →</span>
        </Link>
      )}

      {!vacio && encontrados.length === 0 && (
        <section className="no-encontrado">
          <h2>No aparece en la base</h2>
          <p>
            <b>{q}</b> no corresponde a ningún asegurado. Si el número salió de una foto, revise los
            dígitos: el OCR confunde un 8 con un 3.
          </p>
        </section>
      )}

      {encontrados.length > 0 && (
        <>
          <p className="nota">
            {consulta.tipo === 'poliza'
              ? `Póliza ${q} · ${encontrados.length} ${encontrados.length === 1 ? 'asegurado' : 'asegurados'}`
              : `Cédula ${q} · un asegurado`}
          </p>

          {encontrados.map((caso) => {
            const plan = planDe(caso.planId);
            return (
              <section className="encontrado" key={caso.id}>
                <dl className="ficha-admision">
                  <div>
                    <dt>Asegurado</dt>
                    <dd>
                      {caso.pacienteRef} · {caso.edad} años
                    </dd>
                  </div>
                  <div>
                    <dt>Cédula</dt>
                    <dd>{caso.cedula}</dd>
                  </div>
                  <div>
                    <dt>Póliza</dt>
                    <dd>
                      {caso.numeroPoliza} · {plan.aseguradora}
                    </dd>
                  </div>
                  <div>
                    <dt>Vigencia</dt>
                    <dd>
                      {plan.vigenciaDesdeIso} → {plan.vigenciaHastaIso}
                    </dd>
                  </div>
                </dl>

                <Caso vista={armarVista(caso, plan)} hojaPropia />
              </section>
            );
          })}
        </>
      )}

      <footer>
        <p className="cierre">Aquí no se adivina: se cita la cláusula.</p>
        <p>
          <Link href="/expedientes" style={{ color: 'var(--acento)' }}>
            Ver los expedientes abiertos
          </Link>
        </p>
        <p>
          Datos <strong>sintéticos</strong>: cédulas, pólizas, hospitales, teléfonos y montos son
          inventados.
        </p>
        <p>
          {CREDITOS.equipo} · {CREDITOS.evento}
        </p>
      </footer>
    </div>
  );
}
