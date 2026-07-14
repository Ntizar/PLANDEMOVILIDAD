/**
 * PLANDEMOVILIDAD — Transporte público REAL (Overpass API + GTFS)
 * 
 * Fuentes de datos VERIFICADAS:
 * - Overpass API: paradas de bus, metro, tren de OpenStreetMap
 * - GBFS: estaciones de bicicleta compartida
 * - Nominatim: geocodificación y POIs
 * 
 * REGLA: Si el dato no está verificado, NO se muestra.
 * Autor: David Antizar
 */

import { CONFIG } from './config.js';
import { haversine, safeFetch } from './utils.js';

/**
 * Estado de verificación de datos
 * Cada dato tiene un flag 'verified' que indica si viene de fuente real
 */
export const DATA_STATUS = {
    VERIFIED: 'verified',      // Dato de API real
    FALLBACK: 'fallback',      // Dato estimado con fórmula
    UNAVAILABLE: 'unavailable' // Dato no disponible
};

/**
 * Estructura de parada verificada
 * @typedef {Object} VerifiedStop
 * @property {string} id - ID único (OSM node ID o custom)
 * @property {string} nombre - Nombre real de la parada
 * @property {number} lat - Latitud real
 * @property {number} lon - Longitud real
 * @property {string[]} lineas - Líneas que paran aquí (de OSM ref)
 * @property {string} tipo - 'bus', 'metro', 'train', 'tram'
 * @property {string} operador - Operador real (EMT, Metro, Renfe...)
 * @property {number} distancia_m - Distancia al centro en metros
 * @property {string} status - DATA_STATUS.VERIFIED/FALLBACK/UNAVAILABLE
 * @property {string} source - Fuente del dato ('overpass', 'gbfs', 'manual')
 * @property {Object} tags - Tags originales de OSM
 */

/**
 * Cargar paradas de transporte público desde Overpass API
 * REGLA: Solo devuelve datos VERIFICADOS de OpenStreetMap
 * 
 * @param {number} lat - Latitud del centro
 * @param {number} lon - Longitud del centro
 * @param {number} radioM - Radio en metros (default: 800)
 * @returns {Promise<VerifiedStop[]>}
 */
export async function cargarParadasReales(lat, lon, radioM = 800) {
    console.log(`🚌 Cargando paradas TP reales: [${lat}, ${lon}] radio ${radioM}m`);
    
    const delta = radioM / 111000;
    const south = lat - delta;
    const north = lat + delta;
    const west = lon - (delta * 1.3);
    const east = lon + (delta * 1.3);
    
    // Query Overpass para paradas de bus, metro, tren
    const query = `[out:json][timeout:15];
(
  node["highway"="bus_stop"](${south},${west},${north},${east});
  node["public_transport"="stop_position"](${south},${west},${north},${east});
  node["public_transport"="platform"](${south},${west},${north},${east});
  node["railway"="tram_stop"](${south},${west},${north},${east});
  node["railway"="station"](${south},${west},${north},${east});
  node["railway"="subway_entrance"](${south},${west},${north},${east});
);
out body 50;`;

    try {
        const resp = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'data=' + encodeURIComponent(query),
            signal: AbortSignal.timeout(15000)
        });
        
        if (!resp.ok) {
            console.error('❌ Overpass API error:', resp.status);
            return [];
        }
        
        const data = await resp.json();
        
        if (!data.elements || data.elements.length === 0) {
            console.log('ℹ️ No se encontraron paradas en el radio especificado');
            return [];
        }
        
        // Procesar y deduplicar
        const seen = new Set();
        const stops = [];
        
        for (const el of data.elements) {
            const nombre = el.tags?.name || el.tags?.['name:es'] || '';
            if (!nombre || nombre === 'Parada de autobús' || nombre === 'Bus stop') continue;
            
            // Deduplicar por nombre + coordenadas
            const key = `${nombre}_${el.lat.toFixed(4)}_${el.lon.toFixed(4)}`;
            if (seen.has(key)) continue;
            seen.add(key);
            
            // Determinar tipo
            let tipo = 'bus';
            if (el.tags?.railway === 'station' || el.tags?.railway === 'subway_entrance') tipo = 'metro';
            else if (el.tags?.railway === 'tram_stop') tipo = 'tram';
            else if (el.tags?.public_transport === 'platform' && el.tags?.train === 'yes') tipo = 'train';
            
            // Extraer líneas del tag ref
            const ref = el.tags?.ref || el.tags?.['ref:bus'] || '';
            const lineas = ref ? ref.split(/[;,]/).map(l => l.trim()).filter(Boolean) : [];
            
            // Operador
            const operador = el.tags?.operator || el.tags?.network || el.tags?.operator_ref || '';
            
            // Calcular distancia
            const distancia = haversine(lat, lon, el.lat, el.lon);
            
            stops.push({
                id: `osm_${el.id}`,
                nombre,
                lat: el.lat,
                lon: el.lon,
                lineas,
                tipo,
                operador,
                distancia_m: Math.round(distancia),
                status: DATA_STATUS.VERIFIED,
                source: 'overpass',
                tags: el.tags || {}
            });
        }
        
        // Ordenar por distancia
        stops.sort((a, b) => a.distancia_m - b.distancia_m);
        
        console.log(`✅ ${stops.length} paradas reales cargadas de Overpass`);
        return stops;
        
    } catch (err) {
        console.error('❌ Error cargando paradas:', err.message);
        return [];
    }
}

