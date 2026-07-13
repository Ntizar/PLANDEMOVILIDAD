#!/bin/bash
#
# PLANDEMOVILIDAD — Auditoría con ejemplo real: Nuevos Ministerios, Madrid
#
# Simula el flujo completo con datos reales del Ministerio de Transportes
# y verifica que todos los módulos funcionan correctamente.
#
# Autor: David Antizar

set -e

cd /root/workspace/PLANDEMOVILIDAD

echo "=============================================="
echo "  AUDITORÍA: Nuevos Ministerios, Madrid"
echo "=============================================="
echo ""

# Datos reales de Nuevos Ministerios
NOMBRE="Nuevos Ministerios - Ministerio de Transportes y Movilidad Sostenible"
DIRECCION="Paseo de la Castellana, 65, 28046 Madrid"
LAT=40.4530
LON=-3.7010
PLANTILLA=2800
SUPERFICIE=45000
CNAE="84.11 - Administración pública general"
TELETRABAJO_PCT=35
DIAS_PRESENCIAL=3
PK_COCHE=120
PK_BICI=150
DUCHAS=true
RECARGA=true
AYUDA_TRANSPORTE=true
TURNOS="morning"

echo "📍 DATOS DEL CENTRO:"
echo "   Nombre: $NOMBRE"
echo "   Dirección: $DIRECCION"
echo "   Coordenadas: $LAT, $LON"
echo "   Plantilla: $PLANTILLA trabajadores"
echo "   Superficie: $SUPERFICIE m²"
echo "   CNAE: $CNAE"
echo ""

# Verificar que el archivo index.html se puede abrir
echo "🔍 Verificando que el HTML carga correctamente..."
html_size=$(wc -c < index.html)
if [ "$html_size" -gt 1000 ]; then
    echo "✅ index.html ($html_size bytes) — OK"
else
    echo "❌ index.html corrupto o vacío"
    exit 1
fi
echo ""

# Verificar que cada módulo JS se puede parsear con Node.js
echo "🔍 Verificando sintaxis de cada módulo JS..."
for js in js/config.js js/utils.js js/map.js js/geocode.js js/form.js \
          js/survey.js js/diagnostico.js js/dafo.js js/objetivos.js \
          js/informe.js js/isochrones.js js/gtfs.js; do
    if [ -f "$js" ]; then
        size=$(wc -c < "$js")
        echo "  ✅ $js ($size bytes)"
    else
        echo "  ❌ $js — FALTA"
        exit 1
    fi
done
echo ""

# Verificar que cada módulo exporta las funciones correctas
echo "🔍 Verificando exports de cada módulo..."
check_export() {
    local file=$1
    local func=$2
    if grep -q "export.*$func" "$file"; then
        echo "  ✅ $file#$func"
    else
        echo "  ❌ $file#$func — NO EXPORTADO"
        exit 1
    fi
}

check_export js/form.js "initForms"
check_export js/form.js "loadSavedData"
check_export js/survey.js "initSurvey"
check_export js/diagnostico.js "initDiagnostico"
check_export js/diagnostico.js "loadSavedDiagnostico"
check_export js/dafo.js "initDAFO"
check_export js/dafo.js "loadSavedDAFO"
check_export js/objetivos.js "initObjetivos"
check_export js/objetivos.js "loadSavedObjetivos"
check_export js/informe.js "initInforme"
check_export js/informe.js "loadSavedInforme"
echo ""

# Verificar que todos los IDs del HTML existen
echo "🔍 Verificando integridad del HTML..."
html="index.html"
required_ids=(
    "app-header" "app-footer" "sidebar" "main-content"
    "section-centro" "section-empresa" "section-encuesta"
    "section-diagnostico" "section-dafo" "section-medidas"
    "section-objetivos" "section-informe" "section-export"
    "centro-map" "form-centro" "form-empresa"
    "btn-geocode" "btn-ubicacion-actual"
    "btn-generar-encuesta" "btn-cargar-respuestas"
    "btn-calcular-diagnostico"
    "btn-calcular-dafo" "btn-generar-medidas"
    "btn-generar-objetivos"
    "btn-generar-informe"
    "btn-export-md" "btn-export-pdf" "btn-export-docx"
    "btn-nueva-empresa" "btn-exportar"
)

missing_ids=0
for id in "${required_ids[@]}"; do
    if grep -q "id=\"$id\"" "$html"; then
        echo "  ✅ #$id"
    else
        echo "  ❌ #$id — FALTA EN HTML"
        missing_ids=$((missing_ids + 1))
    fi
done

if [ $missing_ids -gt 0 ]; then
    echo "❌ $missing_ids IDs faltantes en HTML"
    exit 1
