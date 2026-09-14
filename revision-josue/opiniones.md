# Opiniones y rumbo

Esto es criterio, no evidencia. Se discute. Donde hay un dato, va citado.

## 1 · La tesis está bien elegida

«El modelo lee, la póliza decide» es exactamente lo que el mercado considera defendible:
- Cohere Health resuelve en tiempo real alrededor del 85% de las solicitudes y deja la firma
  clínica para el resto.
- Anterior entrega cada resultado con el criterio exacto de la póliza que lo sostiene.

Y es lo contrario de lo que terminó en demandas:
- **UnitedHealth, nH Predict:** cerca del 90% de las negativas apeladas se revertían.
- **Cigna, PXDX:** según la demanda, más de 300.000 negativas a 1.2 segundos por reclamo.

**No cambiaría el rumbo. Cambiaría dónde se ponen los límites al modelo (H-01, H-02).**

## 2 · Que el agente apruebe solo, pero que no niegue solo

Hoy el motor emite `NO_CUBIERTO` y `CARENCIA_NO_CUMPLIDA` sin intervención humana. Propongo:
- **Aprobación:** automática. Es donde la velocidad le sirve al paciente.
- **Negativa:** sale como **propuesta**, con su cláusula, y una persona la firma en la web o en
  Notion.

Es barato: un estado más en la base Decisiones. Además responde la pregunta que un jurado con
criterio de negocio va a hacer. El otro equipo que resolvió el mismo reto lo tiene como regla
explícita: «el modelo no niega una cirugía».

## 3 · Notion como entrada real, no como vitrina

El enunciado dice «reciba el informe y la póliza en una base de datos de Notion». Hoy la ruta de
Notion trae documentos, preexistencias y carácter ya estructurados en columnas, así que no hay nada
que leer. Propongo que el informe viva como **prosa en el cuerpo de la página**, que el agente la
lea con el mismo lector de `/leer` y que el dictamen se escriba de vuelta.

## 4 · Hay otro equipo con el mismo reto, público y en línea

`JuanKsPty/preautorizacion-quirurgica`, desplegado en `preauth.juank.tech` desde el 11 de
septiembre. Por su README y su `/api/health`:
- FastAPI con Postgres;
- cuatro bases de Notion, con lectura y escritura;
- un modelo Claude activo con herramientas deterministas;
- 8 casos;
- la misma tesis que la nuestra.

Lo que hacen y **nosotros no mostramos todavía:**
- rechazan cualquier cifra de la carta que no salga de una herramienta;
- el modelo no puede negar;
- transmiten el razonamiento en vivo;
- detectan preexistencias en la narrativa.

Lo que tenemos y **ellos no muestran:**
- la cita señalada dentro del informe original, con su posición;
- el «qué falta para aprobar» con el monto;
- y, si lo publicamos, **una batería de informes trampa con la cifra de aprobaciones indebidas**.
  Esa es la diferencia que yo defendería.

## 5 · Qué cortar para llegar al miércoles

**Se queda:**
- URL pública;
- H-01 a H-03 arreglados;
- Notion de ida y vuelta;
- batería de trampas en cero aprobaciones indebidas.

**Se va:** Telegram, el PDF de respuesta y el video. La firma humana del punto 2 puede vivir en la
web sin Telegram.

## 6 · Plataforma

- **Formato:** web con URL pública. Ni app de escritorio ni PWA: el jurado abre un enlace. Vercel
  está bien; hay que confirmar que acepte Node 24.
- **Modelo local:** probé los modelos pequeños de Ollama con informes difíciles
  (`pruebas/ollama-lectura.mjs`). qwen3:1.7b acertó 7/9 campos en 6–15 s y qwen2.5:1.5b, 6/9 en
  2.5–12 s. No sirven para la URL; hace falta un modelo en la nube.
- **Esquema de la respuesta:** fijar el catálogo con `enum` en el esquema, no en el prompt. En otro
  proyecto del equipo eso hizo lo que cuatro redacciones del prompt no lograron.

## 7 · Identidad visual (propuesta)

La página [dictamen-2026-09-14.html](dictamen-2026-09-14.html) ya está hecha con esta propuesta.

**Paleta «Petróleo clínico».** El petróleo está a medio camino entre el verde del hospital y el azul
de la aseguradora, que es justo el puente que hace el producto.

| Token | Claro | Oscuro |
|---|---|---|
| Fondo | `#F4F7F7` | `#0C1A1E` |
| Superficie | `#FFFFFF` | `#132429` |
| Tinta | `#10262D` | `#E6F0F1` |
| Secundario | `#4D6269` | `#9DB3B8` |
| Acento | `#0B5F6E` | `#5FC3D1` |

**Estados, texto sobre lavado claro.** Cada uno lleva además un ícono.

| Estado | Texto | Lavado |
|---|---|---|
| Pre-aprobado | `#1D6B3F` | `#E3F2E8` |
| Con condiciones | `#1F5A9E` | `#E2ECF8` |
| Documentos faltantes | `#7A5200` | `#FBF0D4` |
| Carencia no cumplida | `#8F3F0C` | `#FBE6D8` |
| No cubierto | `#A8201A` | `#FBE3E1` |
| Deriva al auditor | `#5A3E9E` | `#ECE6F8` |

Todos los pares pasan WCAG AA; el mínimo es 5.62:1 (`pruebas/contraste-paletas.mjs`).

**Tipografía de tres voces, una por fuente de verdad:**
- **Atkinson Hyperlegible Next** para lo que dice el agente. Distingue 0/O y 1/l/I, que importa en
  códigos como K80.10.
- **Source Serif 4** para lo que dice la póliza: una cláusula tiene que verse como texto legal.
- **Atkinson Hyperlegible Mono** para lo que dice el informe: citas, CUPS y montos.

Las tres están en Google Fonts.
