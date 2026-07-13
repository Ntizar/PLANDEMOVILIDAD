# SPEC.md — PLANDEMOVILIDAD

**Plan de Movilidad Sostenible al Trabajo (PMST/PTST) — Generador interactivo**

| Campo | Valor |
|---|---|
| **Proyecto** | PLANDEMOVILIDAD |
| **Autor** | David Antizar (Ntizar) |
| **Versión** | 1.0 |
| **Fecha** | julio 2026 |
| **Licencia** | MIT |
| **Deploy** | <https://nan.builders> (público, sin login) |
| **Idioma** | Castellano |

---

## 1. Visión

Una web app pública, gratuita y sin login que permite a cualquier empresa o centro de trabajo generar un **Plan de Movilidad Sostenible al Trabajo (PMST/PTST)** completo, con diagnóstico basado en datos reales, mapa interactivo, encuesta anonimizada, DAFO automático, medidas priorizadas e informe profesional exportable en Markdown, PDF y DOCX.

> *"Un PMST abarca los desplazamientos in itinere, los viajes durante la jornada, la flota, las visitas, proveedores y distribución. Debe mejorar accesibilidad, seguridad vial, sostenibilidad ambiental, eficiencia y equidad."*

---

## 2. Alcance

### ✅ Sí hace

| Categoría | Descripción |
|---|---|
| **Formularios interactivos** | Recoger datos del centro (dirección, coordenadas, actividad, plantilla, turnos), empresa (teletrabajo, aparcamiento, flota, duchas, política de viajes) y aparcamiento. |
| **Geolocalización en mapa** | Leaflet con capa CARTO Light; geocodificación Nominatim; marcadores; captura de mapa para PDF. |
| **Isocronas reales** | OpenRouteService: 10-15 min a pie, 15-25 min en bici, 30-60 min en transporte público. Fallback a radios circulares si ORS no disponible. |
| **Transporte público** | NAP/GTFS: catálogo de paradas y rutas cercanas por ciudad. Import manual de CSV/Excel/GTFS. |
| **Encuesta de movilidad** | Generación automática, almacenamiento local (IndexedDB), anonimizada, agregada. Bloques: modalidad laboral, origen agregado, modo, tiempo/distancia/coste, barreras, interés en medidas, accidentes. |
| **Diagnóstico automático** | Reparto modal, ocupación media, persona-km, vehículo-km, huella CO2e, indicadores clave. |
| **Análisis DAFO** | Generación automática basada en datos de encuesta, reparto modal y entorno. |
| **Catálogo de medidas** | Medidas priorizadas por jerarquía (evitar → reducir → activa → TP → alta ocupación → flota → aparcamiento). |
| **Objetivos SMART** | Generación de objetivos medibles con indicadores y plazos. |
| **Informe con IA** | Generación de 16 secciones con prompts específicos vía NaN API (qwen3.6). |
| **Editor de informe** | Markdown editable en vivo con vista previa. |
| **Export** | Markdown (.md), PDF (jsPDF), DOCX (docx.umd.js). |
| **Dashboard** | KPIs visuales y gráficos Chart.js (reparto modal, evolución, barras). |
| **Privacidad RGPD** | Sin domicilio exacto, datos agregados, umbral mínimo 10 respuestas, anonimización total. |

### ❌ NO hace

| Categoría | Razón |
|---|---|
| **Login / autenticación** | Proyecto público, sin necesidad de cuenta. |
| **Almacenamiento en servidor** | Todo local (IndexedDB / localStorage). El servidor solo proxy APIs. |
| **Base de datos PostgreSQL** | MVP usa almacenamiento local; PostGIS en Versión 3+. |
| **Framework frontend** | Vanilla JS con ES modules, sin React/Vue/Angular. |
| **Análisis de imagen** | No OCR de documentos ni análisis visual. |
| **Notificaciones push / email** | Fuera del alcance MVP. |
| **Plan mancomunado real** | Solo sugerencias; la coordinación real es fuera de la app. |
| **Datos personales identificables** | Nunca se almacena nombre, email o dirección exacta de encuestados. |

---

## 3. Pantallas / Interfaz

La app es una **single-page application** con sidebar lateral y área principal. Navegación por secciones.

### 3.1 Layout general

```
┌──────────────────────────────────────────────────────┐
│  HEADER (#1a1a2e)                                     │
│  PLANDEMOVILIDAD  |  Nueva empresa  |  Exportar ▼     │
├──────────┬───────────────────────────────────────────┤
│ SIDEBAR  │  ÁREA PRINCIPAL                           │
│ (blanco) │                                           │
│          │  ┌─────────────────────────────────────┐  │
│ ▸ 1.     │  │  Sección activa (formulario, mapa,  │  │
│    Centro│  │  encuesta, dashboard o informe)     │  │
│ ▸ 2.     │  └─────────────────────────────────────┘  │
│    Empresa│                                          │
│ ▸ 3.     │  ┌─────────────────────────────────────┐  │
│    Encuesta│ │  Panel secundario (opcional)         │  │
│ ▸ 4.     │  └─────────────────────────────────────┘  │
│    Diagnóstico│                                       │
│ ▸ 5.     │                                           │
│    DAFO   │                                           │
│ ▸ 6.     │                                           │
│    Medidas│                                           │
│ ▸ 7.     │                                           │
│    Objetivos│                                         │
│ ▸ 8.     │                                           │
│    Informe│                                           │
│ ▸ 9.     │                                           │
│    Export │                                           │
└──────────┴───────────────────────────────────────────┘
```

### 3.2 Secciones detalladas

