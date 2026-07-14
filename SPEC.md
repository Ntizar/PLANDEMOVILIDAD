# PLANDEMOVILIDAD v3.0 — SPEC

## Visión

Generador profesional de **Planes de Movilidad Sostenible al Trabajo (PMST/PTST)** cumple normativa española (Ley 8/2021). Aplicación web 100% client-side que genera informes de **60-80 páginas** con datos reales de APIs públicas, gráficas interactivas, mapas de isocronas, y seguimiento de indicadores multi-año.

**Autor:** David Antizar  
**Hecho con ❤️ por David Antizar**

---

## Alcance

### Sí hace

1. **Formularios de datos** — Centro, empresa, empleados (CRUD completo)
2. **Encuesta de movilidad** — Formulario RGPD-compliant con IndexedDB
3. **Diagnóstico automático** — Reparto modal, CO2e (factores MITECO 2024), DAFO
4. **Mapa interactivo** — Leaflet con isocronas ORS, paradas TP, GBFS bici, POIs
5. **Datos de transporte público real** — API NAP DGT + Overpass (paradas, líneas, frecuencias)
6. **Datos GBFS** — Bicicletas compartidas de ciudades españolas (Madrid, Barcelona, Valencia, etc.)
7. **Isocronas de accesibilidad** — ORS API (pies, bici, coche) con fallback simulado
8. **Informe completo** — Generación automática de PMST de 60-80 páginas con 20+ secciones
9. **Export profesional** — HTML imprimible, DOCX (docx.js), ZIP completo
10. **Seguimiento de KPIs** — Tabla multi-año con evolución de indicadores
11. **Comparativas** — Centro vs media nacional + autonómica + sector CNAE
12. **Dashboard** — KPIs, gráficas, mapa miniatura
13. **Flota corporativa** — CRUD vehículos, cálculo CO2e flota
14. **Tabla de seguimiento anual** — Evolución de KPIs por año (tabla editable)

### NO hace (non-goals)

- **Sin backend** — Todo client-side, datos en IndexedDB/localStorage
- **Sin login/usuarios** — Herramienta de uso individual
- **Sin IA generativa** — El informe se genera con templates + datos, no con LLM
- **Sin base de datos server** — Persistencia local únicamente
- **Sin modo offline** — Requiere conexión para APIs (ORS, NAP, GBFS)
- **Sin framework** — Vanilla JS + ES modules (máxima portabilidad)

---

## Estructura del informe PMST (60-80 páginas)

### Secciones del informe

| # | Sección | Pág aprox | Fuente de datos |
|---|---------|-----------|-----------------|
| 0 | **Portada** | 1 | Formulario centro/empresa |
| 1 | **Índice** | 1 | Auto-generado |
| 2 | **Resumen ejecutivo** | 2 | Cálculo automático |
| 3 | **Alcance, objetivos y gobernanza** | 2 | Formulario empresa |
| 4 | **Marco normativo** | 3 | Texto estático (Ley 8/2021, RD) |
| 5 | **Metodología y fuentes** | 2 | Texto + configuración |
| 6 | **Caracterización del centro** | 4 | Formulario centro |
| 7 | **Análisis de la demanda — Resultados encuesta** | 8 | Encuesta IndexedDB |
| 8 | **Análisis de la oferta de TP** | 6 | NAP DGT + Overpass API |
| 9 | **Mapas de isocronas** | 4 | ORS API + Leaflet |
| 10 | **Datos de bici compartida (GBFS)** | 3 | APIs GBFS ciudades |
| 11 | **Análisis de barreras y oportunidades** | 3 | Encuesta + DAFO |
| 12 | **Diagnóstico DAFO** | 3 | Cálculo automático |
| 13 | **Huella de carbono CO2e** | 4 | Factores MITECO 2024 |
| 14 | **Comparativas** | 3 | Datos nacionales + autonómicos |
| 15 | **Medidas priorizadas** | 6 | Catálogo + priorización |
| 16 | **Objetivos SMART** | 3 | Generados desde diagnóstico |
| 17 | **Plan de seguimiento — KPIs multi-año** | 4 | Tabla editable anual |
| 18 | **Plan de comunicación** | 2 | Texto template |
| 19 | **Presupuesto estimado** | 2 | Catálogo de costes |
| 20 | **Cronograma de implantación** | 2 | Timeline visual |
| 21 | **Anexos** | 4 | Datos, encuesta, normativa |
| **Total** | | **~70 páginas** | |

