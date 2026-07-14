/**
 * PLANDEMOVILIDAD — Importación CSV de encuestas
 * 
 * Parser robusto que detecta automáticamente el formato del CSV,
 * mapea columnas al formato interno, valida datos y genera preview
 * antes de importar.
 * 
 * Soporta:
 * - CSV de encuesta.html (21 columnas)
 * - CSV manual (formato libre)
 * - CSV de empleados (formato legacy)
 * 
 * Autor: David Antizar
 * Hecho con ❤️ por David Antizar
 */

// ═══════════════════════════════════════════
// MAPA DE COLUMNAS CONOCIDAS
// ═══════════════════════════════════════════

// Mapeo: nombre CSV → campo interno
const MAPEO_COLUMNAS = {
    // Encuesta encuesta.html
    'fecha': 'fecha',
    'nombre': 'nombre',
    'email': 'email',
    'departamento': 'departamento',
    'puesto': 'puesto',
    'centro': 'centro',
    'teletrabajo': 'teletrabajo',
    'dias_presenciales': 'diasPresenciales',
    'dias presenciales': 'diasPresenciales',
    'modo_principal': 'modo_principal',
    'modo principal': 'modo_principal',
    'modo_secundario': 'modo_secundario',
    'modo secundario': 'modo_secundario',
    'distancia_km': 'distancia_km',
    'distancia km': 'distancia_km',
    'distancia': 'distancia_km',
    'tiempo_viaje_min': 'tiempo_viaje_min',
    'tiempo viaje min': 'tiempo_viaje_min',
    'tiempo': 'tiempo_viaje_min',
    'ocupacion_coche': 'ocupacion_coche',
    'ocupacion coche': 'ocupacion_coche',
    'parada_cercana': 'parada_cercana',
    'parada cercana': 'parada_cercana',
    'tipo_parada': 'tipo_parada',
    'tipo parada': 'tipo_parada',
    'tiempo_a_parada': 'tiempo_a_parada',
    'tiempo a parada': 'tiempo_a_parada',
    'parking_trabajo': 'parking_trabajo',
    'parking trabajo': 'parking_trabajo',
    'dispuesto_cambiar': 'dispuesto_cambiar',
    'dispuesto cambiar': 'dispuesto_cambiar',
    'alternativas': 'alternativas',
    'barreras': 'barreras',
    'comentarios': 'comentarios',
    
    // Formato legacy (empleados)
    'id': 'id',
    'apellido': 'apellido',
    'apellidos': 'apellido',
    'telefono': 'telefono',
    'fecha_nacimiento': 'fecha_nacimiento',
};

// Columnas requeridas para una encuesta válida
const COLUMNAS_REQUERIDAS = ['nombre', 'departamento', 'modo_principal', 'distancia_km', 'tiempo_viaje_min'];

// Valores válidos para modo de transporte
const MODOS_VALIDOS = [
    'coche_particular', 'coche_compartido', 'transporte_publico',
    'bicicleta', 'a_pie', 'moto', 'otro',
    // Alias en español
    'coche', 'bus', 'metro', 'tren', 'autobus', 'bici', 'pie', 'camino',
];

// Normalización de modos de transporte
const NORMALIZAR_MODO = {
    'coche': 'coche_particular',
    'coche solo': 'coche_particular',
    'coche solo conductor': 'coche_particular',
    'particular': 'coche_particular',
    'car': 'coche_particular',
    'car solo': 'coche_particular',
    'coche compartido': 'coche_compartido',
    'carpooling': 'coche_compartido',
    'carppooling': 'coche_compartido',
    'transporte publico': 'transporte_publico',
    'transporte público': 'transporte_publico',
    'tp': 'transporte_publico',
    'bus': 'transporte_publico',
    'autobus': 'transporte_publico',
    'autobús': 'transporte_publico',
    'metro': 'transporte_publico',
    'tren': 'transporte_publico',
    'cercanias': 'transporte_publico',
    'cercanías': 'transporte_publico',
    'bici': 'bicicleta',
    'bike': 'bicicleta',
    'bicicleta': 'bicicleta',
    'bike sharing': 'bicicleta',
    'bici compartida': 'bicicleta',
    'pie': 'a_pie',
    'a pie': 'a_pie',
    'caminando': 'a_pie',
    'walking': 'a_pie',
    'moto': 'moto',
    'scooter': 'moto',
    'motorbike': 'moto',
    'otro': 'otro',
    'other': 'otro',
};

// ═══════════════════════════════════════════
// PARSER CSV
// ═══════════════════════════════════════════

/**
 * Parsear CSV a array de objetos
 * Soporta: comillas dobles, saltos de línea en campos, BOM UTF-8
 */
