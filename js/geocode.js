/**
 * PLANDEMOVILIDAD — Geocodificación con Nominatim (OpenStreetMap)
 * 
 * Geocodificación directa (dirección → coordenadas) e inversa
 * (coordenadas → dirección).
 * 
 * Fuente: https://nominatim.openstreetmap.org/
 * Rate limit: 1 req/seg — ToS de Nominatim
 * 
 * Autor: David Antizar
 */

import { CONFIG } from './config.js';
import { safeFetch, sleep } from './utils.js';

/**
 * Cache de geocodificación en memoria
 * Evita repetir queries para la misma dirección
 * @type {Map<string, {lat: number, lon: number, display_name: string}>}
 */
const geocodeCache = new Map();

/**
 * Geocodificación directa: dirección → coordenadas
 * @param {string} address — Dirección a geocodificar
 * @returns {Promise<{lat: number, lon: number, display_name: string}>}
 */
export async function geocodeAddress(address) {
    if (!address || !address.trim()) {
        throw new Error('Dirección vacía');
    }
    
    // Verificar cache
    if (geocodeCache.has(address)) {
        return geocodeCache.get(address);
    }
    
    try {
        // Nominatim requiere User-Agent — verificado
        const params = new URLSearchParams({
            q: address.trim(),
            format: 'json',
            limit: '1',
            countrycodes: 'es', // Priorizar España
            addressdetails: '1',
        });
        
        const url = `${CONFIG.nominatim.searchUrl}?${params}`;
        
        // Respetar rate limit
        await sleep(1100);
        
        const data = await safeFetch(url, {
            headers: {
                'User-Agent': CONFIG.nominatim.userAgent,
            },
        });
        
        if (!data || data.length === 0) {
            throw new Error(`No se encontró la dirección: ${address}`);
        }
        
        const result = data[0];
        const geo = {
            lat: parseFloat(result.lat),
            lon: parseFloat(result.lon),
            display_name: result.display_name,
        };
        
        // Guardar en cache
        geocodeCache.set(address, geo);
        
        return geo;
    } catch (err) {
        console.error(`Geocodificación fallida [${address}]:`, err.message);
        throw err;
    }
}

/**
 * Geocodificación inversa: coordenadas → dirección
 * @param {number} lat — Latitud
 * @param {number} lon — Longitud
 * @returns {Promise<{address: string, postcode: string, city: string}>}
 */
export async function reverseGeocode(lat, lon) {
    try {
        // Respetar rate limit
        await sleep(1100);
        
        const params = new URLSearchParams({
            lat: lat.toString(),
            lon: lon.toString(),
            format: 'json',
            addressdetails: '1',
        });
        
        const url = `${CONFIG.nominatim.reverseUrl}?${params}`;
        
        const data = await safeFetch(url, {
            headers: {
                'User-Agent': CONFIG.nominatim.userAgent,
            },
        });
        
        if (!data || !data.address) {
            throw new Error('No se encontró dirección para estas coordenadas');
        }
        
        const addr = data.address;
        return {
            address: data.display_name,
            postcode: addr.postcode || '',
            city: addr.city || addr.town || addr.village || addr.municipality || '',
        };
    } catch (err) {
        console.error(`Geocodificación inversa fallida [${lat}, ${lon}]:`, err.message);
        throw err;
    }
}

/**
 * Limpiar cache de geocodificación
 * Útil antes de re-ejecutar un análisis
 */
export function clearGeocodeCache() {
    geocodeCache.clear();
}
