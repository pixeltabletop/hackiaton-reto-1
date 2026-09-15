# Contrato de verificación

Cada afirmación que hace este proyecto, con la puerta que la defiende y cómo comprobarla. Si una
afirmación no tiene puerta, se dice.

Estado al 2026-09-15, medido en Windows 11 / Node 24.16 y repetido en Ubuntu (GitHub Actions).

| # | Afirmación | Puerta | Cómo se rompe a propósito | Estado |
|---|---|---|---|---|
| 1 | El modelo nunca decide la cobertura: la decide el motor con la póliza | `npm test` (`motor.test.ts`, `lectura-modelo.test.ts`) | Dejar que un campo del modelo pase sin cita: caen las pruebas del lector | **verde** |
| 2 | Sin cita textual verificada no hay dato, y el valor tiene que salir de esa cita | `npm test` (`lectura-modelo.test.ts`) | Quitar `valorRespaldadoPorCita`: 7 pruebas fallan | **verde** |
| 3 | Ninguna variación realista del informe produce una aprobación indebida | `npm run check:trampas -- --estricto` | Aflojar una regla del lector: la trampa correspondiente falla y nombra archivo y línea | **verde**, 24 de 24, 0 en deuda |
| 4 | Cada regla del motor está ejercida por al menos una prueba | mutaciones (`revision-josue/pruebas/mutaciones-motor.mjs`, rama `josue/revision`) | Poner el deducible en cero, quitar el tope, quitar la vigencia… | **verde**, 8 de 8 |
| 5 | Los montos cuadran contra lo facturado, en centavos enteros | `npm run check:decision` | Cambiar el reparto: el invariante de cuadre falla | **verde** |
| 6 | El OCR no sale a la red ni deja cachés en el proyecto | `npm run probar:ocr` | Quitar el worker local: el `fetch` bloqueado deja de estarlo y la prueba falla | **verde**, 2 de 2 |
| 7 | Un proveedor de modelo se prueba antes de publicar con él | `npm run probar:proveedor` | `--simulado falla` (el modelo no responde) da salida 1; sin clave, salida 2 | **verde**, 13 de 13 con Sonnet 5 |
| 8 | El tema cumple contraste AA en sus 19 pares de color | `npm run check:color` | Bajar el contraste de un par: la puerta lo nombra | **verde** |
| 9 | El README no promete comandos ni archivos que no existen | `npm run check:readme` | Citar un comando borrado: la puerta lo nombra | **verde** |
| 10 | Todo lo anterior corre en una máquina limpia, no solo aquí | CI de GitHub (`.github/workflows/check.yml`), instala desde cero en Ubuntu | Romper cualquier puerta: el push sale en rojo | **verde** |

## Lo que NO tiene puerta automática

- **Que el dictamen sea correcto en derecho**: el corpus es sintético y las pólizas las escribió el
  equipo. La puerta comprueba coherencia con el texto de la póliza, no su validez legal.
- **La calidad de la lectura con proveedores distintos de Claude**: el banco de 36 informes se corrió
  con Haiku 4.5, Sonnet 5, Codex y Qwen. Gemini, Groq y OpenAI están soportados pero sin medir;
  `probar:proveedor` es el mínimo antes de publicar con ellos.
- **La integración con Notion**: se prueba a mano contra un espacio real. Lo que sí tiene prueba es la
  lectura del caso desde una fila (`src/notion/lectura-del-caso.test.ts`) y quién puede escribir
  (`src/notion/seguridad.test.ts`).
- **Los informes trampa los escribió el mismo equipo que escribió el lector**: sesgo declarado.

## Cómo repetirlo entero

```bash
git clone https://github.com/pixeltabletop/hackiaton-reto-1 && cd hackiaton-reto-1
npm ci
npm run check
npm run check:trampas -- --estricto
npm run probar:ocr
npm run probar:proveedor -- --simulado bueno
npx next build
```

Con una clave de modelo en el entorno, además: `npm run probar:proveedor`.
