# PLANDEMOVILIDAD

Generador automático de Planes de Movilidad Sostenible al Trabajo (PMST/PTST).

Web app interactiva que genera diagnósticos de movilidad, DAFO, medidas priorizadas e informes profesionales con IA, para cualquier centro de trabajo en España.

## Características

- 🗺️ **Mapa interactivo** con Leaflet + CARTO Light tiles
- 🔍 **Geolocalización** con Nominatim (OpenStreetMap)
- 📊 **Encuestas anonimizadas** de movilidad plantillas
- 📈 **Diagnóstico automático**: reparto modal, huella CO2e (MITECO), indicadores
- 🔬 **Análisis DAFO** generado automáticamente
- 🎯 **Objetivos SMART** con indicadores medibles
- 📝 **Informe profesional** con IA generativa (NaN API / qwen3.6)
- 📄 **Exportación**: Markdown, PDF, DOCX

## Estructura del proyecto

```
PLANDEMOVILIDAD/
├── index.html           # Estructura DOM (22KB)
├── css/
│   └── style.css        # Estilos Aurora Ntizar v5.2
├── js/
│   ├── config.js        # Configuración centralizada (APIs, colores, factores CO2e MITECO)
│   ├── utils.js         # Utilidades: debounce, haversine, isocronas simuladas
│   ├── map.js           # Leaflet: init, marcadores, isocronas, captura PDF
│   ├── geocode.js       # Nominatim: geocodificación directa e inversa
│   ├── form.js          # Formularios: centro + empresa + flota
│   ├── main.js          # Orquestador: navegación + estado global
│   └── [otros módulos en fases siguientes]
├── data/
│   └── catalog.json     # Catálogo de medidas e indicadores
├── SPEC.md              # Especificación completa del proyecto
├── PLAN.md              # Plan de desarrollo
└── README.md            # Este archivo
```

## Módulos actuales (Fase 1)

| Módulo | Función | Estado |
|--------|---------|--------|
| `config.js` | Configuración: APIs, colores, factores CO2e MITECO | ✅ Listo |
| `utils.js` | Haversine, debounce, isocronas simuladas, hash | ✅ Listo |
| `map.js` | Leaflet Canvas, marcadores, captura PDF | ✅ Listo |
| `geocode.js` | Nominatim con cache y rate-limit | ✅ Listo |
| `form.js` | Formularios centro/empresa, flota, guardado localStorage | ✅ Listo |
| `main.js` | Orquestador, navegación, estado global | ✅ Listo |

## Fases de desarrollo

| Fase | Contenido | Estado |
|------|-----------|--------|
| 1 | Fundamentos: mapa, geocodificación, formularios | ✅ En progreso |
| 2 | Isocronas ORS + transporte público GTFS | ⏳ Pendiente |
| 3 | Encuesta de movilidad anonimizada | ⏳ Pendiente |
| 4 | Diagnóstico (reparto modal, CO2e, KPIs) | ⏳ Pendiente |
| 5 | DAFO automático + medidas priorizadas | ⏳ Pendiente |
| 6 | Objetivos SMART | ⏳ Pendiente |
| 7 | Generación informe con IA (16 prompts) | ⏳ Pendiente |
| 8 | Editor + export MD/PDF/DOCX + deploy | ⏳ Pendiente |

## Tecnologías

- **Frontend:** Vanilla JS ES modules, Leaflet 2.x, Chart.js 4.x
- **Mapas:** CARTO Light tiles, OpenRouteService, Nominatim
- **IA:** NaN API (qwen3.6) para generación de textos
- **Export:** jsPDF, html2canvas, DOCX (UMD)
- **Deploy:** NaN.builders

## Datos verificados

- **Factores CO2e:** MITECO (kg CO2e/km/persona)
- **Transporte público:** NAP Transportes / GTFS España
- **Geocodificación:** OpenStreetMap / Nominatim
- **Isocronas:** OpenRouteService v2

## Licencia

MIT — Uso libre y gratuito

---

Hecho con ❤️ por David Antizar