---

## Arquitectura

### Capas

```
┌─────────────────────────────────────────────┐
│  PRESENTACIÓN                                │
│  index.html + css/style.css                  │
│  (Estructura DOM, estilos Aurora Ntizar)     │
├─────────────────────────────────────────────┤
│  ORQUESTACIÓN                                │
│  js/app.js  (estado global, init, wiring)    │
├─────────────────────────────────────────────┤
│  MÓDULOS DE NEGOCIO                          │
│  js/state.js       ← Estado + persistencia  │
│  js/diagnostico.js ← Cálculo indicadores    │
│  js/dafo.js        ← Análisis DAFO          │
│  js/medidas.js     ← Catálogo medidas       │
│  js/objetivos.js   ← Objetivos SMART        │
│  js/seguimiento.js ← KPIs multi-año         │
│  js/survey.js      ← Encuesta RGPD          │
├─────────────────────────────────────────────┤
│  MÓDULOS DE DATOS                            │
│  js/api-nap.js     ← NAP DGT (paradas TP)   │
│  js/api-gbfs.js    ← GBFS (bici compartida) │
│  js/api-ors.js     ← ORS (isocronas)        │
│  js/api-nominatim.js ← Geocodificación      │
├─────────────────────────────────────────────┤
│  MÓDULOS DE VISUALIZACIÓN                    │
│  js/map.js         ← Leaflet (mapa + capas)  │
│  js/charts.js      ← Chart.js (todas gráf)  │
│  js/informe.js     ← Generador informe MD   │
│  js/export.js      ← PDF/DOCX/ZIP           │
├─────────────────────────────────────────────┤
│  UTILIDADES                                  │
│  js/utils.js       ← Funciones puras        │
│  js/config.js      ← Constantes globales    │
└─────────────────────────────────────────────┘
```

### Archivos del proyecto

```
PLANDEMOVILIDAD/
├── index.html              ← Entry point (solo DOM structure)
├── SPEC.md                 ← Este documento
├── css/
│   └── style.css           ← Estilos (Aurora Ntizar v5.2)
├── js/
│   ├── app.js              ← Orquestador principal
│   ├── config.js           ← Constantes y configuración
│   ├── utils.js            ← Funciones puras reutilizables
│   ├── state.js            ← Estado global + IndexedDB
│   ├── diagnostico.js      ← Cálculo de indicadores
│   ├── dafo.js             ← Análisis DAFO
│   ├── medidas.js          ← Catálogo de medidas
│   ├── objetivos.js        ← Generación SMART
│   ├── seguimiento.js      ← KPIs multi-año (NUEVO)
│   ├── survey.js           ← Encuesta movilidad
│   ├── api-nap.js          ← NAP DGT paradas (NUEVO)
│   ├── api-gbfs.js         ← GBFS bici compartida (NUEVO)
│   ├── api-ors.js          ← ORS isocronas (NUEVO)
│   ├── api-nominatim.js    ← Geocodificación
│   ├── map.js              ← Leaflet mapa
│   ├── charts.js           ← Chart.js gráficas
│   ├── informe.js          ← Generador informe (REWRITE)
│   └── export.js           ← Export PDF/DOCX/ZIP
├── data/
│   ├── normativa.js        ← Textos legales
│   ├── catalogo-medidas.js ← Catálogo de medidas PMST
│   └── gbfs-cities.js      ← Endpoints GBFS ciudades
└── assets/
    └── logo.svg            ← Logo (opcional)
```

### Estado global (`window.appState`)

