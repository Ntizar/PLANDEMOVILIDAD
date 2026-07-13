/**
 * PLANDEMOVILIDAD — Mapa con Leaflet (Canvas renderer)
 * 
 * Inicializa el mapa, gestiona marcadores, capas de isocronas
 * y captura del mapa para export PDF.
 * 
 * Fuentes: CARTO Light tiles, Leaflet 2.x con Canvas renderer
 * 
 * Autor: David Antizar
 */

import { CONFIG } from './config.js';

// Instancia global del mapa
let mapInstance = null;

/**
 * Inicializar el mapa Leaflet con Canvas renderer
 * @param {string} containerId — ID del contenedor DOM
 * @param {number} lat — Latitud inicial
 * @param {number} lon — Longitud inicial
 * @param {number} zoom — Zoom inicial (default: 16)
 * @returns {L.Map} Instancia del mapa
 */
export function initMap(containerId, lat = 40.4168, lon = -3.7038, zoom = 16) {
    // Si ya existe un mapa, destruirlo antes de crear uno nuevo
    if (mapInstance) {
        mapInstance.remove();
        mapInstance = null;
    }
    
    // Crear mapa con Canvas renderer (mejor rendimiento para isocronas)
    mapInstance = L.map(containerId, {
        renderer: L.canvas({ padding: 0.5 }),
        zoomControl: true,
    });
    
    // Capa base CARTO Light (positron) — tiles verificados
    L.tileLayer(CONFIG.map.tileUrl, {
        attribution: CONFIG.map.attribution,
        maxZoom: CONFIG.map.maxZoom,
    }).addTo(mapInstance);
    
    // Centrar mapa
    mapInstance.setView([lat, lon], zoom);
    
    return mapInstance;
}

/**
 * Obtener la instancia actual del mapa
 * @returns {L.Map|null}
 */
export function getMap() {
    return mapInstance;
}

/**
 * Centrar el mapa en coordenadas
 * @param {number} lat — Latitud
 * @param {number} lon — Longitud
 * @param {number} zoom — Zoom (default: 16)
 */
export function setCenter(lat, lon, zoom = 16) {
    if (!mapInstance) return;
    mapInstance.setView([lat, lon], zoom);
}

/**
 * Añadir marcador al mapa
 * @param {number} lat — Latitud
 * @param {number} lon — Longitud
 * @param {Object} options — Opciones del marcador
 * @param {string} options.tooltip — Texto del tooltip
 * @param {string} options.icon — Tipo de icono ('default', 'red', 'green')
 * @returns {L.Marker}
 */
export function addMarker(lat, lon, options = {}) {
    if (!mapInstance) return null;
    
    const { tooltip = '', icon = 'default' } = options;
    
    // Icono personalizado según tipo
    let iconUrl;
    let iconSize;
    
    switch (icon) {
        case 'red':
            iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png';
            iconSize = [25, 41];
            break;
        case 'green':
            iconUrl = 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png';
            iconSize = [25, 41];
            break;
        default:
            iconUrl = 'https://unpkg.com/leaflet@2.0.0/dist/images/marker-icon.png';
            iconSize = [25, 41];
    }
    
    const marker = L.marker([lat, lon], {
        icon: L.icon({
            iconUrl,
            iconSize,
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
        }),
    }).addTo(mapInstance);
    
    if (tooltip) {
        marker.bindTooltip(tooltip, { sticky: false });
    }
    
    return marker;
}

/**
 * Añadir capa de isocrona (GeoJSON) al mapa
 * @param {Object} geojson — GeoJSON FeatureCollection
 * @param {string} color — Color CSS (default: #2563eb)
 * @param {number} opacity — Opacidad (0-1, default: 0.3)
 * @returns {L.Layer}
 */
export function addIsochrone(geojson, color = '#2563eb', opacity = 0.3) {
    if (!mapInstance || !geojson) return null;
    
    const layer = L.geoJSON(geojson, {
        style: {
            color: color,
            weight: 2,
            fillColor: color,
            fillOpacity: opacity,
            dashArray: geojson.features?.[0]?.properties?.simulado ? '5, 5' : undefined,
        },
    }).addTo(mapInstance);
    
    return layer;
}

/**
 * Añadir paradas de transporte público al mapa
 * @param {Array<Object>} stops — Array de paradas {name, lat, lon, lines[]}
 */
export function addTransitStops(stops) {
    if (!mapInstance || !stops) return;
    
    stops.forEach(stop => {
        const marker = L.circleMarker([stop.lat, stop.lon], {
            radius: 5,
            color: '#f97316',
            fillColor: '#f97316',
            fillOpacity: 0.8,
            weight: 1,
        }).addTo(mapInstance);
        
        marker.bindTooltip(
            `<strong>${stop.name}</strong><br>${(stop.lines || []).join(', ')}`,
            { direction: 'top', offset: [0, -5] }
        );
    });
}

/**
 * Limpiar todas las capas superpuestas (isocronas, marcadores temporales)
 * Mantiene la capa base de tiles.
 */
export function clearOverlays() {
    if (!mapInstance) return;
    
    // Eliminar todas las capas excepto los tiles base
    mapInstance.eachLayer(layer => {
        if (layer instanceof L.TileLayer) return; // Mantener tiles
        if (layer instanceof L.GeoJSON) {
            mapInstance.removeLayer(layer);
        } else if (layer instanceof L.Marker || layer instanceof L.CircleMarker) {
            // Solo eliminar marcadores no permanentes
            // (en producción, marcar marcadores permanentes con una propiedad)
            mapInstance.removeLayer(layer);
        }
    });
}

/**
 * Capturar el mapa como imagen para PDF
 * Usa html2canvas para capturar el contenedor del mapa
 * @param {number} width — Ancho deseado (default: 800)
 * @param {number} height — Alto deseado (default: 600)
 * @returns {Promise<string>} DataURL de la imagen
 */
export async function captureMapForPDF(width = 800, height = 600) {
    if (!mapInstance) return null;
    
    // Esperar a que los tiles se rendericen
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // html2canvas es cargado globalmente por el script UMD
    if (typeof html2canvas === 'undefined') {
        console.warn('html2canvas no disponible — captura de mapa omitida');
        return null;
    }
    
    const container = document.getElementById('centro-map');
    if (!container) return null;
    
    try {
        const canvas = await html2canvas(container, {
            useCORS: true, // Necesario para tiles CARTO
            scale: 2, // Alta resolución
            backgroundColor: '#ffffff',
        });
        
        return canvas.toDataURL('image/png');
    } catch (err) {
        console.error('Error capturando mapa:', err);
        return null;
    }
}

/**
 * Añadir marcador de ubicación actual del usuario
 */
export function addUserLocationMarker() {
    if (!navigator.geolocation) {
        console.warn('Geolocalización no soportada');
        return;
    }
    
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const { latitude: lat, longitude: lon } = pos.coords;
            addMarker(lat, lon, {
                tooltip: 'Tu ubicación',
                icon: 'green',
            });
            setCenter(lat, lon, 16);
        },
        (err) => {
            console.warn('Error obteniendo ubicación:', err.message);
        },
        { enableHighAccuracy: true, timeout: 10000 }
    );
}
