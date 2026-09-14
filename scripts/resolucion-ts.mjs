/**
 * Resolución de imports de TypeScript para Node.
 *
 * Los archivos del dominio se importan entre sí sin extensión (así los resuelven
 * también el empaquetador de la web y cualquier herramienta). Node, en cambio,
 * exige la ruta completa en ESM. Este cargador cubre esa diferencia sin
 * transpiladores ni dependencias: Node ya sabe quitar los tipos por su cuenta.
 */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const CANDIDATOS = ['.ts', '.tsx', '.mts', '/index.ts', '/index.tsx'];

export async function resolve(especificador, contexto, siguiente) {
  const relativo = especificador.startsWith('./') || especificador.startsWith('../');
  const conExtension = /\.[a-z]+$/i.test(especificador);

  if (relativo && !conExtension) {
    for (const candidato of CANDIDATOS) {
      const url = new URL(especificador + candidato, contexto.parentURL);
      if (existsSync(fileURLToPath(url))) {
        // Sin `format`: así Node aplica su propio manejo de TypeScript y quita los tipos.
        return { url: url.href, shortCircuit: true };
      }
    }
  }

  return siguiente(especificador, contexto);
}
