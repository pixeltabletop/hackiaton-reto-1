# Revisión de Josué — no es parte del producto

> **Diego:** esta rama es para que la leas y decidas, no para mergear a `main`. Todo vive en
> `revision-josue/` y no toca ningún archivo del proyecto. Revisado sobre `main` en `dfa78fa`
> (14 de septiembre, 11:32). Si algo de aquí te sirve, lo pasamos al proyecto en su propia rama.

## En 30 segundos

La tesis está bien y el motor es sólido: rápido, determinista y con cada motivo citando su
cláusula. Pero **probé el camino completo con informes que no están hechos a la medida del lector,
y aprueba cosas que no debería aprobar**:

| Qué probé | Resultado | Dónde |
|---|---|---|
| Lector por reglas con 18 variaciones realistas del informe | 7 correctas · **5 aprobaciones indebidas** · 1 negativa indebida · 5 frenos de más | [pruebas/check-informes-trampa.mjs](pruebas/check-informes-trampa.mjs) |
| Lector con modelo, usando un proveedor simulado (sin red ni clave) | **2/6 correctos**: el modelo puede cambiar el carácter, el monto y los documentos con una cita que sí existe | [pruebas/modelo-simulado.mjs](pruebas/modelo-simulado.mjs) |
| Reglas del motor desactivadas una a una | `npm run check` detecta **3 de 8**; con la batería de trampas, 6 de 8 | [pruebas/mutaciones.mjs](pruebas/mutaciones.mjs) |

El hallazgo más serio es **H-01**. Con un modelo configurado, un informe de $ 4,200.00 se aprueba
sobre $ 1,000.00, porque se verifica que la cita exista, pero no que el valor salga de ella. Eso
contradice dos frases de hoy: la regla 3 del README («el modelo no puede inventar») y el riesgo de
`docs/PENDIENTES.md` («es imposible por diseño»).

## Qué hay aquí

| Archivo | Para qué |
|---|---|
| [hallazgos.md](hallazgos.md) | Defectos con evidencia reproducible, por severidad, cada uno con una propuesta concreta |
| [opiniones.md](opiniones.md) | Criterio sobre decisiones y rumbo: negativas automáticas, Notion, otro equipo en el mismo reto, qué cortar, identidad visual. Es opinión, no hallazgo: se discute |
| [dictamen-2026-09-14.html](dictamen-2026-09-14.html) | La revisión completa en una página visual (abrir en el navegador). **Es una foto de `1680b6f`**: se hizo antes de tu commit del modelo, así que donde dice «no hay modelo» ya no aplica |
| [pruebas/](pruebas/) | Los scripts, que corren sin red, sin clave y sin tocar el código |
| [pruebas/resultados/](pruebas/resultados/) | Las salidas de cada script sobre `dfa78fa` |

## Cómo reproducir

Desde la raíz del repo, con `npm ci` hecho:

```bash
node --import ./scripts/registro-ts.mjs revision-josue/pruebas/check-informes-trampa.mjs              # sale 0: 11 en deuda, ninguna regresión
node --import ./scripts/registro-ts.mjs revision-josue/pruebas/check-informes-trampa.mjs --estricto   # sale 1: nombra los 11
node --import ./scripts/registro-ts.mjs revision-josue/pruebas/modelo-simulado.mjs                    # sale 1: 4 de 6 fallan
node revision-josue/pruebas/mutaciones.mjs                                                            # tarda ~1 min; restaura motor.ts siempre
node revision-josue/pruebas/contraste-paletas.mjs                                                     # contraste WCAG de las paletas propuestas
```

`ollama-lectura.mjs` necesita Ollama local con `qwen3:1.7b` y `qwen2.5:1.5b-instruct`. Solo sirvió
para descartar un modelo local para la URL pública.

## Si quieres la puerta de trampas en el proyecto

Tengo lista, **sin publicar**, la rama `josue/puerta-informes-trampa`. Mueve `trampas.ts` a
`src/data/`, agrega `npm run check:trampas` a `npm run check` y al CI, y documenta la deuda en el
README. Con deuda, `main` sigue en verde: la puerta solo falla con una regresión nueva, con una
deuda saldada sin quitar o con una trampa que ya no prueba nada. Dime y la subo.

## Lo que pido que decidamos

1. **H-01 y H-02 antes de poner una clave en Vercel.** Sin clave el sitio está más seguro que con
   ella.
2. Si el agente **puede negar** o solo aprobar (ver [opiniones.md](opiniones.md)).
3. Si la deuda de trampas **se tiene que ver en cero antes de enviar** el miércoles.
