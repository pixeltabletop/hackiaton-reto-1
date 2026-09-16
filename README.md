# PRIOR AI — el dictamen con la póliza en la mano

Agente de **pre-autorización quirúrgica**: lee el informe del hospital con IA y dictamina contra la
póliza, citando la cláusula que sostiene cada decisión.

**▶ Agente en línea: https://prior-ai-tau.vercel.app** — abre sin credenciales, comprobado sin sesión iniciada.

Equipo **Jajanken** · Reto 1 del hackIAthon Panamá 2026.

> **El agente no autoriza: dictamina con la póliza en la mano.**
> El modelo lee y cita; la cobertura la decide la póliza con reglas deterministas. Si un dato no
> tiene cita textual en el documento, no existe: el caso no se aprueba.

## Aviso

- Es un **prototipo de hackathon**, no un sistema en producción ni un producto de ninguna aseguradora.
- **Todos los datos son sintéticos**: pólizas, hospitales, pacientes, cédulas, montos e informes son
  inventados. Las fotos de ejemplo llevan impreso «MUESTRA · DATOS FICTICIOS».
- No sustituye el criterio del médico auditor: cuando hay criterio médico o un monto alto, **deriva**.

## Por qué se llama PRIOR AI

Por dos cosas a la vez. **Prior** es la pre-autorización, el permiso que la aseguradora da antes de
operar (*prior authorization*). Y prioridad es lo que falta cuando alguien llega a urgencias: quien
atiende necesita saber **en el momento** si esa persona está cubierta, cuánto paga, y a qué hospital
de su red puede llevarla. Eso es lo que el modo ambulancia responde con la cédula o una foto.

## Qué problema resuelve

Hoy el hospital manda el informe a la aseguradora y la respuesta tarda horas o días. El paciente no
sabe si se opera, el hospital no agenda sin carta aval, y a veces la respuesta vuelve como «no
autorizado» sin decir por qué ni qué faltaba.

PRIOR AI recibe el informe y la póliza y devuelve, en milisegundos, un dictamen con **la cláusula
exacta** que lo sostiene: o está cubierto y dice cuánto paga cada quién, o dice **qué papel falta y
cuánto pagaría la aseguradora si se adjunta**.

El diferenciador no es «usamos IA». Es el reparto de trabajo: **el modelo solo lee y cita; la
cobertura la calcula un motor determinista sobre el texto de la póliza**. Medido en un banco de 36
informes con cuatro modelos: reglas + modelo da 36/36 con **cero aprobaciones indebidas**; dejando
que el modelo decida solo, entre **5 y 19 aprobaciones indebidas**.

## Qué es y cómo funciona

1. **Entra un informe**: pegado en la web, o leído de una fila de Notion, o escaneado de una foto.
2. **Lectura**: las reglas extraen lo que pueden; el modelo completa lo que falta y **cada dato viaja
   con el fragmento textual del que salió**. Un dato cuya cita no aparece en el informe se descarta.
3. **Compilación de la póliza**: el texto legal se indexa en cláusulas numeradas con su posición.
4. **Motor determinista**, ocho pasos en orden fijo: evidencia, vigencia, cobertura, red,
   preexistencias, carencias, documentos, tope y umbral. **El primer paso que falla cierra el caso.**
5. **Salida**: estado, motivos con su cláusula citada, reparto del monto y, si falta un documento,
   el contrafactual («con esos documentos pasa a PRE_APROBADO y la aseguradora responde $ 2,400.00»).

La pantalla **«Cómo decide, paso a paso»** (`/flujo`) enseña ese recorrido con diez variantes, e
incluye informes trampa: el mismo informe con una negación, una orden escondida o un rótulo distinto,
para ver que el camino cambia por lo que dice el documento.

### Las pantallas

| Ruta | Qué es |
|---|---|
| `/` | **Buscar al asegurado** por cédula o póliza, tecleada o leída de una foto (OCR en el servidor) |
| `/leer` | **Pegue un informe y el agente lo dictamina.** Dice arriba si hay modelo activo o si lee por reglas |
| `/flujo` | **Cómo decide, paso a paso**, con diez variantes y los informes trampa |
| `/casos` | Los seis casos del corpus, con el porqué de cada uno y el informe con la cita de cada dato |
| `/emergencia` | **Modo ambulancia**: una pantalla, un campo, un botón para escanear |
| `/notion` | Los casos pendientes de la base **Casos** de Notion; al dictaminar, el modelo lee el informe de la fila y la decisión se escribe en **Decisiones** |
| `/api/dictaminar` | `POST caso=<id de página de Notion>`: la misma ruta, sin interfaz |

