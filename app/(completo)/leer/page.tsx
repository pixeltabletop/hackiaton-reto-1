import { CASOS } from '../../../src/data/casos';
import { PLANES } from '../../../src/data/planes';
import { formato } from '../../../src/domain/dinero';
import { proveedorDeEntorno } from '../../../src/domain/lectura-modelo';
import { FormularioLeer } from './Formulario';

// Esta pantalla depende de si hay clave de modelo en el servidor, así que se arma al pedirla.
export const dynamic = 'force-dynamic';

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
  // En qué modo está el agente. Se dice antes de dictaminar, no después: quien evalúa
  // tiene que saber si el informe lo va a leer un modelo o las reglas.
  const proveedor = proveedorDeEntorno();
  const planes = PLANES.map((p) => ({
    id: p.id,
    etiqueta: `${p.id} · ${p.plan} · deducible ${formato(p.deducibleAnual)} · coaseguro ${p.coaseguroPct}% en red`,
  }));
  const ejemplos = CASOS.map((c) => ({ id: c.id, titulo: c.titulo, planId: c.planId, informe: c.informeTexto }));

  return (
    <div className="hoja">
      <div className="titulo-con-modo">
        <h1>Dictaminar una solicitud</h1>
        <span
          className={`modo-lectura ${proveedor ? 'modo-lectura-activo' : ''}`}
          role="status"
          title={
            proveedor
              ? 'El modelo extrae datos con citas; la póliza sigue decidiendo la cobertura.'
              : 'Sin clave de modelo, el lector usa reglas y necesita informes rotulados.'
          }
        >
          {proveedor ? `Modelo activo · ${proveedor.nombre}` : 'Solo reglas'}
        </span>
      </div>
      <p className="tesis">
        Pegue el informe del hospital: cada dato se respalda con una cita y la póliza decide la cobertura.
      </p>

      <FormularioLeer ejemplo={EJEMPLO} planes={planes} ejemplos={ejemplos} />
    </div>
  );
}
