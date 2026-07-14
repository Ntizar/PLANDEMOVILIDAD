# PLANDEMOVILIDAD — Auditoría de estado y roadmap

**Fecha:** 14 julio 2026
**Autor:** David Antizar (Mastermind)

---

## 📊 Estado actual del proyecto

### ✅ Lo que FUNCIONA (y está commitado)

| Módulo | Archivo | Estado | Notas |
|--------|---------|--------|-------|
| App principal | `index.html` | ✅ | SPA con 13 tabs, funciona |
| CSS | `css/style.css` | ✅ | 992 líneas, reescrito Fase 1 |
| Core app | `js/app.js` | ✅ | CRUD empleados, flota, KPIs |
| Diagnóstico | `js/diagnostico.js` | ✅ | Reparto modal, CO₂e, indicadores |
| DAFO | `js/dafo.js` | ✅ | Análisis 2×2 completo |
| Objetivos SMART | `js/objetivos.js` | ✅ | Generación automática |
| Gráficas | `js/graficas.js` | ✅ | 9 tipos de Chart.js |
| Mapa Leaflet | `js/mapa.js` | ✅ | Inicialización, marcadores |
| Export PDF/DOCX | `js/export.js` | ✅ | Conectado a report.js |
| Informe 22 capítulos | `js/report.js` | ✅ | 3,850 líneas, HTML completo |
| Wrapper módulos | `js/main.js` | ✅ | Re-exports con cache-busting |
| Config | `js/config.js` | ✅ | Constantes, datos nacionales |
| Utils | `js/utils.js` | ✅ | Funciones helper |
| KPIs multi-año | `index.html` | ✅ | Matriz editable, Chart.js |
| Encuesta | `encuesta.html` | ✅ | 6 secciones, export CSV |
| Demo IA | `ai-demo.html` | ✅ | 8 capítulos con prompt/respuesta |

### ⚠️ Lo que EXISTE pero NO FUNCIONA

| Módulo | Archivo | Problema |
|--------|---------|----------|
| Transporte público | `js/gtfs.js` | Solo catálogo estático, **sin fetch a APIs reales** |
| Isochronas | `js/isochrones.js` | Tiene la función pero **sin API key configurada** |
| Geocodificación | `js/geocode.js` | Estructura básica, **sin integrar en flujo** |
| Mapa | `js/map.js` | Básico, **sin capas de isocronas/TP/GBFS** |
| Formulario | `js/form.js` | CRUD empleado, **sin validación robusta** |
| Survey engine | `js/survey.js` | Sistema de encuestas, **sin conexión con appState** |

### ❌ Lo que FALTA (según SPEC v3.0)

| Módulo | Descripción | Prioridad |
|--------|-------------|-----------|
| `js/state.js` | Estado centralizado + persistencia IndexedDB | 🔴 CRÍTICO |
| `js/medidas.js` | Catálogo de 40+ medidas PMST con priorización | 🔴 ALTA |
| `js/seguimiento.js` | Seguimiento KPIs multi-año con gráficas evolución | 🟡 MEDIA |
| `js/api-nap.js` | Conexión real NAP DGT (paradas, líneas, frecuencias) | 🔴 ALTA |
| `js/api-gbfs.js` | Conexión real GBFS (bici compartida ciudades ES) | 🟡 MEDIA |
| `js/api-ors.js` | Conexión real ORS (isocronas con API key) | 🟡 MEDIA |
| `js/api-nominatim.js` | Geocodificación real OSM | 🟢 BAJA |
| Import CSV encuestas | Cargar datos de `encuesta.html` en appState | 🔴 CRÍTICO |
| Multi-empresa | Cargar/gestionar datos de múltiples empresas | 🔴 ALTA |
| IA generativa | Conexión LLM para contenido del informe | 🟡 FASE 5 |

---

## 🎯 Roadmap propuesto (5 fases)

### Fase 3A: CSV Import + Multi-empresa (PRIORIDAD)
**Objetivo:** Poder cargar datos de encuestas reales y gestionar múltiples empresas.

**Archivos a crear/modificar:**
- `js/state.js` — Estado centralizado con persistencia
- `js/csv-import.js` — Parser CSV robusto (encuesta + empleados + flota)
- `js/empresa.js` — Gestión multi-empresa (crear, cargar, guardar)
- `index.html` — Nuevo tab "Empresas" + flujo de carga

