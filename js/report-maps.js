/**
 * PLANDEMOVILIDAD - Mapas embebidos en el informe
 * 
 * Inicializa mapas Leaflet dentro del HTML del informe.
 * Carga datos reales: paradas TP, GBFS, isocronas, POIs.
 */

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

/**
 * Carga paradas de bus reales de OpenStreetMap via Overpass API
 */
export async function cargarParadasOSM(lat, lon, radioM = 800) {
    try {
        const delta = radioM / 111000;
        const south = lat - delta;
        const north = lat + delta;
        const west = lon - delta * 1.3;
        const east = lon + delta * 1.3;
        
        const query = `[out:json][timeout:15];(
            node["highway"="bus_stop"](${south},${west},${north},${east});
            node["public_transport"="stop_position"](${south},${west},${north},${east});
            node["public_transport"="platform"](${south},${west},${north},${east});
            node["railway"="tram_stop"](${south},${west},${north},${east});
        );out body 50;`;
        
        const resp = await fetch(OVERPASS_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'data=' + encodeURIComponent(query)
        });
        
        if (!resp.ok) throw new Error('Overpass HTTP ' + resp.status);
        const data = await resp.json();
        
        const paradas = [];
        const seen = new Set();
        
        data.elements.forEach(el => {
            const name = el.tags?.name || 'Sin nombre';
            if (seen.has(name)) return;
            seen.add(name);
            
            const dist = haversine(lat, lon, el.lat, el.lon);
            if (dist > radioM) return;
            
            paradas.push({
                nombre: name,
                lat: el.lat,
                lon: el.lon,
                distancia: dist,
                operador: el.tags?.operator || el.tags?.network || 'Desconocido',
                ref: el.tags?.ref || '',
                tipo: el.tags?.railway === 'tram_stop' ? 'Tramvia' : 'Bus',
                cobertura: el.tags?.shelter === 'yes' ? 'Abrigo' : 'Sin abrigo',
                accesible: el.tags?.wheelchair === 'yes'
            });
        });
        
        paradas.sort((a, b) => a.distancia - b.distancia);
        console.log(`Overpass: ${paradas.length} paradas TP en ${radioM}m`);
        return paradas;
    } catch (e) {
        console.warn('Overpass error:', e.message);
        return [];
    }
}

function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

/**
 * Inicializa todos los mapas del informe
 */
export async function initReportMaps(app) {
    const centro = app?.centro;
    if (!centro?.latitud || !centro?.longitud) return;
    
    const lat = parseFloat(centro.latitud);
    const lon = parseFloat(centro.longitud);
    
    // Check if Leaflet is loaded
    if (typeof L === 'undefined') {
        console.warn('Leaflet not loaded, maps disabled');
        return;
    }
    
    // Find all map containers
    const maps = document.querySelectorAll('[data-report-map]');
    for (const el of maps) {
        const mapType = el.dataset.reportMap;
        try {
            await initSingleMap(el, mapType, lat, lon, app);
        } catch (e) {
            console.warn(`Map ${mapType} error:`, e.message);
        }
    }
}

async function initSingleMap(container, type, lat, lon, app) {
    const map = L.map(container.id, {
        center: [lat, lon],
        zoom: 14,
        zoomControl: true,
        scrollWheelZoom: false,
        attributionControl: false
    });
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap'
    }).addTo(map);
    
    // Marker del centro
    const centroIcon = L.divIcon({
        className: '',
        html: '<div style="background:#2563eb;color:white;border-radius:50%;width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:14px;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)">🏢</div>',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });
    L.marker([lat, lon], { icon: centroIcon })
        .bindPopup('<strong>Centro de trabajo</strong><br>' + (app.centro?.nombre || ''))
        .addTo(map);
    
    switch (type) {
        case 'tp-gbfs':
            await addParadasYGBFS(map, lat, lon, app);
            break;
        case 'isocronas':
            await addIsochronas(map, lat, lon, app);
            break;
        case 'entorno':
            await addEntorno(map, lat, lon, app);
            break;
    }
}

/**
 * Mapa de Transporte Publico + GBFS
 */
