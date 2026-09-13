# Reto 1 · Pre-autorización quirúrgica — contrato de decisión y plan de 3 días

Equipo Jajanken · hackIAthon Panamá 2026 (reto clasificatorio) · 13–16 de septiembre de 2026

---

## 0. La frase que vende el proyecto

> **El agente no autoriza: dictamina con la póliza en la mano.**
> El modelo lee y cita; la póliza decide. Cada dato de la decisión viaja con la cláusula
> exacta de la que sale. Si un dato no tiene cita textual, no existe: el caso cae a
> "documentos faltantes" en vez de aprobarse.

Todo lo demás (UI, Notion, PDF) está al servicio de esa frase.

---

## 1. Por qué este reto y no otro (para el PDF de herramientas y para el pitch)

| Criterio del filtro | Cómo lo cumple el reto 1 |
|---|---|
| Capacidad de análisis | El problema real no es "falta IA", es que la autorización se decide sobre un texto legal (la póliza) que nadie puede leer a mano en minutos. |
| Criterio técnico | Se separa lo que el LLM hace bien (leer y extraer) de lo que no puede hacer (decidir cobertura). El motor de decisión es determinista y auditable. |
| Ejecución con IA | Corre en una URL pública, con los casos de prueba a un clic, y con la decisión escrita de vuelta en Notion. |

Anti-patrón que evitamos y que hay que decir en el pitch: *"le pedimos a un LLM que diga si
está cubierto"* es un juguete que no pasa una auditoría ni un reclamo. Aquí no se hace eso.

---

## 1.5 Lo que ya tenemos resuelto (MAM y Chen) — y lo que no aplica

| Lo aprendido | Cómo entra en este reto |
|---|---|
| **MAM:** el modelo extrae, el código clasifica | El modelo lee y cita; la póliza decide con reglas deterministas |
| **MAM:** cada dato con su cita textual, verificada como subcadena del original | Cada campo de la decisión con su cláusula; sin cita, el caso cae a "documentos faltantes" |
| **MAM:** hallazgos auditados congelados como comprobaciones (`check-auditoria.mjs`) | `check:decision`: 0 decisiones sin cláusula, y la misma decisión dos veces |
| **MAM:** clon limpio + `npm ci` + check antes de cada push (la lección del `.gitignore` que se comió el grabador) | Con tres personas pusheando en tres días, es lo que evita que el jurado abra un repo que no compila |
| **Chen:** importes en centavos enteros y el modelo que no calcula plata | Deducible, coaseguro y topes en centavos enteros; el LLM nunca toca una cifra |
| **Chen:** dominios separados para no contar dos veces el mismo dinero | No contar dos veces entre deducible / coaseguro / tope, ni mezclar lo que paga la aseguradora con lo que paga el paciente |
| **Chen:** la portada avisa que los datos son ficticios, y lo que se afirma se enseña en pantalla | Corpus sintético declarado en portada y README; cada cifra del pitch, visible en la app |

**No aplica:** inferencia local obligatoria, Electron, instalador y accesos directos (el launcher de
Chen existió justamente porque el jurado tenía que abrir una aplicación local). Aquí el entregable es
una **URL pública**: esa fricción desaparece sola.

**Regla de la casa:** si se reusa código de MAM o Chen, se declara en el README con el commit de
origen. Reusar es legítimo; no declararlo, no.

---

## 2. Contrato de decisión (esto es lo que se codifica)

### 2.1 Póliza (`Policy`)

```
id, aseguradora, plan, versión
vigencia: {desde, hasta}
red: [{hospital, nivel, ciudad}]           // la red importa: fuera de red cambia el coaseguro
deducible_anual, coaseguro_pct, tope_anual
carencias: {maternidad_meses, cirugia_electiva_meses, preexistencias_meses, ...}
procedimientos: [{cups, nombre, cubierto, red_only, requiere_preauth, condiciones[]}]
exclusiones: [{id, texto, clausula}]
requisitos_documentales: [{tipo_procedimiento, documentos:[{id, nombre, clausula}]}]
clausulas: [{id, texto, offset}]            // el texto completo, indexado
```

### 2.2 Informe médico (`Case`)

```
id, hospital, fecha, paciente_ref (anónimo), edad, sexo, fecha_afiliacion
diagnostico_cie10, procedimiento_solicitado_cups, cirujano, caracter (electiva|urgente|emergencia)
hallazgos, estudios_adjuntos[], preexistencias_declaradas[], documentos_adjuntos[]
```

### 2.3 Decisión (`Decision`)

