/**
 * Isochronas realistas para PLANDEMOVILIDAD
 * 
 * Genera polígonos irregulares que simulan isócronas reales:
 * - Siguen ejes viales principales
 * - Se contraen por barreras urbanas (rías, vías, autovías)
 * - Se estiran por transporte público
 * - Densidad variable según dirección
 */

/**
 * Genera polígono irregular tipo "mano de pulpo" que simula isócrona real
 * @param {number} lat - Latitud centro
 * @param {number} lon - Longitud centro
 * @param {number} radioMax - Radio máximo en metros
 * @param {string} modo - 'coche', 'bici', 'pie'
 * @param {number} seed - Seed para consistencia
 * @returns {Array} Array de [lat, lng] puntos del polígono
 */
export function generarIsocronaRealista(lat, lon, radioMax, modo, seed = 42) {
    const puntos = 48; // Alta resolución
    const coords = [];
    
    // Ejes viales principales de Madrid (ángulos en grados desde centro)
    // Estos representan las principales avenidas que se extienden desde Paseo de la Habana
    const ejesPrincipales = [
        { angulo: 0, nombre: 'Norte (Paseo Castellana)', factor: 1.4 },      // Castellana norte
        { angulo: 45, nombre: 'NE (Bravo Murillo)', factor: 1.1 },            // Bravo Murillo
        { angulo: 90, nombre: 'E (Rio Castellana)', factor: 0.7 },            // Rio - barrera
        { angulo: 135, nombre: 'SE (Pza Espana)', factor: 1.2 },              // Hacia Plaza España
        { angulo: 180, nombre: 'S (Paseo Habana)', factor: 1.3 },             // Paseo de la Habana sur
        { angulo: 225, nombre: 'SW (Mexico)', factor: 1.0 },                  // Paseo de México
        { angulo: 270, nombre: 'W (Agricultor)', factor: 0.8 },               // Menor desarrollo
        { angulo: 315, nombre: 'NW (Concha Espina)', factor: 1.15 },          // Concha Espina
    ];
    
    // Velocidades medias por modo (km/h)
    const velocidades = { coche: 25, bici: 14, pie: 4.5 };
    const vel = velocidades[modo] || 25;
    
    // Barreras urbanas que reducen el radio en ciertas direcciones
    const barreras = [
        { anguloMin: 75, anguloMax: 105, factor: 0.6, nombre: 'Rio Castellana' },
        { anguloMin: 260, anguloMax: 285, factor: 0.75, nombre: 'Via tren' },
    ];
    
    for (let i = 0; i < puntos; i++) {
        const anguloBase = (i / puntos) * 360;
        const anguloRad = (anguloBase * Math.PI) / 180;
        
        // Radio base
        let radio = radioMax;
        
        // Factor de eje principal (interpolación suave)
        let factorEje = 1.0;
        for (const eje of ejesPrincipales) {
            let diff = Math.abs(anguloBase - eje.angulo);
            if (diff > 180) diff = 360 - diff;
            if (diff < 30) {
                const peso = 1 - (diff / 30);
                factorEje = factorEje * (1 + (eje.factor - 1) * peso * 0.7);
            }
        }
        
        // Factor de barreras (reducción)
        for (const barrera of barreras) {
            if (anguloBase >= barrera.anguloMin && anguloBase <= barrera.anguloMax) {
                const mid = (barrera.anguloMin + barrera.anguloMax) / 2;
                const diff = Math.abs(anguloBase - mid) / ((barrera.anguloMax - barrera.anguloMin) / 2);
                factorEje *= barrera.factor + (1 - barrera.factor) * diff;
            }
        }
        
        // Variación pseudo-aleatoria suave (no completamente circular)
        const variacion = 1 + 0.15 * Math.sin(anguloBase * 0.1 + seed) 
                           + 0.1 * Math.cos(anguloBase * 0.23 + seed * 2)
                           + 0.08 * Math.sin(anguloBase * 0.37 + seed * 3);
        
        radio *= factorEje * variacion;
        
        // Añadir "dedos" por transporte público
        if (modo === 'coche' || modo === 'bici') {
            // Metro L9 norte - extiende isócrona
            if (anguloBase > 350 || anguloBase < 10) {
                radio *= 1.25; // Metro extiende un 25%
            }
        }
        
        const latP = lat + (radio / 111320) * Math.cos(anguloRad);
        const lonP = lon + (radio / (111320 * Math.cos(lat * Math.PI / 180))) * Math.sin(anguloRad);
        coords.push([latP, lonP]);
    }
    
    return coords;
}

/**
 * Genera isócronas por capas (10, 15, 30 min) para cada modo
 */
export function generarTodasIsocronas(lat, lon) {
    const modos = [
        { key: 'coche', vel: 25, color: '#3b82f6', nombre: 'Coche' },
        { key: 'bici', vel: 14, color: '#16a34a', nombre: 'Bicicleta' },
        { key: 'pie', vel: 4.5, color: '#f59e0b', nombre: 'A pie' }
    ];
    const tiempos = [10, 15, 30];
    
    const resultado = [];
    
    for (const modo of modos) {
        for (let i = 0; i < tiempos.length; i++) {
            const t = tiempos[i];
            const radioMax = (modo.vel * t * 1000) / 60; // metros
            const seed = (modo.key.charCodeAt(0) * 17 + t * 3);
            
            const coords = generarIsocronaRealista(lat, lon, radioMax, modo.key, seed);
            const area = calcularArea(coords);
            
            resultado.push({
                modo: modo.key,
                nombre: modo.nombre,
                minutos: t,
                radioMax: radioMax,
                color: modo.color,
                coords: coords,
                areaKm2: area,
                geojson: {
                    type: 'Feature',
                    properties: { modo: modo.nombre, minutos: t, area_km2: area },
                    geometry: {
                        type: 'Polygon',
                        coordinates: [coords.map(c => [c[1], c[0]])]
                    }
                }
            });
        }
    }
    
    return resultado;
}

/**
 * Calcula área aproximada de un polígono (fórmula de Shoelace)
 */
function calcularArea(coords) {
    let area = 0;
    const n = coords.length;
    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        area += coords[i][0] * coords[j][1];
        area -= coords[j][0] * coords[i][1];
    }
    // Convertir grados² a km²
    const latMedia = coords.reduce((s, c) => s + c[0], 0) / n;
    const factorLat = 111.32; // km/grado lat
    const factorLon = 111.32 * Math.cos(latMedia * Math.PI / 180); // km/grado lon
    return Math.abs(area * factorLat * factorLon / 2);
}

/**
 * Genera tabla comparativa de accesibilidad
 */
export function generarTablaAccesibilidad(isocronas) {
    const porModo = {};
    isocronas.forEach(iso => {
        if (!porModo[iso.nombre]) porModo[iso.nombre] = {};
        porModo[iso.nombre][iso.minutos] = iso.areaKm2;
    });
    return porModo;
}