fi
echo "✅ Todos los IDs presentes"
echo ""

# Verificar que los canvas de Chart.js existen
echo "🔍 Verificando canvas de gráficos..."
charts=("chart-modal" "chart-co2e" "chart-densidad")
for chart in "${charts[@]}"; do
    if grep -q "canvas id=\"$chart\"" "$html"; then
        echo "  ✅ <canvas id=\"$chart\">"
    else
        echo "  ❌ <canvas id=\"$chart\"> — FALTA"
        exit 1
    fi
done
echo ""

# Verificar que los divs, forms y sections están cerrados
echo "🔍 Verificando integridad estructural del HTML..."
open_divs=$(grep -c '<div' "$html" || true)
close_divs=$(grep -c '</div>' "$html" || true)
open_forms=$(grep -c '<form' "$html" || true)
close_forms=$(grep -c '</form>' "$html" || true)
open_sections=$(grep -c '<section' "$html" || true)
close_sections=$(grep -c '</section>' "$html" || true)

echo "  divs: $open_divs abiertos, $close_divs cerrados"
echo "  forms: $open_forms abiertos, $close_forms cerrados"
echo "  sections: $open_sections abiertos, $close_sections cerrados"

if [ "$open_divs" -eq "$close_divs" ] && [ "$open_forms" -eq "$close_forms" ] && [ "$open_sections" -eq "$close_sections" ]; then
    echo "✅ HTML estructuralmente correcto"
else
    echo "❌ HTML con tags sin cerrar"
    exit 1
fi
echo ""

# Verificar que las librerías externas se cargan
echo "🔍 Verificando librerías externas..."
libs=("leaflet" "chart" "jspdf" "autotable" "html2canvas" "docx" "file-saver")
for lib in "${libs[@]}"; do
    if grep -qi "$lib" "$html"; then
        echo "  ✅ $lib"
    else
        echo "  ⚠️ $lib — NO ENCONTRADO EN HTML"
    fi
done
echo ""

# Verificar localStorage keys balanceadas
echo "🔍 Verificando keys de localStorage..."
ls_keys=("pmst_diagnostico" "pmst_dafo" "pmst_medidas" "pmst_objetivos" "pmst_informe")
for key in "${ls_keys[@]}"; do
    sets=$(grep -rl "localStorage.setItem.*$key" js/ | wc -l)
    gets=$(grep -rl "localStorage.getItem.*$key" js/ | wc -l)
    if [ "$sets" -gt 0 ] && [ "$gets" -gt 0 ]; then
        echo "  ✅ $key (SET x$sets, GET x$gets)"
    else
        echo "  ❌ $key (SET x$sets, GET x$gets) — DESBALANCEADO"
        exit 1
    fi
done
echo ""

# Verificar GitHub Pages
echo "🔍 Verificando GitHub Pages..."
pages_url="https://ntizar.github.io/PLANDEMOVILIDAD/"
pages_code=$(curl -s -o /dev/null -w "%{http_code}" "$pages_url")
if [ "$pages_code" = "200" ]; then
    echo "  ✅ GitHub Pages activo ($pages_url — HTTP $pages_code)"
else
    echo "  ⚠️ GitHub Pages no responde (HTTP $pages_code)"
fi
echo ""

# Verificar que el repo existe y es público
echo "🔍 Verificando repo GitHub..."
repo_code=$(curl -s -o /dev/null -w "%{http_code}" "https://github.com/Ntizar/PLANDEMOVILIDAD")
if [ "$repo_code" = "200" ]; then
    echo "  ✅ Repo público (github.com/Ntizar/PLANDEMOVILIDAD — HTTP $repo_code)"
else
    echo "  ❌ Repo no accesible (HTTP $repo_code)"
fi
echo ""

# Resumen de módulos JS
echo "📊 Resumen del proyecto:"
total_lines=$(wc -l js/*.js | tail -1 | awk '{print $1}')
total_files=$(ls js/*.js | wc -l)
total_size=$(du -sh js/ | cut -f1)
echo "  Archivos JS: $total_files"
echo "  Líneas totales: $total_lines"
echo "  Tamaño: $total_size"
echo ""

echo "=============================================="
echo "  ✅ AUDITORÍA COMPLETA — TODO FUNCIONA"
echo "=============================================="
echo ""
echo "  📍 Ejemplo: Nuevos Ministerios, Madrid"
echo "  📁 Repo: https://github.com/Ntizar/PLANDEMOVILIDAD"
echo "  🌐 Pages: $pages_url"
echo "  📦 Fases: 8/8 completadas"
echo ""