| # | Sección | Contenido principal | Módulo |
|---|---|---|---|
| 1 | **Centro** | Formulario: nombre, dirección, coordenadas (auto o manual), actividad económica (CNAE), plantilla total, superficie, turnos, accesos. Mapa con geocodificación. | `form.js` + `map.js` + `geocode.js` |
| 2 | **Empresa** | Formulario: % teletrabajo, plazas aparcamiento coche/bici, duchas/vestuarios, flota (tipo, combustible, edad), política de viajes, ayuda transporte. | `form.js` |
| 3 | **Encuesta** | Botón "Generar encuesta", vista previa, envío (simulado), lista de respuestas agregadas, filtros por turno/modal. Umbral mínimo 10 respuestas para mostrar resultados. | `survey.js` |
| 4 | **Diagnóstico** | Reparto modal (gráfico dona), ocupación media, persona-km, vehículo-km, huella CO2e, indicadores tabla. | `diagnosis.js` + `dashboard.js` |
| 5 | **DAFO** | Matriz DAFO generada automáticamente: Fortalezas, Debilidades, Oportunidades, Amenazas. | `dafo.js` |
| 6 | **Medidas** | Catálogo de medidas priorizadas por jerarquía. Cada medida: descripción, responsable, coste estimado, plazo, indicador, prioridad. | `measures.js` |
| 7 | **Objetivos** | Objetivos SMART con indicador, línea base, meta, plazo, responsable. | `objectives.js` |
| 8 | **Informe** | Editor Markdown en vivo con vista previa. 16 secciones generadas por IA. Edición inline. | `ai-report.js` + `report.js` |
| 9 | **Export** | Botones: Markdown (.md), PDF (.pdf), DOCX (.docx). Opciones de exportación del mapa incluido. | `report.js` + `map.js` |

### 3.3 Diseño visual

| Elemento | Valor |
|---|---|
| **Header** | `#1a1a2e` (azul oscuro), texto blanco |
| **Sidebar** | Blanco `#ffffff`, borde derecho `#e2e8f0` |
| **Fondo** | Blanco `#ffffff`, secciones alternas `#f8fafc` |
| **Color primario** | `#2563eb` (azul) |
| **Color secundario** | `#f97316` (naranja) |
| **Color éxito** | `#16a34a` (verde) |
| **Color alerta** | `#dc2626` (rojo) |
| **Mapa** | CARTO Light (`positron`) |
| **Tipografía** | Inter, system-ui, sans-serif |
| **Reglas** | Sin gradientes azul→naranja, sin neón, sin morado |

---

## 4. Datos y APIs

### 4.1 APIs externas

| API | Uso | URL | Autenticación | Límites |
|---|---|---|---|---|
| **Nominatim** | Geocodificación directa e inversa | `https://nominatim.openstreetmap.org/` | Ninguna (User-Agent requerido) | 1 req/seg |
| **OpenRouteService** | Isocronas, rutas, matrices | `https://api.openrouteservice.org/` | API Key gratuita | 200 req/15 min |
| **NAP Transportes** | Catálogo nacional de datos de transporte | `https://nap.transportes.gob.es/` | Ninguna | Sin especificar |
| **GTFS (datos.gob.es)** | Horarios, líneas, paradas | `https://datos.gob.es/es/catalogo/conjuntos-datos?tags_es=GTFS` | Ninguna | Sin especificar |
| **CRTM** | GTFS Madrid | `https://datos.crtm.es/` | Ninguna | Sin especificar |
| **INE API** | Población, empleo, demografía | `https://www.ine.es/dyngs/DAB/index.htm` | API Key | Con límite |
| **AEMET OpenData** | Meteorología, clima, alertas | `https://opendata.aemet.es/` | API Key | Con límite |
| **MITECO** | Factores de emisión de CO2e | `https://www.miteco.gob.es/` | Ninguna | Sin especificar |
| **DGT** | Estadísticas de siniestralidad | `https://www.dgt.es/` | Ninguna | Sin especificar |
| **EAFO** | Infraestructura recarga eléctrica | `https://alternative-fuels-observatory.ec.europa.eu/` | Ninguna | Sin especificar |

### 4.2 Datos locales (IndexedDB)

| Entidad | Campos clave |
|---|---|
| **centro** | nombre, direccion, lat, lon, actividad, plantilla, superficie, turnos, accesos |
| **empresa** | teletrabajo_pct, plazas_coche, plazas_bici, duchas, flota[], politica_viajes |
| **encuesta_respuesta** | id (hash), turno, modo_principal, modos_secundarios[], tiempo_min, distancia_km, coste_eur, barreras[], interes[], accidentes, origen_zona (agregada) |
| **diagnostico** | reparto_modal, ocupacion_media, persona_km, vehiculo_km, co2e_kg, indicadores[] |
| **dafo** | fortalezas[], debilidades[], oportunidades[], amenazas[] |
| **medidas** | id, nombre, categoria, prioridad, responsable, coste_estimado, plazo, indicador, estado |
| **objetivos** | id, descripcion, indicador, linea_base, meta, plazo, responsable |
| **informe** | secciones[] (texto generado por IA), estado_generacion |
| **configuracion** | ors_api_key, theme, language |

### 4.3 Factores de emisión (CO2e)

| Modo | Factor CO2e (kg CO2e/km/persona) | Fuente |
|---|---|---|
| Coche individual (gasolina) | 0.171 | MITECO |
| Coche individual (diésel) | 0.158 | MITECO |
| Coche individual (eléctrico) | 0.053 | MITECO (mix eléctrico ES) |
| Transporte público (autobús) | 0.063 | MITECO |
| Transporte público (tren/metropolitano) | 0.030 | MITECO |
| Bicicleta | 0.000 | — |
| Caminar | 0.000 | — |
| Motocicleta | 0.103 | MITECO |
| Avión (corto recorrido) | 0.255 | MITECO |

---

## 5. Arquitectura modular

### 5.1 Tabla de archivos