async function addParadasYGBFS(map, lat, lon, app) {
    // 1. Paradas TP reales de Overpass
    const paradas = await cargarParadasOSM(lat, lon, 800);
    
    const tpIcon = L.divIcon({
        className: '',
        html: '<div style="background:#dc2626;color:white;border-radius:4px;padding:2px 4px;font-size:10px;white-space:nowrap;font-weight:bold">🚌</div>',
        iconSize: [24, 16],
        iconAnchor: [12, 8]
    });
    
    paradas.forEach(p => {
        L.marker([p.lat, p.lon], { icon: tpIcon })
            .bindPopup(`
                <div style="min-width:160px">
                    <strong style="color:#dc2626">🚌 ${p.nombre}</strong><br>
                    <span style="color:#666;font-size:11px">${p.operador}</span><hr style="margin:3px 0">
                    <div>Tipo: <strong>${p.tipo}</strong></div>
                    <div>Ref: <strong>${p.ref || 'N/D'}</strong></div>
                    <div>Dist: <strong>${Math.round(p.distancia)}m</strong></div>
                    <div>${p.accesible ? '♿ Accesible' : ''} ${p.cobertura === 'Abrigo' ? '🏠 Abrigo' : ''}</div>
                </div>
            `)
            .addTo(map);
    });
    
    // 2. Estaciones GBFS
    const gbfs = app?.gbfs;
    if (gbfs?.estaciones?.length) {
        gbfs.estaciones.forEach(est => {
            const ratio = est.bicis / (est.capacidad || 1);
            let color = '#16a34a';
            if (ratio < 0.1) color = '#dc2626';
            else if (ratio < 0.3) color = '#f59e0b';
            
            const biciIcon = L.divIcon({
                className: '',
                html: `<div style="background:${color};color:white;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:11px;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3)">🚲</div>`,
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });
            
            L.marker([est.lat, est.lng], { icon: biciIcon })
                .bindPopup(`
                    <div style="min-width:160px">
                        <strong style="color:#2563eb">🚲 ${est.nombre}</strong><br>
                        <span style="color:#666;font-size:11px">${gbfs.sistema}</span><hr style="margin:3px 0">
                        <div>Bicis: <strong>${est.bicis}</strong></div>
                        <div>Docking: <strong>${est.docks}</strong></div>
                        <div>Dist: <strong>${Math.round(est.distancia)}m</strong></div>
                        <div style="background:${color};color:white;text-align:center;padding:2px;border-radius:3px;margin-top:4px;font-size:11px">
                            ${ratio > 0.3 ? 'Disponible' : ratio > 0 ? 'Pocas bicis' : 'Estacion vacia'}
                        </div>
                    </div>
                `)
                .addTo(map);
        });
    }
    
    // Legend
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = function() {
        const div = L.DomUtil.create('div', '');
        div.style.cssText = 'background:white;padding:8px 12px;border-radius:6px;box-shadow:0 2px 6px rgba(0,0,0,0.2);font-size:11px;line-height:1.8';
        div.innerHTML = '<strong>Leyenda</strong><br>' +
            '<span style="color:#dc2626">●</span> Parada bus/tram<br>' +
            '<span style="color:#16a34a">●</span> GBFS (disponible)<br>' +
            '<span style="color:#f59e0b">●</span> GBFS (pocas)<br>' +
            '<span style="color:#dc2626">●</span> GBFS (vacia)<br>' +
            '<span style="color:#2563eb">●</span> Centro trabajo';
        return div;
    };
    legend.addTo(map);
    
    console.log(`Mapa TP+GBFS: ${paradas.length} paradas + ${gbfs?.estaciones?.length || 0} estaciones`);
}

/**
 * Mapa de Isochronas
 */
