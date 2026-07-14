/**
 * PLANDEMOVILIDAD — API GBFS (Bicicletas Compartidas)
 * 
 * Conecta con feeds GBFS reales de España (68 sistemas).
 * Soporta v2.3 y v3.0. Sin API key necesaria.
 * 
 * Fuentes: Madrid BiciMAD, BCN Bicing, Valencia Valenbisi, etc.
 */

// Catálogo de sistemas GBFS en España (principales)
const SISTEMAS_GBFS = {
    madrid: {
        nombre: 'BiciMAD',
        operador: 'EMT Madrid',
        version: '3.0',
        discovery: 'https://madrid.publicbikesystem.net/customer/gbfs/v3.0/gbfs.json',
        ciudad: { lat: 40.4168, lng: -3.7038 }
    },
    barcelona: {
        nombre: 'Bicing',
        operador: 'Ajuntament de Barcelona',
        version: '3.0',
        discovery: 'https://barcelona.publicbikesystem.net/customer/gbfs/v3.0/gbfs.json',
        ciudad: { lat: 41.3874, lng: 2.1686 }
    },
    valencia: {
        nombre: 'Valenbisi',
        operador: 'Valenbisi SL',
        version: '3.0',
        discovery: 'https://valencia.publicbikesystem.net/customer/gbfs/v3.0/gbfs.json',
        ciudad: { lat: 39.4699, lng: -0.3763 }
    },
    sevilla: {
        nombre: 'Sevici',
        operador: 'Sevici SL',
        version: '3.0',
        discovery: 'https://sevilla.publicbikesystem.net/customer/gbfs/v3.0/gbfs.json',
        ciudad: { lat: 37.3891, lng: -5.9845 }
    },
    zaragoza: {
        nombre: 'Bizi',
        operador: 'Avanza Zaragoza',
        version: '3.0',
        discovery: 'https://zaragoza.publicbikesystem.net/customer/gbfs/v3.0/gbfs.json',
        ciudad: { lat: 41.6488, lng: -0.8891 }
    },
    bilbao: {
        nombre: 'Bilbao Bizi',
        operador: 'Dbizi',
        version: '3.0',
        discovery: 'https://bilbao.publicbikesystem.net/customer/gbfs/v3.0/gbfs.json',
        ciudad: { lat: 43.2630, lng: -2.9350 }
    },
    coruna: {
        nombre: 'Bicicoruña',
        operador: 'Bicicoruña',
        version: '3.0',
        discovery: 'https://coruna.publicbikesystem.net/customer/gbfs/v3.0/gbfs.json',
        ciudad: { lat: 43.3623, lng: -8.4115 }
    },
    valladolid: {
        nombre: 'Valladolid',
        operador: 'AVSA',
        version: '3.0',
        discovery: 'https://valladolid.publicbikesystem.net/customer/gbfs/v3.0/gbfs.json',
        ciudad: { lat: 41.6523, lng: -4.7245 }
    }
};

// Cache de datos por sistema
const cacheGBFS = new Map();

/**
 * Detectar sistema GBFS más cercano a unas coordenadas
 */
export function detectarSistemaCercano(lat, lng, radioKm = 50) {
    let mejor = null, mejorDist = Infinity;
    
    for (const [key, sistema] of Object.entries(SISTEMAS_GBFS)) {
        const dist = haversine(lat, lng, sistema.ciudad.lat, sistema.ciudad.lng) / 1000;
        if (dist < radioKm && dist < mejorDist) {
            mejorDist = dist;
            mejor = { key, ...sistema, distancia: dist };
        }
    }
    
    return mejor;
}

/**
 * Cargar discovery de un sistema GBFS
 */
async function cargarDiscovery(sistemaKey) {
    const sistema = SISTEMAS_GBFS[sistemaKey];
    if (!sistema) throw new Error(`Sistema GBFS desconocido: ${sistemaKey}`);
    
    const cacheKey = `discovery_${sistemaKey}`;
    if (cacheGBFS.has(cacheKey)) return cacheGBFS.get(cacheKey);
    
    const resp = await fetch(sistema.discovery);
    if (!resp.ok) throw new Error(`Error discovery ${sistemaKey}: ${resp.status}`);
    
    const data = await resp.json();
    const feeds = data.data?.feeds || data.feeds || [];
    
    // Resolver URLs relativas
    const baseUrl = sistema.discovery.replace(/\/[^\/]+$/, '/');
    const resolved = feeds.map(f => ({
        name: f.name,
        url: f.url ? new URL(f.url, baseUrl).href : null
    }));
    
    cacheGBFS.set(cacheKey, resolved);
    return resolved;
}

