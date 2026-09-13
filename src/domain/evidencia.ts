/**
 * Una cita no es un adorno: es la prueba de que el dato salió del documento.
 * El texto se compara normalizado (sin tildes, sin mayúsculas, sin espacios dobles),
 * pero el offset que se reporta apunta al documento ORIGINAL.
 */

export interface Evidencia {
  campo: string;
  valor: string;
  cita: string;
  offset: number;
  verificado: boolean;
}

/** Normaliza conservando un mapa hacia los índices del texto original. */
export function normalizarConMapa(texto: string): { plano: string; mapa: number[] } {
  const plano: string[] = [];
  const mapa: number[] = [];
  let espacioPendiente = false;

  for (let i = 0; i < texto.length; i++) {
    const original = texto[i];
    const sinTilde = original
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
    for (const caracter of sinTilde) {
      if (/\s/.test(caracter)) {
        if (plano.length > 0) espacioPendiente = true;
        continue;
      }
      if (espacioPendiente) {
        plano.push(' ');
        mapa.push(i);
        espacioPendiente = false;
      }
      plano.push(caracter);
      mapa.push(i);
    }
  }
  return { plano: plano.join(''), mapa };
}

export function verificarCita(
  documento: string,
  cita: string,
): { verificado: boolean; offset: number } {
  const { plano, mapa } = normalizarConMapa(documento);
  const buscado = normalizarConMapa(cita).plano;
  if (buscado.length === 0) return { verificado: false, offset: -1 };
  const posicion = plano.indexOf(buscado);
  if (posicion < 0) return { verificado: false, offset: -1 };
  return { verificado: true, offset: mapa[posicion] ?? -1 };
}

/**
 * Construye la evidencia de un campo extraído. Si la cita no aparece en el
 * documento, el campo queda como no verificado y NO puede sostener una
 * aprobación: el caso cae a documentos faltantes.
 */
export function evidenciaDe(
  campo: string,
  valor: string,
  documento: string,
  cita: string = valor,
): Evidencia {
  const { verificado, offset } = verificarCita(documento, cita);
  return { campo, valor, cita, offset, verificado };
}

export function sinVerificar(evidencias: Evidencia[]): Evidencia[] {
  return evidencias.filter((e) => !e.verificado);
}