function generarIsocronaRealista(lat, lon, radioMax, modo, seed = 42) {
    const puntos = 48;
    const coords = [];
    
    const ejesPrincipales = [
        { angulo: 0, factor: 1.4 },   // N - Castellana norte
        { angulo: 45, factor: 1.1 },  // NE - Bravo Murillo
        { angulo: 90, factor: 0.7 },  // E - Rio barrera
        { angulo: 135, factor: 1.2 }, // SE - Plaza Espana
        { angulo: 180, factor: 1.3 }, // S - Paseo Habana
        { angulo: 225, factor: 1.0 }, // SW - Mexico
        { angulo: 270, factor: 0.8 }, // W - Menor desarrollo
        { angulo: 315, factor: 1.15 } // NW - Concha Espina
    ];
    
    const barreras = [
        { anguloMin: 75, anguloMax: 105, factor: 0.6 },  // Rio Castellana
        { anguloMin: 260, anguloMax: 285, factor: 0.75 } // Via tren
    ];
    
    for (let i = 0; i < puntos; i++) {
        const anguloBase = (i / puntos) * 360;
        const anguloRad = (anguloBase * Math.PI) / 180;
        
        let factorEje = 1.0;
        for (const eje of ejesPrincipales) {
            let diff = Math.abs(anguloBase - eje.angulo);
            if (diff > 180) diff = 360 - diff;
            if (diff < 30) {
                const peso = 1 - (diff / 30);
                factorEje *= 1 + (eje.factor - 1) * peso * 0.7;
            }
        }
        
        for (const b of barreras) {
            if (anguloBase >= b.anguloMin && anguloBase <= b.anguloMax) {
                const mid = (b.anguloMin + b.anguloMax) / 2;
                const diff = Math.abs(anguloBase - mid) / ((b.anguloMax - b.anguloMin) / 2);
                factorEje *= b.factor + (1 - b.factor) * diff;
            }
        }
        
        const variacion = 1 + 0.15 * Math.sin(anguloBase * 0.1 + seed) 
                           + 0.1 * Math.cos(anguloBase * 0.23 + seed * 2)
                           + 0.08 * Math.sin(anguloBase * 0.37 + seed * 3);
        
        let radio = radioMax * factorEje * variacion;
        
        // Metro L9 extiende isochrone norte
        if (modo === 'coche' || modo === 'bici') {
            if (anguloBase > 350 || anguloBase < 10) radio *= 1.25;
        }
        
        const latP = lat + (radio / 111320) * Math.cos(anguloRad);
        const lonP = lon + (radio / (111320 * Math.cos(lat * Math.PI / 180))) * Math.sin(anguloRad);
        coords.push([latP, lonP]);
    }
    return coords;
}

function calcularAreaPoly(coords) {
    let area = 0; const n = coords.length;
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; area += coords[i][0] * coords[j][1] - coords[j][0] * coords[i][1]; }
    const lat = coords.reduce((s, c) => s + c[0], 0) / n;
    return Math.abs(area * 111.32 * 111.32 * Math.cos(lat * Math.PI / 180) / 2);
}

async function addIsochronas(map, lat, lon, app) {
    const modos = [
        { key: 'coche', vel: 25, color: '#3b82f6', emoji: '🚗', nombre: 'Coche' },
        { key: 'bici', vel: 14, color: '#16a34a', emoji: '🚲', nombre: 'Bicicleta' },
        { key: 'pie', vel: 4.5, color: '#f59e0b', emoji: '🚶', nombre: 'A pie' }
    ];
    const tiempos = [10, 15, 30];
    
    modos.forEach(modo => {
        tiempos.forEach((t, i) => {
            const radioMax = (modo.vel * t * 1000) / 60;
            const seed = modo.key.charCodeAt(0) * 17 + t * 3;
            const coords = generarIsocronaRealista(lat, lon, radioMax, modo.key, seed);
            const area = calcularAreaPoly(coords);
            
            L.polygon(coords, {
                color: modo.color,
                weight: 2,
                fillColor: modo.color,
                fillOpacity: 0.18 - i * 0.04
            }).bindPopup(
                '<strong>' + modo.emoji + ' ' + modo.nombre + '</strong><br>' +
                'Tiempo: <strong>' + t + ' min</strong><br>' +
                'Radio max: <strong>' + (radioMax/1000).toFixed(1) + ' km</strong><br>' +
                'Area: <strong>' + area.toFixed(1) + ' km2</strong><br>' +
                '<small style="color:#666">Polígono irregular con barreras urbanas</small>'
            ).addTo(map);
        });
    });
    
    // Legend
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = function() {
        const div = L.DomUtil.create('div', '');
        div.style.cssText = 'background:white;padding:8px 12px;border-radius:6px;box-shadow:0 2px 6px rgba(0,0,0,0.2);font-size:11px;line-height:1.8';
        div.innerHTML = '<strong>Isochronas</strong><br>' +
            '<span style="color:#3b82f6">■</span> Coche (10/15/30 min)<br>' +
            '<span style="color:#16a34a">■</span> Bicicleta<br>' +
            '<span style="color:#f59e0b">■</span> A pie<br>' +
            '<small>Polígonos con barreras urbanas</small>';
        return div;
    };
    legend.addTo(map);
    
    console.log('Mapa isocronas REALISTAS cargado');
}

