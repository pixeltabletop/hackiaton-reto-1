# PRIOR AI — el dictamen con la póliza en la mano

Equipo **Jajanken** · Reto 1 del hackIAthon Panamá 2026 · **datos sintéticos**

> **El agente no autoriza: dictamina con la póliza en la mano.**
> El modelo lee el informe del hospital y cita; la cobertura la decide la póliza con reglas
> deterministas. Si un dato no tiene cita textual en el documento, no existe: el caso no se aprueba.

Un paciente no debería esperar días para saber si su cirugía está cubierta. PRIOR AI recibe el
informe del hospital y la póliza del paciente y devuelve **un dictamen con la cláusula que lo
sostiene**, o la lista exacta de lo que falta y qué pasa si se adjunta.

## Las pantallas

| Ruta | Qué es |
|---|---|
| `/` | **Buscar al asegurado** por cédula o número de póliza (tecleado o leído de una foto). Muestra su póliza, su vigencia y el dictamen de su caso. Desde aquí se entra a leer un informe nuevo. |
| `/leer` | **Pegue un informe y el agente lo dictamina.** El modelo lee el informe en prosa, cada dato sale con su cita y el motor decide con la póliza. Es el agente sobre un documento que nunca vio. |
| `/casos` | Los seis casos del corpus: veredicto, cada regla con su cláusula, reparto del monto e informe con la cita de cada dato. |
| `/emergencia` | **Modo ambulancia**: una pantalla, un campo y un botón para escanear la cédula o la póliza con una mano. |
| `/notion` | Lee los casos pendientes de la base **Casos** de Notion y escribe la decisión en **Decisiones**. |
| `/api/dictaminar` | `POST caso=<id de la página de Notion>`: dictamina ese caso y escribe la decisión. |

## Cómo correrlo

Requisitos: Node 24 o superior.

```bash
npm ci
npm run dev                      # la web en http://localhost:3000
npm run check                    # pruebas, puerta del dictamen, informes trampa y contraste
npm run check:trampas -- --estricto   # cero defectos conocidos: la verificación antes de entregar
npm run probar:ocr               # lee las dos fotos de ejemplo sin red
npm run probar:proveedor         # con una clave de modelo: ver «Despliegue»
```

| Comando | Qué comprueba |
|---|---|
| `npm test` | 81 pruebas: corpus, evidencia, motor, lectura por reglas y con modelo, búsqueda por cédula y póliza, números en documentos, escritura en Notion y la regla de salida de `probar:proveedor` |
| `npm run check:decision` | Dictamina los seis casos y audita los invariantes del contrato |
| `npm run check:trampas` | 24 informes trampa: variaciones reales (negaciones, rótulos distintos, montos corregidos, órdenes escondidas) que no pueden cambiar el dictamen correcto |
| `npm run check:color` | Contraste WCAG AA de todos los pares de color del tema |
| `npm run probar:ocr` | El OCR lee la cédula y la póliza de ejemplo con el modelo de idioma local, sin salir a la red |

La integración continua de GitHub corre todo lo anterior, la prueba del proveedor en modo simulado y
el build de producción en cada push.

## Los seis casos (corpus sintético)

| Caso | Qué trae | Dictamen |
|---|---|---|
| `PR-2026-0417` | Colecistectomía electiva, en red, tres años de afiliación, todo adjunto | `PRE_APROBADO` |
| `PR-2026-0518` | Artroscopia electiva con dos meses de afiliación (la póliza pide tres) | `CARENCIA_NO_CUMPLIDA` |
| `PR-2026-0633` | Rinoplastia con fines estéticos | `NO_CUBIERTO` |
| `PR-2026-0701` | Colecistectomía sin estudio de imagen ni orden de anestesiología | `DOCUMENTOS_FALTANTES` |
| `PR-2026-0744` | Hernioplastia con preexistencia declarada, 14 de 24 meses | `DERIVAR_A_MEDICO_AUDITOR` |
| `PR-2026-0790` | Apendicectomía urgente en hospital fuera de la red | `PRE_APROBADO_CON_CONDICIONES` |

El caso `PR-2026-0701` además responde **qué falta para aprobar**: *«con esos documentos, el caso
pasa a `PRE_APROBADO` y la aseguradora responde $ 2,400.00»*.

Cédulas y pólizas de prueba para el buscador: `8-742-1593`, `8-315-8820`, `3-714-2296`,
`4-118-5471`, `9-233-6604`, `2-641-9038` y la póliza familiar `IS-A-2025-0871`.

## Las reglas que no se negocian