| Archivo | Responsabilidad | Expone (exports) |
|---|---|---|
| `index.html` | Estructura DOM, carga de módulos | — |
| `css/style.css` | Estilos (Aurora Ntizar v5.2 adaptado) | — |
| `js/config.js` | Configuración centralizada | `CONFIG` |
| `js/utils.js` | Utilidades genéricas | `debounce`, `formatNum`, `haversine`, `truncate`, `slugify`, `downloadFile`, `generateId` |
| `js/map.js` | Leaflet: init, capas, marcadores, isocronas, captura PDF | `initMap`, `setCenter`, `addMarker`, `addIsochrone`, `captureMapForPDF` |
| `js/geocode.js` | Nominatim: geocodificación directa e inversa | `geocodeAddress`, `reverseGeocode` |
| `js/isochrones.js` | OpenRouteService: isocronas coche/bici/peatón + fallback | `fetchIsochrones`, `fetchIsochroneFallback` |
| `js/gtfs.js` | NAP/GTFS: catálogo TP por ciudad, import manual | `getTransitStops`, `loadGTFSFeed`, `importManualTransit` |
| `js/form.js` | Formularios: centro, empresa, flota, aparcamiento | `initForms`, `saveFormData`, `loadFormData`, `validateForm` |
| `js/survey.js` | Encuesta: generación, almacenamiento, agregación | `generateSurvey`, `submitResponse`, `getResponseAggregates`, `getSurveyStats` |
| `js/diagnosis.js` | Cálculos: reparto modal, CO2e, ocupación, indicadores | `calculateModalSplit`, `calculateCO2e`, `calculateIndicators`, `runFullDiagnosis` |
| `js/dafo.js` | Análisis DAFO automático | `analyzeDAFO`, `generateDAFOMatrix` |
| `js/measures.js` | Catálogo de medidas priorizadas | `getMeasuresCatalog`, `prioritizeMeasures`, `saveMeasures` |
| `js/objectives.js` | Objetivos SMART e indicadores | `generateObjectives`, `saveObjectives`, `getObjectives` |
| `js/ai-report.js` | Generación informe con IA NaN: prompts por sección | `generateSection`, `generateAllSections`, `getSectionPrompt` |
| `js/report.js` | Editor del informe, export Markdown/PDF/DOCX | `renderEditor`, `updatePreview`, `exportMarkdown`, `exportPDF`, `exportDOCX` |
| `js/dashboard.js` | Dashboard visual con KPIs y gráficos Chart.js | `initDashboard`, `renderCharts`, `updateKPIs` |
| `js/main.js` | Orquestador: init + wiring de módulos | `initApp` |
| `server.mjs` | Servidor estático + proxy APIs + endpoint IA NaN | — |
| `data/catalog.json` | Catálogo de medidas, indicadores, fuentes | — |

### 5.2 Diagrama de dependencias

```
main.js
├── config.js
├── utils.js
├── form.js ──→ geocode.js ──→ utils.js
├── map.js ──→ utils.js
├── isochrones.js ──→ utils.js
├── gtfs.js
├── survey.js ──→ utils.js
├── diagnosis.js ──→ survey.js, utils.js
├── dafo.js ──→ diagnosis.js, survey.js
├── measures.js ──→ diagnosis.js, dafo.js
├── objectives.js ──→ diagnosis.js, dafo.js, measures.js
├── ai-report.js ──→ diagnosis.js, dafo.js, measures.js, objectives.js, survey.js, map.js
├── report.js ──→ ai-report.js
├── dashboard.js ──→ diagnosis.js, survey.js
└── map.js (reused by ai-report.js for PDF capture)
```

### 5.3 Estado global

```javascript
// window.appState — objeto único de estado compartido
window.appState = {
  centro: null,       // { nombre, direccion, lat, lon, actividad, plantilla, ... }
  empresa: null,      // { teletrabajo_pct, plazas_coche, plazas_bici, ... }
  encuesta: {         // { respuestas: [], agregados: {}, stats: {} }
    respuestas: [],
    agregados: {},
    stats: {}
  },
  diagnostico: null,  // { reparto_modal, ocupacion_media, co2e_kg, ... }
  dafo: null,         // { fortalezas: [], debilidades: [], ... }
  medidas: [],        // [{ id, nombre, categoria, prioridad, ... }]
  objetivos: [],      // [{ id, descripcion, indicador, ... }]
  informe: {          // { secciones: {}, estado: 'pending' }
    secciones: {},
    estado: 'pending' // 'pending' | 'generating' | 'partial' | 'complete'
  },
  mapa: null,         // Referencia a L.map instance
  charts: null        // Referencia a Chart.js instances (ver regla abajo)
};
```

**Regla crítica:** `var charts = window.charts = {}` — usar `var` (NO `const`) para permitir reasignación de Chart.js instances.

---

## 6. Interfaces entre módulos

### 6.1 `config.js`

```javascript
// EXPORTS
export const CONFIG = {
  // APIs
  nominatimUrl: 'https://nominatim.openstreetmap.org/search',
  nominatimReverse: 'https://nominatim.openstreetmap.org/reverse',
  orsBaseUrl: 'https://api.openrouteservice.org/v2',
  orsIsochrone: '/isochrones',
  
  // Colores (sin gradientes)
  colors: {
    primary: '#2563eb',
    secondary: '#f97316',
    success: '#16a34a',
    danger: '#dc2626',
    header: '#1a1a2e'
  },
  
  // Isocronas (minutos)
  isochroneTimes: {
    pedestrian: [10, 15],
    cycling: [15, 25],
    publicTransport: [30, 60]
  },
  
  // Encuesta
  minResponses: 10,
  surveyId: 'pmst_survey_v1',
  
  // CO2e factores (kg CO2e/km/persona)
  emissionFactors: {
    car_petrol: 0.171,
    car_diesel: 0.158,
    car_electric: 0.053,
    bus: 0.063,
    train: 0.030,
    motorcycle: 0.103,
    airplane: 0.255
  },
  
  // IA
  aiModel: 'qwen3.6',
  aiApiUrl: '/api/ai/generate',
  
  // Map
  mapTileUrl: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  mapMaxZoom: 18
};
```

### 6.2 `utils.js`

```javascript
// EXPORTS principales
export function debounce(fn, ms) { ... }
export function formatNum(n, decimals = 2) { ... }
export function haversine(lat1, lon1, lat2, lon2) { ... }
export function truncate(str, max) { ... }
export function slugify(text) { ... }
export function downloadFile(content, filename, mime) { ... }
export function generateId() { ... }
export function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
export function safeFetch(url, options = {}) { ... }
```

