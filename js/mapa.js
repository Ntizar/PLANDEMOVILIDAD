/**
 * PLANDEMOVILIDAD v2.0 — Mapa interactivo con Leaflet
 * 
 * Funcionalidades:
 * - Mapa base con Leaflet (OpenStreetMap + IGN)
 * - Isocronas de accesibilidad (OpenRouteService)
 * - Paradas de transporte público (Nominatim/GTFS)
 * - Puntos de interés (supermercados, farmacias, etc.)
 * - Rutas de transporte público
 * - Marcadores de empleados y vehículos
 * - Panel lateral con información detallada
 * 
 * Autor: David Antizar
 */

import { CONFIG } from './config.js';

// ═══════════════════════════════════════════
// INICIALIZACIÓN DEL MAPA
// ═══════════════════════════════════════════

let map = null;
let layers = {
    isocronas: null,
    paradas: null,
    poi: null,
    empleados: null,
    gbfs: null,
    isocronasReales: null,
    rutas: null,
    markerCentro: null,
    markerMiUbicacion: null,
};

const TILE_LAYERS = {
    osm: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
    }),
    ign: L.tileLayer('https://www.ign.es/wms-layers/NMT/MontanaColor', {
        layers: '0',
        format: 'image/jpeg',
        attribution: '© IGN',
        maxZoom: 18,
    }),
    satelite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '© Esri',
        maxZoom: 18,
    }),
};

export function initMap(containerId, lat, lon) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Contenedor #${containerId} no encontrado`);
        return;
    }
    
    // Inicializar mapa
    map = L.map(containerId, {
        center: [lat || 40.4168, lon || -3.7038],
        zoom: 15,
        layers: [TILE_LAYERS.osm],
        zoomControl: true,
        attributionControl: true,
    });
    
    // Capas base
    const baseLayers = {
        'OpenStreetMap': TILE_LAYERS.osm,
        'IGN (Montaña)': TILE_LAYERS.ign,
        'Satélite': TILE_LAYERS.satelite,
    };
    L.control.layers(baseLayers).addTo(map);
    
    // Control de escala
    L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map);
    
    // Controles personalizados
    const control = L.control({ position: 'topright' });
    control.onAdd = function() {
        const div = L.DomUtil.create('div', 'map-controls');
        div.innerHTML = `
            <button class="map-btn" onclick="window.pmstApp.refreshIsocrones()" title="Recalcular isocronas">🔄 Isocronas</button>
            <button class="map-btn" onclick="window.pmstApp.refreshParadas()" title="Recargar paradas">🚌 Paradas</button>
            <button class="map-btn" onclick="window.pmstApp.centerMap()" title="Centrar en centro">🎯 Centrar</button>
            <button class="map-btn" onclick="window.pmstApp.toggleLayer('empleados')" title="Mostrar empleados">👥 Empleados</button>
        `;
        return div;
    };
    control.addTo(map);
    
    // Click para geolocalizar
    map.on('click', function(e) {
        const { lat, lng } = e.latlng;
        document.getElementById('latitud')?.setValue(lat.toFixed(6));
        document.getElementById('longitud')?.setValue(lng.toFixed(6));
        console.log(`Coordenadas: ${lat}, ${lng}`);
    });
    
    // Guardar referencia global
    window.pmstApp.map = map;
    window.pmstApp.layers = layers;
    
    // Cargar capas iniciales
    loadParadas(lat, lon);
    
    return map;
}

// ═══════════════════════════════════════════
// ISOCRONAS
// ═══════════════════════════════════════════