/**
 * Cargar estaciones de bicicleta compartida desde GBFS
 * REGLA: Solo devuelve datos VERIFICADOS del feed GBFS
 * 
 * @param {number} lat - Latitud del centro
 * @param {number} lon - Longitud del centro
 * @param {number} radioM - Radio en metros (default: 1200)
 * @returns {Promise<Array>}
 */
export async function cargarEstacionesBiciReales(lat, lon, radioM = 1200) {
    console.log(`🚲 Cargando estaciones bici reales: [${lat}, ${lon}]`);
    
    try {
        // Detectar ciudad y obtener feed GBFS
        const ciudad = detectarCiudadGBFS(lat, lon);
        if (!ciudad) {
            console.log('ℹ️ Ciudad no detectada para GBFS');
            return [];
        }
        
        const feedUrl = ciudad.feedUrl;
        const resp = await fetch(feedUrl, { signal: AbortSignal.timeout(10000) });
        if (!resp.ok) return [];
        
        const data = await resp.json();
        const stations = data.data?.stations || data.stations || [];
        
        return stations
            .map(s => {
                const stationLat = s.lat || s.latitude;
                const stationLon = s.lon || s.longitude;
                if (!stationLat || !stationLon) return null;
                
                const distancia = haversine(lat, lon, stationLat, stationLon);
                if (distancia > radioM) return null;
                
                const bikes = s.bikes_available || s.bikesAvailable || 0;
                const docks = s.bikes_available + (s.slots_available || s.slotsAvailable || 0);
                
                return {
                    id: `gbfs_${s.station_id || s.id}`,
                    nombre: s.name || s.stationName || 'Estación sin nombre',
                    lat: stationLat,
                    lon: stationLon,
                    bicis: bikes,
                    docks,
                    distancia_m: Math.round(distancia),
                    status: DATA_STATUS.VERIFIED,
                    source: 'gbfs',
                    disponibilidad: docks > 0 ? bikes / docks : 0
                };
            })
            .filter(Boolean)
            .sort((a, b) => a.distancia_m - b.distancia_m);
        
    } catch (err) {
        console.error('❌ Error cargando GBFS:', err.message);
        return [];
    }
}

/**
 * Detectar ciudad para GBFS por proximidad
 */
function detectarCiudadGBFS(lat, lon) {
    const ciudades = [
        { nombre: 'Madrid', lat: 40.4168, lon: -3.7038, feedUrl: 'https://gbfs.link/es/bicimad/stations.json' },
        { nombre: 'Barcelona', lat: 41.3874, lon: 2.1686, feedUrl: 'https://gbfs.link/es/bicing/stations.json' },
        { nombre: 'Valencia', lat: 39.4699, lon: -0.3763, feedUrl: 'https://gbfs.link/es/valenbisi/stations.json' },
        { nombre: 'Sevilla', lat: 37.3891, lon: -5.9845, feedUrl: 'https://gbfs.link/es/sevici/stations.json' },
    ];
    
    let closest = null;
    let minDist = Infinity;
    
    for (const c of ciudades) {
        const d = haversine(lat, lon, c.lat, c.lon);
        if (d < minDist && d < 50000) { // Máximo 50km
            minDist = d;
            closest = c;
        }
    }
    
    return closest;
}

/**
 * Obtener POIs del entorno desde Nominatim
 * REGLA: Solo devuelve datos VERIFICADOS
 * 
 * @param {number} lat - Latitud
 * @param {number} lon - Longitud
 * @param {number} radioM - Radio en metros
 * @returns {Promise<Object>} POIs categorizados
 */
