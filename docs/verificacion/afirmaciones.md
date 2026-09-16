# Contrato de verificación

Cada afirmación que hace este proyecto, con la puerta que la defiende y cómo comprobarla. Si una
afirmación no tiene puerta, se dice.

Estado al 2026-09-16, medido en Windows 11 / Node 24.16 y repetido en Ubuntu (GitHub Actions).

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
| 11 | El desglose del copago cuadra al centavo con lo que calculó el motor | `npm test` (`atencion.test.ts`) | Cambiar una línea del desglose: la suma deja de dar `pagaPaciente` y la prueba lo dice | **verde** |
| 12 | Ninguna pantalla muestra una cifra que la póliza todavía no respalda | `npm test` (`atencion.test.ts`) | Hacer que los destinos muestren el monto sin cobertura: la prueba que ata destinos y copago al mismo criterio falla | **verde** |
| 13 | Lo que se dice de cada hospital sale del motor, no de texto escrito a mano | `npm test` (`atencion.test.ts`) | Cambiar un monto de destino: deja de coincidir con `calcularMontos` para esa condición de red | **verde** |
| 14 | El borrador de solicitud de aval siempre declara que no es una autorización | `npm test` (`atencion.test.ts`) | Quitar la advertencia del pie: la prueba la exige en los seis casos del corpus | **verde** |
| 15 | Siempre hay a quién llamar, y su teléfono es marcable | `npm test` (`atencion.test.ts`) | Quitar un contacto de un estado: la prueba exige al menos uno por dictamen y la línea 24/7 en todos | **verde** |
| 16 | El directorio no se desincroniza de las pólizas | `npm test` (`atencion.test.ts`) | Añadir un hospital a la red de un plan sin ficha: la prueba lo nombra | **verde** |

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
- **Que un dato del directorio nunca se rotule como cláusula**: hay un solo componente que decide el
  origen (`Origen` en `app/components/Atencion.tsx`, donde `null` significa «sin cláusula»), pero
  nada impide automáticamente que alguien pase un número de cláusula donde no toca. Es regla de
  revisión, no puerta. Se encontró y corrigió una violación el 2026-09-16.
- **Que la bandeja de expedientes aguante a Notion caído**: el código degrada a solo-locales con
  `try/catch` por caso y corta el `fetch` a los 8 s, y se comprobó a mano; no hay prueba automática
  que simule la integración caída.
- **Las hojas de impresión**: el CSS del reporte y el del borrador de aval están revisados a ojo en
  pantalla, pero nadie ha mirado una impresión real en papel ni un PDF exportado.

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