```
estado: PRE_APROBADO | PRE_APROBADO_CON_CONDICIONES | DOCUMENTOS_FALTANTES
      | NO_CUBIERTO | CARENCIA_NO_CUMPLIDA | DERIVAR_A_MEDICO_AUDITOR
monto_autorizado, deducible_aplicado, coaseguro_aplicado
faltantes: [{documento, clausula_que_lo_exige}]
motivos: [{regla, resultado, clausula, cita_textual, offset}]
campos: [{campo, valor, cita_textual, offset, confianza}]   // confianza = ¿la cita se verificó?
tiempo_ms
```

### 2.4 Orden de evaluación del motor (determinista, en este orden, sin LLM)

1. **Vigencia** de la póliza a la fecha del informe.
2. **Cobertura** del procedimiento (CUPS en la lista, `cubierto`, red del hospital, exclusiones).
3. **Carencias y preexistencias** (antigüedad de afiliación vs. meses exigidos).
4. **Requisitos documentales** del tipo de procedimiento.
5. **Topes, deducible y coaseguro** → monto que le toca al paciente y a la aseguradora.

El primer paso que falla **para** el circuito y fija el estado. Los pasos posteriores no se
"adivinan": se informan como faltantes o condiciones.

### 2.5 El invariante que se congela en CI (`check:decision`)

- Ninguna decisión sale sin al menos una cláusula citada.
- Todo campo que una regla usa tiene cita textual **verificada como subcadena** del documento
  original (con offset).
- Un campo sin cita no puede sostener un `PRE_APROBADO`: el caso cae a `DOCUMENTOS_FALTANTES`.
- El mismo caso, corrido dos veces, da la misma decisión (motor determinista).

Es la misma disciplina que ya usamos en MAM (hallazgos auditados convertidos en comprobaciones
permanentes) y es el punto que más impresiona a un jurado técnico.

### 2.6 El extra que llaman la atención todos: **"qué falta para aprobar"**

Además del estado, el agente corre el motor con los faltantes resueltos y responde:
*"si el hospital adjunta el informe de anestesiología y el estudio de imagen, este caso pasa a
PRE_APROBADO por USD X"*. Nadie más lo va a tener, cuesta poco y es exactamente lo que necesita
la oficina de facturación del hospital.

---

## 3. Los 6 casos de la demo (a un clic cada uno)

| # | Caso | Estado esperado | Se ve en pantalla |
|---|---|---|---|
| 1 | Colecistectomía, plan A, red, 3 años afiliado, todo adjunto | `PRE_APROBADO` | Deducción y coaseguro calculados + cláusulas |
| 2 | Cirugía electiva con 2 meses de afiliación (pide 3) | `CARENCIA_NO_CUMPLIDA` | Cláusula de carencia + fecha desde la que sí aplica |
| 3 | Procedimiento estético (exclusión) | `NO_CUBIERTO` | Cláusula de exclusión, textual |
| 4 | Falta informe de anestesiología y estudio de imagen | `DOCUMENTOS_FALTANTES` | Lista exacta de lo que falta, con la cláusula de cada requisito + **qué falta para aprobar** |
| 5 | Preexistencia declarada con 14 de 24 meses | `DERIVAR_A_MEDICO_AUDITOR` | Carencia de preexistencia + motivo de derivación |
| 6 | Urgencia vital fuera de red | `PRE_APROBADO_CON_CONDICIONES` | Red, coaseguro distinto, condiciones |

Los 6 se escriben a mano (informes y pólizas sintéticas pero realistas: CUPS, CIE-10, red de
hospitales panameños ficticios). **El corpus es el activo**: sin buenos casos de prueba, el
motor se ve de juguete.

---

## 4. Plan de 3 días (13 → 16 sep)

**Meta interna: martes 16 de septiembre, 8:00 p.m.** Si la fecha oficial resulta ser el 23
(ver Bases), quedan 6 días de pulido y no se pierde nada.

### Día 1 — hoy
- Repo público + despliegue vacío **en Vercel/Cloudflare con URL pública desde hoy**. El enlace
  existe el día 1: nunca hay riesgo de quedarse sin entregable.
- Corpus sintético: 2–3 pólizas + 6 informes + catálogo de procedimientos.
- Tipos y esquemas (zod) + motor de decisión con reglas 1–5 y pruebas.
- `check:decision` en CI.

### Día 2
- Extracción con LLM y salida estructurada + **evidencia obligatoria por campo** (cita + offset).
- Pantalla del caso: informe ↔ campos extraídos ↔ decisión, con el panel **"¿por qué?"**.
- Integración Notion: leer el caso de la base "Casos" y escribir la decisión en "Decisiones".
- PDF de respuesta al hospital.

### Día 3
- Los 6 casos como botones, cronómetro por caso, métrica de la portada (72 h → X s, y
  "0 decisiones sin cláusula citada").
