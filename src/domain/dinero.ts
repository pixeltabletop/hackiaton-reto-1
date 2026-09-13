/**
 * Todo el dinero viaja en centavos enteros. Nunca floats.
 * Regla heredada de Chen: el motor calcula, el modelo no toca una cifra.
 */

export type Centavos = number;

export const usd = (monto: number): Centavos => Math.round(monto * 100);

export const sumar = (...montos: Centavos[]): Centavos =>
  montos.reduce((total, monto) => total + monto, 0);

/** Porcentaje con redondeo half-up, en centavos enteros. */
export const porcentaje = (monto: Centavos, pct: number): Centavos =>
  Math.floor((monto * pct) / 100 + 0.5);

export const menos = (a: Centavos, b: Centavos): Centavos => a - b;

export const min = (a: Centavos, b: Centavos): Centavos => (a < b ? a : b);

export const formato = (monto: Centavos): string => {
  const signo = monto < 0 ? '-' : '';
  const abs = Math.abs(monto);
  const entero = Math.trunc(abs / 100).toLocaleString('en-US');
  const decimales = String(abs % 100).padStart(2, '0');
  return `${signo}$ ${entero}.${decimales}`;
};
