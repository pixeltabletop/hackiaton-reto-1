# Pre-autorización quirúrgica — agente de dictamen con la póliza en la mano

Equipo **Jajanken** · Reto 1 del hackIAthon Panamá 2026 (reto clasificatorio).

> **El agente no autoriza: dictamina con la póliza en la mano.**
> El modelo lee el informe médico y cita; la póliza decide con reglas deterministas.
> Si un dato no tiene cita textual en el documento, no existe: el caso cae a
> "documentos faltantes" en vez de aprobarse.

Un paciente no debería esperar días para saber si su cirugía está cubierta. Este agente recibe el
informe del hospital y la póliza del paciente, y devuelve en segundos **un dictamen con la cláusula
que lo sostiene** — o la lista exacta de lo que falta y qué pasa si se adjunta.

## Los seis casos (todos sintéticos, a un clic en la app)

| Caso | Qué trae | Dictamen |
|---|---|---|
| `PR-2026-0417` | Colecistectomía electiva, en red, tres años de afiliación, todo adjunto | `PRE_APROBADO` |
| `PR-2026-0518` | Artroscopia electiva con dos meses de afiliación (la póliza pide tres) | `CARENCIA_NO_CUMPLIDA` |
| `PR-2026-0633` | Rinoplastia con fines estéticos (exclusión 5.1) | `NO_CUBIERTO` |
| `PR-2026-0701` | Colecistectomía sin estudio de imagen ni orden de anestesiología | `DOCUMENTOS_FALTANTES` |
| `PR-2026-0744` | Hernioplastia con preexistencia declarada, 14 de 24 meses | `DERIVAR_A_MEDICO_AUDITOR` |
| `PR-2026-0790` | Apendicectomía urgente en hospital fuera de la red | `PRE_APROBADO_CON_CONDICIONES` |

El caso `PR-2026-0701` además responde **qué falta para aprobar**: *"con el estudio de imagen y la
orden de anestesiología, el caso pasa a `PRE_APROBADO` y la aseguradora responde $ 2,400.00"*.

## Cómo correrlo

```bash
node --test "src/domain/*.test.ts"   # 13 pruebas: corpus, evidencia, motor
node scripts/check-decision.mjs      # dictamina los seis casos y audita el contrato
```

La puerta de calidad falla (exit 1) si algún caso da un dictamen distinto al esperado, si una
decisión sale sin cláusula citada, si el motor deja de ser determinista o si los montos de una
aprobación no cuadran contra lo facturado.

## Arquitectura

```
src/domain/dinero.ts      todo el dinero en centavos enteros (el modelo nunca toca una cifra)
src/domain/evidencia.ts   cita textual verificada como subcadena, con offset al documento original
src/domain/poliza.ts      compilador: el texto legal se convierte en cláusulas indexadas
src/domain/motor.ts       motor determinista. Orden: evidencia → vigencia → cobertura → red →
                          preexistencias → carencias → documentos → montos y umbral
src/data/                 corpus sintético: 3 pólizas, 6 casos, tarifario de procedimientos
```

Dos reglas que no se negocian:

1. **El modelo lee y cita; el código decide.** La cobertura la resuelve la póliza, no un LLM.
2. **Sin cita textual no hay dato.** Un campo que no se puede citar no puede sostener una aprobación.

## Estado

- [x] Motor de decisión, corpus de seis casos y puerta de calidad (13/13 en verde).
- [ ] Lectura del informe con modelo y evidencia por campo.
- [ ] Aplicación web pública con los seis casos y el panel "¿por qué?".
- [ ] Lectura y escritura de la decisión en Notion.

## Aviso

Todos los datos son **sintéticos**: pólizas, hospitales, pacientes y montos son inventados para la
demostración. Este proyecto reutiliza aprendizajes (no código) de dos entregas anteriores del mismo
equipo: `jajanken-hackathon` (MAM: evidencia citada como subcadena, hallazgos congelados como
comprobaciones) y `Narukami-Hackathon` (Chen: dinero en centavos enteros, dominios separados para no
contar dos veces).