export function parseCSV(texto) {
    // Eliminar BOM UTF-8
    if (texto.charCodeAt(0) === 0xFEFF) {
        texto = texto.substring(1);
    }
    
    // Normalizar saltos de línea
    texto = texto.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    const lineas = [];
    let lineaActual = '';
    let dentroComillas = false;
    
    for (let i = 0; i < texto.length; i++) {
        const char = texto[i];
        const siguiente = texto[i + 1];
        
        if (dentroComillas) {
            if (char === '"' && siguiente === '"') {
                lineaActual += '"';
                i++; // Saltar la comilla escapada
            } else if (char === '"') {
                dentroComillas = false;
            } else {
                lineaActual += char;
            }
        } else {
            if (char === '"') {
                dentroComillas = true;
            } else if (char === '\n') {
                lineas.push(lineaActual);
                lineaActual = '';
            } else {
                lineaActual += char;
            }
        }
    }
    if (lineaActual) lineas.push(lineaActual);
    
    if (lineas.length < 2) {
        return { headers: [], rows: [], error: 'CSV con menos de 2 líneas' };
    }
    
    // Parsear headers
    const headers = parsearLinea(lineas[0]);
    
    // Parsear filas
    const rows = [];
    for (let i = 1; i < lineas.length; i++) {
        if (lineas[i].trim() === '') continue; // Saltar líneas vacías
        const valores = parsearLinea(lineas[i]);
        const fila = {};
        headers.forEach((h, idx) => {
            fila[h] = valores[idx] || '';
        });
        rows.push(fila);
    }
    
    return { headers, rows, error: null };
}

/**
 * Parsear una línea CSV respetando comillas
 */
function parsearLinea(linea) {
    const campos = [];
    let actual = '';
    let dentroComillas = false;
    
    for (let i = 0; i < linea.length; i++) {
        const char = linea[i];
        const siguiente = linea[i + 1];
        
        if (dentroComillas) {
            if (char === '"' && siguiente === '"') {
                actual += '"';
                i++;
            } else if (char === '"') {
                dentroComillas = false;
            } else {
                actual += char;
            }
        } else {
            if (char === '"') {
                dentroComillas = true;
            } else if (char === ',') {
                campos.push(actual.trim());
                actual = '';
            } else {
                actual += char;
            }
        }
    }
    campos.push(actual.trim());
    
    return campos;
}

// ═══════════════════════════════════════════
// DETECCIÓN Y MAPEO
// ═══════════════════════════════════════════

/**
 * Detectar formato del CSV y mapear columnas
 */
export function detectarFormato(headers) {
    const headersLower = headers.map(h => h.toLowerCase().trim().replace(/\s+/g, '_'));
    const mapping = {};
    let columnasDetectadas = 0;
    let tipoDetectado = 'desconocido';
    
    // Intentar mapear cada header
    headersLower.forEach((h, idx) => {
        if (MAPEO_COLUMNAS[h]) {
            mapping[headers[idx]] = MAPEO_COLUMNAS[h];
            columnasDetectadas++;
        } else {
            // Intentar coincidencia parcial
            const key = Object.keys(MAPEO_COLUMNAS).find(k => 
                h.includes(k) || k.includes(h)
            );
            if (key) {
                mapping[headers[idx]] = MAPEO_COLUMNAS[key];
                columnasDetectadas++;
            }
        }
    });
    
    // Detectar tipo de CSV
    const camposDetectados = Object.values(mapping);
    if (camposDetectados.includes('modo_principal') && camposDetectados.includes('distancia_km')) {
        tipoDetectado = 'encuesta_movilidad';
    } else if (camposDetectados.includes('departamento') && !camposDetectados.includes('modo_principal')) {
        tipoDetectado = 'lista_empleados';
    } else {
        tipoDetectado = 'generico';
    }
    
    return {
        mapping,
        columnasDetectadas,
        totalColumnas: headers.length,
        porcentajeCobertura: Math.round((columnasDetectadas / headers.length) * 100),
        tipoDetectado,
        camposRequeridosFaltantes: COLUMNAS_REQUERIDAS.filter(c => !camposDetectados.includes(c)),
    };
}

/**
 * Transformar filas del CSV al formato interno
 */
export function transformarFilas(rows, mapping) {
    return rows.map(row => {
        const fila = {};
        
        Object.entries(row).forEach(([csvCol, valor]) => {
            const campoInterno = mapping[csvCol];
            if (campoInterno) {
                fila[campoInterno] = normalizarValor(campoInterno, valor);
            }
        });
        
        // Generar ID único si no existe
        if (!fila.id) {
            fila.id = crypto.randomUUID();
        }
        
        return fila;
    });
}

/**
 * Normalizar un valor según su campo
 */
function normalizarValor(campo, valor) {
    if (valor === '' || valor === undefined || valor === null) return '';
    
    valor = valor.toString().trim();
    
    switch (campo) {
        case 'modo_principal':
            return normalizarModo(valor);
        
        case 'distancia_km':
            return parseFloat(valor) || 0;
        
        case 'tiempo_viaje_min':
            return parseFloat(valor) || 0;
        
        case 'ocupacion_coche':
            return parseInt(valor) || 1;
        
        case 'diasPresenciales':
            return parseInt(valor) || 3;
        
        case 'parada_cercana':
        case 'parking_trabajo':
        case 'dispuesto_cambiar':
            return valor.toLowerCase();
        
        default:
            return valor;
    }
}

