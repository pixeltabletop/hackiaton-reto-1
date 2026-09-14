# Aprender el producto: qué es, cómo funciona y cómo demostrarlo

Guía de estudio para el equipo. Escrita para entenderlo de verdad, no para repetirlo de memoria.
Todo lo que dice acá se puede comprobar en el repositorio o en la app corriendo.

---

## 1. La idea en 30 segundos (esto hay que poder decirlo sin mirar)

Un paciente no debería esperar días para saber si su cirugía está cubierta. Hoy el hospital manda el
informe, la aseguradora lo revisa a mano contra la póliza, y la respuesta tarda horas o días — y a
veces vuelve como «no autorizado» sin decir por qué ni qué faltaba.

Nuestro agente recibe el informe del hospital y la póliza del paciente, y devuelve en milisegundos
un **dictamen con la cláusula que lo sostiene**: o está cubierto y cuánto paga cada quién, o falta
exactamente esta lista de documentos — con el detalle de qué pasa si se adjuntan.

**La frase que lo resume todo:** *el agente no autoriza, dictamina con la póliza en la mano.*

---

## 2. Por qué esto no es otro «wrapper de ChatGPT»

La tentación obvia es pedirle a un modelo «decime si esta cirugía está cubierta». Nosotros no lo
hacemos, y esta es la razón de negocio, no la técnica: **una aseguradora no puede pagar por una
decisión que no puede auditar.** Si mañana el paciente reclama, alguien tiene que poder abrir el
expediente y ver exactamente qué cláusula de qué póliza sostuvo la decisión.

Entonces el trabajo está repartido:

| Quién | Qué hace |
|---|---|
| **El modelo** | Lee el informe del hospital en lenguaje natural y extrae los datos, y por cada dato copia el fragmento textual del que lo sacó |
| **El código** | Aplica la póliza con reglas deterministas: vigencia, cobertura, red, carencias, documentos, montos |

El modelo nunca decide cobertura, nunca calcula un monto y nunca «interpreta» la póliza. Si un dato
no tiene cita textual en el documento, **no existe**: el caso cae a documentos faltantes en lugar de
aprobarse.

---

## 3. Qué hace, paso a paso (con un caso real)

Caso `PR-2026-0417`: mujer de 54 años, colecistectomía laparoscópica (CUPS 512301), Hospital Nacional
de Panamá, afiliada desde 2022, monto facturado $ 4,200.00. Póliza PLAN-A.

1. **Lee** el informe y saca: paciente, edad, hospital, fecha, fecha de afiliación, diagnóstico
   (K80.20), CUPS, cirujano, carácter, monto. Cada dato con su cita.
2. **Vigencia** (cláusula 1.1): la póliza rige del 1 de enero de 2025 al 31 de diciembre de 2026 →
   está vigente.
3. **Cobertura** (cláusula 2.1): el CUPS 512301 figura en el tarifario del plan.
4. **Red** (cláusula 4.1): el Hospital Nacional de Panamá está en la red del plan.
5. **Preexistencias** (cláusula 3.2): no hay ninguna declarada.
6. **Carencia** (cláusula 3.1): cirugía electiva pide 3 meses; lleva más de 3 años.
7. **Documentos** (cláusula 6.1): están los cuatro que exige una cirugía electiva.
8. **Montos** (cláusulas 7.1 y 7.2): facturado $ 4,200.00 − deducible $ 1,200.00 = $ 3,000.00;
   coaseguro del 20 % = $ 600.00; **la aseguradora responde $ 2,400.00 y el paciente paga
   $ 1,800.00**.

Resultado en pantalla: `PRE_APROBADO`, con los ocho pasos, cada uno citando su cláusula.

**El primer paso que falla cierra el caso.** No se sigue calculando plata de algo que no está
cubierto: por eso los casos rechazados muestran «Sin reparto: no se superó la cobertura».

---

## 4. Cómo lo hace por dentro (las cuatro piezas)

```
informe del hospital ──► LECTURA ──────► caso con citas ──┐
                                                          ├──► MOTOR ──► dictamen + motivos
póliza (texto legal) ──► COMPILADOR ──► cláusulas ────────┘        (cada uno con su cláusula)
                          indexadas
```