1. **El modelo lee y cita; el código decide.** La cobertura la resuelve la póliza, no un modelo.
2. **Sin cita textual no hay dato.** Cada campo que el agente usa tiene que existir literalmente en
   el documento, y su valor tiene que salir de esa cita. Si el informe se contradice (dos montos
   distintos), ese dato no se usa.
3. **El modelo no puede inventar.** Su respuesta se acepta campo por campo y solo si el fragmento
   que cita aparece en el informe **y el valor sale de ese fragmento**: un monto de $ 1,000.00 que
   cita la línea de $ 4,200.00 se descarta. El carácter tiene que estar en el catálogo, los
   documentos también se citan uno por uno, y el modelo nunca pisa lo que las reglas ya resolvieron.
4. **Lo que el informe no declara no se adivina.** Sin carácter (electiva o urgencia) o sin
   declaración de preexistencias dentro de su carencia, el caso deriva al médico auditor. Un
   documento negado («pendiente estudio de imagen») no cuenta. La cédula y la póliza del informe
   solo se toman junto a su rótulo: una fecha o un teléfono no se convierten en una persona.
5. **Todo en centavos enteros**, y los montos de una aprobación cuadran contra lo facturado.

## Arquitectura

```
src/domain/   dinero.ts          todo el dinero en centavos (el modelo nunca toca una cifra)
              evidencia.ts       cita textual verificada como subcadena, con offset al original
              poliza.ts          compilador: el texto legal pasa a cláusulas indexadas
              motor.ts           motor determinista: evidencia → vigencia → cobertura → red →
                                 preexistencias → carencias → documentos → tope y umbral
              lectura.ts         lector por reglas (determinista, sin costo, sin red)
              lectura-modelo.ts  lector con modelo + la regla de la cita + respaldo por reglas
              busqueda.ts        buscador por cédula o póliza, con o sin guiones
              numeros.ts         cédulas panameñas y pólizas dentro de un texto
              presentacion.ts    resumen.ts   lo que la web pinta, ya resuelto
src/ocr/      leer-documento.ts  OCR en el servidor (Tesseract, modelo de idioma local, sin red)
src/data/     corpus sintético: 3 pólizas con su texto legal, 6 casos, tarifario e informes trampa
src/notion/   cliente.ts (fetch, API 2026-03-11), mapeo.ts y seguridad.ts (quién puede escribir)
app/          Next.js en el servidor; los informes y las fotos viajan por POST, nunca en la URL
scripts/      puertas de calidad, probar-ocr, probar-proveedor y notion-preparar (crea las bases)
```

Más detalle en [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md).

## Despliegue

La web se publica en Vercel. Variables de entorno (nunca en el repositorio; plantilla en
[`.env.example`](.env.example)):

```
ANTHROPIC_API_KEY           # lectura con Claude Sonnet 5 (medido: 36/36, 0 aprobaciones indebidas). Tiene prioridad.
GOOGLE_API_KEY              # alternativa: Gemini (por defecto gemini-2.5-flash; Google la retira desde el 16-oct-2026)
GROQ_API_KEY                # alternativa: Groq (por defecto openai/gpt-oss-120b)
OPENAI_API_KEY              # alternativa: OpenAI (por defecto gpt-4o-mini)
MODELO_LECTURA              # opcional: otro modelo del proveedor elegido
NOTION_TOKEN                # integración de Notion
NOTION_FUENTE_CASOS         # id de la fuente de datos de la base Casos
NOTION_FUENTE_POLIZAS       # id de la base Pólizas
NOTION_FUENTE_DECISIONES    # id de la base Decisiones
```

Sin ninguna variable el sitio funciona: el buscador, los casos y `/leer` dictaminan con la lectura
por reglas. Pero **sin clave de modelo los informes en prosa no se dictaminan bien**, y el reto pide
leer con IA.

**Antes de publicar con una clave**, correr con esa clave en el entorno:

```bash
npm run probar:proveedor
```

Pasa 13 informes con dictamen conocido (7 en prosa y 6 trampas) por el mismo camino que `/leer`.
Sale con 1 si hay una aprobación indebida o si el modelo no está leyendo y todo cae a reglas; con 2
si no hay clave. Solo Claude Sonnet 5 está medido con el banco completo.

Las fotos se reducen en el teléfono antes de subir; el servidor acepta hasta 4 MB por foto.

## Aviso

Todos los datos son **sintéticos**: pólizas, hospitales, pacientes, cédulas y montos son inventados
para la demostración, y las fotos de ejemplo están marcadas como documentos ficticios. No hay datos
reales de pacientes ni de ninguna aseguradora.

Licencia MIT.