## Qué sale a la red y qué no

| Parte | Dónde corre | Sale a internet |
|---|---|---|
| Motor de decisión (`src/domain/motor.ts`) | En el servidor, sin red | **No** |
| Lector por reglas (`src/domain/lectura.ts`) | En el servidor, sin red | **No** |
| OCR de fotos (`src/ocr/`) | En el servidor, con Tesseract y el modelo de idioma incluido en el repositorio (`src/ocr/idioma/eng.traineddata`, 5.0 MB) | **No** — el worker tiene `fetch` bloqueado y `npm run probar:ocr` falla si intenta salir |
| Lectura con modelo (`src/domain/lectura-modelo.ts`) | API del proveedor elegido | **Sí**: el texto del informe. Es la única salida |
| Notion | API de Notion | **Sí**, solo si se configura el token |

Sin ninguna clave, la web funciona completa leyendo por reglas: **el enlace público no depende de un
token**. Lo que cambia es que un informe escrito en prosa libre quedará incompleto.

## Máquina donde se midió

Windows 11 Pro (26200), Intel Core i7-1355U, 10 núcleos, 15.6 GB de RAM, Node 24.16.0.
**Todas las cifras de este documento salen de esa máquina**, salvo las de la integración continua,
que corren en Ubuntu en GitHub Actions.

## Modelo y configuración exacta

| Uso | Modelo | Configuración | Medido |
|---|---|---|---|
| Lectura del informe | `claude-sonnet-5` (SDK `@anthropic-ai/sdk` 0.125.0, versión fijada) | esfuerzo `low`, salida estructurada con el esquema de lectura, sin `temperature` | 13/13 informes, mediana 5.0 s, ~USD 0.009 por informe |
| Alternativa medida | `claude-haiku-4-5` | igual | 36/36 en el banco, 8.7 s, ~USD 0.003 |
| Alternativas soportadas **sin medir** | Gemini, Groq, OpenAI | por defecto `gemini-2.5-flash`, `openai/gpt-oss-120b`, `gpt-4o-mini` | correr `npm run probar:proveedor` antes de publicar |
| OCR | Tesseract 7 (`eng`, modelo LSTM) | lista blanca de caracteres, sin red, corte a los 20 s | 2/2 fotos de ejemplo en 2.7 s |

Cambiar el modelo o su configuración invalida las cifras de arriba. Por eso existe
`npm run probar:proveedor`.

## Requisitos mínimos

| | Mínimo | Recomendado |
|---|---|---|
| Sistema | Windows 10/11, macOS o Linux | Windows 11 |
| Node | **24** (`npm ci` falla por debajo; `engines` solo avisa, el lanzador sí se detiene) | 24.16 |
| Memoria libre | 2 GB | 4 GB |
| Disco | 500 MB (393 MB de dependencias + 100 MB de compilación + 5.4 MB del repositorio) | 1 GB |
| Red | Solo para instalar. Para que la IA lea informes, una clave de modelo | — |

## Instalación

### Camino corto: doble clic (Windows)

1. Descargar el proyecto (botón **Code → Download ZIP**, o el archivo de la
   [última versión publicada](../../releases/latest)) y descomprimirlo.
2. Doble clic en **`Iniciar-PRIOR-AI.cmd`**.
3. El lanzador comprueba Node, comprueba que el puerto 3000 esté libre, instala, compila, arranca y
   abre el navegador. Si algo falta, lo dice y se detiene.

La primera vez tarda entre uno y dos minutos (instalación 50 s, compilación 12 s en la máquina de
arriba). Las siguientes, unos segundos.

### Camino desde el código

```bash
git clone https://github.com/pixeltabletop/hackiaton-reto-1
cd hackiaton-reto-1
npm ci
npm run build && npm run start      # http://localhost:3000
```

Para desarrollo: `npm run dev`.

**Para que la IA lea informes en prosa** (opcional, la web funciona sin esto):

