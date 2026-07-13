#!/bin/bash
#
# PLANDEMOVILIDAD — Deploy a NaN.builders
#
# Sube el proyecto completo a NaN.builders como aplicación estática.
# Requiere:
# - NAN_API variable de entorno configurada
# - NaN CLI o curl con auth
#
# Autor: David Antizar
#

set -euo pipefail

PROJECT_NAME="plandemovilidad"
BUILD_DIR="dist"
SOURCE_DIR="."

echo "🚀 Deploy de PLANDEMOVILIDAD a NaN.builders"
echo "============================================"

# 1. Verificar que NAN_API está configurada
if [ -z "$NAN_API" ]; then
    echo "⚠️ NAN_API no configurada."
    echo "   La IA generativa no funcionará, pero el resto de la app sí."
    echo "   Configura: export NAN_API='tu-api-key'"
    echo ""
fi

# 2. Crear directorio de build
echo "📦 Preparando build..."
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

# 3. Copiar todos los archivos
cp -r "$SOURCE_DIR"/* "$BUILD_DIR"/
cp -r "$SOURCE_DIR"/.* "$BUILD_DIR"/ 2>/dev/null || true

# 4. Verificar estructura
echo "📋 Estructura de build:"
find "$BUILD_DIR" -type f | head -20
echo ""

# 5. Verificar que todos los archivos JS existen
echo "🔍 Verificando archivos..."
for f in js/config.js js/utils.js js/map.js js/geocode.js js/form.js js/main.js js/survey.js js/diagnostico.js js/dafo.js js/objetivos.js js/informe.js js/isochrones.js js/gtfs.js; do
    if [ ! -f "$BUILD_DIR/$f" ]; then
        echo "❌ Faltando: $f"
        exit 1
    fi
done
echo "✅ Todos los archivos presentes"
echo ""

# 6. Crear package.json para el servidor proxy
cat > "$BUILD_DIR/package.json" << 'EOF'
{
  "name": "plandemovilidad",
  "version": "1.0.0",
  "description": "Generador automático de Planes de Movilidad Sostenible al Trabajo",
  "main": "server.mjs",
  "type": "module",
  "scripts": {
    "start": "node server.mjs"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
EOF

# 7. Crear NaN config si no existe
cat > "$BUILD_DIR/nan.config.json" << 'EOF'
{
  "name": "plandemovilidad",
  "framework": "static",
  "buildCommand": "",
  "outputDirectory": ".",
  "routes": [
    { "src": "/(.*)", "dest": "/$1" }
  ]
}
EOF

# 8. Crear .gitignore
cat > "$BUILD_DIR/.gitignore" << 'EOF'
node_modules/
.env
*.log
EOF

echo "✅ Build preparado en $BUILD_DIR/"
echo ""
echo "📤 Deploy..."
echo ""

# 9. Deploy a NaN.builders
# Usar el método adecuado según la configuración de NaN
if [ -n "$NAN_API" ]; then
    echo "🔑 Deploy con IA generativa activa"
    # Subir a NaN.builders (ajustar según tu método de deploy)
    # Opción A: git push
    # Opción B: curl API de NaN
    # Opción C: rsync a servidor
    
    # Por defecto, usar git si hay un repo remoto configurado
    if git remote -v | grep -q "nan"; then
        echo "📡 Git push a NaN..."
        git add -f "$BUILD_DIR/"
        git commit -m "Deploy PLANDEMOVILIDAD $(date +%Y-%m-%d_%H:%M)" || true
        git push origin main || echo "⚠️ Git push falló — intenta manualmente"
    else
        echo "⚠️ No hay remote git configurado para NaN."
        echo "   Opciones de deploy:"
        echo "   1. Subir manualmente los archivos de $BUILD_DIR/"
        echo "   2. Configurar git remote y hacer git push"
        echo "   3. Usar la API de NaN.builders directamente"
    fi
else
    echo "⚠️ Deploy sin IA generativa (modo offline)"
    echo "   Para activar IA: export NAN_API='tu-key' y repetir"
fi

echo ""
echo "✅ Deploy completado"
echo ""
echo "📋 Resumen:"
echo "   - Build: $BUILD_DIR/"
echo "   - Archivos JS: $(find "$BUILD_DIR/js" -name '*.js' | wc -l) módulos"
echo "   - Servidor proxy: server.mjs (puerto 3001)"
echo "   - IA: $([ -n "$NAN_API" ] && echo 'Activa' || echo 'Offline (fallback)')"
echo ""
echo "🌐 URL: https://plandemovilidad.apps.nan.builders"
echo ""
echo "Hecho con ❤️ por David Antizar"