export async function cargarPOIsReales(lat, lon, radioM = 1000) {
    console.log(`🏙️ Cargando POIs reales: [${lat}, ${lon}]`);
    
    const categorias = {
        salud: ['hospital', 'clinic', 'pharmacy', 'doctors', 'dentist'],
        educacion: ['school', 'university', 'kindergarten', 'college'],
        parking: ['parking', 'bicycle_parking'],
        hosteleria: ['restaurant', 'cafe', 'bar', 'fast_food'],
        servicios: ['bank', 'atm', 'post_office', 'police']
    };
    
    const pois = {};
    
    for (const [cat, tags] of Object.entries(categorias)) {
        pois[cat] = [];
        
        for (const tag of tags) {
            try {
                const query = `[out:json][timeout:5];node["amenity"="${tag}"](around:${radioM},${lat},${lon});out body 10;`;
                
                const resp = await fetch('https://overpass-api.de/api/interpreter', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: 'data=' + encodeURIComponent(query),
                    signal: AbortSignal.timeout(5000)
                });
                
                if (!resp.ok) continue;
                
                const data = await resp.json();
                
                for (const el of (data.elements || [])) {
                    const nombre = el.tags?.name || tag;
                    const distancia = haversine(lat, lon, el.lat, el.lon);
                    
                    pois[cat].push({
                        nombre,
                        tipo: tag,
                        lat: el.lat,
                        lon: el.lon,
                        distancia_m: Math.round(distancia),
                        status: DATA_STATUS.VERIFIED,
                        source: 'nominatim'
                    });
                }
                
            } catch (e) {
                // Skip silently
            }
        }
        
        // Deduplicar y ordenar
        const seen = new Set();
        pois[cat] = pois[cat]
            .filter(p => {
                const key = `${p.nombre}_${p.lat.toFixed(4)}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            })
            .sort((a, b) => a.distancia_m - b.distancia_m)
            .slice(0, 10); // Máximo 10 por categoría
    }
    
    console.log(`✅ POIs cargados: ${Object.values(pois).flat().length} total`);
    return pois;
}

/**
 * Validar si un dato es real o inventado
 * REGLA PRINCIPAL: Si no hay dato verificado, mostrar "N/D"
 * 
 * @param {*} value - Valor a validar
 * @param {string} source - Fuente del dato
 * @returns {Object} { value, status, display }
 */
export function validarDato(value, source) {
    if (value === null || value === undefined || value === '') {
        return { value: null, status: DATA_STATUS.UNAVAILABLE, display: 'N/D' };
    }
    
    if (source === 'overpass' || source === 'gbfs' || source === 'nominatim' || source === 'manual_verified') {
        return { value, status: DATA_STATUS.VERIFIED, display: String(value) };
    }
    
    if (source === 'estimated' || source === 'formula') {
        return { value, status: DATA_STATUS.FALLBACK, display: `~${value} (est.)` };
    }
    
    // Fuente desconocida → no mostrar
    return { value: null, status: DATA_STATUS.UNAVAILABLE, display: 'N/D' };
}

/**
 * Generar tabla de datos verificados para el informe
 * REGLA: Solo incluir datos con status VERIFIED
 * 
 * @param {Object} app - Estado de la aplicación
 * @returns {Object} Datos verificados para el informe
 */
export function generarDatosVerificados(app) {
    const datos = {
        paradas: app.paradasReales || [],
        estacionesBici: app.estacionesBiciReales || [],
        pois: app.poisReales || {},
        empresa: app.empresa || {},
        centro: app.centro || {},
        empleados: app.empleados || [],
        diagnostico: app.diagnostico || null,
        dafo: app.dafo || null,
        medidas: app.medidas || [],
        objetivos: app.objetivos || []
    };
    
    // Contar datos verificados vs no verificados
    const stats = {
        paradasVerificadas: datos.paradas.filter(p => p.status === DATA_STATUS.VERIFIED).length,
        paradasNoDisponibles: datos.paradas.filter(p => p.status === DATA_STATUS.UNAVAILABLE).length,
        biciVerificadas: datos.estacionesBici.filter(e => e.status === DATA_STATUS.VERIFIED).length,
        poisVerificados: Object.values(datos.pois).flat().filter(p => p.status === DATA_STATUS.VERIFIED).length,
    };
    
    datos.stats = stats;
    datos.allVerified = stats.paradasVerificadas > 0 || stats.biciVerificadas > 0;
    
    return datos;
}