1. **El dinero en centavos enteros.** Nada de decimales flotantes: $ 4,200.00 son 420000 unidades.
   Así las cuentas cuadran siempre — «deducible + coaseguro + lo que paga la aseguradora = lo
   facturado» se cumple al centavo, y una prueba lo verifica en cada push.
2. **La evidencia como cita textual.** Cada dato viaja con el fragmento exacto del documento del que
   salió y su posición (offset). Se compara normalizado (sin tildes, sin mayúsculas) pero el offset
   apunta al documento original. Si la cita no aparece, el dato se marca como no verificado.
3. **El compilador de pólizas.** El texto legal se indexa en cláusulas numeradas con su posición
   exacta. Eso es lo que permite citar: «cláusula 3.1, que dice literalmente: *los procedimientos
   quirúrgicos electivos requieren 3 meses de afiliación continua*».
4. **El motor determinista.** Ocho reglas en orden fijo. Sin IA, sin azar: el mismo caso da siempre
   el mismo dictamen, y hay una prueba que lo comprueba. Dos milisegundos, en la máquina de un
   jurado.

**El extra que casi nadie tiene — «qué falta para aprobar»:** cuando un caso cae por documentos
faltantes, el motor lo corre otra vez *como si* estuvieran adjuntos y responde: *«con esos
documentos, el caso pasa a PRE_APROBADO y la aseguradora responde $ 2,400.00»*. Eso es lo que
necesita la oficina de facturación del hospital: no un «no», sino qué hacer para que sea «sí».

---

## 5. Vocabulario (para no perderse en una reunión)

| Término | Qué es |
|---|---|
| **Póliza** | El contrato. Texto legal que dice qué se cubre y bajo qué condiciones |
| **Cláusula** | Cada artículo numerado del contrato (2.1, 3.1, 7.2…). Es lo que citamos |
| **CUPS** | Código del procedimiento (ej. 512301 = colecistectomía). En otros países, CPT |
| **CIE-10** | Código del diagnóstico (ej. K80.20 = cálculos en la vesícula) |
| **Carencia** | Tiempo mínimo de afiliación antes de que algo esté cubierto (3 meses para cirugía electiva, 24 para preexistencias) |
| **Preexistencia** | Condición que el paciente ya tenía antes de afiliarse. Se cubre tras su carencia |
| **Deducible** | Lo primero que paga el paciente de su bolsillo antes de que la aseguradora pague algo |
| **Coaseguro** | El porcentaje del resto que asume el paciente (20 % en red, 40 % fuera de la red) |
| **Tope anual** | Máximo que la aseguradora paga por persona al año |
| **Umbral de auditoría** | Sobre cierto monto, la decisión la firma un médico auditor (USD 5,000 en el plan A) |
| **Red** | Los hospitales con los que la aseguradora tiene convenio. Fuera de la red, lo programado no se cubre; la urgencia sí |
| **Preautorización** | El permiso previo de la aseguradora para operar. Sin eso, el hospital cobra a riesgo |
| **Dictamen** | Nuestra salida: estado + motivos + cláusulas + montos |
| **Evidencia / cita** | El fragmento textual del documento que respalda un dato. Sin cita, no hay dato |
| **Contrafactual** | «Qué falta para aprobar»: el mismo caso simulado con los faltantes resueltos |

---

## 6. Los seis casos: qué demuestra cada uno