export async function loadIsocrones(lat, lon, tiempoMin = 15, radioM = 900) {
    try {
        const url = `${CONFIG.openRouteService.baseUrl}${CONFIG.openRouteService.isochroneEndpoint}`;
        const params = new URLSearchParams({
            api_key: CONFIG.openRouteService.apiKey || '',
            locations: `${lon},${lat}`,
            profile: 'foot-walking',
            range_type: 'distance',
            range: `${radioM}`,
            attributes: ['area'],
        });
        
        const response = await fetch(`${url}?${params}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        
        // Limpiar capa anterior
        if (layers.isocronas) map.removeLayer(layers.isocronas);
        
        // Dibujar isocrona
        if (data.features && data.features.length > 0) {
            const feature = data.features[0];
            layers.isocronas = L.geoJSON(feature, {
                style: {
                    color: '#2563eb',
                    weight: 2,
                    fillColor: '#2563eb',
                    fillOpacity: 0.2,
                },
            }).addTo(map);
            
            // Añadir segunda isocrona para 30 min
            const params30 = new URLSearchParams({
                api_key: CONFIG.openRouteService.apiKey || '',
                locations: `${lon},${lat}`,
                profile: 'foot-walking',
                range_type: 'time',
                range: `${tiempoMin * 60}`,
                attributes: ['area'],
            });
            
            const response30 = await fetch(`${url}?${params30}`);
            if (response30.ok) {
                const data30 = await response30.json();
                if (data30.features && data30.features.length > 0) {
                    L.geoJSON(data30.features[0], {
                        style: {
                            color: '#f97316',
                            weight: 2,
                            fillColor: '#f97316',
                            fillOpacity: 0.15,
                        },
                    }).addTo(map);
                }
            }
        }
        
        console.log('✅ Isocronas cargadas');
    } catch (e) {
        console.warn('Error cargando isocronas:', e.message);
        // Fallback: círculo simple
        if (layers.isocronas) map.removeLayer(layers.isocronas);
        layers.isocronas = L.circle([lat, lon], {
            radius: radioM,
            color: '#2563eb',
            weight: 2,
            fillColor: '#2563eb',
            fillOpacity: 0.15,
        }).addTo(map);
    }
}

// ═══════════════════════════════════════════
// PARADAS DE TRANSPORTE PÚBLICO
// ═══════════════════════════════════════════

export async function loadParadas(lat, lon, radio = 500) {
    try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=public+transport+stop&bounded=1&viewbox=${lon-0.01},${lat+0.01},${lon+0.01},${lat-0.01}&limit=50`;
        
        const response = await fetch(url, {
            headers: { 'User-Agent': CONFIG.nominatim.userAgent },
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        
        // Limpiar capa anterior
        if (layers.paradas) map.removeLayer(layers.paradas);
        
        const paradas = [];
        data.forEach(stop => {
            const stopLat = parseFloat(stop.lat);
            const stopLon = parseFloat(stop.lon);
            const dist = calcularDistancia(lat, lon, stopLat, stopLon);
            
            if (dist <= radio) {
                const tipo = detectarTipoParada(stop.display_name);
                const color = getParadaColor(tipo);
                
                const marker = L.circleMarker([stopLat, stopLon], {
                    radius: 6,
                    color: color,
                    fillColor: color,
                    fillOpacity: 0.8,
                    weight: 1,
                }).addTo(map);
                
                marker.bindPopup(`
                    <strong>${tipo}</strong><br>
                    ${stop.display_name}<br>
                    <small>Distancia: ${Math.round(dist)}m</small>
                `);
                
                paradas.push({ tipo, nombre: stop.display_name, distancia: dist, lat: stopLat, lon: stopLon });
            }
        });
        
        layers.paradas = L.layerGroup();
        paradas.forEach(p => {
            const marker = L.circleMarker([p.lat || lat, p.lon || lon], {
                radius: 5, color: getParadaColor(p.tipo), fillColor: getParadaColor(p.tipo), fillOpacity: 0.8, weight: 1
            });
            marker.bindPopup(`<strong>${p.tipo}</strong><br>${p.nombre}<br><small>${Math.round(p.distancia)}m</small>`);
            layers.paradas.addLayer(marker);
        });
        layers.paradas.addTo(map);
        
        console.log(`Bus: ${paradas.length} paradas TP cargadas`);
        return paradas;
    } catch (e) {
        console.warn('Error cargando paradas:', e.message);
        return [];
    }
}

// ═══════════════════════════════════════════
// PUNTOS DE INTERÉS
// ═══════════════════════════════════════════

export async function loadPOI(lat, lon, radio = 300) {
    const tipos = ['supermarket', 'pharmacy', 'school', 'park', 'restaurant', 'bank', 'fuel'];
    const puntos = [];
    
    for (const tipo of tipos) {
        try {
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${tipo}&bounded=1&viewbox=${lon-0.005},${lat+0.005},${lon+0.005},${lat-0.005}&limit=10`;
            
            const response = await fetch(url, {
                headers: { 'User-Agent': CONFIG.nominatim.userAgent },
            });
            
            if (response.ok) {
                const data = await response.json();
                data.forEach(poi => {
                    const poiLat = parseFloat(poi.lat);
                    const poiLon = parseFloat(poi.lon);
                    const dist = calcularDistancia(lat, lon, poiLat, poiLon);
                    
                    if (dist <= radio) {
                        const marker = L.marker([poiLat, poiLon], {
                            icon: L.divIcon({
                                className: 'poi-marker',
                                html: getPOIEmoji(tipo),
                                iconSize: [20, 20],
                            }),
                        }).addTo(map);
                        
                        marker.bindPopup(`
                            <strong>${poi.display_name.split(',')[0]}</strong><br>
                            Tipo: ${tipo}<br>
                            Distancia: ${Math.round(dist)}m
                        `);
                        
                        puntos.push({ tipo, nombre: poi.display_name, distancia: dist });
                    }
                });
            }
        } catch (e) {
            console.warn(`Error cargando ${tipo}:`, e.message);
        }
    }
    
    console.log(`✅ ${puntos.length} POI cargados`);
    return puntos;
}

// ═══════════════════════════════════════════
// MARCADORES DE EMPLEADOS
// ═══════════════════════════════════════════

export function loadEmpleadosMarkers(empleados, lat, lon) {
    if (layers.empleados) map.removeLayer(layers.empleados);
    
    empleados.forEach(emp => {
        if (!emp.modo_principal) return;
        
        const color = getModoColor(emp.modo_principal);
        const icon = L.divIcon({
            className: 'empleados-marker',
            html: `<div style="background:${color};width:12px;height:12px;border-radius:50%;border:2px solid white;"></div>`,
            iconSize: [12, 12],
        });
        
        // Posición aleatoria alrededor del centro (simulada)
        const empLat = lat + (Math.random() - 0.5) * 0.01;
        const empLon = lon + (Math.random() - 0.5) * 0.01;
        
        const marker = L.marker([empLat, empLon], { icon }).addTo(map);
        marker.bindPopup(`
            <strong>${emp.nombre}</strong><br>
            Departamento: ${emp.departamento}<br>
            Modo: ${emp.modo_principal}<br>
            Distancia: ${emp.distancia_km || 'N/A'} km
        `);
    });
    
    layers.empleados = L.layerGroup(empleados.map(emp => 
        L.marker([/* lat, lon */], { /* icon */ })
    )).addTo(map);
    
    console.log(`✅ ${empleados.length} marcadores de empleados`);
}

// ═══════════════════════════════════════════
// FUNCIONES AUXILIARES
// ═══════════════════════════════════════════

function calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getParadaColor(tipo) {
    const colores = {
        'Metro': '#2563eb',
        'Cercanías': '#16a34a',
        'Autobús': '#f97316',
        'Tranvía': '#9333ea',
        'Tren': '#dc2626',
    };
    return colores[tipo] || '#6b7280';
}

function getModoColor(modo) {
    if (modo.includes('coche')) return '#dc2626';
    if (modo.includes('autobús')) return '#2563eb';
    if (modo.includes('metro')) return '#16a34a';
    if (modo.includes('bicicleta')) return '#f97316';
    if (modo.includes('caminando')) return '#0891b2';
    if (modo.includes('motocicleta')) return '#ea580c';
    if (modo.includes('teletrabajo')) return '#6b7280';
    return '#6b7280';
}

function getPOIEmoji(tipo) {
    const emojis = {
        'supermarket': '🛒',
        'pharmacy': '💊',
        'school': '🏫',
        'park': '🌳',
        'restaurant': '🍽️',
        'bank': '🏦',
        'fuel': '⛽',
    };
    return emojis[tipo] || '📍';
}

function detectarTipoParada(nombre) {
    const n = nombre.toLowerCase();
    if (n.includes('metro')) return 'Metro';
    if (n.includes('cercanías') || n.includes('cercania')) return 'Cercanías';
    if (n.includes('autobús') || n.includes('autobus')) return 'Autobús';
    if (n.includes('tranvía') || n.includes('tranvia')) return 'Tranvía';
    if (n.includes('tren')) return 'Tren';
    return 'Parada';
}

// ═══════════════════════════════════════════
// FUNCIONES GLOBALES
// ═══════════════════════════════════════════

window.pmstApp = window.pmstApp || {};
window.pmstApp.map = null;
window.pmstApp.layers = layers;

window.pmstApp.refreshIsocrones = function() {
    const centro = window.pmstApp.appState?.centro || {};
    if (centro.latitud && centro.longitud) {
        loadIsocrones(parseFloat(centro.latitud), parseFloat(centro.longitud));
    }
};

window.pmstApp.refreshParadas = function() {
    const centro = window.pmstApp.appState?.centro || {};
    if (centro.latitud && centro.longitud) {
        loadParadas(parseFloat(centro.latitud), parseFloat(centro.longitud));
    }
};

window.pmstApp.centerMap = function() {
    const centro = window.pmstApp.appState?.centro || {};
    if (centro.latitud && centro.longitud) {
        map.flyTo([parseFloat(centro.latitud), parseFloat(centro.longitud)], 16);
    }
};

window.pmstApp.loadGBFS = loadGBFS;
window.pmstApp.loadIsochronasReales = loadIsochronasReales;

window.pmstApp.toggleLayer = function(layerName) {
    if (layers[layerName]) {
        if (map.hasLayer(layers[layerName])) {
            map.removeLayer(layers[layerName]);
        } else {
            map.addLayer(layers[layerName]);
        }
    }
};

// ═══════════════════════════════════════════
// GBFS — BICICLETAS COMPARTIDAS
// ═══════════════════════════════════════════

export async function loadGBFS(lat, lon, radioM = 1000) {
    try {
        const gbfs = window.pmstApp?.gbfs;
        if (!gbfs) { console.warn('GBFS module not loaded'); return []; }
        
        const result = await gbfs.estacionesCercanas(lat, lon, radioM);
        
        if (layers.gbfs) map.removeLayer(layers.gbfs);
        layers.gbfs = L.layerGroup();
        
        result.estaciones.forEach(est => {
            const ratio = est.bicis / (est.capacidad || 1);
            let color = '#16a34a'; // verde
            if (ratio < 0.1) color = '#dc2626'; // rojo
            else if (ratio < 0.3) color = '#f59e0b'; // amarillo
            
            const marker = L.circleMarker([est.lat, est.lng], {
                radius: 8,
                color: '#2563eb',
                fillColor: color,
                fillOpacity: 0.9,
                weight: 2
            });
            
            marker.bindPopup(`
                <div style="min-width:180px">
                    <strong style="color:#2563eb">🚲 ${est.nombre}</strong><br>
                    <span style="color:#666">${result.sistema}</span><hr style="margin:4px 0">
                    <div style="display:flex;justify-content:space-between">
                        <span>🚲 Bicis:</span><strong>${est.bicis}</strong>
                    </div>
                    <div style="display:flex;justify-content:space-between">
                        <span>🅿️ Docking:</span><strong>${est.docks}</strong>
                    </div>
                    <div style="display:flex;justify-content:space-between">
                        <span>📏 Dist:</span><strong>${Math.round(est.distancia)}m</strong>
                    </div>
                    <div style="background:${color};color:white;text-align:center;padding:2px;border-radius:4px;margin-top:4px;font-size:11px">
                        ${ratio > 0.3 ? '✅ Disponible' : ratio > 0 ? '⚠️ Pocas' : '❌ Vacía'}
                    </div>
                </div>
            `);
            
            layers.gbfs.addLayer(marker);
        });
        
        layers.gbfs.addTo(map);
        console.log(`🚲 ${result.estaciones.length} estaciones GBFS cargadas (${result.sistema})`);
        return result.estaciones;
    } catch (e) {
        console.warn('Error GBFS:', e.message);
        return [];
    }
}

// ═══════════════════════════════════════════
// ISÓCRONAS REALES/SIMULADAS
// ═══════════════════════════════════════════

export async function loadIsochronasReales(lat, lon, modos = ['coche', 'bici', 'pie'], tiempos = [10, 15, 30]) {
    try {
        const ors = window.pmstApp?.ors;
        if (!ors) { console.warn('ORS module not loaded'); return []; }
        
        if (layers.isocronas) map.removeLayer(layers.isocronas);
        layers.isocronas = L.layerGroup();
        
        const colores = {
            coche: ['#3b82f6', '#2563eb', '#1d4ed8'],
            bici: ['#16a34a', '#15803d', '#166534'],
            pie: ['#f59e0b', '#d97706', '#b45309']
        };
        
        for (const modo of modos) {
            for (let i = 0; i < tiempos.length; i++) {
                const min = tiempos[i];
                const result = await ors.calcularIsocrona(lon, lat, modo, min);
                
                if (result.geojson?.features?.[0]) {
                    const feature = result.geojson.features[0];
                    const color = colores[modo]?.[i] || '#888';
                    
                    L.geoJSON(feature, {
                        style: {
                            color: color,
                            weight: 2,
                            fillColor: color,
                            fillOpacity: 0.15 - (i * 0.03),
                            dashArray: result.real ? null : '5, 5'
                        }
                    }).bindPopup(`
                        <strong>${modo === 'coche' ? '🚗' : modo === 'bici' ? '🚲' : '🚶'} ${modo}</strong><br>
                        ⏱️ ${min} minutos<br>
                        📐 ${result.areaKm2.toFixed(1)} km²<br>
                        ${result.real ? '✅ Datos ORS reales' : '⚠️ Simulado'}
                    `).addTo(layers.isocronas);
                }
                
                // Stagger for ORS
                if (result.real) await new Promise(r => setTimeout(r, 400));
            }
        }
        
        layers.isocronas.addTo(map);
        console.log(`🗺️ Isócronas cargadas (${modos.length} modos × ${tiempos.length} tiempos)`);
        return [];
    } catch (e) {
        console.warn('Error isócronas:', e.message);
        return [];
    }
}

export { map, layers };
