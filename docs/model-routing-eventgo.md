# Guía de modelos para ejecutar el plan de EventGO

**Fecha:** 20 de agosto de 2026
**Alcance:** Wedding Seating Chart y Wedding Vendors
**Objetivo:** maximizar el avance incluido en la suscripción de Codex sin gastar el modelo más costoso en tareas que no requieren su profundidad.

## Decisión principal

Usar **GPT-5.6 Terra con razonamiento Medium** como modelo predeterminado para implementar el plan.

Terra es el modelo de trabajo diario para cambios de producción que requieren buen razonamiento y herramientas. Sol se reserva para decisiones difíciles o de alto riesgo. Luna se usa cuando el resultado esperado es claro y repetible.

## Matriz de selección

| Tipo de trabajo | Modelo | Razonamiento | Ejemplos en EventGO |
|---|---|---|---|
| Implementación cotidiana | GPT-5.6 Terra | Medium | Vertical slices, APIs, componentes, integración y pruebas |
| Decisiones difíciles o de alto riesgo | GPT-5.6 Sol | High | Arquitectura, migraciones, permisos, seguridad, pagos y revisión de release |
| Trabajo claro y repetible | GPT-5.6 Luna | Low o Medium | Fixtures, CSV, traducciones, formato, cambios mecánicos y documentación rutinaria |
| Problema excepcionalmente difícil | GPT-5.6 Sol | Max | Sólo después de que Sol High no alcance |
| Trabajo realmente divisible en paralelo | Modelo apropiado | Ultra | Sólo si la tarea tiene partes independientes y el ahorro de tiempo justifica el consumo |

## Distribución recomendada de uso

- **70% Terra:** implementación y validación de cada vertical slice.
- **20% Luna:** trabajo mecánico, repetible o de alto volumen.
- **10% Sol:** decisiones críticas y revisiones de calidad.

Estos porcentajes son una regla operativa de EventGO, no límites oficiales de OpenAI.

## Matriz de skills

Cada tarea debe cargar el conjunto mínimo de skills: una principal y, cuando sea necesario, una de apoyo. Cargar muchas skills a la vez aumenta contexto y puede mezclar procedimientos que no corresponden a la tarea.

| Tarea | Skill principal | Skill de apoyo opcional |
|---|---|---|
| Research de producto y flujos de boda | `design-consultation` | `product-designer` |
| Especificación lista para backlog | `spec` | `plan-eng-review` o `plan-design-review` |
| ADR y decisión arquitectónica | `architecture` | `clean-architecture` |
| Entidades e invariantes de negocio | `domain-driven-design` | `architecture` |
| Vertical slice, feature o endpoint | `vertical-slice-architecture` | `vercel-react-best-practices` si toca React/Next.js |
| UI nueva o rediseño visual | `frontend-design` | `impeccable` o `design-review` |
| React/Next.js y rendimiento del frontend | `vercel-react-best-practices` | `frontend-design` si cambia la experiencia |
| Bug o causa raíz | `investigate` | Ninguna hasta confirmar el diagnóstico |
| QA funcional con correcciones | `qa` | `playwright-cli` |
| QA sólo reporte | `qa-only` | `playwright-cli` |
| Seguridad, permisos, privacidad o pagos | `security-review` | `cso` sólo para auditoría amplia |
| Benchmark de rendimiento | `benchmark` | Ninguna |
| Documentación | `document-generate` | `make-pdf` para salida PDF |
| Revisión antes de integrar | `review` | `security-review` si el riesgo lo exige |
| Publicación explícitamente autorizada | `ship` | `land-and-deploy` sólo si también se autorizó desplegar |
| Configuración o comportamiento de Codex | `openai-docs` | Ninguna |

La selección se conserva en `AGENTS.md`, por lo que aplica a futuras sesiones iniciadas dentro de este repositorio.

## Enrutamiento por plan

### Wedding Seating Chart

Usar **Sol High** para:

- Confirmar el modelo de `SeatingPlan`, `EventOccasion` y `SeatAssignment`.
- Diseñar y revisar la migración desde la asignación familiar existente.
- Definir invariantes, concurrencia, revisiones y recuperación de conflictos.
- Revisar privacidad, links compartidos y acceso de proveedores.
- Auditar el cambio antes de producción.

Usar **Terra Medium** para:

