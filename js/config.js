/**
 * PLANDEMOVILIDAD — Configuración centralizada
 * 
 * Todas las constantes de la aplicación se definen aquí.
 * Fuentes de datos verificadas: MITECO, OpenRouteService, Nominatim, etc.
 * 
 * Autor: David Antizar
 */

export const CONFIG = {
    // ═══════════════════════════════════════════
    // API EXTERNAS — Fuentes verificadas
    // ═══════════════════════════════════════════
    
    nominatim: {
        baseUrl: 'https://nominatim.openstreetmap.org',
        searchUrl: 'https://nominatim.openstreetmap.org/search',
        reverseUrl: 'https://nominatim.openstreetmap.org/reverse',
        userAgent: 'PLANDEMOVILIDAD/1.0',
        rateLimitMs: 1100, // 1 req/seg — ToS de Nominatim
    },
    
    openRouteService: {
        baseUrl: 'https://api.openrouteservice.org/v2',
        isochroneEndpoint: '/isochrones',
        directionsEndpoint: '/directions',
        matrixEndpoint: '/matrix',
        // Perfiles verificados: https://openrouteservice.org/dev/#/api-docs/types
        profiles: {
            pedestrian: 'foot-walking',
            cycling: 'cycling-regular',
            car: 'driving-car',
        },
        // Tiempos de isocrona (minutos) — ver informe maestro
        isochroneTimes: {
            pedestrian: [10, 15],
            cycling: [15, 25],
            publicTransport: [30, 60], // Aproximación con driving-car
        },
    },
    
    // ═══════════════════════════════════════════
    // MAPA — CARTO Light (tiles verificados)
    // ═══════════════════════════════════════════
    map: {
        tileUrl: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 18,
        defaultZoom: 16,
        // Colores de isocrona verificados
        isochroneColors: {
            pedestrian: '#2563eb',
            cycling: '#16a34a',
            publicTransport: '#f97316',
        },
        isochroneOpacity: 0.3,
    },
    
    // ═══════════════════════════════════════════
    // ENCUESTA — Umbral RGPD
    // ═══════════════════════════════════════════
    survey: {
        minResponses: 10, // Umbral mínimo para mostrar resultados agregados
        dbName: 'plandemovilidad_db',
        dbVersion: 1,
        storeNames: [
            'centro',
            'empresa',
            'encuestas',
            'diagnostico',
            'dafo',
            'medidas',
            'objetivos',
            'informe',
        ],
    },
    
    // ═══════════════════════════════════════════
    // CO2e — Factores de emisión MITECO verificados
    // Fuente: https://www.miteco.gob.es/es/cambio-climatico/temas/mitigacion-politicas-y-medidas/huella-carbono.html
    // Valores actualizados 2024-2025
    // ═══════════════════════════════════════════
    emissionFactors: {
        car_petrol: 0.171,     // kg CO2e/km/persona — gasolina
        car_diesel: 0.158,     // kg CO2e/km/persona — diésel
        car_electric: 0.053,   // kg CO2e/km/persona — eléctrico (mix eléctrico ES)
        bus: 0.063,            // kg CO2e/km/persona — autobús
        train: 0.030,          // kg CO2e/km/persona — tren/metropolitano
        motorcycle: 0.103,     // kg CO2e/km/persona — motocicleta
        airplane: 0.255,       // kg CO2e/km/persona — avión corto recorrido
        cycling: 0.0,          // kg CO2e/km/persona — bicicleta (ciclo de vida ~0.02, redondeado a 0)
        walking: 0.0,          // kg CO2e/km/persona — caminar
    },
    
    // Velocidades estimadas para cálculo de distancias (km/h)
    speeds: {
        pedestrian: 5.0,    // Andando — promedio urbano
        cycling: 15.0,      // Bicicleta — promedio urbano
        car: 30.0,          // Coche — promedio urbano
        motorcycle: 35.0,   // Motocicleta — promedio urbano
    },
    
    // ═══════════════════════════════════════════
    // IA — NaN API
    // ═══════════════════════════════════════════
    ai: {
        model: 'qwen3.6',
        endpoint: '/api/ai/generate', // Proxy en server.mjs
        temperature: 0.7,
        maxTokens: 2000,
        // Secciones del informe — 16 prompts específicos
        sections: [
            'portada',
            'resumen_ejecutivo',
            'alcance_objetivos_gobernanza',
            'marco_normativo',
            'metodologia_fuentes',
            'caracterizacion_centro',
            'diagnostico_territorial',
            'diagnostico_encuesta',
            'seguridad_vial',
            'impacto_ambiental',
            'dafo',
            'objetivos_smart',
            'plan_accion',
            'comunicacion_participacion',
            'seguimiento_evaluacion',
            'anexos',
        ],
    },
    
    // ═══════════════════════════════════════════
    // EXPORTACIÓN
    // ═══════════════════════════════════════════
    export: {
        author: 'David Antizar (Ntizar)',
        project: 'PLANDEMOVILIDAD',
        dateFormat: 'YYYY-MM-DD',
    },
    
    // ═══════════════════════════════════════════
    // COLORES — SÓLIDOS, SIN GRADIENTES
    // ═══════════════════════════════════════════
    colors: {
        primary: '#2563eb',
        primaryHover: '#1d4ed8',
        secondary: '#f97316',
        secondaryHover: '#ea580c',
        success: '#16a34a',
        danger: '#dc2626',
        warning: '#eab308',
        header: '#1a1a2e',
        border: '#e2e8f0',
        bgAlt: '#f8fafc',
    },
};
