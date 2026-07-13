/**
 * PLANDEMOVILIDAD — Isocronas con OpenRouteService
 * 
 * Calcula isocronas (zonas alcanzables en X minutos) para:
 * - Peatón (10-15 min)
 * - Bicicleta (15-25 min)
 * - Coche (30-60 min, aproximación transporte público)
 * 
 * Fallback: isocronas simuladas si ORS no disponible (sin API key).
 * 
 * Fuente: https://openrouteservice.org/
 * API v2: https://openrouteservice.org/dev/#/api-docs
 * 
 * Autor: David Antizar
 */

import { CONFIG } from './config.js';
import { safeFetch, sleep, calcularIsocronaSimulada, calcularAreaPoligonoKm2 } from './utils.js';
import { addIsochrone, getMap } from './map.js';

/**
 * Calcular isocrona desde un punto con ORS
 * @param {number} lng — Longitud
 * @param {number} lat — Latitud
 * @param {string} profile — Perfil ORS: 'foot-walking', 'cycling-regular', 'driving-car'
 * @param {number} minutos — Minutos
 * @returns {Promise<{geojson: Object, areaKm2: number, real: boolean}>}
 */
export async function fetchIsochrone(lng, lat, profile, minutos) {
    // Construir URL completa del endpoint
    const url = `${CONFIG.openRouteService.baseUrl}${CONFIG.openRouteService.isochroneEndpoint}/${profile}`;
    
    const body = {
        locations: [[lng, lat]], // Formato ORS: [lng, lat]
        range: [minutos * 60],    // Segundos — ⚠️ NO incluir 'interval' para rango único
        range_type: 'time',
        attributes: ['area'],     // Devuelve área en m²
    };
    
    try {
        const data = await safeFetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Accept': 'application/json, application/geo+json',
            },
            body: JSON.stringify(body),
        });
        
        // Calcular área en km²
        const areaM2 = data.features?.[0]?.properties?.area || 0;
        const areaKm2 = areaM2 / 1_000_000;
        
        return {
            geojson: data,
            areaKm2,
            real: true,
        };
    } catch (err) {
        console.warn(`⚠️ ORS fallback (${profile} ${minutos}min): ${err.message}`);
        // Fallback: isocrona simulada
        return {
            ...calcularIsocronaSimulada(lng, lat, profile === 'foot-walking' ? 'pedestrian' : profile === 'cycling-regular' ? 'cycling' : 'car', minutos),
            real: false,
        };
    }
}

/**
 * Calcular TODAS las isocronas para un punto (staggered para evitar rate-limit)
 * @param {Object} center — {lat, lon}
 * @param {Object} times — {pedestrian: [10,15], cycling: [15,25], publicTransport: [30,60]}
 * @returns {Promise<Array<{modo, minutos, geojson, areaKm2, real}>>}
 */
export async function fetchAllIsochrones(center, times) {
    const { lat, lon } = center;
    const results = [];
    
    // Mapeo de modos a perfiles ORS
    const modeProfiles = {
        pedestrian: 'foot-walking',
        cycling: 'cycling-regular',
        publicTransport: 'driving-car', // Aproximación — TP real necesita GTFS
    };
    
    // Stagger secuencial para evitar 429 rate-limit
    for (const [modo, profiles] of Object.entries(modeProfiles)) {
        const profile = profiles;
        const minutosList = times[modo] || [15];
        
        for (const min of minutosList) {
            const r = await fetchIsochrone(lon, lat, profile, min).catch(
                e => ({ geojson: null, areaKm2: 0, error: e.message, real: false })
            );
            results.push({ modo, minutos: min, ...r });
            
            // Stagger entre requests — ORS free tier: ~1 req/s
            await sleep(1000);
        }
    }
    
    return results;
}

/**
 * Renderizar isocronas en el mapa
 * @param {Object} center — {lat, lon}
 * @param {Array} isochrones — Resultados de fetchAllIsochrones
 */
export function renderIsochrones(isochrones) {
    const map = getMap();
    if (!map) return;
    
    // Limpiar isocronas previas
    map.eachLayer(layer => {
        if (layer instanceof L.GeoJSON) {
            map.removeLayer(layer);
        }
    });
    
    // Colores por modo
    const colors = {
        pedestrian: CONFIG.map.isochroneColors.pedestrian,
        cycling: CONFIG.map.isochroneColors.cycling,
        publicTransport: CONFIG.map.isochroneColors.publicTransport,
    };
    
    for (const iso of isochrones) {
        if (!iso.geojson) continue;
        
        const color = colors[iso.modo] || '#2563eb';
        const layer = addIsochrone(iso.geojson, color, CONFIG.map.isochroneOpacity);
        
        if (layer) {
            layer.bindTooltip(
                `<strong>${iso.modos || iso.modo} — ${iso.minutos} min</strong><br>` +
                `Área: ${iso.areaKm2 ? iso.areaKm2.toFixed(2) : '—'} km²` +
                (iso.real ? '' : ' (simulado)'),
                { sticky: true }
            );
        }
    }
}