```bash
cp .env.example .env.local     # y complete UNA clave de modelo
npm run probar:proveedor       # comprueba que ese modelo sirve, antes de confiar en él
```

> **Trampa conocida:** si el puerto 3000 está ocupado por otro proyecto, Next arranca en otro puerto
> y el navegador queda mirando la aplicación equivocada. El lanzador lo detecta y se detiene.

## Verificación reproducible

```bash
npm run check                          # todo lo que no necesita red ni claves
npm run check:trampas -- --estricto    # cero defectos conocidos: la puerta antes de entregar
npm run probar:ocr                     # el OCR, sin red
npm run probar:proveedor -- --simulado bueno   # la prueba del proveedor, sin clave
```

| Comando | Qué comprueba | Necesita |
|---|---|---|
| `npm test` | 92 pruebas: corpus, evidencia, motor, lectura por reglas y con modelo, búsqueda por cédula y póliza, números en documentos, lectura desde Notion, pasos del flujo y la regla de salida del probador | nada |
| `npm run check:decision` | Los cinco invariantes del contrato sobre los seis casos | nada |
| `npm run check:trampas` | 24 informes trampa: negaciones, rótulos distintos, montos corregidos, órdenes escondidas. Falla si aparece una aprobación indebida | nada |
| `npm run check:color` | Contraste WCAG AA de los 19 pares de color del tema | nada |
| `npm run probar:ocr` | Lee la cédula y la póliza de ejemplo **y falla si el OCR intenta salir a la red o deja cachés** | nada |
| `npm run probar:proveedor` | 13 informes con dictamen conocido por el mismo camino que `/leer`. Sale con 1 ante una aprobación indebida o si el modelo no está leyendo, y con 2 sin clave | una clave de modelo (o `--simulado`) |

**Las puertas se prueban a sí mismas**: `probar:proveedor` tiene su regla de salida en
`src/domain/prueba-proveedor.ts` con pruebas que la rompen a propósito, y `check:trampas` falla si
una trampa deja de probar lo que decía.

La integración continua corre todo lo anterior **más el build de producción**, instalando desde cero
en Ubuntu, en cada push.

## Resultados medidos

| Qué se midió | Resultado |
|---|---|
| Pruebas automáticas | **92 de 92** |
| Informes trampa | **24 de 24**, 0 aprobaciones indebidas, 0 en deuda |
| Reglas del motor cubiertas por una prueba que falla si se quitan | **8 de 8** (eran 3 de 8) |
| Banco de 36 informes, reglas + modelo | **36 de 36**, 0 aprobaciones indebidas (Haiku 4.5, Sonnet 5 y Codex) |
| El mismo banco dejando decidir al modelo | **5 a 19 aprobaciones indebidas** según el modelo |
| Prueba del proveedor con Sonnet 5 real | **13 de 13**, 0 indebidas, 0 caídas a reglas |
| OCR sobre las fotos de ejemplo | **2 de 2**, sin red |
| Contraste del tema | **19 pares**, 0 por debajo de AA |

## Tiempos reales

| Operación | Tiempo |
|---|---|
| Dictamen (motor solo) | 1 a 6 ms |
| Lectura de un informe con Claude Sonnet 5 | 3.6 a 6.9 s (mediana 5.0 s) |
| OCR de una foto | 1.3 a 2.7 s |
| Página del buscador / del flujo | 70 a 173 ms en local; 273 ms en la URL pública |
| OCR en la URL pública, primera foto tras un arranque en frío | hasta 30 s (Tesseract compila el wasm y carga el modelo dentro de la función); las siguientes, segundos |
| Instalación (`npm ci`) | 50 s |
| Compilación (`npm run build`) | 12 s |
| Verificación (`npm run check`) | 5 s |

## Limitaciones conocidas

- **La póliza no se lee con modelo**: su estructura está escrita a mano; el texto legal sí es el que
  se indexa y se cita. Es el siguiente paso más valioso.
- **El deducible no acumula**: se aplica por caso, no contra el histórico anual del afiliado.
- **Tres pólizas y seis casos.** Suficiente para demostrar el criterio, lejos de la variedad real.
- **Sin autenticación real**: la escritura en Notion se limita por origen, por base y por estado del
  caso, no por usuario.