**Flujo usuario:**
1. Usuario rellena `encuesta.html` → exporta CSV
2. En `index.html`, pestaña "Empresas" → "Importar CSV"
3. App parsea CSV, detecta columnas, muestra preview
4. Usuario confirma → datos se cargan en appState
5. Diagnóstico se recalcula automáticamente

### Fase 3B: APIs Externas REALES
Objetivo: Conectar NAP DGT, GBFS, ORS con fallbacks elegantes.

**Archivos a crear/modificar:**
- `js/api-nap.js` — Fetch paradas TP desde NAP DGT
- `js/api-gbfs.js` — Fetch estaciones bici desde GBFS
- `js/api-ors.js` — Fetch isocronas con API key
- `js/geocode.js` — Geocodificación Nominatim
- `js/mapa.js` — Capas de mapa (isocronas, paradas, GBFS)
- `index.html` — Sección "Datos Externos" con estado de conexiones

**APIs a conectar:**
| API | URL | API Key | Rate Limit |
|-----|-----|---------|------------|
| NAP DGT | `nap.transportes.gob.es` | No necesita | Generoso |
| GBFS Madrid | `madrid.es/gbfs` | No necesita | Generoso |
| GBFS BiciMAD | `gbfs.madrid.es` | No necesita | Generoso |
| ORS | `api.openrouteservice.org` | **Necesita** (gratis 2000/día) | 2000 req/día |
| Nominatim | `nominatim.openstreetmap.org` | No necesita | 1 req/seg |

### Fase 4: Medidas + Catálogo PMST
- Catálogo de 40+ medidas reales (del MITMA)
- Priorización automática según diagnóstico
- Coste estimado por medida
- Plan de comunicación interna

### Fase 5: IA Generativa
- Conexión LLM (qwen3.6 via NaN)
- Prompt templates por capítulo
- Generación de contenido adaptado a datos reales
- Cache de respuestas

### Fase 6: Despliegue
- GitHub Pages
- Configuración API keys
- Documentación de uso

---

## 💡 Ideas adicionales (para soñar fuerte)

1. **Comparador de empresas** — Cargar 3+ empresas y comparar sus diagnósticos
2. **Benchmarking sectorial** — Datos del CNAE del centro vs media nacional
3. **App móvil** — PWA para que los empleados rellenen la encuesta desde el móvil
4. **Notificaciones** — Enviar recordatorios por email/Telegram cuando toca renovar KPIs
5. **Dashboard público** — Panel web con los KPIs de movilidad accesible para toda la empresa
6. **Integración RRHH** — Conectar con sistemas de RRHH para importar datos de empleados
7. **Gamificación** — Ranking de departamentos por sostenibilidad
8. **Alertas ZBE** — Notificar cuando se acercan restricciones ZBE en la ciudad
9. **Simulador "¿Qué pasaría si...?"** — Cambiar un parámetro y ver el impacto en CO₂e
10. **Export a Word real** — docx.js con formato profesional (no solo texto plano)

---

## 📋 Resumen de archivos del proyecto

```
PLANDEMOVILIDAD/
├── index.html              # App principal (SPA)
├── encuesta.html           # Formulario de recolección CSV
├── ai-demo.html            # Demo de IA generativa
├── css/
│   └── style.css           # Aurora Ntizar (992 líneas)
├── js/
│   ├── app.js              # Core: CRUD, estado, KPIs
│   ├── config.js           # Constantes, datos nacionales
│   ├── dafo.js             # Análisis DAFO
│   ├── diagnostico.js      # Cálculo diagnóstico
│   ├── export.js           # Export PDF/DOCX/ZIP
│   ├── graficas.js         # 9 tipos de Chart.js
│   ├── main.js             # Wrapper con cache-busting
│   ├── mapa.js             # Leaflet mapa
│   ├── objetivos.js        # Objetivos SMART
│   ├── report.js           # Generador informe 22 capítulos
│   ├── survey.js           # Engine de encuestas
│   ├── gtfs.js             # Transporte público (stub)
│   ├── isochrones.js       # Isochronas ORS (stub)
│   ├── geocode.js          # Geocodificación (stub)
│   ├── map.js              # Mapa básico (stub)
│   └── form.js             # Formularios CRUD
├── SPEC.md                 # Especificación v3.0
├── NORMAS.md               # Reglas de modificación
└── README.md               # Documentación
```
