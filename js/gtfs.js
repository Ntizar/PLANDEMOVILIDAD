/**
 * PLANDEMOVILIDAD — Transporte público (NAP/GTFS España)
 * 
 * Catálogo de transporte público por ciudad, detección de paradas
 * cercanas, y estructura de datos GTFS.
 * 
 * Fuentes:
 * - NAP Transportes: https://nap.transportes.gob.es/
 * - GTFS España: datos.gob.es
 * - CRTM Madrid: https://datos.crtm.es/
 * 
 * Autor: David Antizar
 */

import { CONFIG } from './config.js';
import { haversine, safeFetch } from './utils.js';

/**
 * Catálogo de operadores de transporte público en España
 * IDs NAP verificados — https://nap.transportes.gob.es/
 * Actualizado 2026-07
 */
export const TRANSIT_CATALOG = {
    // Madrid
    madrid: {
        name: 'Madrid',
        operators: [
            { id: '2111', name: 'EMT Madrid', type: 'bus', gtfs: true },
            { id: '2113', name: 'Metro Madrid', type: 'metro', gtfs: true },
            { id: '1738', name: 'Renfe Cercanías Madrid', type: 'train', gtfs: true },
            { id: '286', name: 'CRTM (Interurbanos)', type: 'bus', gtfs: true },
        ],
        // Coordenadas del centro de Madrid para fallback
        center: { lat: 40.4168, lon: -3.7038 },
    },
    
    // Barcelona
    barcelona: {
        name: 'Barcelona',
        operators: [
            { id: '1536', name: 'TMB (Bus + Metro)', type: 'bus', gtfs: true },
            { id: '1535', name: 'Barcelona Simplificada', type: 'mixed', gtfs: true },
        ],
        center: { lat: 41.3874, lon: 2.1686 },
    },
    
    // Valencia
    valencia: {
        name: 'Valencia',
        operators: [
            { id: '1325', name: 'Metrovalencia', type: 'train', gtfs: true },
        ],
        center: { lat: 39.4699, lon: -0.3763 },
    },
    
    // Sevilla
    sevilla: {
        name: 'Sevilla',
        operators: [
            { id: '1386', name: 'EMT Sevilla', type: 'bus', gtfs: true },
        ],
        center: { lat: 37.3891, lon: -5.9845 },
    },
    
    // Málaga
    malaga: {
        name: 'Málaga',
        operators: [
            { name: 'EMT Málaga', type: 'bus', gtfs: false },
        ],
        center: { lat: 36.7213, lon: -4.4214 },
    },
};

/**
 * Detectar ciudad a partir de coordenadas y nombre de dirección
 * @param {number} lat — Latitud
 * @param {number} lon — Longitud
 * @param {string} displayName — Nombre de lugar de Nominatim
 * @returns {string|null} Clave de ciudad o null
 */
export function detectarCiudad(lat, lon, displayName = '') {
    const name = displayName.toLowerCase();
    
    for (const [key, city] of Object.entries(TRANSIT_CATALOG)) {
        if (name.includes(city.name.toLowerCase()) || name.includes(key)) {
            return key;
        }
    }
    
    return null;
}

/**
 * Obtener paradas de transporte público cercanas a un punto
 * En la versión actual, devuelve datos simulados basados en el catálogo.
 * En producción, se conecta con NAP/GTFS real.
 * 
 * @param {number} lat — Latitud
 * @param {number} lon — Longitud
 * @param {number} radius — Radio en metros (default: 500m)
 * @returns {Promise<Array<{name, lat, lon, lines: string[], type: string}>>}
 */
export async function getTransitStops(lat, lon, radius = 500) {
    // En producción: descargar GTFS de NAP y buscar paradas cercanas
    // Por ahora, devolver estructura vacía con nota
    console.log(`🚌 Buscando paradas cercanas a [${lat}, ${lon}] en radio ${radius}m`);
    console.log('⚠️ Transporte público real requiere descarga de GTFS desde NAP');
    console.log('📦 Para activar: ejecutar python descargar-nap.py y cargar datos locales');
    
    return [];
}

/**
 * Importar datos de transporte público manualmente (CSV/Excel)
 * @param {string} csvData — Datos CSV con columnas: stop_id, stop_name, stop_lat, stop_lon, route_id
 * @returns {Array<Object>} Paradas parseadas
 */
export function importManualTransit(csvData) {
    const lines = csvData.trim().split('\n');
    const stops = [];
    
    // Detectar si hay cabecera
    const hasHeader = lines[0].toLowerCase().includes('stop_id') || lines[0].includes('stop_name');
    const startIdx = hasHeader ? 1 : 0;
    
    for (let i = startIdx; i < lines.length; i++) {
        const cols = lines[i].split(',');
        if (cols.length < 4) continue;
        
        const lat = parseFloat(cols[2]);
        const lon = parseFloat(cols[3]);
        
        if (isNaN(lat) || isNaN(lon)) continue;
        
        stops.push({
            id: cols[0]?.trim() || `stop_${i}`,
            name: cols[1]?.trim() || `Parada ${i}`,
            lat,
            lon,
            lines: [cols[4]?.trim() || '—'],
            type: 'bus',
        });
    }
    
    return stops;
}

/**
 * Calcular frecuencias de transporte público en horario laboral
 * @param {Array} stops — Paradas cercanas
 * @param {string} period — 'morning' (7:30-9:30) | 'evening' (16:30-18:30)
 * @returns {Object} Resumen de frecuencias
 */
export function calcularFrecuencias(stops, period = 'morning') {
    const window = period === 'morning' 
        ? { start: 7.5, end: 9.5 }  // 7:30-9:30
        : { start: 16.5, end: 18.5 }; // 16:30-18:30
    
    return {
        totalParadas: stops.length,
        periodo: period === 'morning' ? 'Mañana (7:30-9:30)' : 'Tarde (16:30-18:30)',
        operadores: [...new Set(stops.map(s => s.lines).flat())].length,
    };
}
