import { usd, type Centavos } from '../domain/dinero.ts';

/**
 * Tarifario de referencia. En el producto real estos valores salen del contrato
 * tarifario de la aseguradora; aquí es el corpus sintético de la demo.
 */
export interface ProcedimientoCatalogo {
  cups: string;
  nombre: string;
  tarifaReferencia: Centavos;
}

export const CATALOGO: ProcedimientoCatalogo[] = [
  { cups: '512301', nombre: 'Colecistectomía laparoscópica', tarifaReferencia: usd(4200) },
  { cups: '452101', nombre: 'Hernioplastia inguinal', tarifaReferencia: usd(2300) },
  { cups: '793501', nombre: 'Artroscopia de rodilla', tarifaReferencia: usd(3100) },
  { cups: '471201', nombre: 'Apendicectomía por laparotomía', tarifaReferencia: usd(2600) },
  { cups: '892001', nombre: 'Cesárea', tarifaReferencia: usd(2900) },
  { cups: '158001', nombre: 'Rinoplastia estética', tarifaReferencia: usd(3800) },
];

export function procedimientoDe(cups: string): ProcedimientoCatalogo {
  const encontrado = CATALOGO.find((p) => p.cups === cups);
  if (!encontrado) throw new Error(`El CUPS ${cups} no está en el tarifario de referencia`);
  return encontrado;
}