```javascript
window.appState = {
    // Formularios
    centro: {              // Datos del centro de trabajo
        nombre, direccion, lat, lon, actividad, plantilla, 
        superficie, turnos: [], codigoPostal, municipio, provincia
    },
    empresa: {             // Datos de la empresa
        teletrabajoPct, diasPresencial, plazasCoche, plazasBici,
        duchas, recargaElectrica, ayudaTransporte, lanzadera,
        carpooling, nombreEmpresa, cnae, sector
    },
    
    // Empleados
    empleados: [],         // CRUD completo
    
    // Encuesta
    encuesta: {
        respuestas: [],    // IndexedDB
        agregados: {},     // Calculados
    },
    
    // Análisis
    diagnostico: null,     // Reparto modal, CO2e, indicadores
    dafo: null,            // Fortalezas, debilidades, etc.
    medidas: [],           // Catálogo priorizado
    objetivos: [],         // SMART generados
    
    // Datos externos
    transportePublico: {   // API NAP/Overpass
        paradas: [],       // Paradas reales
        lineas: [],        // Líneas disponibles
        frecuencias: {},   // Frecuencias por línea
    },
    gbfs: {                // API GBFS
        estaciones: [],    // Estaciones bici compartida
        bicicletas: 0,     // Disponibles ahora
        docks: 0,          // Total docks
    },
    isocronas: {           // API ORS
        pedestrian: null,  // GeoJSON 10/15 min
        cycling: null,     // GeoJSON 15/25 min
        driving: null,     // GeoJSON coche
    },
    
    // Seguimiento
    seguimiento: {         // KPIs multi-año (NUEVO)
        anios: [],         // ['2024', '2025', '2026', ...]
        kpis: {},          // { 'reparto_sostenible': { 2024: 45, 2025: 52 }, ... }
    },
    
    // Flota
    flota: [],             // Vehículos corporativos
    
    // Informe
    informe: {
        contenido: '',     // Markdown completo
        estado: 'pending',
    },
    
    // Configuración
    config: {
        orsApiKey: '',     // OpenRouteService API key
        ciudad: '',        // Para GBFS lookup
    },
}
```

---

## Módulos detallados

### 1. `css/style.css` — REWRITE COMPLETO

**Problema actual:** Selectores CSS usan IDs (`#app-header`, `#sidebar`, `#main-content`) donde el HTML usa clases (`.app-header`, `.sidebar`, `.main-content`). Resultado: layout sin estilos.

**Solución:** Reescribir CSS alineado 1:1 con el HTML actual. Selectores por clase, no por ID.

**Clases CSS requeridas por el HTML:**

```css
/* Layout */
.app-header, .header-content, .logo-area, .version-badge, .subtitle, .header-actions
.app-layout, .sidebar, .sidebar-nav, .nav-section, .nav-label, .nav-btn, .nav-btn.active
.main-content, .tab-content, .tab-content.active

/* KPIs */
.kpi-grid, .kpi-card, .kpi-icon, .kpi-value, .kpi-label

/* Dashboard */
.dashboard-grid, .chart-card, .chart-container, .map-card

/* Formularios */
.form-card, .form-grid, .form-row, .form-group, .form-actions, .checkbox-group

/* Tablas */
.table-card, .table-header, .table-actions, .table-responsive, .empty-state

/* Botones */
.btn, .btn-primary, .btn-outline

/* Dropdown */
.dropdown, .dropdown-menu, .dropdown-item

/* Mapa */
.map-container, .map-btn

/* DAFO */
.dafo-list

/* Secciones adicionales */
.segmento-card, .linea-card, .frecuencia-badge
.kpi-tracking-table, .kpi-row, .kpi-year-cell
```

### 2. `js/app.js` — REWRITE

**Problema actual:** Módulos importados incorrectamente, `showTab()` no definida, funciones `window.pmstApp.*` no implementadas.

**Solución:** App.js es el único orquestador. Expone TODAS las funciones que el HTML necesita en `window.pmstApp`.

**Funciones que DEBE exponer:**

