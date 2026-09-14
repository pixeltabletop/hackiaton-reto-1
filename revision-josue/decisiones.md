# Decisiones con evidencia

Revisión de Josué, 14 de septiembre de 2026. Cada decisión trae las alternativas que se
consideraron, con qué se midió, el resultado y por qué se eligió. Donde no hubo prueba, se dice
y se explica la razón. Lo que queda para el equipo va al final, sin decidir.

Lo que se midió vive en [`banco/`](banco/) y en [`pruebas/`](pruebas/). Todo corre sin red
salvo las llamadas a modelos, que quedaron guardadas en `banco/cache/`: la evaluación se repite
gratis.

---

## Contexto que condiciona todo

- **Plazo:** miércoles 16 a las 9:57. Queda poco más de un día de trabajo.
- **Entregable:** una URL pública y el repositorio. El jurado abre un enlace; no instala nada.
- **Equipo de pruebas:** laptop con i7-1355U, 15.6 GB de RAM (unos 3 GB libres durante las
  pruebas) y gráfica integrada, sin GPU. En Ollama hay modelos de hasta 1.7B.
- **Accesos a modelos:**
  - una clave de API de Anthropic;
  - las suscripciones de Codex y de Claude Code, por CLI;
  - Gemini CLI quedó retirada para cuentas individuales;
  - Antigravity no devuelve la respuesta en modo sin interacción;
  - no hay clave de Gemini, Groq ni OpenAI.

---

## DEC-01 · Cómo se combinan el lector y el motor

**Pregunta:** ¿quién decide la cobertura y cuánto se confía en el modelo?

| Variante | Qué es |
|---|---|
| V0 reglas | Solo expresiones regulares; es lo que sirve la URL sin clave |
| **V1 relleno** | Reglas primero; el modelo solo completa lo que falta, con cita. Es la arquitectura de Diego |
| V2 modelo primero | El modelo manda en todo lo que puede citar |
| V3 consenso | Reglas y modelo tienen que coincidir; si discrepan, no se aprueba solo |
| V4 modelo decide | El modelo dictamina con la póliza completa, sin motor |

**Cómo se midió:** 36 informes (6 del corpus, 23 trampas y 7 en prosa libre), cada uno con su
dictamen correcto y su cláusula. Se usaron cuatro proveedores y las mismas respuestas guardadas
para todas las variantes.

**Resultado, con el código arreglado** ([`banco/resultados/tabla.md`](banco/resultados/tabla.md)):

| | Correctos | Aprueba de más | Niega de más | Frena de más |
|---|---|---|---|---|
| V1 · Haiku 4.5 | **36/36** | 0 | 0 | 0 |
| V1 · Sonnet 5 | **36/36** | 0 | 0 | 0 |
| V1 · Codex (gpt-5.6-sol) | **36/36** | 0 | 0 | 0 |
| V3 · consenso (Haiku, Sonnet o Codex) | 35/36 | 0 | 0 | 1 |
| V2 · modelo primero (Haiku, Sonnet o Codex) | 32/36 | 1 | 1 | 2 |
| V0 · solo reglas | 30/36 | 0 | 0 | 6, todos en prosa |
| V1 · Qwen 3 1.7B local | 30/36 | 0 | 0 | 6 |
| V4 · Haiku decide | 24/36 | **7** | 0 | 5 |
| V4 · Codex decide | 20/36 | **5** | 0 | 11 |
| V4 · Sonnet decide | 16/36 | **6** | 0 | 14 |
| V4 · Qwen decide | 11/36 | **19** | 0 | 6 |

**Decisión: se mantiene V1**, la arquitectura de Diego, con los arreglos de esta revisión.

**Por qué:**
- Es la única variante que llega a 36/36 con tres modelos distintos.
- V3 no mejora nada y es más complicada.
- V2 le da al modelo la última palabra sobre datos que las reglas leen de forma determinista, y
  eso le cuesta una aprobación y una negativa indebidas.
- **V4 confirma con datos la tesis del proyecto:** los modelos que deciden solos aprueban con
  preexistencias, con la póliza vencida y fuera de la red. Todos lo hacen, desde el más pequeño
  hasta Sonnet 5.

**Antes y después, sobre el mismo corpus y el código original de `main`**
([`banco/resultados/antes-dfa78fa.txt`](banco/resultados/antes-dfa78fa.txt)):

| | Antes | Después |
|---|---|---|
| Solo reglas | 15/36, 7 aprobaciones indebidas | 30/36, 0 |
| Reglas + Haiku | 25/36, 5 aprobaciones indebidas | 36/36, 0 |

*Salvedad:* las respuestas del modelo se generaron con el prompt nuevo, que pide documentos con
cita, y el código viejo esperaba identificadores sueltos. La fila con modelo puede castigar de
más al código viejo en los documentos. La fila de solo reglas es limpia.

---

## DEC-02 · Qué modelo lee en la URL pública