- README con la pared de casos y `DECISIONES.md` (un repo sin documentación clara se lee como abandono).
- Bot de Telegram **solo si** los seis casos y la URL ya están cerrados (ver sección 6).
- Ensayo de la demo de punta a punta, en ventana de incógnito, con la URL limpia y sin claves
  visibles. Envío al correo.

### Línea de corte (si algo se atrasa)
Lo primero que se cae es el **bot de Telegram**, después la **escritura en Notion** (queda como
lectura + captura). Lo que no se negocia: motor determinista, cláusula citada, panel "¿por qué?",
URL pública con los 6 casos.

### Riesgo técnico ya identificado
- En la máquina no hay claves de LLM ni `vercel` instalado. Hace falta una clave server-side
  (Gemini free tier o Groq) como variable de entorno del hosting, **nunca en el repo**.
- **Los 6 casos se cachean**: la decisión va precalculada y la extracción también. Si el jurado
  abre el enlace con la cuota agotada o sin red, la demo sigue funcionando igual. Eso se dice en
  el README: el motor es determinista, el LLM solo lee.

---

## 5. Reparto propuesto (confirmar con Josué y Juanchi)

| Quién | Qué |
|---|---|
| **Josué** | Extracción con evidencia + motor de decisión + `check:decision` + CI (es su terreno: MAM) |
| **Diego** | Corpus sintético (pólizas, informes, procedimientos), narrativa del pitch, ensayo de demo |
| **Juanchi** | Web app (UI de casos + panel "¿por qué?" + PDF), despliegue, integración Notion |
| **Hermes (yo)** | Corpus sintético en paralelo, revisión del motor contra el contrato, auditoría antes de enviar, textos de la ficha y del PDF |

---

## 6. El bot de Telegram — vale la pena, pero solo en una versión

Vale la pena **si el bot es donde el humano firma**, no donde llega el mensaje.

**La versión que NO hay que construir** (decoración): un bot que recibe el caso por chat o que
contesta preguntas sobre la póliza. Duplica la web, no aporta nada que un jurado no haya visto mil
veces y no cambia ninguna decisión.

**La versión que SÍ** — firma del auditor médico, con el humano en el circuito. El motor dictamina
y, cuando el resultado es `DERIVAR_A_MEDICO_AUDITOR` o el monto pasa el umbral del plan, el caso
**no se cierra solo**. Llega al auditor con tres botones:

```
Caso PR-2026-0417 · Plan A · Red
Procedimiento: colecistectomía (CUPS 512301)
Dictamen del motor: DERIVAR — preexistencia declarada, 14 de 24 meses
[ Aprobar ]  [ Rechazar ]  [ Pedir documentos ]
```

El auditor toca, y la decisión vuelve a Notion **con su nombre y la hora**. Un segundo mensaje va
al hospital: *"faltan informe de anestesiología y estudio de imagen (cláusula 7.2)"* — el caso se
descongela en minutos, no en días.

Por qué esta versión: refuerza la frase que vende el proyecto. **El motor dictamina, el humano
firma, y la firma queda registrada.** Ningún otro equipo va a mostrar eso.

**Tres reglas de oro**

1. **No reciclar TARS.** Sirve para contar la experiencia, no para la entrega: vive en un teléfono,
   depende de que el teléfono esté encendido y su cerebro queda fuera del repositorio — un jurado no
   puede verificar nada de lo que corre ahí. Un bot propio con la Bot API son ~50 líneas, y quedan
   auditables en el repo.
2. **Sin datos clínicos en el mensaje.** Se envía referencia del caso + dictamen + enlace al detalle;
   el informe y la póliza se quedan en Notion. Eso un jurado lo lee como criterio de cumplimiento,
   no como ocurrencia.
3. **Se construye al final, con línea de corte.** Bot API + webhook + botones son horas, no días.
   Si el día 3 a las 2 p.m. no funciona, se corta y se sigue con la web y Notion.

Y si el jurado no tiene Telegram: el bot es un canal extra. La web muestra el mismo panel de firma,
así que la demo nunca depende de que alguien instale algo.

## 7. Checklist de entrega (solo lo que dicen el reto y el correo)

- [ ] Solución **funcional** de **un solo** reto (estos cinco se eligen: uno y solo uno).
- [ ] **Enlace público del agente funcional** — URL que el jurado abre y usa sin instrucciones.
- [ ] **Enlace del repositorio** en GitHub o GitLab.
- [ ] Enviado a **hackiathon@viamatica.com** dentro de los **3 días** siguientes al correo
      (recibido el domingo 13 a las 9:57 a.m. → vence el **miércoles 16 a las 9:57 a.m.**).
- [ ] Verificación final: abrir la URL en ventana de incógnito, sin claves visibles, y correr los
      6 casos de punta a punta.
