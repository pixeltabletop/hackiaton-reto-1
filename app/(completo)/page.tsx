import Link from 'next/link';
import { Buscador } from '../components/Buscador';
import { SubirFoto } from '../components/SubirFoto';
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
  'sin-foto': 'No llegó ninguna foto. Elija una imagen o use la cédula de ejemplo.',
  'no-leido': 'No se pudo leer ningún número en la foto. Escriba la cédula a mano.',
  'archivo-grande': 'La foto pesa más de 4 MB. Tómela de nuevo o recórtela.',
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; leido?: string; error?: string }>;
}) {
  const { q = '', leido, error } = await searchParams;
  const consulta = buscar(q);
  const encontrados = consulta.coincidencias;

  return (
    <div className="hoja">
      <header>
        <h1>Buscar al asegurado</h1>
        <p className="problema">
          En la ambulancia o en admisiones: con la cédula o el número de póliza, el sistema saca la
          póliza, la carencia y el copago. Sin llamar a nadie.
        </p>
      </header>

      {/* La lectura de un informe nuevo es lo que pide el reto: tiene que verse sin bajar. */}
      {q.trim() === '' && (
        <Link className="tarjeta entrada-leer" href="/leer">
          <span className="slug">¿Ya llegó el informe del hospital?</span>
          <h3>Péguelo tal como lo escribió el médico: el agente lo lee y lo dictamina con la póliza</h3>
          <span className="detalle">Cada dato sale con su cita del informe y cada decisión con su cláusula.</span>
          <span className="pista">Leer un informe →</span>
        </Link>
      )}

      <Buscador valor={q} />
      <SubirFoto />

      {leido && (
        <p className="nota nota-buena">
          Leído de la foto: <b>{q}</b>. Verifique el número contra el documento antes de continuar.
        </p>
      )}
      {error && AVISOS[error] && <p className="nota nota-mala">{AVISOS[error]}</p>}

      {q.trim() === '' && (
        <p className="nota">
          Nadie quiere inventarse una cédula para probar. Toque cualquiera de los ejemplos de arriba y
          el sistema busca, dictamina y muestra la cláusula en la que se apoya.
        </p>
      )}

      {q.trim() !== '' && encontrados.length === 0 && (
        <section className="no-encontrado">
          <h2>No aparece en la base</h2>
          <p>
            <b>{q}</b> no corresponde a ningún asegurado de esta demostración. Si el número salió de
            una foto, revise los dígitos: el OCR puede confundir un 8 con un 3 o un 0 con una O.
          </p>
          <p className="nota">
            La base de esta demostración tiene seis asegurados. Los valores de prueba están arriba, en
            los ejemplos.
          </p>
        </section>
      )}

      {encontrados.length > 0 && (
        <>
          <p className="nota">
            {consulta.tipo === 'poliza'
              ? `Póliza ${q}: ${encontrados.length} ${encontrados.length === 1 ? 'asegurado' : 'asegurados'} cubiertos por este certificado.`
              : `Cédula ${q}: un asegurado.`}
          </p>

          {encontrados.map((caso) => {
            const plan = planDe(caso.planId);
            return (
              <section className="encontrado" key={caso.id}>
                <dl className="ficha-admision">
                  <div>
                    <dt>Asegurado</dt>
                    <dd>
                      {caso.pacienteRef} · {caso.edad} años · sexo {caso.sexo}
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
                    <dt>Vigencia del plan</dt>
                    <dd>
                      del {plan.vigenciaDesdeIso} al {plan.vigenciaHastaIso}
                    </dd>
                  </div>
                </dl>

                <Caso vista={armarVista(caso, plan)} />
              </section>
            );
          })}
        </>
      )}

      <footer>
        <p className="cierre">Aquí no se adivina: se cita la cláusula.</p>
        <p>
          <Link href="/casos" style={{ color: 'var(--acento)' }}>
            Ver los seis casos dictaminados
          </Link>
        </p>
        <p>
          Los datos son <strong>sintéticos</strong>: cédulas, pólizas, hospitales, pacientes y montos
          son inventados. Las fotos de ejemplo son documentos ficticios.
        </p>
        <p>
          {CREDITOS.equipo} · {CREDITOS.evento}
        </p>
      </footer>
    </div>
  );
}
