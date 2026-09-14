# Arquitectura

Para quien va a leer o tocar el código (Josué: esto está pensado para que no tengas que adivinar
nada). Todo el dominio corre en Node sin transpiladores: `npm test` ejecuta los `.ts` directamente.

## El flujo, de punta a punta

```
informe del hospital ──► lectura (reglas + modelo) ──► caso con citas ──► motor determinista
                                                                              │
póliza (texto legal) ──► compilador ──► cláusulas indexadas ──────────────────┤
                                                                              ▼
                                                                    decisión + motivos
                                                                    (cada uno con su cláusula)
```

Nada decide a la vez. La lectura y la decisión están separadas a propósito: **el modelo lee, el
código decide**.

## Qué hace cada módulo

| Módulo | Responsabilidad | No hace |
|---|---|---|
| `dinero.ts` | Centavos enteros, redondeo half-up, formato | No redondea a la mitad dos veces |
| `evidencia.ts` | Verifica que una cita exista en el documento (normalizado, con offset al original) | No interpreta: solo dice sí o no |
| `poliza.ts` | Convierte el texto legal en cláusulas con id y offset | No entiende el derecho: solo indexa |
| `motor.ts` | Aplica las reglas en orden y cierra el caso en el primer paso que falla | No llama a ningún modelo |
| `lectura.ts` | Lee el informe con expresiones regulares y devuelve un caso con citas | No decide cobertura |
| `lectura-modelo.ts` | Pide los campos a un modelo, acepta solo lo que se puede citar (cita en el informe **y** valor que sale de la cita; carácter dentro del catálogo; documentos con su propia cita) y cae a reglas si falla | No confía en el modelo |
| `presentacion.ts` | Arma lo que la web pinta (segmentos con marcas, cláusulas usadas) | No calcula nada del dictamen |
| `notion/cliente.ts` | `fetch` contra la API de Notion (`2026-03-11`) | No conoce el dominio |
| `notion/mapeo.ts` | Traduce fila ↔ póliza/caso/decisión | No decide nada |

## El orden del motor (no cambiar sin actualizar el contrato)

1. **evidencia** — ¿cada campo que se va a usar tiene cita textual verificada?
2. **vigencia** — ¿la póliza estaba vigente el día del informe?
3. **cobertura y exclusiones** — ¿el procedimiento está en el tarifario? ¿es una exclusión?
4. **red** — la atención programada fuera de la red no está cubierta (la urgencia sí)
5. **preexistencias** — carencia de 24 meses declarada
6. **carencia de cirugía electiva** — 3 meses
7. **requisitos documentales** — por carácter del procedimiento, y aquí nace el contrafactual
8. **montos, tope y umbral** — y con ellos el reparto entre aseguradora y paciente

El primer paso que falla **cierra** el caso. Los posteriores no se adivinan: se informan como
faltantes o condiciones.

## Los invariantes (esto es lo que hay que proteger)

- Ninguna decisión sale sin al menos un motivo con cláusula citada.
- Todo campo que una regla usa tiene cita textual verificada como subcadena del documento, y su valor sale de esa cita.
- Un campo sin cita no puede sostener un `PRE_APROBADO`: el caso cae a `DOCUMENTOS_FALTANTES`.
- El mismo caso, corrido dos veces, da la misma decisión (motor determinista).
- Los montos de una aprobación cuadran contra lo facturado.

`scripts/check-decision.mjs` verifica los cinco y corre en CI en cada push.

## Dónde se engancha lo que falta

- **Más campos del informe**: añade el patrón en `REGLAS` (`lectura.ts`) y, si aplica, al prompt y a
  `CAMPOS` (`lectura-modelo.ts`). El motor no cambia.
- **Otro proveedor de modelo**: implementa `ProveedorModelo` (un método `completar`) y añádelo a
  `proveedorDeEntorno()`. La validación de citas es la misma para todos.
- **Otra regla de póliza**: va en `motor.ts` con su cláusula y su prueba en `motor.test.ts`; y un
  caso en el corpus que la ejercite.
- **Otra base de Notion**: el esquema está en `scripts/notion-preparar.mjs` y el mapeo en
  `notion/mapeo.ts`.

## Pruebas

| Archivo | Qué protege |
|---|---|
| `corpus.test.ts` | Que el corpus sea coherente y que todo dato estructurado esté en el texto legal |
| `motor.test.ts` | Los seis dictámenes, la determinación, el cuadre de montos y el contrafactual |
| `lectura.test.ts` | Que el lector por reglas reconstruya cada caso del corpus campo por campo |
| `lectura-modelo.test.ts` | Que el modelo no pueda inventar: cita no verificable, valor que no sale de su cita, carácter fuera del catálogo o documento sin cita ⇒ se descarta |
| `scripts/check-informes-trampa.mjs` | Que variaciones reales del informe (negaciones, rótulos distintos, montos corregidos) no cambien el dictamen correcto. Casos en `src/data/trampas.ts`; los defectos sin arreglar van con `deuda` y la lista solo puede bajar |