/**
 * Normalizar modo de transporte
 */
function normalizarModo(valor) {
    const lower = valor.toLowerCase().trim();
    
    // Coincidencia exacta
    if (NORMALIZAR_MODO[lower]) {
        return NORMALIZAR_MODO[lower];
    }
    
    // Coincidencia parcial
    for (const [alias, modo] of Object.entries(NORMALIZAR_MODO)) {
        if (lower.includes(alias) || alias.includes(lower)) {
            return modo;
        }
    }
    
    // Si ya es un modo válido, devolverlo
    if (MODOS_VALIDOS.includes(lower)) {
        return lower;
    }
    
    return 'otro';
}

// ═══════════════════════════════════════════
// VALIDACIÓN
// ═══════════════════════════════════════════

/**
 * Validar datos transformados
 */
export function validarDatos(rows, mapping) {
    const errores = [];
    const advertencias = [];
    
    const camposDetectados = Object.values(mapping);
    const faltanRequeridos = COLUMNAS_REQUERIDAS.filter(c => !camposDetectados.includes(c));
    
    if (faltanRequeridos.length > 0) {
        errores.push({
            tipo: 'columnas_faltantes',
            mensaje: `Faltan columnas requeridas: ${faltanRequeridos.join(', ')}`,
            detalle: faltanRequeridos,
        });
    }
    
    if (rows.length === 0) {
        errores.push({
            tipo: 'sin_datos',
            mensaje: 'El CSV no contiene filas de datos',
        });
    }
    
    // Validar filas individuales
    let sinNombre = 0;
    let sinModo = 0;
    let distanciasInvalidas = 0;
    
    rows.forEach((row, idx) => {
        if (!row.nombre || row.nombre === '') sinNombre++;
        if (!row.modo_principal || row.modo_principal === '') sinModo++;
        if (row.distancia_km !== undefined && (row.distancia_km < 0 || row.distancia_km > 500)) {
            distanciasInvalidas++;
        }
    });
    
    if (sinNombre > 0) {
        advertencias.push(`${sinNombre} filas sin nombre`);
    }
    if (sinModo > 0) {
        advertencias.push(`${sinModo} filas sin modo de transporte`);
    }
    if (distanciasInvalidas > 0) {
        advertencias.push(`${distanciasInvalidas} filas con distancias fuera de rango (0-500 km)`);
    }
    
    return {
        valido: errores.length === 0,
        errores,
        advertencias,
        estadisticas: {
            totalFilas: rows.length,
            sinNombre,
            sinModo,
            distanciasInvalidas,
        },
    };
}

// ═══════════════════════════════════════════
// FLUJO COMPLETO DE IMPORTACIÓN
// ═══════════════════════════════════════════

/**
 * Procesar un CSV completo: parsear → detectar → transformar → validar
 * @param {string} texto - Contenido del CSV
 * @returns {Object} { ok, datos, formato, validacion, error }
 */
export function procesarCSV(texto) {
    // 1. Parsear
    const parseResult = parseCSV(texto);
    if (parseResult.error) {
        return { ok: false, error: parseResult.error };
    }
    
    // 2. Detectar formato
    const formato = detectarFormato(parseResult.headers);
    
    // 3. Transformar
    const datos = transformarFilas(parseResult.rows, formato.mapping);
    
    // 4. Validar
    const validacion = validarDatos(datos, formato.mapping);
    
    return {
        ok: validacion.valido,
        datos,
        formato,
        validacion,
        rawHeaders: parseResult.headers,
        totalRows: parseResult.rows.length,
    };
}

/**
 * Generar preview del CSV para mostrar al usuario
 */
export function generarPreview(datos, maxFilas = 5) {
    if (!datos || datos.length === 0) return null;
    
    const headers = Object.keys(datos[0]);
    const filasPreview = datos.slice(0, maxFilas);
    
    return {
        headers,
        filas: filasPreview,
        totalFilas: datos.length,
        truncado: datos.length > maxFilas,
    };
}

// ═══════════════════════════════════════════
// EXPORTAR CSV (para encuesta.html)
// ═══════════════════════════════════════════

/**
 * Exportar array de objetos a CSV
 */
export function exportarCSV(datos, nombreArchivo = 'encuesta') {
    if (!datos || datos.length === 0) return;
    
    const headers = Object.keys(datos[0]);
    const csv = [
        headers.join(','),
        ...datos.map(row => 
            headers.map(h => {
                const val = row[h] ?? '';
                const str = val.toString();
                return str.includes(',') || str.includes('"') || str.includes('\n') 
                    ? `"${str.replace(/"/g, '""')}"` 
                    : str;
            }).join(',')
        )
    ].join('\n');
    
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${nombreArchivo}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}