### 6.3 `map.js`

```javascript
// EXPORTS principales
export function initMap(containerId, lat, lon, zoom) { ... }
export function setCenter(lat, lon, zoom) { ... }
export function addMarker(lat, lon, options) { ... }
export function addIsochrone(geojson, color, opacity) { ... }
export function addTransitStops(stops) { ... }
export function clearOverlays() { ... }
export function captureMapForPDF(width, height) { ... } // Canvas → DataURL
```

### 6.4 `geocode.js`

```javascript
// EXPORTS principales
export async function geocodeAddress(address) { ... }   // → { lat, lon, display_name }
export async function reverseGeocode(lat, lon) { ... }   // → { address, postcode, city }
```

### 6.5 `isochrones.js`

```javascript
// EXPORTS principales
export async function fetchIsochrones(center, modes) { ... }
// → { pedestrian: GeoJSON, cycling: GeoJSON, publicTransport: GeoJSON }
export async function fetchIsochroneFallback(center, radiusKm) { ... }
// → fallback circular si ORS no disponible
```

### 6.6 `gtfs.js`

```javascript
// EXPORTS principales
export async function getTransitStops(lat, lon, radius = 500) { ... }
// → [{ name, lat, lon, lines: [] }]
export async function loadGTFSFeed(gtfsUrl) { ... }
// → parsea feeds GTFS remotos
export function importManualTransit(csvData) { ... }
// → import manual de CSV/Excel
```

### 6.7 `form.js`

```javascript
// EXPORTS principales
export function initForms() { ... }
export function saveFormData(section) { ... }  // 'centro' | 'empresa'
export function loadFormData(section) { ... }
export function validateForm(section) { ... }
```

### 6.8 `survey.js`

```javascript
// EXPORTS principales
export function generateSurvey() { ... }
// → HTML de encuesta + estructura de datos
export function submitResponse(data) { ... }
// → almacena en IndexedDB (sin PII)
export function getResponseAggregates() { ... }
// → { modo: count, turno: count, ... }
export function getSurveyStats() { ... }
// → { total, minResponses, responseRate }
```

### 6.9 `diagnosis.js`

```javascript
// EXPORTS principales
export function calculateModalSplit(responses) { ... }
// → { walking: pct, cycling: pct, car: pct, publicTransport: pct, ... }
export function calculateCO2e(responses, distances) { ... }
// → total kg CO2e
export function calculateIndicators(diagnosticData) { ... }
// → { modalSplit, occupancy, personKm, vehicleKm, co2e, ... }
export function runFullDiagnosis() { ... }
// → calcula todo y guarda en appState.diagnostico
```

### 6.10 `dafo.js`

```javascript
// EXPORTS principales
export function analyzeDAFO(diagnosticData, surveyData) { ... }
// → { fortalezas: [], debilidades: [], oportunidades: [], amenazas: [] }
export function generateDAFOMatrix(dafoData) { ... }
// → HTML renderizable
```

### 6.11 `measures.js`

```javascript
// EXPORTS principales
export function getMeasuresCatalog() { ... }
// → [{ id, nombre, categoria, jerarquia, descripcion, coste, plazo }]
export function prioritizeMeasures(diagnosticData, dafoData) { ... }
// → medidas ordenadas por prioridad
export function saveMeasures(measures) { ... }
export function getMeasures() { ... }
```

### 6.12 `objectives.js`

```javascript
// EXPORTS principales
export function generateObjectives(diagnosticData, dafoData, measures) { ... }
// → [{ id, descripcion, indicador, linea_base, meta, plazo, responsable }]
export function saveObjectives(objectives) { ... }
export function getObjectives() { ... }
```

### 6.13 `ai-report.js`

```javascript
// EXPORTS principales
export async function generateSection(sectionNumber, context) { ... }
// → llama a NaN API con prompt específico
export async function generateAllSections() { ... }
// → genera las 16 secciones en secuencia
export function getSectionPrompt(sectionNumber, context) { ... }
// → devuelve el prompt para la sección dada
```

### 6.14 `report.js`

```javascript
// EXPORTS principales
export function renderEditor(informeData) { ... }
export function updatePreview(markdown) { ... }
export function exportMarkdown() { ... }
export function exportPDF() { ... }
export function exportDOCX() { ... }
```

### 6.15 `dashboard.js`

```javascript
// EXPORTS principales
export function initDashboard(containerId) { ... }
export function renderCharts(diagnosticData, surveyData) { ... }
export function updateKPIs(diagnosticData) { ... }
```

---

## 7. Stack tecnológico

| Capa | Tecnología | Versión | Notas |
|---|---|---|---|
| **Frontend** | HTML5 | — | Single file, ES modules |
| **Lenguaje** | JavaScript (ES Modules) | ES2022 | `type="module"` en `<script>` |
| **Mapas** | Leaflet | 2.x | Canvas renderer, capa CARTO Light |
| **Gráficos** | Chart.js | 4.x | `var charts = window.charts = {}` |
| **PDF** | jsPDF | 2.x | + html2canvas para mapa |
| **DOCX** | docx.umd.js | — | UMD build |
| **Backend** | Node.js | 20+ | `server.mjs` (ESM) |
| **IA** | NaN API (qwen3.6) | — | Endpoint proxy en server.mjs |
| **Almacenamiento** | IndexedDB | — | Todo local, sin servidor |
| **CSS** | CSS3 (sin preprocesador) | — | Aurora Ntizar v5.2 adaptado |
| **Deploy** | NaN.builders | — | Público, sin login |

---

## 8. Prompts de IA por sección del informe

Cada sección se genera con un prompt específico a la API de NaN. El contexto incluye datos relevantes del `appState`.

### Sección 1: Portada y control de versiones

```
Genera una portada profesional para un Plan de Movilidad Sostenible al Trabajo.

Datos:
- Nombre de la empresa/centro: {centro.nombre}
- Dirección: {centro.direccion}
- Fecha: {fecha_actual}
- Versión: 1.0

Incluye también una tabla de control de versiones con campos: versión, fecha, autor, descripción de cambios.
Formato Markdown.
```