```javascript
window.pmstApp = {
    // Navegación
    showTab(tabName),
    
    // Centro
    guardarCentro(),
    geolocalizarCentro(),
    miUbicacion(),
    
    // Empresa
    guardarEmpresa(),
    nuevaEmpresa(),
    
    // Empleados
    addEmpleado(),
    deleteEmpleado(id),
    filtrarEmpleados(),
    importarEmpleadosCSV(),
    exportarEmpleadosCSV(),
    
    // Diagnóstico
    calcularDiagnostico(),
    
    // DAFO
    calcularDAFO(),
    
    // Mapa
    initMap(),
    cargarTransportePublico(),
    cargarGBFS(),
    calcularIsocronas(),
    
    // Medidas y objetivos
    generarMedidas(),
    generarObjetivos(),
    
    // Seguimiento
    registrarKPI(),
    renderTablaSeguimiento(),
    
    // Export
    exportPDF(),
    exportDOCX(),
    exportZIP(),
    
    // Datos
    cargarDatosDemo(),
    borrarTodosDatos(),
}
```

### 3. `js/state.js` — Estado + Persistencia (NUEVO)

**Responsabilidad:** Estado global único + persistencia en IndexedDB.

```javascript
// Funciones exportadas:
initDB()                    // Abrir/crear IndexedDB
getState()                  // Leer estado completo
setState(path, value)       // Actualizar estado (immer-like)
save Centro(centro)         // Guardar centro
save Empresa(empresa)       // Guardar empresa
add Empleado(empleado)      // Añadir empleado
delete Empleado(id)         // Eliminar empleado
get Empleados()             // Obtener todos
add Seguimiento(kpi, anio, valor)  // Registrar KPI
get Seguimiento()           // Obtener registros
load All()                  // Cargar todo desde DB
clear All()                 // Borrar todo
```

### 4. `js/api-nap.js` — NAP DGT (NUEVO)

**Fuente:** https://nap.dgt.es/ + Overpass API

**Funciones:**

```javascript
buscarParadasTransporte(lat, lon, radioM = 1000)
  // 1. Overpass API: buscar paradas de autobús, metro, tren, tranvía
  // 2. Filtrar por radio Haversine
  // 3. Deduplicar por nombre + coordenadas
  // 4. Enriquecer con distinta info si disponible
  
buscarLineasTransporte(stopIds)
  // Overpass: líneas que pasan por cada parada
  // Retorna: { lineas: [{ id, nombre, operador, tipo }] }

obtenerFrecuencias(lineId)
  // Overpass: frecuencias de cada línea
  // Retorna: { frecuencias: [{ hora_inicio, hora_fin, intervalo_min }] }
```

**Endpoint Overpass:**
```
[out:json][timeout:25];
(
  node["highway"="bus_stop"](40.4,-3.72,40.44,-3.68);
  node["public_transport"="stop_position"](40.4,-3.72,40.44,-3.68);
  node["railway"="station"](40.4,-3.72,40.44,-3.68);
  node["railway"="tram_stop"](40.4,-3.72,40.44,-3.68);
);
out body;
```

### 5. `js/api-gbfs.js` — GBFS Bici Compartida (NUEVO)

**Fuente:** APIs GBFS de ciudades españolas

**Ciudades soportadas (endpoints verificados):**

| Ciudad | Sistema | GBFS URL |
|--------|---------|----------|
| Madrid | BiciMAD | `gbfs municipal` |
| Barcelona | Bicing | API propia |
| Valencia | Valenbisi | API EMT Valencia |
| Sevilla | Sevici | Bicicletas públicas |
| Bilbao | dBizi | Bizkaibusa |
| Zaragoza | Bizi | SMATSA |
| Málaga | MálagaBici | EMT Málaga |
| Palma | Calatrava | EMAYA |

**Funciones:**

```javascript
detectarGBFSCiudad(lat, lon)
  // Buscar en lista de ciudades cuál está más cercana
  // Retorna: { ciudad, sistema, endpoint } o null

cargarEstacionesGBFS(ciudad)
  // Fetch del feed GBFS station_information + station_status
  // Retorna: { estaciones: [{ id, nombre, lat, lon, capacidad, bikes, docks }] }

buscarEstacionesCercanas(lat, lon, radioM = 1000)
  // Filtrar estaciones por radio
  // Calcular distancia a cada una
  // Retorna: estaciones ordenadas por distancia
```

### 6. `js/api-ors.js` — Isocronas ORS (NUEVO)

**Fuente:** OpenRouteService API v2

**Funciones:**

