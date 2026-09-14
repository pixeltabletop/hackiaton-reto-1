# Hallazgos

Sobre `main` en `dfa78fa`. Cada hallazgo trae el comando que lo reproduce, el impacto y una
propuesta. Van por severidad: **crítico** = aprueba lo que no debe; **alto** = el sistema afirma
algo que no cumple; **medio** = riesgo operativo o de privacidad; **bajo** = pulido.

---

## H-01 · Crítico · Con modelo, el valor de un campo no tiene que salir de su cita

**Dónde:** `src/domain/lectura-modelo.ts`, `aceptarDelModelo`. Se verifica
`verificarCita(informe, cita)`, pero nunca se compara `valor` con `cita`.

**Evidencia:** `node --import ./scripts/registro-ts.mjs revision-josue/pruebas/modelo-simulado.mjs`

| Escenario | El modelo devuelve | Debía | Dio |
|---|---|---|---|
| MS-01 · artroscopia con 2 de 3 meses | `caracter: "programada"`, cita `"Carácter: electiva"` | `CARENCIA_NO_CUMPLIDA` | **`PRE_APROBADO`** |
| MS-04 · informe con monto en «USD 4,200.00» | `montoEstimado: "$ 1,000.00"`, cita `"… USD 4,200.00"` | aprobar por $ 4,200.00 o frenar | **`PRE_APROBADO` sobre $ 1,000.00** |
| MS-02 · electiva fuera de red | `caracter: "urgente"`, cita `"Carácter: electiva"` | `NO_CUBIERTO` | `DOCUMENTOS_FALTANTES` |

**Por qué pasa:**
- **Carácter.** Las reglas nunca registran una cita para `caracter`, así que el modelo siempre lo
  puede sobrescribir, y el valor se acepta sin compararlo con el catálogo:
  `valor.toLowerCase() as Caracter`. Un carácter fuera del catálogo apaga a la vez la regla de red,
  la carencia electiva y los requisitos documentales, porque `requisitosDe` devuelve vacío.
- **Monto.** El motor verifica la cita que trae el caso, y esa cita sí existe; pero el monto que
  usa sale del valor.

**Propuesta:**
1. Aceptar un campo solo si su valor normalizado aparece **dentro** de su cita. Para el monto y la
   edad, sacar el número de la cita, no del valor.
2. Validar `caracter` contra el catálogo (`electiva | urgente | emergencia`). Si no cae ahí, se
   descarta, no se castea.
3. Agregar estos escenarios a `lectura-modelo.test.ts`: los seis ya están escritos en
   `modelo-simulado.mjs`, listos para copiar.

## H-02 · Crítico · Con modelo, los documentos adjuntos no exigen cita, y la nota lo esconde

**Dónde:** `lectura-modelo.ts`, `documentos`. Solo se filtra que el id esté entre R1 y R5.

**Evidencia:** escenario MS-03. Informe sin la línea «Documentos adjuntos»; el modelo responde
`documentos: ["R1","R2","R3","R4"]`. Debía dar `DOCUMENTOS_FALTANTES` y dio **`PRE_APROBADO`**.
Además, la nota que ve el usuario dice «no aportó nada nuevo; la lectura por reglas ya estaba
completa», porque `nota` solo cuenta los campos escalares.

**Propuesta:** pedir documentos como objetos `{ id, cita }` con la cita verificada, igual que los
demás campos. Contar documentos y preexistencias en la nota y en `origen`.

## H-03 · Crítico · El lector por reglas aprueba ante negaciones y rótulos distintos

**Dónde:** `src/domain/lectura.ts`, `NOMBRES_DE_DOCUMENTO`, `REGLAS.preexistencias` y
`REGLAS.montoEstimado`.

**Evidencia:** `node --import ./scripts/registro-ts.mjs revision-josue/pruebas/check-informes-trampa.mjs`

| Trampa | Variación | Debía | Dio |
|---|---|---|---|
| TR-10 | «…; pendiente estudio de imagen y orden de anestesiología» | `DOCUMENTOS_FALTANTES` | `PRE_APROBADO` |
| TR-11 | «(no se adjunta orden de anestesiología)» | `DOCUMENTOS_FALTANTES` | `PRE_APROBADO` |
| TR-12 | «Hipertensión desde 2024, sin antecedentes quirúrgicos» | `DERIVAR_A_MEDICO_AUDITOR` | `PRE_APROBADO` |
| TR-13 | la preexistencia rotulada «Antecedentes patológicos:» | `DERIVAR_A_MEDICO_AUDITOR` | `PRE_APROBADO` |
| TR-14 | dos líneas de monto; la segunda, corregida, supera el umbral | `DERIVAR` o `FALTANTES` | `PRE_APROBADO` |

**Por qué pasa:**
- Un documento cuenta en cuanto se nombra, aunque la frase lo niegue.
- `/ninguna|sin antecedentes/` descarta la línea entera si aparece en cualquier parte.
- Si no hay línea «Preexistencias declaradas:», se asume que no hay ninguna: **se falla abierto**.
- `match` toma la primera coincidencia y no ve la segunda.

**Propuesta, fallar cerrado:**
- Un documento precedido de «pendiente», «no se adjunta» o «falta» no cuenta.
- Sin línea de preexistencias, el caso no se aprueba solo: deriva al auditor, o se pide que el
  hospital la declare.
- Dos coincidencias distintas del mismo campo son un conflicto, y un conflicto no se aprueba.

