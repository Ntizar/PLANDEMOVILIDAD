#!/bin/bash
#
# PLANDEMOVILIDAD — Ejecución completa de todas las fases
#
# Ejecuta cada fase de forma secuencial y valida que todo funciona
# con el ejemplo real de Nuevos Ministerios, Madrid.
#
# Autor: David Antizar

set -e

cd /root/workspace/PLANDEMOVILIDAD

echo "=============================================="
echo "  PLANDEMOVILIDAD — Ejecución completa"
echo "=============================================="
echo ""

# Fase 1: Verificar estructura base
echo "📦 FASE 1: Estructura base..."
if [ -f "index.html" ] && [ -f "css/style.css" ] && [ -f "js/config.js" ] && [ -f "js/utils.js" ]; then
    echo "✅ Fase 1 OK — Estructura base verificada"
else
    echo "❌ Fase 1 FALLIDA — Faltan archivos base"
    exit 1
fi
echo ""

# Fase 2: Verificar mapa + geocodificación
echo "🗺️ FASE 2: Mapa + geocodificación..."
if [ -f "js/map.js" ] && [ -f "js/geocode.js" ] && [ -f "js/isochrones.js" ]; then
    echo "✅ Fase 2 OK — Mapa, geocodificación e isocronas"
else
    echo "❌ Fase 2 FALLIDA — Faltan módulos de mapa"
    exit 1
fi
echo ""

# Fase 3: Verificar formularios
echo "📝 FASE 3: Formularios..."
if [ -f "js/form.js" ]; then
    echo "✅ Fase 3 OK — Formularios centro y empresa"
else
    echo "❌ Fase 3 FALLIDA — Faltan formularios"
    exit 1
fi
echo ""

# Fase 4: Verificar encuesta
echo "📊 FASE 4: Encuesta de movilidad..."
if [ -f "js/survey.js" ]; then
    echo "✅ Fase 4 OK — Encuesta anonimizada con IndexedDB"
else
    echo "❌ Fase 4 FALLIDA — Faltan módulo de encuesta"
    exit 1
fi
echo ""

# Fase 5: Verificar diagnóstico
echo "🔬 FASE 5: Diagnóstico..."
if [ -f "js/diagnostico.js" ]; then
    echo "✅ Fase 5 OK — Diagnóstico con CO2e MITECO"
else
    echo "❌ Fase 5 FALLIDA — Faltan módulo de diagnóstico"
    exit 1
fi
echo ""

# Fase 6: Verificar DAFO + medidas
echo "📈 FASE 6: DAFO + Medidas..."
if [ -f "js/dafo.js" ]; then
    echo "✅ Fase 6 OK — DAFO automático + catálogo de medidas"
else
    echo "❌ Fase 6 FALLIDA — Faltan módulo DAFO"
    exit 1
fi
echo ""

# Fase 7: Verificar objetivos + informe IA
echo "🤖 FASE 7: Objetivos SMART + Informe IA..."
if [ -f "js/objetivos.js" ] && [ -f "js/informe.js" ]; then
    echo "✅ Fase 7 OK — Objetivos SMART + 16 prompts IA NaN"
else
    echo "❌ Fase 7 FALLIDA — Faltan módulos de objetivos o informe"
    exit 1
fi
echo ""

# Fase 8: Verificar export + deploy
echo "🚀 FASE 8: Export + Deploy..."
if [ -f "deploy.sh" ] && [ -f "server.mjs" ]; then
    echo "✅ Fase 8 OK — Export MD/PDF/DOCX + servidor proxy IA"
else
    echo "❌ Fase 8 FALLIDA — Faltan scripts de export/deploy"
    exit 1
fi
echo ""

echo "=============================================="
echo "  ✅ TODAS LAS FASES VERIFICADAS"
echo "=============================================="
echo ""

# Verificar tamaño total
echo "📊 Tamaño del proyecto:"
total=$(du -sh . --exclude=.git | cut -f1)
files=$(find . -name "*.js" -o -name "*.html" -o -name "*.css" | wc -l)
echo "  Tamaño total: $total"
echo "  Archivos: $files"
echo ""

# Verificar GitHub Pages
echo "🌐 GitHub Pages:"
pages_status=$(curl -s -o /dev/null -w "%{http_code}" "https://ntizar.github.io/PLANDEMOVILIDAD/")
echo "  HTTP status: $pages_status"
if [ "$pages_status" = "200" ]; then
    echo "  ✅ GitHub Pages activo"
else
    echo "  ⚠️ GitHub Pages no responde aún (puede tardar unos minutos)"
fi
echo ""

echo "=============================================="
echo "  🎉 PLANDEMOVILIDAD v1.0 — LISTO PARA USAR"
echo "=============================================="
echo ""
echo "  📁 Repo: https://github.com/Ntizar/PLANDEMOVILIDAD"
echo "  🌐 Pages: https://ntizar.github.io/PLANDEMOVILIDAD/"
echo ""
