/**
 * Lo que decide si un proveedor de modelo sirve para publicar el agente.
 *
 * Vive aparte del script que llama al modelo para poder probarlo sin red ni clave:
 * la regla de salida es lo que protege la URL pública, así que tiene sus propias pruebas.
 */

export interface ResultadoInforme {
  id: string;
  esperados: string[];
  obtenido: string;
  /** El modelo no respondió (error, negativa o JSON inválido) y se usó la lectura por reglas. */
  cayoAReglas: boolean;
  /** Campos que el modelo propuso y se descartaron por no salir de su cita. */
  descartados: number;
  ms: number;
}

export interface Veredicto {
  aciertos: number;
  indebidas: number;
  caidas: number;
  medianaMs: number;
  codigo: 0 | 1;
}

const aprueba = (estado: string) => estado.startsWith('PRE_APROBADO');

/** Aprobó algo que el dictamen correcto no aprueba. Es el error que no se tolera. */
export function esIndebida(r: ResultadoInforme): boolean {
  return aprueba(r.obtenido) && !r.esperados.some(aprueba);
}

export function evaluarCorrida(resultados: ResultadoInforme[]): Veredicto {
  const tiempos = resultados.map((r) => r.ms).sort((a, b) => a - b);
  const mitad = Math.floor(tiempos.length / 2);
  const medianaMs =
    tiempos.length === 0 ? 0 : tiempos.length % 2 ? tiempos[mitad] : Math.round((tiempos[mitad - 1] + tiempos[mitad]) / 2);

  const aciertos = resultados.filter((r) => r.esperados.includes(r.obtenido)).length;
  const indebidas = resultados.filter(esIndebida).length;
  const caidas = resultados.filter((r) => r.cayoAReglas).length;

  // Sin informes no hay evidencia; una caída aislada se tolera (un tiempo de espera), dos no.
  const codigo = resultados.length === 0 || indebidas > 0 || caidas > 1 ? 1 : 0;
  return { aciertos, indebidas, caidas, medianaMs, codigo };
}