/**
 * Cargar estaciones de un sistema
 */
export async function cargarEstaciones(sistemaKey) {
    const cacheKey = `stations_${sistemaKey}`;
    if (cacheGBFS.has(cacheKey)) return cacheGBFS.get(cacheKey);
    
    const feeds = await cargarDiscovery(sistemaKey);
    const infoFeed = feeds.find(f => f.name === 'station_information');
    const statusFeed = feeds.find(f => f.name === 'station_status');
    
    if (!infoFeed) throw new Error('No station_information feed');
    
    const [infoResp, statusResp] = await Promise.all([
        fetch(infoFeed.url),
        statusFeed ? fetch(statusFeed.url) : Promise.resolve(null)
    ]);
    
    const infoData = await infoResp.json();
    const statusData = statusResp?.ok ? await statusResp.json() : null;
    
    // Parsear v2.3 y v3.0
    let stations = infoData.data?.data?.stations || infoData.data?.stations || [];
    
    // Combinar con status
    const statusMap = {};
    if (statusData) {
        const statusList = statusData.data?.data?.stations || statusData.data?.stations || [];
        statusList.forEach(s => { statusMap[s.station_id] = s; });
    }
    
    const result = stations.map(s => {
        const st = statusMap[s.station_id] || {};
        const nombre = Array.isArray(s.name) 
            ? (s.name.find(n => n.language === 'es')?.text || s.name[0]?.text || s.station_id)
            : (s.name || s.station_id);
        
        return {
            id: s.station_id,
            nombre,
            lat: s.lat,
            lng: s.lon || s.lng,
            capacidad: s.capacity || s.num_docks_available || 0,
            bicis: st.num_vehicles_available ?? st.num_bikes_available ?? 0,
            docks: st.num_docks_available ?? (s.capacity - (st.num_vehicles_available ?? 0)),
            estado: st.status || 'active',
            tipo: s.vehicle_types?.map(v => v.form_factor).join(', ') || 'bicycle'
        };
    });
    
    cacheGBFS.set(cacheKey, result);
    return result;
}

/**
 * Buscar estaciones cercanas a un punto
 */
export async function estacionesCercanas(lat, lng, radioM = 1000, sistemaKey = null) {
    // Auto-detectar sistema si no se especifica
    if (!sistemaKey) {
        const detectado = detectarSistemaCercano(lat, lng);
        if (!detectado) return { estaciones: [], sistema: null, error: 'No hay sistema GBFS en esta zona' };
        sistemaKey = detectado.key;
    }
    
    const estaciones = await cargarEstaciones(sistemaKey);
    const cercanas = estaciones
        .map(e => ({
            ...e,
            distancia: haversine(lat, lng, e.lat, e.lng)
        }))
        .filter(e => e.distancia <= radioM)
        .sort((a, b) => a.distancia - b.distancia);
    
    return {
        estaciones: cercanas,
        sistema: SISTEMAS_GBFS[sistemaKey]?.nombre || sistemaKey,
        total: cercanas.length
    };
}

/**
 * Obtener estadísticas de un sistema
 */
export async function estadisticasSistema(sistemaKey) {
    const estaciones = await cargarEstaciones(sistemaKey);
    
    const totalEstaciones = estaciones.length;
    const totalBicis = estaciones.reduce((s, e) => s + e.bicis, 0);
    const totalDocks = estaciones.reduce((s, e) => s + e.capacidad, 0);
    const ocupacion = totalDocks > 0 ? Math.round(totalBicis / totalDocks * 100) : 0;
    
    const conBicis = estaciones.filter(e => e.bicis > 0).length;
    const vacias = estaciones.filter(e => e.bicis === 0).length;
    
    return {
        totalEstaciones,
        totalBicis,
        totalDocks,
        ocupacion,
        conBicis,
        vacias,
        sistemas: Object.keys(SISTEMAS_GBFS).length
    };
}

/**
 * Haversine distance (meters)
 */
function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

/**
 * Listar todos los sistemas disponibles
 */
export function listarSistemas() {
    return Object.entries(SISTEMAS_GBFS).map(([key, s]) => ({
        key,
        nombre: s.nombre,
        operador: s.operador,
        ciudad: s.ciudad
    }));
}

// Exponer globalmente
if (typeof window !== 'undefined') {
    window.pmstApp = window.pmstApp || {};
    window.pmstApp.gbfs = {
        detectarSistemaCercano,
        estacionesCercanas,
        cargarEstaciones,
        estadisticasSistema,
        listarSistemas
    };
}