| Modelo | Correctos (V1) | Mediana por informe | Costo por informe | ¿Sirve en producción? |
|---|---|---|---|---|
| Claude Sonnet 5, esfuerzo bajo | 36/36 | **5.0 s** | USD 0.0094 | Sí, con clave de API |
| Claude Haiku 4.5 | 36/36 | 8.7 s | **USD 0.0033** | Sí, con clave de API |
| Codex, gpt-5.6-sol (CLI) | 36/36 | 148 s | Suscripción | **No**: la URL no puede llamar a una CLI en la laptop |
| Qwen 3 1.7B (Ollama) | 30/36 | 22 s | 0 | **No**: no aporta sobre las reglas y la laptop no sirve al jurado |
| Gemini 2.5 Flash (el que eligió Diego) | **Sin medir** | — | Gratis por cuota | Sí, con clave; no hay clave en esta máquina |

**Decisión: no la tomo yo.** Queda para el equipo (ver el final).

**Recomendación:** Sonnet 5 con esfuerzo bajo para la demostración, porque tarda la mitad que
Haiku con el mismo acierto, y mil informes cuestan unos USD 9. Haiku es la opción si importa más
el costo que el tiempo. Cualquiera de las dos exige agregar un proveedor Anthropic al código (hoy
solo hay Gemini, Groq y OpenAI) y una clave en Vercel que alguien pague.

**Por qué no Gemini sin medirlo:** porque el banco muestra que modelos distintos fallan en
cosas distintas. Si el equipo prefiere Gemini, basta con crear la clave y correr
`correr.mjs --proveedores gemini`; el evaluador ya está listo.

**Costo de toda esta comparación:** USD 0.74 en la API de Anthropic (144 llamadas). Codex usó
unos 610 mil tokens de la suscripción y Qwen corrió local.

---

## DEC-03 · Salida estructurada con esquema o solo el prompt

**Cómo se midió:** Qwen 3 1.7B, con y sin JSON schema, sobre los mismos 36 informes.

**Resultado:** mismo acierto (30/36), pero con esquema la mediana baja de 33 s a 22 s. Con Claude
se usó siempre el esquema (`output_config.format`), sin fallos de formato en 144 llamadas.

**Decisión:** en producción, salida con esquema y catálogos en `enum`.

**Por qué:**
- No cuesta nada y quita toda una clase de error: el modelo que devuelve "programada" fuera del
  catálogo.
- El código igual valida cada campo contra su cita: el esquema no reemplaza esa verificación.

---

## DEC-04 · El lector falla cerrado

**Alternativa:** mantener el lector que asume lo favorable cuando falta un dato. Hoy, sin línea
de preexistencias asume que no hay; sin carácter asume electiva.

**Cómo se midió:** 24 trampas, más 14 mutaciones que quitan cada defensa por separado.

**Resultado:**
- Las trampas en deuda pasan de 11 a 0.
- Las 14 mutaciones son detectadas por `npm run check`
  ([`pruebas/resultados/mutaciones-arreglos.json`](pruebas/resultados/mutaciones-arreglos.json)).

**Decisión:**
- Un documento negado no cuenta.
- Un rótulo que se contradice no se usa, y el modelo tampoco puede llenarlo.
- Sin carácter declarado, el caso deriva al auditor.
- Sin declaración de preexistencias dentro de esa carencia, no se aprueba solo.

**Por qué:** en seguros, aprobar de más es pagar lo que no correspondía. Derivar a una persona
cuesta minutos.

**Costo aceptado:** dos controles (TR-17 y TR-26) aseguran que esto no frene informes que sí
declaran bien.

---

## DEC-05 · Orden del motor: tope antes que el umbral

**Problema:** en los tres planes el umbral de auditoría es menor que el tope anual. Evaluado
después del umbral, el tope nunca se alcanzaba ni se citaba, y quitarlo no rompía nada.

**Decisión:** evaluar el tope primero.

**Resultado:** las 8 mutaciones del motor pasan de 3/8 detectadas a **8/8**
([`pruebas/resultados/mutaciones-motor.json`](pruebas/resultados/mutaciones-motor.json)). El
deducible queda vigilado por montos escritos a mano.

---

## DEC-06 · `/leer` por POST

| Opción | A favor | En contra |
|---|---|---|
| **Acción de servidor con `useActionState`** | El informe no queda en la URL; la clave sigue en el servidor | Algo de JavaScript en `/leer` |
| Cookie y redirección | Cero JavaScript | Límite de 4 KB; el informe queda guardado en el navegador |
| POST con un id y redirección | Cero JavaScript | En Vercel no hay dónde guardarlo entre peticiones |

**Decisión:** la acción de servidor.

**Verificado en vivo:** un informe trampa enviado desde el formulario dicta documentos
faltantes y la dirección sigue siendo `/leer`, sin el informe. El README ya no afirma "cero
JavaScript en el cliente".

---

## DEC-07 · Escritura en Notion sin inicio de sesión