| Caso | Qué trae | Dictamen | Qué decir cuando lo muestres |
|---|---|---|---|
| `PR-2026-0417` | Colecistectomía en red, todo adjunto, 3 años afiliada | `PRE_APROBADO` | «Caso limpio: aprobado y con el reparto del monto, $ 2,400 la aseguradora» |
| `PR-2026-0518` | Artroscopia electiva con 2 meses de afiliación | `CARENCIA_NO_CUMPLIDA` | «No es un no: es un *todavía no*, y dice desde cuándo sí» |
| `PR-2026-0633` | Rinoplastia estética | `NO_CUBIERTO` | «Está en la cláusula 5.1, textual. El sistema no opina: lee» |
| `PR-2026-0701` | Falta el estudio de imagen y la orden de anestesia | `DOCUMENTOS_FALTANTES` | «Y acá está el remate: dice qué falta y cuánto pagaría si se adjunta» |
| `PR-2026-0744` | Preexistencia con 14 de 24 meses | `DERIVAR_A_MEDICO_AUDITOR` | «Cuando hay criterio médico de por medio, no decide un algoritmo: deriva» |
| `PR-2026-0790` | Apendicectomía urgente fuera de la red | `PRE_APROBADO_CON_CONDICIONES` | «Urgencia vital: se cubre aunque sea fuera de la red, con el coaseguro de fuera de red» |

Los seis casos cubren los seis estados posibles. Eso no es casualidad: hay una prueba que exige que
el corpus represente los seis dictámenes del contrato.

---

## 7. Cómo demostrarlo (guion de dos minutos)

1. **Portada.** «Un paciente espera días para saber si su cirugía está cubierta. Acá son 2
   milisegundos, y cada decisión viene con la cláusula que la sostiene.» Señala las métricas: seis
   dictámenes, **cero decisiones sin cláusula citada**.
2. **Un caso aprobado** (`0417`). Abre «¿Por qué?». Lee un paso en voz alta y su cláusula. Muestra
   el reparto del monto y di que cuadra al centavo.
3. **El caso de documentos faltantes** (`0701`). Baja hasta el recuadro verde: «qué falta para
   aprobar». Ahí se gana al jurado.
4. **`/leer`**: pega un informe nuevo (o pulsa un ejemplo) y dictamínalo delante de ellos. Que vean
   que no es un guion grabado, y que si borrás un dato del informe el caso **deja de aprobarse**.
5. **Si hay Notion conectado:** muestra la fila del caso pasando de «Pendiente» a «Dictaminado» y la
   decisión escrita con sus cláusulas.
6. **Cierre:** «El modelo lee; la póliza decide; y lo que no se puede citar, no se aprueba.»

---

## 8. Los números que SÍ puedes afirmar (y los que no)

**Sí, con respaldo:**

- **54 pruebas** y una puerta de calidad que corre en cada push (GitHub Actions).
- **23 informes trampa** escritos a propósito para intentar engañar al agente (negaciones,
  formatos raros, montos corregidos): **0 aprobaciones indebidas**.
- **Banco de 36 informes × 4 modelos**: reglas + modelo da **36/36 y cero aprobaciones indebidas**
  con Claude Haiku 4.5, Sonnet 5 y Codex. Dejar que el modelo decida solo: entre **5 y 19
  aprobaciones indebidas**. Esa comparación es la prueba de la tesis.
- **2 a 6 milisegundos** por dictamen (el motor; el modelo, si lee, tarda 4-6 segundos).
- Costo medido de la lectura con modelo: **~$0,003 por informe** con Haiku, ~$0,009 con Sonnet.

**No digas** (o dilo con contexto): nada del tipo «9 de 10 aciertos» sin explicar el banco. Un
«acierta 8 de cada 10» en una ficha pública se lee como «falla 2 de cada 10». Las cifras van donde
se pueden explicar.

---

## 9. Las preguntas difíciles (y sus respuestas)

**— ¿Dónde está la IA, si el que decide es un motor de reglas?**
La IA está en leer. El informe llega en texto libre, escrito por un médico, con abreviaturas, con
formatos distintos, a veces en prosa. Convertir eso en datos estructurados y confiables es el
problema difícil, y ahí el modelo es bueno. Decidir cobertura sobre texto legal es el problema donde
el modelo es peligroso, y ahí usamos reglas. Cada uno hace lo que sabe hacer.

**— ¿Y si el modelo se equivoca?**
No puede inventar: cada dato que aporta tiene que venir con el fragmento literal del informe, y ese
fragmento se verifica. Si no aparece, se descarta y queda listado en pantalla. Si el modelo falla o
se cae, hay una lectura por reglas debajo: el dictamen sale igual.

