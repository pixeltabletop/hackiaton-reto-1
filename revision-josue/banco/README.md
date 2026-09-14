# Banco de lectura

Compara cinco maneras de combinar el lector con el motor y varios modelos, sobre 36 informes con
su dictamen correcto. No es parte del producto: es la evidencia de [`../decisiones.md`](../decisiones.md).

## Corpus

- **6 informes del corpus:** los de `src/data/casos.ts`.
- **23 trampas:** las de `src/data/trampas.ts`, menos el control que repite un informe.
- **7 informes en prosa libre:** los de [`informes-prosa.mjs`](informes-prosa.mjs). Los escribió
  la misma persona que escribió el banco; conviene que alguien más agregue informes que nadie de
  aquí haya visto.

## Correr

Desde la raíz del repositorio. El banco tiene su propio `npm install`, solo para el SDK de
Anthropic.

```bash
cd revision-josue/banco && npm install && cd ../..

# llamadas a modelos (se guardan en cache/ y no se repiten)
node --import ./scripts/registro-ts.mjs revision-josue/banco/correr.mjs --proveedores haiku,sonnet --paralelo 4
node --import ./scripts/registro-ts.mjs revision-josue/banco/correr.mjs --proveedores qwen,qwen-sin-esquema --paralelo 1
node --import ./scripts/registro-ts.mjs revision-josue/banco/correr.mjs --proveedores codex --paralelo 4

# evaluación: sin llamadas, se repite gratis después de cada cambio del código
node --import ./scripts/registro-ts.mjs revision-josue/banco/evaluar.mjs
```

Requisitos por proveedor:
- **`haiku` y `sonnet`:** `ANTHROPIC_API_KEY`.
- **`qwen`:** Ollama local con `qwen3:1.7b`.
- **`codex`:** la CLI de Codex con sesión iniciada. Se llama con la entrada estándar cerrada y
  desde una carpeta vacía.

## Archivos

| Archivo | Qué hace |
|---|---|
| `corpus.mjs` | Arma los 36 informes con su dictamen esperado |
| `proveedores.mjs` | Anthropic (salida estructurada con esquema), Ollama (con y sin esquema) y Codex CLI |
| `correr.mjs` | Dos tareas por informe: `lectura`, con la instrucción real del producto, y `decision`, donde el modelo dictamina solo |
| `evaluar.mjs` | Variantes V0 a V4 sobre las respuestas guardadas: tabla, resumen y detalle por informe |
| `cache/` | Cada respuesta guardada con tiempo, tokens y modelo exacto |
| `resultados/tabla.md` | La tabla final |
| `resultados/detalle.json` | Qué dio cada variante en cada informe |
| `resultados/antes-dfa78fa.txt` | Las mismas respuestas pasadas por el código original de `main` |
