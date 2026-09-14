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

/** Raíces que pueden aparecer en la cita para cada carácter del catálogo. */
const RAICES_DEL_CARACTER: Record<string, string[]> = {
  electiva: ['electiv', 'programad'],
  urgente: ['urgen'],
  emergencia: ['emergen'],
};

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const dos = (n: number | string): string => String(n).padStart(2, '0');

/**
 * Fechas escritas en un texto, en ISO: «2026-09-10», «10/09/2026», «10-09-2026» y
 * «10 de septiembre de 2026». Día antes que mes, como se escribe en Panamá.
 */
export function fechasEn(texto: string): string[] {
  const t = plano(texto).replace(/setiembre/g, 'septiembre');
  const fechas: string[] = [];
  for (const m of t.matchAll(/(\d{4})-(\d{2})-(\d{2})/g)) fechas.push(`${m[1]}-${m[2]}-${m[3]}`);
  for (const m of t.matchAll(/\b(\d{1,2})[/-](\d{1,2})[/-](\d{4})\b/g)) fechas.push(`${m[3]}-${dos(m[2])}-${dos(m[1])}`);
  for (const m of t.matchAll(new RegExp(`\\b(\\d{1,2}) de (${MESES.join('|')}) (?:de|del) (\\d{4})`, 'g'))) {
    fechas.push(`${m[3]}-${dos(MESES.indexOf(m[2]) + 1)}-${dos(m[1])}`);
  }
  return fechas;
}

/** «HOSP. NACIONAL DE PANAMÁ» y «Hospital Nacional de Panamá» se comparan igual. */
export function normalizarHospital(texto: string): string {
  return plano(texto)
    .replace(/\bhosp\b\.?/g, 'hospital')
    .replace(/\bclin\b\.?/g, 'clinica')
    .replace(/[.,]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

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
      const raices = RAICES_DEL_CARACTER[plano(valor)];
      return raices !== undefined && raices.some((raiz) => plano(cita).includes(raiz));
    }
    case 'fecha':
    case 'fechaAfiliacion': {
      const [fecha] = fechasEn(valor);
      return fecha !== undefined && fechasEn(cita).includes(fecha);
    }
    case 'hospital':
      return normalizarHospital(cita).includes(normalizarHospital(valor));
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
