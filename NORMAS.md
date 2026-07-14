# NORMAS DEL CODEBASE — PLANDEMOVILIDAD

> **Objetivo:** Evitar regresiones clasificando cada archivo en una categoría de protección.
> Si no estás seguro, consulta esta guía ANTES de modificar cualquier archivo.

---

## 🔒 SAGRADO (no tocar)

Estos archivos/áreas están **estabilizados y funcionan correctamente**. No deben modificarse sin aprobación explícita del autor.

### Archivos protegidos

| Archivo | Razón | Cómo verificar |
|---------|-------|----------------|
| `css/style.css` | Alineado con el HTML (Phase 1 fix). Selectores por clase, no ID. | Comparar clases CSS con las usadas en index.html |
| `index.html` | Estructura DOM completa: class names, IDs, orden de secciones, CDN imports | Cualquier cambio rompe el wiring con JS |
| `js/config.js` | Constantes: endpoints API, factores de emisión MITECO 2024, configuración por defecto | No cambiar sin validar con datos MITECO actualizados |
| `js/utils.js` | Funciones puras sin dependencias externas (Haversine, formateo, etc.) | Son utility functions reutilizables en todo el proyecto |
| `js/graficas.js` | Funciones de creación de gráficas Chart.js (doughnut, bar, line, radar) | Referencian IDs de canvas específicos del HTML |
| `js/export.js` | Lógica de exportación PDF/DOCX/ZIP con atribución 'Hecho con ❤️ por David Antizar' | La exportación funciona y genera documentos correctos |
| CDN imports en `index.html` | Leaflet 1.9.4, Chart.js 4.4.0, JSZip 3.10.1 | Cambiar versión = riesgo de breaking changes |
| Convención `window.pmstApp` | Namespace global donde se exponen todas las funciones llamadas desde HTML `onclick` | HTML usa `onclick="window.pmstApp.xxx()"` en toda la aplicación |

### Reglas específicas para archivos SAGRADOS

- **NO** renombrar IDs del DOM (`kpi-plantilla`, `chart-modal`, `mapa-principal`, etc.)
- **NO** eliminar clases CSS usadas en el HTML
- **NO** cambiar la URL de CDN imports sin probar toda la app
- **NO** modificar la estructura de `window.pmstApp` (agregar funciones sí, eliminar/reorganizar no)
- **NO** cambiar factores de emisión en `config.js` sin fuente MITECO verificada
- **NO** cambiar el orden de secciones `<section>` en `index.html` sin actualizar navegación

---

## ⚠️ MODIFICABLE con cuidado

Estos archivos se pueden modificar, pero los cambios afectan múltiples partes de la aplicación. **Requiere revisión de código completa antes de merge.**

| Archivo | Por qué es delicado | Qué cuidar |
|---------|---------------------|------------|
| `js/app.js` | Orquestador principal: inicializa todo, conecta módulos con DOM, expone funciones a `window.pmstApp` | Cualquier cambio afecta el flujo completo de la app. Mantener contrato con HTML. |
| `js/mapa.js` | Integración Leaflet: isocronas, capas, markers, eventos de mapa | No romper API de Leaflet. Mantener IDs de contenedores (`mapa-principal`, `dashboard-map`). |
| `js/diagnostico.js` | Lógica de cálculo: reparto modal, CO2e, KPIs, comparativas | Cambiar un cálculo afecta dashboard, export, e informe. Validar con datos conocidos. |
| `js/survey.js` | Encuesta de movilidad:RGPD, IndexedDB, validación | No romper flujo de encuesta. Mantener compatibilidad con `window.pmstApp`. |

### Reglas para modificar archivos MODIFICABLES

1. **Antes de modificar** → Leer la función completa y entender su contexto
2. **Al modificar** → Mantener la misma interfaz pública (nombre de función, parámetros, retorno)
3. **Después de modificar** → Probar el flujo completo afectado:
   - `app.js` → Probar init, tabs, guardado de datos, export
   - `mapa.js` → Probar carga de mapa, paradas TP, isocronas
   - `diagnostico.js` → Probar cálculo con datos demo, verificar dashboard
4. **Nunca** → Eliminar funciones que el HTML llama directamente (`onclick`)
5. **Nunca** → Cambiar la estructura de `appState` sin actualizar todos los consumidores

---

## 🟢 LIBRE

Estos archivos se pueden crear, modificar o eliminar libremente. Son módulos nuevos o de soporte que no afectan la funcionalidad core.

### Archivos libres para creación/modificación

| Archivo/Carpeta | Propósito | Estado |
|-----------------|-----------|--------|
| `js/api-*.js` | Módulos de integración con APIs externas (NAP, GBFS, ORS, Nominatim) | Pueden crearse nuevos |
| `js/seguimiento.js` | KPIs multi-año, tabla editable de evolución | Puede crearse/modificarse |
| `js/medidas.js` | Catálogo de medidas PMST, priorización | Puede crearse/modificarse |
| `js/dafo.js` | Análisis DAFO automatizado | Puede crearse/modificarse |
| `js/objetivos.js` | Generación de objetivos SMART | Puede crearse/modificarse |
| `js/state.js` | Estado global + persistencia (si se refactoriza desde app.js) | Puede crearse |
| `js/informe.js` | Generador de informe Markdown de 60-80 páginas | Puede crearse/modificarse |
| `data/*.js` | Datos estáticos (normativa, catálogo medidas, ciudades GBFS) | Pueden crearse |
| `SPEC.md` | Especificación técnica del proyecto | Actualizable libremente |
| `assets/*` | Logo, imágenes estáticas | Libres |