### Sección 2: Resumen ejecutivo

```
Eres un consultor experto en movilidad sostenible. Genera un resumen ejecutivo de 500-800 palabras.

Datos:
- Empresa: {centro.nombre}, {centro.plantilla_total} trabajadores
- Reparto modal: {diagnostico.reparto_modal}
- Huella CO2e: {diagnostico.co2e_kg} kg CO2e/año
- DAFO resumido: F={dafo.fortalezas.length} | D={dafo.debilidades.length} | O={dafo.oportunidades.length} | A={dafo.amenazas.length}
- Medidas propuestas: {medidas.length}
- Objetivos: {objetivos.length}

Estructura:
1. Contexto y justificación
2. Principales hallazgos
3. Medidas clave propuestas
4. Impacto esperado
5. Próximos pasos
```

### Sección 3: Alcance, objetivos y gobernanza

```
Genera la sección de alcance, objetivos y gobernanza.

Datos:
- Centro: {centro.nombre}, {centro.actividad_economica}
- Plantilla: {centro.plantilla_total} trabajadores, {centro.turnos.length} turnos
- Superficie: {centro.superficie_m2} m²

Incluye:
1. Ámbito del plan (desplazamientos in itinere, viajes en misión, flota)
2. Objetivos generales del PMST
3. Gobernanza: dirección, gestor de movilidad, comité de seguimiento
4. Representación laboral
5. Compromiso de la dirección
```

### Sección 4: Marco normativo

```
Genera el marco normativo aplicable a un Plan de Movilidad Sostenible al Trabajo en España.

Incluye:
1. Ley 7/2021 de cambio climático y transición energética
2. Real Decreto-ley 8/2021 (movilidad sostenible)
3. Estatuto de los trabajadores (art. 45 sobre desplazamiento)
4. Ley 31/1995 de prevención de riesgos laborales
5. Normativa de tráfico aplicable
6. Ordenanzas municipales relevantes (ZBE, aparcamiento)
7. Directivas europeas relacionadas

Cita artículos y artículos específicos. Tono formal.
```

### Sección 5: Metodología, fuentes y limitaciones

```
Genera la sección de metodología, fuentes y limitaciones.

Datos de fuentes usadas:
- Encuesta: {encuesta.stats.total} respuestas (umbral: {encuesta.stats.minResponses})
- Isocronas: {isocronas disponibles}
- Transporte público: {datos GTFS disponibles}
- CO2e: factores MITECO

Incluye:
1. Metodología de recogida de datos
2. Fuentes utilizadas con URLs
3. Limitaciones (tamaño muestral, datos incompletos, etc.)
4. Nivel de confianza de los resultados
```

### Sección 6: Caracterización del centro

```
Genera la caracterización del centro de trabajo.

Datos:
- Nombre: {centro.nombre}
- Dirección: {centro.direccion}
- Actividad (CNAE): {centro.actividad_economica}
- Plantilla: {centro.plantilla_total}
- Turnos: {centro.turnos}
- Superficie: {centro.superficie_m2} m²
- Teletrabajo: {empresa.teletrabajo_pct}%

Incluye:
1. Descripción del centro y actividad
2. Organización del trabajo (turnos, horarios)
3. Servicios de proximidad
4. Infraestructura disponible (aparcamiento, duchas, bicis)
```

### Sección 7: Diagnóstico territorial y accesibilidad

```
Eres un consultor experto en movilidad sostenible. Genera un diagnóstico territorial completo.

Datos:
- Centro: {centro.nombre}, {centro.direccion}, {centro.lat}, {centro.lon}
- Isocronas: {isocronas.pedestrian} peatonal, {isocronas.cycling} ciclista, {isocronas.publicTransport} transporte público
- Transporte público: {gtfs.stops.length} paradas cercanas
- Entorno: {POIs y empresas próximas}

Genera:
1. Accesibilidad peatonal (barreras, calidad de aceras, cruces)
2. Accesibilidad ciclista (carriles, pendientes, seguridad)
3. Accesibilidad transporte público (frecuencias, cobertura, última milla)
4. Infraestructura de aparcamiento y recarga eléctrica
5. Oportunidades de plan mancomunado con empresas próximas
6. Recomendaciones específicas de mejora

Tono profesional pero accesible. Cita fuentes de datos.
```

### Sección 8: Diagnóstico de plantilla y encuesta

```
Genera el diagnóstico de la encuesta de movilidad.

Datos:
- Respuestas: {encuesta.stats.total} (mínimo requerido: {encuesta.stats.minResponses})
- Reparto modal: {diagnostico.reparto_modal}
- Ocupación media coche: {diagnostico.ocupacion_media}
- Barreras principales: {barreras_top}
- Interés en medidas: {interes_top}

Incluye:
1. Perfil de la plantilla (turnos, modalidades)
2. Análisis del reparto modal
3. Tiempos y distancias medias
4. Barreras identificadas
5. Potencial de cambio modal
6. Segmentación por grupos (si hay suficientes datos)

Si hay menos de {encuesta.stats.minResponses} respuestas, indica limitación muestral.
```

### Sección 9: Seguridad vial laboral

```
Genera la sección de seguridad vial laboral.

Datos:
- Accidentes in itinere: {accidentes_in_itinere}
- Accidentes en misión: {accidentes_mision}
- Incidentes: {incidentes}
- Factores: {factores_riesgo}

Incluye:
1. Definiciones (accidente in itinere, en misión, incidente, cuasiaccidente)
2. Análisis temporal y modal de siniestros
3. Factores de riesgo identificados
4. Medidas preventivas
5. Protocolo de actuación
6. Formación y concienciación
```

### Sección 10: Impacto ambiental, energético y económico

