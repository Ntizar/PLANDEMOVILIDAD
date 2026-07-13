/**
 * PLANDEMOVILIDAD — Utilidades genéricas
 * 
 * Funciones puras reutilizables en toda la aplicación.
 * Sin dependencias externas.
 * 
 * Autor: David Antizar
 */

/**
 * Debounce — Retrasa la ejecución de una función hasta
 * que hayan pasado `ms` ms desde la última llamada.
 * @param {Function} fn — Función a retrasar
 * @param {number} ms — Milisegundos de espera
 * @returns {Function} Función debounceada
 */
export function debounce(fn, ms) {
    let timer;
    return function(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), ms);
    };
}

/**
 * Format number con separadores y decimales
 * @param {number} n — Número a formatear
 * @param {number} decimals — Decimales (default: 2)
 * @returns {string} Número formateado
 */
export function formatNum(n, decimals = 2) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    return n.toLocaleString('es-ES', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
}

/**
 * Haversine — Distancia en metros entre dos puntos geográficos
 * @param {number} lat1 — Latitud punto 1
 * @param {number} lon1 — Longitud punto 1
 * @param {number} lat2 — Latitud punto 2
 * @param {number} lon2 — Longitud punto 2
 * @returns {number} Distancia en metros
 */
export function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Radio de la Tierra en metros
    const toRad = deg => deg * Math.PI / 180;
    
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const lat1Rad = toRad(lat1);
    const lat2Rad = toRad(lat2);
    
    const a = Math.sin(dLat / 2) ** 2 +
              Math.sin(dLon / 2) ** 2 *
              Math.cos(lat1Rad) * Math.cos(lat2Rad);
    
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Truncate string a longitud máxima
 * @param {string} str — Texto
 * @param {number} max — Longitud máxima
 * @returns {string} Texto truncado
 */
export function truncate(str, max = 80) {
    if (!str || str.length <= max) return str || '';
    return str.substring(0, max).trim() + '…';
}

/**
 * Generar slug a partir de texto
 * @param {string} text — Texto
 * @returns {string} Slug
 */
export function slugify(text) {
    return text
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

/**
 * Generar ID único corto
 * @returns {string} ID
 */
export function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
}

/**
 * Descargar archivo — Crea un blob y fuerza la descarga
 * @param {string} content — Contenido del archivo
 * @param {string} filename — Nombre del archivo
 * @param {string} mime — Tipo MIME
 */
export function downloadFile(content, filename, mime = 'text/plain') {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Sleep — Promesa que se resuelve tras ms milisegundos
 * @param {number} ms — Milisegundos
 * @returns {Promise<void>}
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch seguro — Envuelve fetch con manejo de errores
 * @param {string} url — URL a fetchear
 * @param {Object} options — Opciones fetch
 * @returns {Promise<any>} Datos parseados
 */
export async function safeFetch(url, options = {}) {
    try {
        const resp = await fetch(url, options);
        if (!resp.ok) {
            throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
        }
        const contentType = resp.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
            return await resp.json();
        }
        return await resp.text();
    } catch (err) {
        console.error(`safeFetch error [${url}]:`, err.message);
        throw err;
    }
}

/**
 * Calcular área de un polígono (coordenadas [lng, lat])
 * Usando la fórmula de Gauss (shoelace) con corrección latitudinal
 * @param {Array<Array<number>>} coords — Array de [lng, lat]
 * @param {number} refLat — Latitud de referencia para corrección
 * @returns {number} Área en km²
 */
export function calcularAreaPoligonoKm2(coords, refLat) {
    if (!coords || coords.length < 3) return 0;
    
    let area = 0;
    const n = coords.length;
    const cosLat = Math.cos((refLat ?? coords.reduce((s, c) => s + c[1], 0) / n) * Math.PI / 180);
    
    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        area += coords[i][0] * coords[j][1] - coords[j][0] * coords[i][1];
    }
    
    area = Math.abs(area) / 2;
    // Convertir grados² a km²
    return area * 111.32 * 111.32 * cosLat / 1_000_000;
}

/**
 * Generar isocrona simulada (fallback)
 * Círculo irregular con jitter para simular red vial
 * @param {number} lng — Longitud
 * @param {number} lat — Latitud
 * @param {string} modo — 'pedestrian' | 'cycling' | 'car'
 * @param {number} minutos — Minutos
 * @returns {Object} GeoJSON FeatureCollection
 */
export function calcularIsocronaSimulada(lng, lat, modo, minutos) {
    const speeds = { pedestrian: 5, cycling: 15, car: 30 };
    const speedKmh = speeds[modo] || 5;
    const radioM = (speedKmh / 3.6) * minutos * 60;
    const PTS = 48;
    const coords = [];
    
    for (let i = 0; i <= PTS; i++) {
        const ang = (i / PTS) * 2 * Math.PI;
        // Jitter para simular irregularidad de la red vial
        const jitter = 1 - (0.12 * (Math.sin(i * 7.3) * 0.5 + 0.5));
        const r = radioM * jitter;
        const dLat = (r * Math.cos(ang)) / 111320;
        const dLng = (r * Math.sin(ang)) / (111320 * Math.cos(lat * Math.PI / 180));
        coords.push([lng + dLng, lat + dLat]);
    }
    
    const areaKm2 = calcularAreaPoligonoKm2(coords, lat);
    
    return {
        type: 'FeatureCollection',
        features: [{
            type: 'Feature',
            geometry: {
                type: 'Polygon',
                coordinates: [coords],
            },
            properties: {
                modo,
                minutos,
                simulado: true,
                areaKm2,
            },
        }],
    };
}

/**
 * Hash simple para anonimizar datos de encuesta
 * @param {string} data — Datos a hashar
 * @returns {string} Hash
 */
export function simpleHash(data) {
    let hash = 0;
    const str = JSON.stringify(data);
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
}

/**
 * Parsear tiempo "HH:MM:SS" a fracción de día
 * @param {string} time — Tiempo
 * @returns {number} Fracción de día
 */
export function parseTime(time) {
    if (!time) return 0;
    const parts = time.split(':').map(Number);
    return parts[0] + parts[1] / 60 + (parts[2] || 0) / 3600;
}

/**
 * Calcular tiempo en minutos desde fracción de día
 * @param {number} fraction — Fracción de día
 * @returns {number} Minutos
 */
export function fractionToMinutes(fraction) {
    return Math.round(fraction * 24 * 60);
}
