# Pre-autorización quirúrgica — el agente que dictamina con la póliza en la mano

Equipo **Jajanken** · Reto 1 del hackIAthon Panamá 2026 · **datos sintéticos**

> **El agente no autoriza: dictamina con la póliza en la mano.**
> El modelo lee el informe del hospital y cita; la cobertura la decide la póliza con reglas
> deterministas. Si un dato no tiene cita textual en el documento, no existe: el caso cae a
> «documentos faltantes» en vez de aprobarse.

Un paciente no debería esperar días para saber si su cirugía está cubierta. Este agente recibe el
informe del hospital y la póliza del paciente y devuelve, en milisegundos, **un dictamen con la
cláusula que lo sostiene** — o la lista exacta de lo que falta y qué pasa si se adjunta.

## Las tres pantallas

| Ruta | Qué es |
|---|---|
| `/` | Los seis casos dictaminados: veredicto, cada regla con su cláusula, reparto del monto, informe con la cita de cada dato. |
| `/leer` | **Pegue un informe y el agente lo dictamina.** Es el agente funcionando sobre un documento que nunca vio. |
| `/notion` | Lee los casos pendientes desde la base **Casos** de Notion y escribe la decisión en **Decisiones**. |

## Cómo correrlo

```bash
npm ci
npm run dev            # la web en http://localhost:3000
npm test               # 22 pruebas: corpus, evidencia, motor, lectura por reglas y con modelo
npm run check:decision # dictamina los seis casos y audita el contrato
npm run check          # las dos anteriores
```

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

## Las reglas que no se negocian

1. **El modelo lee y cita; el código decide.** La cobertura la resuelve la póliza, no un LLM.
2. **Sin cita textual no hay dato.** Cada campo que el agente usa tiene que existir literalmente en
   el documento. Si no se puede citar, el caso no se aprueba.
3. **El modelo no puede inventar.** Su respuesta se acepta campo por campo y solo si el fragmento
   que cita aparece en el informe; y nunca pisa lo que la lectura por reglas ya resolvió.
4. **Todo en centavos enteros**, y deducible + coaseguro + aseguradora tiene que cuadrar contra lo
   facturado. Lo verifica la puerta de calidad en cada push.

## Arquitectura

```
src/domain/   dinero.ts      todo el dinero en centavos (el modelo nunca toca una cifra)
              evidencia.ts   cita textual verificada como subcadena, con offset al original
              poliza.ts      compilador: el texto legal pasa a cláusulas indexadas
              motor.ts       motor determinista: evidencia → vigencia → cobertura → red →
                             preexistencias → carencias → documentos → montos y umbral
              lectura.ts     lector por reglas (determinista, sin costo, sin red)
              lectura-modelo.ts  lector con modelo + la regla de la cita + red de seguridad
              presentacion.ts    todo lo que la web necesita, ya resuelto
src/data/     corpus sintético: 3 pólizas (con su texto legal), 6 casos, tarifario
src/notion/   cliente.ts (fetch, sin SDK, API 2026-03-11) y mapeo.ts (Notion ↔ motor)
app/          Next.js, todo renderizado en el servidor: cero JavaScript en el cliente
scripts/      check-decision.mjs (puerta de calidad) y notion-preparar.mjs (crea las bases)
```

Más detalle en [`docs/ARQUITECTURA.md`](docs/ARQUITECTURA.md) y lo que falta por conectar en
[`docs/PENDIENTES.md`](docs/PENDIENTES.md).

## Despliegue

La web se publica en Vercel. Variables de entorno (nunca en el repositorio):

```
GOOGLE_API_KEY              # opcional: lectura con modelo (Gemini). Sin ella, lee por reglas.
NOTION_TOKEN                # opcional: integración de Notion
NOTION_FUENTE_CASOS         # id de la fuente de datos de la base Casos
NOTION_FUENTE_POLIZAS       # id de la base Pólizas
NOTION_FUENTE_DECISIONES    # id de la base Decisiones
```

Sin ninguna variable el sitio funciona igual: `/` y `/leer` dictaminan con el corpus y con la
lectura por reglas. Es deliberado: **el enlace público no depende de un token.**

## Aviso

Todos los datos son **sintéticos**: pólizas, hospitales, pacientes y montos son inventados para la
demostración. No hay datos reales de pacientes ni de ninguna aseguradora.

Este proyecto reutiliza aprendizajes (no código) de dos entregas anteriores del mismo equipo:
`jajanken-hackathon` (MAM: evidencia citada como subcadena, hallazgos congelados como
comprobaciones) y `Narukami-Hackathon` (Chen: dinero en centavos enteros, dominios separados para no
contar dos veces).