### Reglas para archivos LIBRES

- **Exponer** funciones en `window.pmstApp` si el HTML las llama vía `onclick`
- **Importar** en `index.html` con `<script type="module">` o `<script src="...">`
- **No dependan** de variables globales implícitas — usar `window.pmstApp.appState`
- **Incluir** atribución `'Hecho con ❤️ por David Antizar'` en cualquier export generado

---

## 📏 REGLAS GENERALES

Estas reglas aplican a **TODOS** los archivos, sin importar su categoría.

### CSS

```css
/* ✅ SIEMPRE: Usar selectores de clase */
.app-header { ... }
.kpi-card { ... }
.btn-primary { ... }

/* ❌ NUNCA: Usar IDs para estilos (usar solo para JS/selectores únicos) */
#app-header { ... }  /* ← PROHIBIDO para styling */
#sidebar { ... }     /* ← PROHIBIDO para styling */
```

**Razón:** Los IDs son para seleccionar elementos únicos desde JS. Los estilos deben ser reutilizables mediante clases.

### JavaScript

```javascript
// ✅ SIEMPRE: Exponer funciones que el HTML llama via onclick
window.pmstApp = {
    guardarCentro() { ... },
    calcularDiagnostico() { ... },
    // ...
};

// ❌ NUNCA: Dejar funciones sin exponer si el HTML las usa
function guardarCentro() { ... }  // ← HTML no puede llamarla directamente
```

**Razón:** El HTML usa `onclick="window.pmstApp.xxx()"`. Si no se expone, la función no se ejecuta.

### HTML

```html
<!-- ✅ SIEMPRE: Mantener classes e IDs existentes al agregar elementos -->
<section id="tab-nuevo" class="tab-content">
    <div class="kpi-card">
        ...
    </div>
</section>

<!-- ❌ NUNCA: Renombrar o eliminar clases/IDs existentes sin actualizar CSS -->
<section id="tab-datos" class="tab-content">  <!-- ← NO cambiar esto -->
```

**Razón:** CSS, JS y otros módulos dependen de los selectores actuales.

### Módulos nuevos

```html
<!-- ✅ SIEMPRE: Importar nuevos módulos en index.html -->
<script src="js/nuevo-modulo.js"></script>
<!-- O para módulos ES: -->
<script type="module" src="js/nuevo-modulo.js"></script>

<!-- ❌ NUNCA: Crear un módulo sin importarlo — no se cargará -->
```

**Razón:** Sin import, el navegador no descarga ni ejecuta el archivo.

### Estado global

```javascript
// ✅ SIEMPRE: Usar window.pmstApp.appState como fuente única de verdad
window.pmstApp.appState.empleados.push(nuevoEmp);

// ❌ NUNCA: Crear copias locales del estado o usar variables globales paralelas
let empleadosLocales = [];  // ← ROMPE la sincronización
let globalState = {};       // ← DUPLICADO, causará bugs
```

**Razón:** Estado duplicado = datos inconsistentes = bugs difíciles de rastrear.

### Atribución en exports

```javascript
// ✅ SIEMPRE: Incluir en todos los documentos generados
const ATTRIBUTION = 'Hecho con ❤️ por David Antizar';

// Se incluye en:
// - PDF export
// - DOCX export
// - ZIP export
// - Markdown informe
// - Cualquier archivo generado por la app
```

**Razón:** Requisito del autor. Los documentos generados son profesionales y deben llevar attribution.

---

## 🔄 PROCESO DE CAMBIO

Antes de modificar cualquier archivo, seguir este checklist:

1. **Identificar categoría** del archivo (SAGRADO / MODIFICABLE / LIBRE)
2. **Leer el archivo completo** para entender su contexto
3. **Verificar dependencias** — ¿Qué otros archivos dependen de este?
4. **Hacer el cambio** — Mínimo, preciso, documentado
5. **Probar el flujo completo** afectado
6. **Actualizar documentación** si el cambio afecta la arquitectura

### Dependencias conocidas

```
index.html → css/style.css (selectores de clase)
index.html → js/app.js (onclick → window.pmstApp)
index.html → CDN: Leaflet, Chart.js, JSZip

js/app.js → js/config.js (import { CONFIG })
js/app.js → js/utils.js (utilidades)
js/app.js → js/graficas.js (crear gráficas)
js/app.js → js/mapa.js (iniciar mapa)
js/app.js → js/diagnostico.js (calcular indicadores)
js/app.js → js/export.js (generar documentos)

js/graficas.js → index.html canvas IDs (chart-modal, chart-co2e, etc.)
js/mapa.js → index.html div IDs (mapa-principal, dashboard-map)
js/export.js → js/app.js (leer appState para generar informe)
```

---

## 📝 NOTA FINAL

> **Si tienes duda, NO MODIFIQUES el archivo.** 
> Consulta primero con el equipo o abre un issue.
> Es mejor prevenir una regresión que arreglarla después.

---

*Creado: Plan de Movilidad v2.0*
*Última actualización: Fase de desarrollo activo*