**— ¿Esto reemplaza al médico auditor?**
Al contrario, lo alimenta. Cuando hay criterio médico o un monto sobre el umbral, el caso se deriva
al auditor con todo el trabajo hecho: el informe leído, las cláusulas citadas y lo que falta. El
agente le quita el trabajo mecánico, no la responsabilidad.

**— ¿De dónde sacan las pólizas y los informes?**
Son sintéticos, inventados para la demostración, y están a la vista en el repositorio. La estructura
de la póliza hoy se carga escrita; el texto legal sí es el que se indexa y se cita.

**— ¿Qué pasa con la privacidad de los datos de un paciente?**
Hoy el informe se envía al servidor para leerlo y no se guarda (y por eso dejamos de mandarlo en la
URL, donde quedaba en el historial y en los registros del hosting). Para producción hay que
enmascarar identificadores y firmar un acuerdo de tratamiento de datos. Lo que sí está por diseño:
**no hay datos reales de pacientes en el repositorio**.

**— ¿Es legal?**
El agente propone un dictamen auditable; la decisión y la responsabilidad siguen siendo humanas, y
todo queda con su cláusula. Un sistema así es lo que una aseguradora necesita para poder automatizar
sin perder trazabilidad.

**— ¿Cómo se integraría de verdad?**
Por donde ya entra hoy: una base de datos compartida (Notion en la demo; en producción, la API del
hospital y el core de la aseguradora). Los estándares del sector son HL7/FHIR para datos clínicos;
ahí es donde iría el siguiente paso.

**— ¿Qué falta para producción?**
Tres cosas: leer la póliza con el modelo (hoy su estructura se carga escrita), historial del
afiliado (hoy el deducible se aplica por caso, no acumulado contra el año) y autenticación real
(hoy la escritura en Notion se limita por origen y por estado, sin usuarios).

**— ¿Cuánto cuesta por decisión?**
El motor: cero. La lectura con modelo: entre tres y nueve décimas de centavo por informe, medido.

**— ¿Por qué debería confiar en su dictamen y no en el de otro?**
Porque cada dato y cada decisión traen la cláusula exacta de la póliza y el fragmento exacto del
informe. No hay una caja negra: hay un expediente que se puede auditar línea por línea. Y eso no lo
puede decir nadie que le haya pedido a un modelo «decime si está cubierto».

---

## 10. La verdad honesta (lo que todavía no es)

- Es un **prototipo de hackathon**, no un sistema en producción: sin usuarios, sin auditoría legal,
  sin integración real con un hospital ni con el core de una aseguradora.
- La **póliza no se lee con modelo**: su estructura se carga escrita a mano y el texto legal es el
  que se indexa. Es el siguiente paso más valioso.
- El **deducible no acumula**: se aplica al caso, no contra el histórico del año del afiliado.
- **Tres pólizas y seis casos**: suficiente para demostrar el criterio, lejos de la variedad real.
- La interfaz está pensada para pantalla de computadora; para proyectar en una sala hay que subir
  tamaños de letra.

Decirlas uno mismo, antes de que las diga el jurado, es lo que separa una demo creíble de una
promesa inflada.

---

## 11. Cómo correrlo tú mismo

```bash
npm ci                 # instala (solo la primera vez)
npm run dev            # abre http://localhost:3000
npm test               # las 54 pruebas
npm run check:decision # dictamina los seis casos y audita el contrato
npm run check:trampas  # los 23 informes trampa: no puede haber aprobaciones indebidas
```

**Qué mirar en pantalla cuando quieras aprender más:**
1. Abre un caso y pulsa el desplegable *«Informe del hospital, con la cita textual de cada dato»*:
   vas a ver el informe con cada dato resaltado y la tabla de citas con su posición.
2. Pulsa *«Cláusulas de la póliza aplicadas»*: ahí está el texto legal de cada cláusula usada.
3. Ve a `/leer`, borra un dato del informe de ejemplo (por ejemplo la línea del monto) y vuelve a
   dictaminar: **el caso deja de aprobarse**. Ese es el corazón del producto.