```javascript
calcularIsocronas(lat, lon, api_key)
  // 3 modos: pedestrian (10, 15 min), cycling (15, 25 min), driving (10, 15 min)
  // Retorna: { pedestrian: GeoJSON, cycling: GeoJSON, driving: GeoJSON }
  // Fallback: usar calcularIsocronaSimulada() de utils.js si no hay API key

calcularRutasOrigenDestino(origen, destino, modo, api_key)
  // Para análisis de rutas de empleados
  // Retorna: { distancia_m, duracion_s, geometria }
```

### 7. `js/seguimiento.js` — KPIs Multi-año (NUEVO)

**Funcionalidad:** Tabla editable de seguimiento de indicadores por año.

**KPIs a trackear:**

| KPI | Unidad | Fuente |
|-----|--------|--------|
| % reparto sostenible | % | Encuesta anual |
| % coche particular | % | Encuesta anual |
| % teletrabajo | % | Registro RRHH |
| CO2e total | toneladas/año | Cálculo MITECO |
| CO2e por empleado | kg/empleado/año | Cálculo MITECO |
| Nº plazas bici | plazas | Registro empresa |
| Nº abonos TP subvencionados | abonos | Registro empresa |
| Accidentes en desplazamiento | nº | Registro SST |
| Satisfacción empleados | escala 1-10 | Encuesta |
| Nº empleados usando bici compartida | nº | Encuesta |
| Cobertura isocrona 15min | % | Cálculo GIS |

**Tabla de seguimiento (HTML):**

```html
<table class="kpi-tracking-table">
  <thead>
    <tr>
      <th>KPI</th>
      <th>Unidad</th>
      <th>Línea base</th>
      <th>2024</th>
      <th>2025</th>
      <th>2026</th>
      <th>2027</th>
      <th>Meta 2027</th>
    </tr>
  </thead>
  <tbody>
    <!-- Filas editables — click para editar valor -->
  </tbody>
</table>
```

**Funciones:**

```javascript
initSeguimiento()
  // Renderizar tabla con KPIs predefinidos
  // Cargar valores guardados de IndexedDB

registrarValorKPI(kpiId, anio, valor, nota)
  // Guardar en IndexedDB
  // Actualizar tabla

renderTablaSeguimiento()
  // Generar HTML de la tabla completa
  // Colores: verde si cumple meta, rojo si no

exportarSeguimientoCSV()
  // Descargar tabla como CSV

getEvolucionKPI(kpiId)
  // Retorna array de { anio, valor } para gráfica de evolución
```

### 8. `js/informe.js` — REWRITE COMPLETO

**Problema actual:** Genera ~10 páginas con secciones básicas.

**Solución:** Generador de informe completo de 60-80 páginas con 22 secciones.

**Estructura del generador:**

```javascript
generarInformeCompleto(state)
  // Retorna: string Markdown de ~70 páginas
  
// Secciones (cada una es una función):
seccionPortada(centro, empresa)
seccionIndice()
seccionResumenEjecutivo(diagnostico)
seccionAlcanceObjetivos(empresa)
seccionMarcoNormativo()              // Texto estático Ley 8/2021
seccionMetodologia(config)
seccionCaracterizacionCentro(centro)
seccionAnalisisDemanda(encuesta, empleados)
seccionOfertaTransporte(transportePublico)
seccionMapasIsocronas(isocronas)
seccionGBFS(gbfs)
seccionBarreras(dafo, encuesta)
seccionDiagnosticoDAFO(dafo)
seccionHuellaCO2e(diagnostico)
seccionComparativas(comparativas)
seccionMedidasPriorizadas(medidas)
seccionObjetivosSMART(objetivos)
seccionSeguimientoKPI(seguimiento)    // NUEVO
seccionPlanComunicacion(empresa)
seccionPresupuesto(medidas)
seccionCronograma(medidas)
seccionAnexos(encuesta, normativa)
```

### 9. `js/charts.js` — REWRITE

**Gráficas necesarias (todas con Chart.js):**

