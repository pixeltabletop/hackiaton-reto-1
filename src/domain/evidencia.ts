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

const plano = (texto: string): string => normalizarConMapa(texto).plano;

/** Montos escritos en un texto, en centavos: «$ 4,200.00», «USD 4,200.00», «4200». */
function montosEn(texto: string): number[] {
  return [...texto.matchAll(/\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?/g)].map((m) =>
    Math.round(Number(m[0].replace(/,/g, '')) * 100),
  );
}

/** Raíz que tiene que aparecer en la cita para cada carácter del catálogo. */
const RAIZ_DEL_CARACTER: Record<string, string> = {
  electiva: 'electiv',
  urgente: 'urgen',
  emergencia: 'emergen',
};

/**
 * Que la cita exista no basta: el VALOR tiene que salir de ella. Sin esto, una
 * cita real puede sostener un dato inventado («$ 1,000.00» citando la línea que
 * dice «$ 4,200.00»).
 */
export function valorRespaldadoPorCita(campo: string, valor: string, cita: string): boolean {
  if (!valor.trim() || !cita.trim()) return false;
  switch (campo) {
    case 'montoEstimado': {
      const [monto] = montosEn(valor);
      return monto !== undefined && montosEn(cita).includes(monto);
    }
    case 'edad':
      return new RegExp(`(^|\\D)${Number(valor.replace(/\D/g, ''))}(\\D|$)`).test(cita);
    case 'procedimientoCups': {
      const digitos = valor.replace(/\D/g, '');
      return digitos.length > 0 && cita.replace(/\D/g, '').includes(digitos);
    }
    case 'caracter': {
      const raiz = RAIZ_DEL_CARACTER[plano(valor)];
      return raiz !== undefined && plano(cita).includes(raiz);
    }
    default:
      return plano(cita).includes(plano(valor));
  }
}

/**
 * Construye la evidencia de un campo extraído. Si la cita no aparece en el
 * documento, o el valor no sale de la cita, el campo queda como no verificado y
 * NO puede sostener una aprobación: el caso cae a documentos faltantes.
 */
export function evidenciaDe(
  campo: string,
  valor: string,
  documento: string,
  cita: string = valor,
): Evidencia {
  const { verificado, offset } = verificarCita(documento, cita);
  return { campo, valor, cita, offset, verificado: verificado && valorRespaldadoPorCita(campo, valor, cita) };
}

export function sinVerificar(evidencias: Evidencia[]): Evidencia[] {
  return evidencias.filter((e) => !e.verificado);
}
