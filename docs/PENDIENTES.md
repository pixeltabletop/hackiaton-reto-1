# Pendientes y bloqueos

Estado al lunes 14 de septiembre. Vence el **miércoles 16 a las 9:57 a.m.** (3 días desde el correo).

## Para empezar en tu máquina (Josué, Juanchi)

```bash
git clone https://github.com/pixeltabletop/preautorizacion-quirurgica
cd preautorizacion-quirurgica
npm ci                 # versiones fijadas por package-lock.json
npm run dev            # http://localhost:3000
npm test               # 48 pruebas, sin dependencias extra
npm run check          # pruebas + puerta del dictamen + informes trampa
npm run check:trampas -- --estricto   # lo que falta arreglar del lector (hoy 0 casos en deuda)
```

**No hace falta ninguna clave para trabajar**: sin `ANTHROPIC_API_KEY` (ni `GOOGLE_API_KEY`) el sistema lee por reglas y sin
`NOTION_TOKEN` la web dictamina con el corpus. Las claves solo encienden funciones extra.

Ramas sugeridas, para no pisarnos:

- `josue/lectura-modelo` — tu terreno (ver `docs/ARQUITECTURA.md`, sección «Dónde se engancha lo que falta»).
- `juanchi/web-notion` — la web y la integración de Notion.
- `main` se queda con lo que ya está verde en CI.

Antes de subir: `npm run check` tiene que salir 0. La puerta de calidad falla si algún caso cambia de
dictamen, si una decisión sale sin cláusula citada o si los montos no cuadran. Si una prueba se pone
roja, **no ajustes la prueba sin decirlo**: puede ser un hallazgo real.

## Entregables (solo dos, los del correo)

| Entregable | Estado |
|---|---|
| Enlace del repositorio | ✅ https://github.com/pixeltabletop/preautorizacion-quirurgica (público, MIT, CI verde) |
| Enlace público del agente en ejecución | ⏳ falta desplegar (ver Vercel) |

## Bloqueos y qué desbloquea cada uno

### 1. Notion — bloquea la integración del reto

El reto pide que el informe y la póliza lleguen en una base de datos de Notion. El código está
escrito y probado; falta la conexión.

Pasos (una sola vez):

1. `notion.so/my-integrations` → *New connection* (interna, con permiso de **leer** e **insertar**
   contenido).
2. Abrir la página padre en Notion → menú `···` → **Conexiones** → añadir la conexión.
   *Sin este paso la API responde 404 aunque el token sea correcto.*
3. Guardar el token en `.secrets/notion-token.txt` (está en `.gitignore`).
4. Correr: `npm run notion:preparar -- --pagina <id-o-url de la página padre>`.
   El script crea las tres bases (**Pólizas**, **Casos**, **Decisiones**) con su esquema, carga el
   corpus y **imprime las variables de entorno** que hay que copiar a `.env.local` y a Vercel.

Después de eso, `/notion` lee los casos pendientes en vivo y escribe la decisión de vuelta.

### 2. Vercel — bloquea el segundo entregable

**Ahora: solo la cuenta.** (Diego.) Entrar a `vercel.com` con **Continue with GitHub** y autorizar.
Plan Hobby (gratis, sin tarjeta). No importar el proyecto todavía: importarlo dispara el primer
despliegue, y eso se hace cuando el momento llegue.

**El momento** (cuando Josué diga que ya subió al repo), dos minutos, sin decisiones pendientes:

1. Vercel → *Add New… → Project → Import Git Repository* → `pixeltabletop/preautorizacion-quirurgica`.
   Si no aparece: *Adjust GitHub App Permissions* y dar acceso a ese repo. Framework: Next.js
   (lo detecta solo). Root Directory: la raíz.
2. Antes de pulsar Deploy, *Environment Variables* (Production y Preview):
   `ANTHROPIC_API_KEY` y, si ya corrió el script de Notion, `NOTION_TOKEN`,
   `NOTION_FUENTE_CASOS`, `NOTION_FUENTE_POLIZAS`, `NOTION_FUENTE_DECISIONES`.
3. Deploy (1–2 minutos) y copiar la URL de producción.
4. Dos comprobaciones en el panel, que son las trampas típicas:
   - *Settings → General → Node.js Version*: **24.x** (el repo declara `engines: >=24`).
   - *Settings → Deployment Protection*: **desactivado en Production**. Si queda activo, el jurado
     ve un inicio de sesión de Vercel en vez del agente.
5. Verificar la URL desde afuera, sin sesión: `/`, `/leer` y `/notion` tienen que responder, y el
   formulario de `/leer` tiene que dictaminar de verdad.

Desde el primer despliegue, cada push a `main` publica solo: lo que suba Josué queda en línea sin
que nadie toque el panel.

### 3. Clave de modelo (opcional, recomendada)

- **Elegido: Claude Sonnet 5** con esfuerzo bajo (banco de la revisión: 36/36, 0 aprobaciones indebidas, unos 5 s por informe, USD 0.009 por informe). Guardar la clave como `ANTHROPIC_API_KEY` en `.env.local` y en Vercel.
- Alternativa: Google AI Studio (gratis) → `GOOGLE_API_KEY`. Sin medir en el banco.
- Sin la clave, `/leer` funciona con el lector por reglas (determinista, sin costo, sin red).
- Con la clave, el modelo completa los campos que las reglas no encuentran, **y solo los acepta si
  puede citar textualmente** el fragmento del informe. Si el modelo falla, cae a reglas: nunca deja
  el dictamen a medias.

### 4. Accesos del equipo — hecho

- `josweq` (Josué) ✅ con permiso de escritura.
- `Crono15uru` — invitación enviada, **pendiente de aceptar**.

## Riesgos vigilados

| Riesgo | Qué hacemos |
|---|---|
| El jurado pregunta «¿dónde está la IA?» | La lectura con modelo se muestra en `/leer`, con los campos que aportó y los que descartó |
| Notion o el modelo fallan en la demo | La web dictamina igual: el corpus y las reglas están debajo, y el enlace público no depende de tokens |
| El plazo real fuera el 16 y no el 23 | Se trabaja contra el 16. El plan no cambia: primero esto, después pulir |
| Un dato inventado en la decisión | Es imposible por diseño: sin cita textual el motor no aprueba, y hay una prueba que lo verifica |