| Gráfica | Tipo | Sección informe |
|---------|------|-----------------|
| Reparto modal | Doughnut | Diagnóstico |
| Comparativas vs nacional | Bar grouped | Comparativas |
| CO2e por modo | Horizontal bar | Huella CO2e |
| Densidad viajes (horas) | Line | Demanda |
| Evolución KPIs (años) | Line multi | Seguimiento |
| Distribución por depto | Horizontal bar | Demanda |
| Distancia vs tiempo | Scatter | Demanda |
| Flota por combustible | Pie | Flota |
| Cobertura TP | Doughnut | Oferta TP |
| Barreras percibidas | Horizontal bar | Barreras |
| Interés en medidas | Horizontal bar | Barreras |
| Progreso objetivos | Polar | Objetivos |
| Isocronas (en mapa) | Leaflet layer | Mapa |
| GBFS estaciones | Leaflet markers | Mapa |

### 10. `js/map.js` — REWRITE

**Capas del mapa:**

| Capa | Fuente | Color |
|------|--------|-------|
| Centro trabajo | Marker | Rojo |
| Isocronas pies 10/15min | ORS/simulado | Azul |
| Isocronas bici 15/25min | ORS/simulado | Verde |
| Isocronas coche 10/15min | ORS/simulado | Naranja |
| Paradas TP | Overpass/NAP | Por tipo (metro=azul, bus=naranja, etc.) |
| Estaciones GBFS | GBFS API | Verde bici |
| POIs (supermercados, etc.) | Nominatim | Emojis |
| Empleados (simulados) | Datos | Por modo |
| Rutas empleado | ORS | Línea coloreada |

**Controles del mapa:**
- Selector de capas (Layer control Leaflet)
- Botones: 🔄 Recalcular isocronas, 🚌 Cargar TP, 🚲 Cargar GBFS, 🎯 Centrar
- Popup con info al click

---

## Datos estáticos

### `data/normativa.js`

Textos legales completos:
- Ley 8/2021, de 28 de diciembre, de medidas de reducción de la huella de carbono
- Real Decreto 1632/2024 (PMST/PTST)
- Artículo 7 (planes de movilidad)
- Requisitos mínimos del plan

### `data/catalogo-medidas.js`

Catálogo de ~30 medidas PMST con:

```javascript
const CATALOGO_MEDIDAS = [
    {
        id: 'med-01',
        nombre: 'Subvención abono transporte público',
        categoria: 'Incentivo económico',
        descripcion: 'Subvención parcial o total del abono de transporte público.',
        impacto: 'Alto',
        coste: 'Medio',
        plazo: '3 meses',
        indicador: '% empleados con abono subvencionado',
        meta: '30% en 12 meses',
    },
    // ... 29 más
];
```

**Categorías de medidas:**
- Incentivo económico
- Infraestructura
- Organizativo
- Comunicación
- Seguridad vial
- Flota
- Bicicleta
- Teletrabajo

### `data/gbfs-cities.js`

```javascript
const GBFS_CIUDADES = [
    { ciudad: 'Madrid', lat: 40.4168, lon: -3.7038, radio: 50000, endpoint: '...' },
    { ciudad: 'Barcelona', lat: 41.3874, lon: 2.1686, radio: 50000, endpoint: '...' },
    // ...
];
```

---

## CSS — Paleta y diseño

**Diseño:** Aurora Ntizar v5.2 adaptado

| Elemento | Color | Nota |
|----------|-------|------|
| Primary | `#2563eb` | Azul sólido |
| Secondary | `#f97316` | Naranja sólida |
| Success | `#16a34a` | Verde |
| Danger | `#dc2626` | Rojo |
| Warning | `#eab308` | Amarillo |
| Header | `#1a1a2e` | Azul oscuro |
| Background | `#ffffff` | Blanco |
| BG Alt | `#f8fafc` | Gris muy claro |
| Border | `#e2e8f0` | Borde sutil |
| Text | `#1e293b` | Texto principal |
| Text Muted | `#64748b` | Texto secundario |

**Reglas:**
- **SIN degradados** azul→naranja (interpola a morado en sRGB)
- Colores sólidos en bloques
- Bordes redondeados: 4/8/12px
- Sombras sutiles: `0 1px 2px rgba(0,0,0,0.05)` a `0 10px 15px rgba(0,0,0,0.1)`
- Sidebar blanca con borde derecho
- Header azul oscuro fijo
- Layout: sidebar fija + main scrollable