- **Los informes trampa los escribió el mismo equipo** que escribió el lector. Un informe de alguien
  ajeno es la prueba que falta.
- **Solo Claude está medido.** Gemini, Groq y OpenAI funcionan por código, pero sin banco detrás.
- **El OCR reconoce documentos escritos con letra de imprenta**, no manuscritos, y propone un número
  para buscar: nunca escribe en la base.

## Trabajo futuro

Leer la póliza con el modelo, historial del afiliado (deducible y tope acumulados), integración por
HL7/FHIR con el hospital y el core de la aseguradora, y negativas firmadas por una persona.

## Cumplimiento del reto

| Requisito del reto | Cómo se cumple |
|---|---|
| Recibe el informe médico digital y la póliza **en una base de datos de Notion** | Bases `Pólizas`, `Casos` y `Decisiones` creadas por `npm run notion:preparar`; la pantalla `/notion` las lee |
| **Con IA**, analiza si el procedimiento está cubierto | El modelo lee el informe de la fila y cita cada dato (`src/notion/lectura-del-caso.ts`); la cobertura la decide el motor |
| Verifica las **carencias** | Pasos 5 y 6 del motor, cláusulas 3.1 y 3.2, con sus pruebas |
| Emite **preaprobación o solicitud de documentos faltantes** | Seis estados posibles, incluida la lista de faltantes y el contrafactual |
| **De forma instantánea** | 1 a 6 ms el motor; 5 s si además lee un informe en prosa con el modelo |
| Enlace público del agente | Ver arriba, en la cabecera del repositorio |
| Enlace del repositorio | Este |

## Declaración de origen del trabajo

- **Diego Laverde** (`pixeltabletop`): base del proyecto, corpus sintético, motor inicial, identidad
  visual, buscador por cédula, modo ambulancia y OCR.
- **Juan Andrés López** (`Crono15uru`): plantilla de variables de entorno e integración de Notion.
- **Josué Carrillo** (`josweq`): lectura con modelo y la regla de la cita, informes trampa como
  puerta, banco de modelos, lector de cédulas, OCR desplegable, prueba del proveedor y auditoría.

El historial de `main` conserva los commits de las tres personas, con su autoría.

### Lo que no escribimos nosotros

| Qué | De dónde | Cómo se usa |
|---|---|---|
| Next.js 16, React 19 | Meta y Vercel (MIT) | Servidor y pantallas |
| `@anthropic-ai/sdk` 0.125.0 | Anthropic (MIT) | Llamada al modelo |
| `tesseract.js` 7 y `tesseract.js-core` | Apache 2.0 | OCR en el servidor |
| `eng.traineddata` (modelo de idioma) | Proyecto Tesseract (Apache 2.0) | Incluido en `src/ocr/idioma/` |
| Inter y JetBrains Mono | Google Fonts (SIL Open Font License) | Tipografía, servidas desde el propio sitio |
| Modelos de lenguaje | Anthropic, Google, Groq, OpenAI | Leen el informe; no deciden cobertura |
| **Asistencia de IA en el desarrollo** | Claude Code y Codex CLI | Se usaron para escribir, revisar y auditar parte del código, bajo revisión del equipo |

## Licencias

Código propio bajo **licencia MIT** (ver [`LICENSE`](LICENSE)). Las dependencias conservan la suya,
listadas arriba. Los datos del corpus son sintéticos y del equipo.

## Dónde está todo

| Carpeta | Qué contiene |
|---|---|
| `app/` | Pantallas y rutas de Next.js; los informes y las fotos viajan por POST |
| `src/domain/` | Motor, lectura, evidencia, dinero, flujo y búsqueda. Sin dependencias de la web |
| `src/data/` | Corpus sintético: pólizas con su texto legal, casos, tarifario e informes trampa |
| `src/notion/` | Cliente de Notion, mapeo de filas, seguridad de escritura y lectura del caso |
| `src/ocr/` | OCR en el servidor y su modelo de idioma |
| `scripts/` | Puertas de calidad y probadores (`check-*`, `probar-*`, `notion-preparar`) |
| `docs/` | [Arquitectura](docs/ARQUITECTURA.md) y el [contrato de verificación](docs/verificacion/afirmaciones.md) |