## H-04 · Alto · Las puertas protegen los seis casos, no las reglas

**Evidencia:** `node revision-josue/pruebas/mutaciones.mjs`

| Regla desactivada | ¿`npm run check` lo ve? |
|---|---|
| Vigencia · umbral de auditoría · electiva fuera de red | No (la batería de trampas sí) |
| Tope anual | No, ni con trampas |
| Deducible en cero | No, ni con trampas |
| Exclusiones · evidencia · preexistencias 24 → 12 | Sí |

**Dos causas concretas:**
- **El tope es inalcanzable.** El umbral de auditoría se evalúa antes y en los tres planes es menor
  que el tope (A: 5,000 < 60,000 · B: 3,000 < 40,000 · C: 6,000 < 100,000). Todo monto que llegaría
  al tope ya derivó por umbral.
- **«Los montos cuadran» no puede fallar.** Deducible + coaseguro + aseguradora = facturado se
  cumple por construcción, aunque el deducible sea cero.

**Propuesta:**
- Un caso por regla con los montos esperados **escritos a mano** en el corpus. Por ejemplo, 0417
  debe dar: deducible $ 1,200.00, coaseguro $ 600.00, aseguradora $ 2,400.00.
- Decidir si el tope va antes que el umbral, o si se elimina del contrato hasta que un plan lo pueda
  alcanzar.

## H-05 · Alto · El README y PENDIENTES afirman cosas que hoy no se cumplen

| Afirmación | Dónde | Por qué no se cumple |
|---|---|---|
| «El modelo no puede inventar… y nunca pisa lo que la lectura por reglas ya resolvió» | README, regla 3 | H-01: el carácter siempre se pisa, y el valor puede no salir de la cita |
| «Un dato inventado en la decisión: es imposible por diseño» | `docs/PENDIENTES.md`, riesgos | H-01 y H-02 |
| «Sin cita textual no hay dato… el caso no se aprueba» | README, regla 2 | H-03: documentos, preexistencias y carácter deciden sin cita |

**Propuesta:** o se arreglan H-01 a H-03 antes de enviar, o se suaviza la frase. El jurado lee el
README antes que el código.

## H-06 · Medio · `/leer` usa GET: el informe viaja en la URL y cada recarga llama al modelo

**Dónde:** `app/leer/page.tsx`, `<form method="get">`.

**Por qué importa:**
- Un informe médico, aunque sea sintético, queda en el historial, en los registros del hosting y en
  cualquier enlace compartido.
- Un informe largo choca con el límite de longitud de URL.
- Con clave, recargar la página o que un robot la visite vuelve a llamar al modelo, con su costo.

**Propuesta:** POST con Server Action o route handler. Los ejemplos pueden seguir como enlaces
`?caso=PR-2026-0417`, sin el texto.

## H-07 · Medio · `POST /api/dictaminar` escribe en Notion sin autenticación

Cualquiera con la URL pública puede crear filas en Decisiones y marcar casos como dictaminados.
**Propuesta:** una clave de demostración en una variable de entorno, o limitar la escritura a
casos cuyo id empiece con el prefijo del corpus.

## H-08 · Bajo · Frenos y negativas de más en el lector por reglas

| Trampa | Variación | Debía | Dio |
|---|---|---|---|
| TR-20 | «HOSP. NACIONAL DE PANAMÁ» (hospital de la red abreviado) | `PRE_APROBADO` | **`NO_CUBIERTO`** |
| TR-21 | «USD 4,200.00» | `PRE_APROBADO` | `DOCUMENTOS_FALTANTES` |
| TR-22 / TR-23 | «Carácter: Urgencia» / urgencia sin línea de carácter | `CON_CONDICIONES` | `DOCUMENTOS_FALTANTES` |
| TR-24 | fecha `10/09/2026` | `PRE_APROBADO` | `DOCUMENTOS_FALTANTES` |
| TR-25 | CUPS «51.23.01» | `PRE_APROBADO` | `DOCUMENTOS_FALTANTES` |

TR-20 es el único grave de este grupo: niega en lugar de frenar. Los demás son seguros; el modelo
los puede resolver una vez arreglado H-01.

## H-09 · Bajo · Accesibilidad visual

Medido sobre la app corriendo en `1680b6f`:
- **Contraste:** 919 textos, 0 fallos, mínimo 6.32:1. Bien.
- **Tamaño:** 316 textos miden 11–12 px.
- **Fuente:** la del sistema.
- **Tema:** solo oscuro.
- **Estados:** «aprobado» (`#35D07F`) y «con condiciones» (`#2FD1C5`) tienen casi el mismo tono, un
  problema con daltonismo. El estado sí lleva texto, así que no depende solo del color.

Propuesta de paleta y tipografía en [opiniones.md](opiniones.md).

---

## Lo que está bien y no tocaría

- El motor determinista y el orden de las reglas, con el primer paso que falla cerrando el caso.
- El dinero en centavos enteros y el contrafactual «qué falta para aprobar».
- La evidencia verificada como subcadena con offset al original. Solo hay que exigirla también
  sobre el valor (H-01).
- Que el sitio funcione sin claves, con los seis casos precalculados.
- Que la cita inventada se descarte (MS-05) y que una lista vacía del modelo no borre lo que leyeron
  las reglas (MS-06).
- La resistencia a texto inyectado en el camino por reglas (TR-02).
- El rendimiento: 2.7 ms por dictamen; la portada responde en 5–27 ms.