---

## Stack técnico

| Capa | Tecnología | CDN |
|------|-----------|-----|
| HTML | Vanilla | - |
| CSS | Vanilla (Aurora Ntizar) | - |
| JS | ES Modules (import/export) | - |
| Mapa | Leaflet 1.9.4 | unpkg |
| Gráficas | Chart.js 4.4.0 | jsdelivr |
| ZIP | JSZip 3.10.1 | cdnjs |
| PDF | html2canvas + jsPDF | cdnjs |
| DOCX | docx.js | cdnjs |

**CDN additions needed:**
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/docx@8.2.3/build/index.min.js"></script>
```

---

## Iteraciones de implementación

### Fase 1: Fix CSS + Navegación (URGENTE)
- Reescribir `css/style.css` alineado con HTML
- Implementar `showTab()` en `app.js`
- Verificar que la web se ve correctamente

### Fase 2: Módulos de negocio
- Crear `state.js` (estado + persistencia)
- Reconexionar `diagnostico.js`, `dafo.js`, `medidas.js`, `objetivos.js`
- Implementar todas las funciones `window.pmstApp.*`

### Fase 3: Datos externos
- Crear `api-nap.js` (Overpass paradas TP)
- Crear `api-gbfs.js` (bici compartida)
- Crear `api-ors.js` (isocronas)
- Integrar en mapa

### Fase 4: Informe completo
- Reescribir `informe.js` con 22 secciones
- Generador automático de 60-80 páginas
- Export DOCX profesional con tablas reales

### Fase 5: Seguimiento multi-año
- Crear `seguimiento.js`
- Tabla editable de KPIs por año
- Gráfica de evolución temporal

### Fase 6: Polish y deploy
- Tests en navegador con datos demo
- Responsive
- Deploy GitHub Pages

---

## Criterios de éxito

1. ✅ La web se ve correctamente (CSS alineado)
2. ✅ Navegación funciona (todas las pestañas accesibles)
3. ✅ Formularios guardan datos (IndexedDB)
4. ✅ Diagnóstico calcula indicadores reales
5. ✅ Mapa muestra paradas TP reales (Overpass)
6. ✅ Mapa muestra estaciones GBFS reales
7. ✅ Mapa muestra isocronas (ORS o simuladas)
8. ✅ Informe genera 60+ páginas de contenido
9. ✅ Export DOCX funciona con tablas
10. ✅ Tabla de seguimiento KPIs funciona
11. ✅ Responsive en móvil
12. ✅ Datos demo cargan correctamente

---

## Anti-patrones (lo que evitamos)

- ❌ **ID vs Clase en CSS** — Siempre usar clases, nunca IDs para estilos
- ❌ **Módulos huérfanos** — Todo módulo DEBE ser importado e inicializado
- ❌ **Funciones fantasma** — Toda función llamada desde HTML DEBE existir
- ❌ **Duplicación de módulos** — Un solo `map.js`, un solo `state.js`
- ❌ **Dependencias CDN faltantes** — Verificar TODAS las librerías en HTML
- ❌ **Informe corto** — Mínimo 60 páginas, máximo 80
- ❌ **Datos hardcodeados** — Todo dato de APIs públicas o encuesta
- ❌ **Estado disperso** — Un solo `window.appState` como fuente de verdad

---

## Referencias

- **Ley 8/2021:** https://www.boe.es/buscar/act.php?id=BOE-A-2021-23822
- **NAP DGT:** https://nap.dgt.es/
- **Overpass API:** https://overpass-api.de/
- **GBFS:** https://mobility.specs.gbfs.com/
- **ORS API:** https://openrouteservice.org/dev/
- **MITECO CO2e:** https://www.miteco.gob.es/es/cambio-climatico/temas/mitigacion-politicas-y-medidas/huella-carbono.html
- **Proyectos del autor:** GTFSSpain, GBFSSpain, DataHubEspana
- **Diseño:** Aurora Ntizar v5.2