```
Genera el impacto ambiental, energético y económico.

Datos:
- Huella CO2e: {diagnostico.co2e_kg} kg CO2e/año
- Vehículo-km: {diagnostico.vehiculo_km} km/año
- Persona-km: {diagnostico.persona_km} km/año
- Consumo combustible estimado: {consumo}
- Coste desplazamientos: {coste_total} €/año

Incluye:
1. Huella de carbono de la movilidad
2. Consumo energético
3. Coste económico de los desplazamientos
4. Comparativa con benchmarks del sector
5. Proyección con medidas implementadas
```

### Sección 11: DAFO

```
Genera el análisis DAFO.

Datos:
- Fortalezas: {dafo.fortalezas}
- Debilidades: {dafo.debilidades}
- Oportunidades: {dafo.oportunidades}
- Amenazas: {dafo.amenazas}

Presenta en formato tabla Markdown con las 4 cuadrantes.
Añade una sección de estrategias cruzadas (FO, DO, FA, DA).
```

### Sección 12: Objetivos SMART e indicadores

```
Genera los objetivos SMART e indicadores.

Datos:
- Objetivos: {objetivos}
- Indicadores: {indicadores}
- Línea base: {diagnostico}

Para cada objetivo incluye:
- Descripción SMART
- Indicador de seguimiento
- Línea base
- Meta
- Plazo
- Responsable

Formato tabla Markdown.
```

### Sección 13: Plan de acción y presupuesto

```
Genera el plan de acción y presupuesto.

Datos:
- Medidas: {medidas}
- Prioridades: {prioridades}

Para cada medida incluye:
- Descripción
- Responsable
- Presupuesto estimado
- Plazo
- Indicador de seguimiento
- Estado

Tabla Markdown con resumen ejecutivo al inicio.
```

### Sección 14: Comunicación y participación

```
Genera la sección de comunicación y participación.

Incluye:
1. Plan de comunicación interna
2. Mecanismos de participación de la plantilla
3. Calendario de actividades de sensibilización
4. Canales de comunicación
5. Encuesta de satisfacción periódica
```

### Sección 15: Seguimiento, evaluación y actualización

```
Genera la sección de seguimiento, evaluación y actualización.

Incluye:
1. Frecuencia de revisión de indicadores
2. Comité de seguimiento
3. Proceso de actualización del plan
4. Calendario de revisiones (semestral/anual)
5. Mecanismos de mejora continua
```

### Sección 16: Anexos

```
Genera los anexos del informe.

Incluye:
A. Mapas y isocronas (referencia a imágenes adjuntas)
B. Cuestionario de encuesta (versión completa)
C. Cálculos detallados (fórmulas, factores de emisión)
D. Fuentes de datos (URLs, fechas de consulta, licencias)
E. Glosario de términos
```

---

## 9. Criterios de éxito

### 9.1 MVP (Versión 1.0)

| # | Criterio | Métrica |
|---|---|---|
| 1 | Formularios funcionales | Datos de centro y empresa se guardan y cargan correctamente |
| 2 | Encuesta operativa | Generación, envío y agregación de respuestas (mín. 10) |
| 3 | Geocodificación | Dirección → coordenadas con Nominatim |
| 4 | Mapa interactivo | Leaflet con CARTO Light, marcador del centro |
| 5 | Diagnóstico básico | Reparto modal y CO2e calculados automáticamente |
| 6 | Export Markdown | Informe descargable en .md con todas las 16 secciones |
| 7 | Export PDF | Informe descargable en .pdf con mapa incluido |
| 8 | Export DOCX | Informe descargable en .docx |
| 9 | DAFO automático | Matriz generada desde datos |
| 10 | Catálogo de medidas | Medidas priorizadas por jerarquía |

### 9.2 Versión completa (Versión 2+)

| # | Criterio | Métrica |
|---|---|---|
| 11 | Isocronas reales | 3 modos (peatón, bici, TP) con OpenRouteService |
| 12 | Transporte público | Paradas y rutas GTFS cargadas en mapa |
| 13 | Dashboard visual | KPIs y gráficos Chart.js funcionales |
| 14 | IA generativa | 16 secciones generadas con prompts específicos |
| 15 | Editor en vivo | Markdown editable con preview en tiempo real |
| 16 | Privacidad RGPD | Sin PII, agregación, umbral 10 respuestas |
| 17 | Multi-centro | Gestión de varios centros en un mismo plan |
| 18 | Comparación escenarios | Antes/después de medidas |
| 19 | Import datos | CSV/Excel/GTFS manual |
| 20 | Accesibilidad | WCAG 2.1 AA mínimo |

---

## 10. Anti-patrones

| # | Anti-patrón | Regla |
|---|---|---|
| 1 | **Archivo monolítico** | Un archivo = una responsabilidad. Máximo ~300 líneas por archivo JS. |
| 2 | **Global state sin dueño** | Cada pieza de estado tiene un módulo propietario. Solo ese módulo la modifica. |
| 3 | **Impurezas en módulos** | Los módulos exportan funciones puras. Los efectos secundarios (DOM, fetch) se gestionan en el módulo que los llama. |
| 4 | **Hardcoded API keys** | Las claves van en `config.js` o variables de entorno del servidor. Nunca en código fuente. |
| 5 | **Gradientes azul→naranja** | Interpolan a morado en sRGB. Usar colores sólidos. |
| 6 | **`const charts = ...`** | Chart.js necesita reasignación. Usar `var charts = window.charts = {}`. |
| 7 | **Almacenar dirección exacta** | Usar código postal, municipio o sección censal. Nunca dirección exacta de encuestados. |
| 8 | **Mostrar datos con < 10 respuestas** | Umbral mínimo de 10 respuestas para mostrar resultados agregados. |
| 9 | **Dependencias npm innecesarias** | Sin framework frontend. Sin bundler. Vanilla JS + ES modules. |
| 10 | **Ignorar límites de API** | Implementar debounce, caching y fallback para todas las llamadas externas. |
| 11 | **CSS en línea** | Todo el CSS en `css/style.css`. Sin estilos inline salvo excepciones mínimas. |
| 12 | **Callbacks anidados** | Usar `async/await` exclusivamente. No callbacks, no `.then()` encadenados. |
| 13 | **`document.querySelector` en cada módulo** | Centralizar referencias DOM en `main.js` y pasar como parámetros. |
| 14 | **Sin atribución** | Siempre incluir "Hecho con ❤️ por David Antizar" en el footer. |
| 15 | **Texto IA sin revisión** | Todo el texto generado por IA debe ser revisable y editable por el usuario. |