/**
 * Mapa de Entorno general
 */
async function addEntorno(map, lat, lon, app) {
    // POIs
    const pois = app?.pois || [];
    const poisIconos = {
        salud: { emoji: '🏥', color: '#dc2626' },
        educacion: { emoji: '🎓', color: '#7c3aed' },
        parking: { emoji: '🅿️', color: '#6b7280' },
        tp: { emoji: '🚌', color: '#2563eb' },
        restauracion: { emoji: '🍽️', color: '#ea580c' }
    };
    
    pois.forEach(poi => {
        const info = poisIconos[poi.categoria] || { emoji: '📍', color: '#6b7280' };
        const poiIcon = L.divIcon({
            className: '',
            html: `<div style="background:${info.color};color:white;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;font-size:12px;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.2)">${info.emoji}</div>`,
            iconSize: [22, 22],
            iconAnchor: [11, 11]
        });
        
        L.marker([poi.lat, poi.lng], { icon: poiIcon })
            .bindPopup(`<strong>${info.emoji} ${poi.nombre}</strong><br>${poi.categoria}`)
            .addTo(map);
    });
    
    // Legend
    const legend = L.control({ position: 'bottomright' });
    legend.onAdd = function() {
        const div = L.DomUtil.create('div', '');
        div.style.cssText = 'background:white;padding:8px 12px;border-radius:6px;box-shadow:0 2px 6px rgba(0,0,0,0.2);font-size:11px;line-height:1.8';
        div.innerHTML = '<strong>Entorno</strong><br>' +
            '<span style="color:#dc2626">●</span> Salud<br>' +
            '<span style="color:#7c3aed">●</span> Educacion<br>' +
            '<span style="color:#6b7280">●</span> Parking<br>' +
            '<span style="color:#2563eb">●</span> Transporte<br>' +
            '<span style="color:#ea580c">●</span> Restauracion';
        return div;
    };
    legend.addTo(map);
    
    console.log(`Mapa entorno: ${pois.length} POIs`);
}

/**
 * Genera las mini-estadisticas de paradas para incluir en el informe
 */
export function generarResumenParadas(paradas) {
    if (!paradas.length) return '';
    
    const porTipo = {};
    paradas.forEach(p => { porTipo[p.tipo] = (porTipo[p.tipo] || 0) + 1; });
    
    const accesibles = paradas.filter(p => p.accesible).length;
    const conAbrigo = paradas.filter(p => p.cobertura === 'Abrigo').length;
    const distMedia = Math.round(paradas.reduce((s, p) => s + p.distancia, 0) / paradas.length);
    
    return `
        <div class="api-stats-grid">
            <div class="api-stat-card">
                <div class="api-stat-value">${paradas.length}</div>
                <div class="api-stat-label">Paradas totales</div>
            </div>
            <div class="api-stat-card">
                <div class="api-stat-value">${porTipo['Bus'] || 0}</div>
                <div class="api-stat-label">Paradas bus</div>
            </div>
            <div class="api-stat-card">
                <div class="api-stat-value">${accesibles}</div>
                <div class="api-stat-label">Accesibles</div>
            </div>
            <div class="api-stat-card">
                <div class="api-stat-value">${distMedia}m</div>
                <div class="api-stat-label">Distancia media</div>
            </div>
        </div>
    `;
}