- Implementar una fase o vertical slice a la vez.
- Construir endpoints, servicios, componentes y estado del lienzo.
- Integrar lista de invitados, exportación y check-in.
- Escribir y ejecutar pruebas de cada entrega.

Usar **Luna** para:

- Generar fixtures de mesas, asientos y objetos.
- Completar casos repetitivos de prueba ya especificados.
- Ajustar textos, traducciones, CSV y documentación rutinaria.

### Wedding Vendors

Usar **Sol High** para:

- Separar correctamente `Vendor` de `EventVendor`.
- Diseñar cotizaciones versionadas, contratos, pagos y auditoría.
- Revisar permisos y exposición de datos a proveedores.
- Diseñar reputación, moderación y monetización del marketplace.

Usar **Terra Medium** para:

- Implementar Vendor Manager, pipeline, shortlist y comparaciones.
- Construir las integraciones con Budget, Checklist, Timeline y Seating Chart.
- Implementar storefront, leads, inbox, reviews e insights por fases.
- Validar cada gate del plan.

Usar **Luna** para:

- Cargar categorías y datos de prueba.
- Crear transformaciones y exportaciones rutinarias.
- Completar variantes repetitivas una vez estabilizado el patrón.

## Procedimiento para cuidar la suscripción

1. Abrir una conversación por fase o vertical slice, no por todo el producto.
2. Iniciar con Terra Medium y proporcionar el documento de plan correspondiente.
3. Definir un resultado verificable antes de pedir implementación.
4. Cambiar a Sol High únicamente para el diseño crítico o la revisión del slice.
5. Regresar a Terra para aplicar la decisión ya tomada.
6. Delegar en Luna sólo tareas con patrón y criterio de aceptación claros.
7. Cerrar cada slice con pruebas, diff y pendientes explícitos para no reconstruir contexto.

## Hook de recordatorio

El repositorio incluye un hook `UserPromptSubmit` en `.codex/hooks.json`. Antes de enviar cada tarea, el hook examina el modelo activo y el texto del prompt para recomendar tanto el modelo como las skills aplicables.

Advierte en estos casos:

- Terra o Luna ante arquitectura, migraciones, seguridad, permisos, datos personales, pagos, contratos, acciones destructivas o releases.
- Luna ante implementación que requiere razonamiento de producción.
- Sol ante formato, traducciones, fixtures, renombres y otras tareas claramente mecánicas.

El hook **no bloquea** el prompt y no cambia el modelo automáticamente. Sólo agrega una advertencia y la recomendación correspondiente. Para confirmar deliberadamente el modelo actual, incluir `[modelo-confirmado]` en el prompt; la recomendación de skills continuará aplicando.

Las reglas persistentes viven en `AGENTS.md`; el hook las refuerza en cada prompt. Si el hook no está disponible, las instrucciones del repositorio continúan aplicando.

Después de crear o modificar el hook, abrir `/hooks` en Codex, revisar su definición y marcarla como confiable. Codex no ejecuta hooks locales nuevos o modificados hasta que se aprueban.

## Prompts base

### Implementación con Terra

```text
Ejecuta únicamente la siguiente vertical slice del plan con GPT-5.6 Terra Medium.
Lee primero el plan, define el criterio de terminado, implementa, ejecuta las
pruebas relevantes y reporta cualquier pendiente sin avanzar a la fase siguiente.
```

### Revisión crítica con Sol

```text
Revisa esta vertical slice con GPT-5.6 Sol High. Busca errores de arquitectura,
migración, seguridad, permisos, integridad de datos y regresiones. No amplíes el
alcance; entrega hallazgos priorizados y corrige únicamente los confirmados.
```

### Trabajo repetitivo con Luna

```text
Ejecuta esta tarea acotada con GPT-5.6 Luna. Sigue el patrón existente, no tomes
decisiones de arquitectura, valida el resultado indicado y detente si falta una
decisión de producto o seguridad.
```

## Documentos de ejecución

- [Wedding Seating Chart](superpowers/plans/2026-08-20-wedding-seating-chart.md)
- [Wedding Vendors](superpowers/plans/2026-08-20-wedding-vendors.md)

## Fuentes oficiales

- [Modelos de Codex y niveles de razonamiento](https://learn.chatgpt.com/docs/models)
- [Precios y límites de uso de Codex](https://learn.chatgpt.com/docs/pricing)
- [Hooks de Codex](https://learn.chatgpt.com/docs/hooks)
