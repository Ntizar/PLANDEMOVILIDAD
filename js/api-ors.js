/**
 * PLANDEMOVILIDAD — API ORS (Isochronas reales)
 * 
 * OpenRouteService API v2 para isócronas de coche, bici, pie.
 * Key del usuario en localStorage. Fallback a simulación si no hay key.
 * 
 * Patrón: localStorage key → ORS real → fallback simulado
 */

const ORS_URL = 'https://api.openrouteservice.org/v2/isochrones';
const ORS_PROFILES = {
    coche: 'driving-car',
    bici: 'cycling-regular',
    pie: 'foot-walking'
};

const VELOCIDADES_SIM = {
    coche: { kmh: 30, label: 'Coche urbano' },
    bici: { kmh: 15, label: 'Bicicleta' },
    pie: { kmh: 5, label: 'A pie' }
};

/**
 * Obtener/guardar API key de ORS
 */
export function getOrsKey() {
    return localStorage.getItem('pmst_ors_key') || '';
}

export function setOrsKey(key) {
    localStorage.setItem('pmst_ors_key', key);
}

/**
 * Calcular isócrona real vía ORS o fallback simulado
 */
export async function calcularIsocrona(lng, lat, modo, minutos) {
    const key = getOrsKey();
    
    // Intentar ORS real si hay key
    if (key && key.length > 20) {
        try {
            const result = await calcularIsocronaORS(lng, lat, modo, minutos, key);
            if (result.success) return { ...result, real: true };
        } catch (err) {
            console.warn(`ORS fallback ${modo} ${minutos}min:`, err.message);
        }
    }
    
    // Fallback: simulación
    return { ...calcularIsocronaSim(lng, lat, modo, minutos), real: false };
}

/**
 * ORS API v2 — Isochrone request
 */
async function calcularIsocronaORS(lng, lat, modo, minutos, key) {
    const profile = ORS_PROFILES[modo];
    if (!profile) throw new Error(`Modo no soportado: ${modo}`);
    
    const resp = await fetch(`${ORS_URL}/${profile}`, {
        method: 'POST',
        headers: {
            'Authorization': key,
            'Content-Type': 'application/json; charset=utf-8',
            'Accept': 'application/json, application/geo+json'
        },
        body: JSON.stringify({
            locations: [[lng, lat]],
            range: [minutos * 60],
            range_type: 'time',
            attributes: ['area']
        }),
        signal: AbortSignal.timeout(15000)
    });
    
    if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        const errMsg = typeof errData.error === 'string' 
            ? errData.error 
            : errData.error?.message || resp.statusText;
        throw new Error(`ORS HTTP ${resp.status}: ${errMsg}`);
    }
    
    const data = await resp.json();
    const areaM2 = data.features?.[0]?.properties?.area || 0;
    const areaKm2 = areaM2 / 1_000_000;
    
    return {
        geojson: data,
        areaKm2,
        modo,
        minutos,
        success: true
    };
}

/**
 * Simulación de isócrona (fallback visual)
 */
function calcularIsocronaSim(lng, lat, modo, minutos) {
    const vel = VELOCIDADES_SIM[modo] || VELOCIDADES_SIM.coche;
    const radioM = (vel.kmh / 3.6) * minutos * 60;
    const PTS = 48;
    const coords = [];
    
    for (let i = 0; i <= PTS; i++) {
        const ang = (i / PTS) * 2 * Math.PI;
        // Jitter para forma irregular (no círculo perfecto)
        const jitter = 1 - (0.12 * (Math.sin(i * 7.3) * 0.5 + 0.5));
        const r = radioM * jitter;
        const dLat = (r * Math.cos(ang)) / 111320;
        const dLng = (r * Math.sin(ang)) / (111320 * Math.cos(lat * Math.PI / 180));
        coords.push([lng + dLng, lat + dLat]);
    }
    
    // Cerrar polígono
    coords.push(coords[0]);
    
    const areaKm2 = calcularAreaPoligonoKm2(coords, lat);
    
    return {
        geojson: {
            type: 'FeatureCollection',
            features: [{
                type: 'Feature',
                geometry: { type: 'Polygon', coordinates: [coords] },
                properties: { modo, minutos, simulado: true }
            }]
        },
        areaKm2,
        modo,
        minutos,
        success: true
    };
}

/**
 * Calcular todas las isócronas para múltiples modos y tiempos
 */
export async function calcularTodasIsocronas(lat, lng, modos, tiempos) {
    const resultados = [];
    
    for (const modo of modos) {
        for (const min of tiempos) {
            const result = await calcularIsocrona(lng, lat, modo, min);
            resultados.push({ modo, minutos: min, ...result });
            // Stagger para ORS (evitar 429)
            if (result.real) await new Promise(r => setTimeout(r, 400));
        }
    }
    
    return resultados;
}

/**
 * Área de polígono en km² (Shoelace formula)
 */
function calcularAreaPoligonoKm2(coords, refLat) {
    let area = 0;
    const n = coords.length;
    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        area += coords[i][0] * coords[j][1] - coords[j][0] * coords[i][1];
    }
    const cosLat = Math.cos((refLat || coords.reduce((s, c) => s + c[1], 0) / n) * Math.PI / 180);
    return Math.abs(area) / 2 * (111.32 * 111.32 * cosLat);
}

/**
 * Verificar si la API key es válida
 */
export async function verificarOrsKey(key) {
    if (!key || key.length < 20) return { ok: false, error: 'Key muy corta' };
    
    try {
        const resp = await fetch(`${ORS_URL}/driving-car`, {
            method: 'POST',
            headers: {
                'Authorization': key,
                'Content-Type': 'application/json; charset=utf-8'
            },
            body: JSON.stringify({
                locations: [[-3.7038, 40.4168]],
                range: [900],
                range_type: 'time'
            }),
            signal: AbortSignal.timeout(10000)
        });
        
        if (resp.ok) return { ok: true, message: 'API key válida' };
        const err = await resp.json().catch(() => ({}));
        return { ok: false, error: err.error?.message || resp.statusText };
    } catch (e) {
        return { ok: false, error: e.message };
    }
}

// Exponer globalmente
if (typeof window !== 'undefined') {
    window.pmstApp = window.pmstApp || {};
    window.pmstApp.ors = {
        calcularIsocrona,
        calcularTodasIsocronas,
        getOrsKey,
        setOrsKey,
        verificarOrsKey
    };
}