**Alternativas:**
- autenticación real: no cabe en el plazo;
- una clave escondida en la página: la vería cualquiera que la abra;
- **validar lo comprobable sin sesión.**

**Decisión:**
- antes de tocar Notion, la petición tiene que venir del mismo sitio;
- antes de escribir, la página tiene que ser de la base Casos y el caso tiene que seguir
  pendiente.

**Verificado:** 7 pruebas, y con curl: otro sitio y una petición sin Origin quedan rechazados
antes de llamar a Notion.

**Límite declarado:** un script que falsifique el encabezado Origin puede dictaminar un caso
pendiente. Para cerrarlo haría falta autenticación.

---

## DEC-08 · Identidad visual

**Alternativas:** paleta A "Petróleo clínico", B "Verde quirófano" y C "Azul póliza". Todas pasan
WCAG AA.

**Decisión propuesta:** A, con tema claro por defecto y oscuro según el sistema, y tipografía de
tres voces (el agente en sans, la póliza en serif y el informe en mono).

**Por qué A:**
- el petróleo queda entre el verde del hospital y el azul de la aseguradora;
- B confunde el acento con "pre-aprobado";
- C choca con "con condiciones".

**Verificado sobre la app viva, con todo desplegado:**
- 919 textos, **0 fallos** en los dos temas;
- contraste mínimo de 5.58:1 en claro y 7.3:1 en oscuro;
- las 54 citas resaltadas del informe, con mínimo de 8.43:1 (en MAM ese resaltado había quedado
  en 1.12:1);
- ningún texto bajo 13 px (eran 316);
- sin desborde a 375 px.

**Pendiente de validar con el equipo:** es gusto y marca, no solo medición.

---

## DEC-09 · Lenguaje y stack: se queda TypeScript con Next.js

**Alternativas investigadas:**

| Alternativa | Quién la usa | Qué aportaría | Por qué no ahora |
|---|---|---|---|
| Python + FastAPI + Postgres + Docker | El otro equipo del mismo reto (preauth.juank.tech) | Ecosistema de IA más amplio y agente con herramientas | Reescribir unas 3.000 líneas verificadas en un día; necesita servidor propio y no Vercel |
| [LangExtract](https://github.com/google/langextract) (Google, Python) | Extracción clínica con posición exacta de cada dato | Lo mismo que ya hace `evidencia.ts` | Exige Python y una clave de Gemini, que no hay; su virtud ya está cubierta y medida |
| LangGraph o Google ADK con FHIR ([careauth-ai](https://github.com/yunjilee/careauth-ai), ADK prior authorization agent) | Proyectos abiertos de preautorización | Flujo FHIR y Da Vinci (CRD, DTR y PAS) | Pensado para integrarse con sistemas clínicos reales, no para una demo sin datos reales |
| Instructor o BAML (salida estructurada) | Proyectos multiproveedor | Contratos de esquema entre lenguajes | Con un solo proveedor en TypeScript, la salida nativa basta ([comparativa](https://dev.to/thedailyagent/top-5-structured-output-libraries-for-llms-in-2026-48g0)) |

**Decisión:** mantener TypeScript con Next.js y desplegar en Vercel.

**Por qué:**
- el motor ya pasa 48 pruebas, 24 trampas y 22 mutaciones;
- la URL pública se resuelve sin servidor propio;
- lo que importa medir, que es el lector, no depende del lenguaje.

**Sin banco de lenguajes, a propósito:** una comparación justa exigiría portar el motor, y ese
costo no cambia la decisión dentro del plazo.

---

## DEC-10 · Con qué se prueban los modelos

**Decisión:**
- las CLI de las suscripciones sirven para medir la **calidad** de un modelo sin claves;
- la **latencia** y la **viabilidad en producción** se miden con API.

**Por qué:** Codex por CLI tarda 148 s por informe por el arranque del agente. No representa
lo que vería el jurado, pero sí mide qué tan bien lee.

**Hallazgos del camino:**
- **Codex exec** necesita la entrada estándar cerrada; si no, espera texto adicional y nunca
  responde.
- **Gemini CLI** quedó retirada para cuentas individuales.
- **Antigravity** en modo `-p` no imprime la respuesta.

---

## Lo que decide el equipo

1. **Proveedor y clave para la URL:** Sonnet 5, Haiku 4.5 o Gemini (sin medir). Quién crea y
   paga la clave.
2. **Publicar:** qué ramas subir y cuándo, y si se unen a `main` o las revisa Diego primero.
3. **CI de trampas en modo estricto:** con la deuda en 0, se puede exigir cero en cada push.
4. **Identidad visual:** confirmar la paleta A o cambiarla (son tokens CSS).
5. **Negativas con firma humana:** el motor todavía emite `NO_CUBIERTO` y `CARENCIA_NO_CUMPLIDA`
   solo. Ver [`opiniones.md`](opiniones.md), punto 2.