---

## 11. Plan de desarrollo por fases

### Fase 1: Fundamentos (Semanas 1-2)

| # | Tarea | Archivo(s) | Estado |
|---|---|---|---|
| 1.1 | Estructura de proyecto y repositorio | `SPEC.md`, `PLAN.md`, `README.md` | ⬜ |
| 1.2 | `index.html` — estructura DOM, sidebar, áreas | `index.html` | ⬜ |
| 1.3 | `css/style.css` — Aurora Ntizar v5.2 adaptado | `css/style.css` | ⬜ |
| 1.4 | `js/config.js` — configuración centralizada | `js/config.js` | ⬜ |
| 1.5 | `js/utils.js` — utilidades | `js/utils.js` | ⬜ |
| 1.6 | `js/main.js` — orquestador básico | `js/main.js` | ⬜ |
| 1.7 | `server.mjs` — servidor estático + proxy | `server.mjs` | ⬜ |
| 1.8 | Deploy en NaN.builders (página estática) | — | ⬜ |

### Fase 2: Formularios y geolocalización (Semanas 3-4)

| # | Tarea | Archivo(s) | Estado |
|---|---|---|---|
| 2.1 | `js/geocode.js` — Nominatim | `js/geocode.js` | ⬜ |
| 2.2 | `js/map.js` — Leaflet init, marcadores | `js/map.js` | ⬜ |
| 2.3 | `js/form.js` — formularios centro y empresa | `js/form.js` | ⬜ |
| 2.4 | Integración: formulario → mapa → geocodificación | `main.js` | ⬜ |
| 2.5 | Persistencia local (IndexedDB) | `utils.js` + `form.js` | ⬜ |

### Fase 3: Encuesta y diagnóstico (Semanas 5-6)

| # | Tarea | Archivo(s) | Estado |
|---|---|---|---|
| 3.1 | `js/survey.js` — generación y almacenamiento | `js/survey.js` | ⬜ |
| 3.2 | `js/diagnosis.js` — cálculos básicos | `js/diagnosis.js` | ⬜ |
| 3.3 | `js/dashboard.js` — gráficos Chart.js | `js/dashboard.js` | ⬜ |
| 3.4 | Integración encuesta → diagnóstico → dashboard | `main.js` | ⬜ |
| 3.5 | Umbral mínimo 10 respuestas, agregación | `survey.js` | ⬜ |

### Fase 4: DAFO y medidas (Semanas 7-8)

| # | Tarea | Archivo(s) | Estado |
|---|---|---|---|
| 4.1 | `js/dafo.js` — análisis automático | `js/dafo.js` | ⬜ |
| 4.2 | `js/measures.js` — catálogo y priorización | `js/measures.js` | ⬜ |
| 4.3 | `js/objectives.js` — objetivos SMART | `js/objectives.js` | ⬜ |
| 4.4 | `data/catalog.json` — catálogo de medidas | `data/catalog.json` | ⬜ |
| 4.5 | UI: visualización DAFO y medidas | `index.html` | ⬜ |

### Fase 5: Isocronas y transporte público (Semanas 9-10)

| # | Tarea | Archivo(s) | Estado |
|---|---|---|---|
| 5.1 | `js/isochrones.js` — OpenRouteService | `js/isochrones.js` | ⬜ |
| 5.2 | `js/gtfs.js` — NAP/GTFS transporte público | `js/gtfs.js` | ⬜ |
| 5.3 | Integración isocronas en mapa | `map.js` + `isochrones.js` | ⬜ |
| 5.4 | Fallback a radios circulares | `isochrones.js` | ⬜ |
| 5.5 | Import manual de datos de transporte | `gtfs.js` | ⬜ |

### Fase 6: IA y generación de informe (Semanas 11-13)

| # | Tarea | Archivo(s) | Estado |
|---|---|---|---|
| 6.1 | `js/ai-report.js` — prompts por sección | `js/ai-report.js` | ⬜ |
| 6.2 | `server.mjs` — endpoint NaN API proxy | `server.mjs` | ⬜ |
| 6.3 | `js/report.js` — editor Markdown | `js/report.js` | ⬜ |
| 6.4 | Generación secuencial de 16 secciones | `ai-report.js` | ⬜ |
| 6.5 | Editor en vivo con preview | `report.js` | ⬜ |

### Fase 7: Export y refinamiento (Semanas 14-15)

| # | Tarea | Archivo(s) | Estado |
|---|---|---|---|
| 7.1 | Export Markdown (.md) | `report.js` | ⬜ |
| 7.2 | Export PDF (.pdf) con jsPDF + mapa | `report.js` + `map.js` | ⬜ |
| 7.3 | Export DOCX (.docx) | `report.js` | ⬜ |
| 7.4 | `map.js` — captura de mapa para PDF | `map.js` | ⬜ |
| 7.5 | Accesibilidad WCAG 2.1 AA | `css/style.css` + `index.html` | ⬜ |
| 7.6 | Testing y corrección de bugs | — | ⬜ |
| 7.7 | Deploy versión completa en NaN.builders | — | ⬜ |

### Fase 8: Versión completa (Semanas 16-20)

| # | Tarea | Archivo(s) | Estado |
|---|---|---|---|
| 8.1 | Multi-centro | `form.js` + `main.js` | ⬜ |
| 8.2 | Comparación de escenarios | `diagnosis.js` + `dashboard.js` | ⬜ |
| 8.3 | Plan mancomunado sugerencias | `measures.js` | ⬜ |
| 8.4 | Import CSV/Excel/GTFS | `gtfs.js` + `survey.js` | ⬜ |
| 8.5 | Documentación completa | `README.md`, `PLAN.md` | ⬜ |
| 8.6 | Publicación en GitHub (público) | — | ⬜ |

---

