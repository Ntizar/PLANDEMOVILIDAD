/**
 * PLANDEMOVILIDAD — API Nominatim (Geocodificación)
 * 
 * OpenStreetMap Nominatim para geocodificación directa e inversa.
 * Gratis, sin API key. Rate limit: 1 req/segundo.
 * 
 * CRÍTICO: Nominatim usa "lon", no "lng". Wrapper corrige esto.
 */

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';
const USER_AGENT = 'PLANDEMOVILIDAD/2.0 (david.antizar@gmail.com)';

// Cola de requests para respetar rate limit
let lastRequest = 0;
const MIN_INTERVAL = 1100; // 1.1s para seguridad

/**
 * Geocodificación directa: dirección → coordenadas
 */
export async function geocodificar(direccion) {
    await esperarRateLimit();
    
    const params = new URLSearchParams({
        format: 'json',
        q: direccion,
        limit: '5',
        countrycodes: 'es',
        addressdetails: '1'
    });
    
    const resp = await fetch(`${NOMINATIM_URL}/search?${params}`, {
        headers: { 'User-Agent': USER_AGENT }
    });
    
    if (!resp.ok) throw new Error(`Nominatim error: ${resp.status}`);
    
    const data = await resp.json();
    
    return data.map(r => ({
        nombre: r.display_name,
        direccion: r.display_name.split(',').slice(0, 3).join(','),
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon), // CRÍTICO: Nominatim usa "lon"
        tipo: r.type,
        categoria: r.class,
        boundingbox: r.boundingbox?.map(Number)
    }));
}

/**
 * Geocodificación inversa: coordenadas → dirección
 */
export async function geocodificarInversa(lat, lng) {
    await esperarRateLimit();
    
    const params = new URLSearchParams({
        format: 'json',
        lat: lat.toString(),
        lon: lng.toString(),
        addressdetails: '1'
    });
    
    const resp = await fetch(`${NOMINATIM_URL}/reverse?${params}`, {
        headers: { 'User-Agent': USER_AGENT }
    });
    
    if (!resp.ok) throw new Error(`Nominatim reverse error: ${resp.status}`);
    
    const data = await resp.json();
    
    if (data.error) return null;
    
    const addr = data.address || {};
    
    return {
        nombre: data.display_name,
        calle: [addr.road, addr.house_number].filter(Boolean).join(' '),
        barrio: addr.suburb || addr.neighbourhood || '',
        ciudad: addr.city || addr.town || addr.village || addr.municipality || '',
        provincia: addr.state || addr.county || '',
        cp: addr.postcode || '',
        pais: addr.country || 'España',
        lat: parseFloat(data.lat),
        lng: parseFloat(data.lon)
    };
}

/**
 * Buscar centros de salud, educativos, comercios cercanos (POIs)
 */
export async function buscarPOIs(lat, lng, tipo = 'all', radioM = 2000) {
    await esperarRateLimit();
    
    // Overpass API lite (sin autenticación)
    const tipoMap = {
        salud: '"amenity"="hospital","amenity"="clinic","amenity"="pharmacy"',
        educacion: '"amenity"="school","amenity"="university","amenity"="kindergarten"',
        comercio: '"shop"="supermarket","shop"="mall"',
        parking: '"amenity"="parking","amenity"="parking_entrance"',
        tp: '"public_transport"="station","public_transport"="stop_position"'
    };
    
    const radius = radioM || 2000;
    const query = `
        [out:json][timeout:10];
        (
            node["amenity"](around:${radius},${lat},${lng});
            way["amenity"](around:${radius},${lat},${lng});
        );
        out center 20;
    `;
    
    try {
        const resp = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            body: `data=${encodeURIComponent(query)}`,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            signal: AbortSignal.timeout(15000)
        });
        
        if (!resp.ok) return [];
        
        const data = await resp.json();
        
        return (data.elements || []).map(e => ({
            id: e.id,
            nombre: e.tags?.name || e.tags?.['name:es'] || '',
            tipo: e.tags?.amenity || e.tags?.shop || 'unknown',
            lat: e.lat || e.center?.lat,
            lng: e.lon || e.center?.lon,
            distancia: haversine(lat, lng, e.lat || e.center?.lat, e.lon || e.center?.lon)
        })).filter(p => p.lat && p.lng).sort((a, b) => a.distancia - b.distancia);
        
    } catch (err) {
        console.warn('Overpass API error:', err.message);
        return [];
    }
}

/**
 * Detectar ciudad desde coordenadas
 */
export async function detectarCiudad(lat, lng) {
    const resultado = await geocodificarInversa(lat, lng);
    if (!resultado) return null;
    
    return {
        nombre: resultado.ciudad || resultado.barrio || 'Desconocido',
        provincia: resultado.provincia,
        cp: resultado.cp,
        direccion: resultado.nombre,
        lat: resultado.lat,
        lng: resultado.lng
    };
}

/**
 * Rate limit helper
 */
async function esperarRateLimit() {
    const ahora = Date.now();
    const espera = MIN_INTERVAL - (ahora - lastRequest);
    if (espera > 0) await new Promise(r => setTimeout(r, espera));
    lastRequest = Date.now();
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

// Exponer globalmente
if (typeof window !== 'undefined') {
    window.pmstApp = window.pmstApp || {};
    window.pmstApp.nominatim = {
        geocodificar,
        geocodificarInversa,
        buscarPOIs,
        detectarCiudad
    };
}
