# Pendientes y bloqueos

Estado al lunes 14 de septiembre. Vence el **miércoles 16 a las 9:57 a.m.** (3 días desde el correo).

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

1. Crear cuenta en `vercel.com` entrando con GitHub.
2. *Settings → Tokens* → crear uno y guardarlo en `.secrets/vercel-token.txt`.
3. Avisar. Con eso se despliega y queda la URL pública, más las variables del punto 1 y 3.

### 3. Clave de modelo (opcional, recomendada)

- Google AI Studio (gratis) → guardar como `GOOGLE_API_KEY` en `.env.local`.
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