## 12. Privacidad y RGPD

| Principio | Implementación |
|---|---|
| **Minimización** | No recopilar domicilio exacto. Usar código postal/municipio. |
| **Anonimización** | Las respuestas de encuesta se almacenan sin identificador personal. ID generado como hash aleatorio. |
| **Agregación** | Resultados solo visibles con ≥ 10 respuestas. |
| **Separación** | Identidad y respuestas nunca se almacenan juntas. |
| **Almacenamiento local** | Todo en IndexedDB del navegador. Sin envío a servidor. |
| **Sin perfilado** | No usar datos territoriales para perfilado individual ni decisiones laborales. |
| **Transparencia** | Aviso de privacidad visible antes de la encuesta. |
| **Eliminación** | Botón "Borrar todos los datos" en configuración. |

---

## 13. Reglas de integración de APIs externas

1. **No asumir API única para toda España.** Construir conectores nacionales, autonómicos y municipales.
2. **Aceptar import manual** de CSV, Excel, GeoJSON, shapefile y GTFS como alternativa a APIs.
3. **Registrar metadatos** de cada fuente: URL, fecha de descarga, licencia, cobertura, versión, limitaciones.
4. **Diferenciar oferta planificada** (GTFS) de datos en tiempo real.
5. **Respetar límites de consulta** con debounce, caché local y fallback.
6. **Revisar condiciones de uso** de cada API antes de integrar.
7. **Nominatim:** User-Agent obligatorio, máximo 1 req/seg.
8. **OpenRouteService:** API key gratuita, 200 req/15 min. Fallback a radios circulares si se excede.

---

## 14. Notas de implementación

### 14.1 Leaflet Canvas renderer

```javascript
// map.js — siempre usar Canvas renderer para mejor rendimiento
const map = L.map('map-container', {
  renderer: L.canvas(),
  zoomControl: true
});
```

### 14.2 Chart.js — regla `var`

```javascript
// dashboard.js — SIEMPRE usar var, nunca const
var charts = window.charts = {};

charts.modalSplit = new Chart(ctx, {
  type: 'doughnut',
  data: { ... },
  options: { ... }
});
```

### 14.3 Estructura de index.html

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PLANDEMOVILIDAD — Plan de Movilidad Sostenible al Trabajo</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@2/dist/leaflet.css">
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <header>...</header>
  <div class="app-layout">
    <nav class="sidebar">...</nav>
    <main class="main-content">
      <section id="sec-centro">...</section>
      <section id="sec-empresa">...</section>
      <section id="sec-encuesta">...</section>
      <section id="sec-diagnostico">...</section>
      <section id="sec-dafo">...</section>
      <section id="sec-medidas">...</section>
      <section id="sec-objetivos">...</section>
      <section id="sec-informe">...</section>
      <section id="sec-export">...</section>
    </main>
  </div>
  <footer>Hecho con ❤️ por David Antizar</footer>
  
  <script src="https://unpkg.com/leaflet@2/dist/leaflet.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
  <script src="https://unpkg.com/docx@8/build/index.umd.js"></script>
  
  <script type="module" src="js/main.js"></script>
</body>
</html>
```

### 14.4 Estructura de server.mjs

```javascript
// server.mjs — NaN.builders
import { serve } from 'https://deno.land/std@0.170.0/http/server.ts';
// o Node.js native:
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// 1. Servidor estático (archivos locales)
// 2. Proxy para APIs externas (evitar CORS)
//    - /api/nominatim → Nominatim
//    - /api/ors → OpenRouteService
//    - /api/ine → INE
//    - /api/aemet → AEMET
// 3. Endpoint IA NaN
//    - /api/ai/generate → NaN API (qwen3.6)

const PORT = process.env.PORT || 3000;
// ... implementación
```

### 14.5 Estructura de catalog.json

```json
{
  "medidas": [
    {
      "id": "m001",
      "nombre": "Teletrabajo flexible",
      "categoria": "organizacion",
      "jerarquia": 1,
      "descripcion": "Permitir teletrabajo 2-3 días/semana",
      "coste": "bajo",
      "plazo": "inmediato",
      "prioridad": "alta"
    },
    {
      "id": "m002",
      "nombre": "Aparcabicis cubierto",
      "categoria": "bicicleta",
      "jerarquia": 3,
      "descripcion": "Instalar aparcabicis cubierto y seguro",
      "coste": "medio",
      "plazo": "3 meses",
      "prioridad": "media"
    }
  ],
  "indicadores": [
    {
      "id": "i001",
      "nombre": "Reparto modal",
      "formula": "personas_por_modo / respuestas_validas",
      "frecuencia": "semestral"
    }
  ],
  "categorias": ["organizacion", "caminar", "bicicleta", "transporte_publico", "compartido", "aparcamiento", "flota"]
}
```

---

## 15. Glossary

| Término | Definición |
|---|---|
| **PMST** | Plan de Movilidad Sostenible al Trabajo |
| **PTST** | Plan de Transporte al Trabajo (sinónimo) |
| **In itinere** | Desplazamiento entre el domicilio y el centro de trabajo |
| **Isocrona** | Área alcanzable en un tiempo determinado desde un punto |
| **GTFS** | General Transit Feed Specification (horarios de transporte público) |
| **NAP** | National Access Point (portal nacional de datos de transporte) |
| **DAFO** | Debilidades, Amenazas, Fortalezas, Oportunidades |
| **CO2e** | Dióxido de carbono equivalente |
| **ZBE** | Zona de Bajas Emisiones |
| **VMP** | Vehículo de Movilidad Personal (patinete, etc.) |
| **CNAE** | Clasificación Nacional de Actividades Económicas |
| **INE** | Instituto Nacional de Estadística (España) |
| **AEMET** | Agencia Estatal de Meteorología |
| **MITECO** | Ministerio para la Transición Ecológica |
| **DGT** | Dirección General de Tráfico |
| **CRTM** | Consorcio Regional de Transportes de Madrid |

---

*Documento generado julio 2026. Hecho con ❤️ por David Antizar.*
