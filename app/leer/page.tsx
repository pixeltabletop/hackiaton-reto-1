import Link from 'next/link';
import { CASOS } from '../../src/data/casos';
import { PLANES } from '../../src/data/planes';
import { formato } from '../../src/domain/dinero';
import { FormularioLeer } from './Formulario';

const EJEMPLO = `CLÍNICA COSTA DEL ESTE — SERVICIO DE ORTOPEDIA
Informe médico para solicitud de preautorización
Paciente: AF-9921 · 38 años · sexo masculino
Fecha: 2026-09-14 · Fecha de afiliación al plan: 2025-02-10
Diagnóstico: M23.20 — lesión de menisco interno
Procedimiento solicitado: CUPS 793501 — artroscopia de rodilla
Carácter: electiva
Cirujano tratante: Dr. Ignacio Sáez
Monto estimado del procedimiento: $ 3,100.00
Estudios adjuntos: resonancia magnética del 2026-09-09
Documentos adjuntos: informe del cirujano, estudio de imagen
Antecedentes: dolor con bloqueos de rodilla. Sin antecedentes crónicos declarados.
Hallazgos: rotura meniscal interna, sin derrame.`;

export default function PaginaLeer() {
  const planes = PLANES.map((p) => ({
    id: p.id,
    etiqueta: `${p.id} · ${p.plan} · deducible ${formato(p.deducibleAnual)} · coaseguro ${p.coaseguroPct}% en red`,
  }));
  const ejemplos = CASOS.map((c) => ({ id: c.id, titulo: c.titulo, planId: c.planId, informe: c.informeTexto }));

  return (
    <div className="hoja">
      <h1>Nueva solicitud de pre-autorización</h1>
      <p className="tesis">
        Pegue el informe del hospital y la póliza del paciente. Cada dato se toma{' '}
        <strong>con la cita textual de donde salió</strong> y la cobertura la resuelven las cláusulas.
        Si un dato no está escrito en el expediente, la solicitud no se aprueba: queda a la espera de
        documentación.
      </p>

      <FormularioLeer ejemplo={EJEMPLO} planes={planes} ejemplos={ejemplos} />

      <footer>
        <p>
          <Link href="/" style={{ color: 'var(--acento)' }}>
            Volver a los seis casos dictaminados
          </Link>
        </p>
      </footer>
    </div>
  );
}
