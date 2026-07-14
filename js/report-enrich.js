/**
 * PLANDEMOVILIDAD — Enriquecimiento con datos REALES
 * 
 * REGLAS:
 * 1. Solo usar datos verificados de APIs
 * 2. Si no hay dato, marcar como "N/D" (nunca inventar)
 * 3. Registrar cada fuente en el DataValidator
 * 
 * Autor: David Antizar
 */

import { cargarParadasReales, cargarEstacionesBiciReales, cargarPOIsReales } from './gtfs.js';
import { DataValidator, generarTablaParadas, generarTablaEstaciones, generarResumenCobertura } from './data-validator.js';

/**
 * Enriquecer la app con datos reales de APIs
 * REGLA: Si el dato no está disponible, NO se inventa
 * 
 * @param {Object} app - Estado de la aplicación
 * @returns {Object} App enriquecida con datos verificados
 */
export async function enrichAppWithAPIs(app) {
    const centro = app?.centro;
    const validator = new DataValidator();
    
    console.log('🌐 Iniciando enriquecimiento con datos reales...');
    
    // Verificar coordenadas
    if (!centro?.latitud || !centro?.longitud) {
        console.warn('⚠️ No hay coordenadas del centro — datos de API no disponibles');
        validator.addUnavailable('api', 'Datos de APIs', 'No hay coordenadas del centro configuradas');
        app.dataValidator = validator;
        return app;
    }
    
    const lat = parseFloat(centro.latitud);
    const lon = parseFloat(centro.longitud);
    
    if (isNaN(lat) || isNaN(lon)) {
        console.warn('⚠️ Coordenadas inválidas');
        validator.addUnavailable('api', 'Datos de APIs', 'Coordenadas del centro inválidas');
        app.dataValidator = validator;
        return app;
    }
    
    console.log(`📍 Centro: [${lat}, ${lon}]`);
    
    // 1. Cargar paradas de TP REALES (Overpass API)
    try {
        console.log('🚌 Cargando paradas de transporte público...');
        const paradas = await cargarParadasReales(lat, lon, 800);
        app.paradasReales = paradas;
        
        if (paradas.length > 0) {
            validator.addVerified('overpass', 'Paradas de transporte público', paradas.length);
            console.log(`✅ ${paradas.length} paradas reales cargadas`);
        } else {
            validator.addUnavailable('overpass', 'Paradas de transporte público', 'Overpass no retornó paradas en el radio');
            console.log('ℹ️ No se encontraron paradas de TP');
        }
    } catch (e) {
        console.error('❌ Error cargando paradas:', e.message);
        app.paradasReales = [];
        validator.addUnavailable('overpass', 'Paradas de transporte público', 'Error de conexión con Overpass API');
    }
    
    // 2. Cargar estaciones BICI REALES (GBFS)
    try {
        console.log('🚲 Cargando estaciones de bicicleta compartida...');
        const estaciones = await cargarEstacionesBiciReales(lat, lon, 1200);
        app.estacionesBiciReales = estaciones;
        
        if (estaciones.length > 0) {
            validator.addVerified('gbfs', 'Estaciones de bicicleta compartida', estaciones.length);
            console.log(`✅ ${estaciones.length} estaciones GBFS cargadas`);
        } else {
            validator.addUnavailable('gbfs', 'Estaciones de bicicleta compartida', 'Sin feed GBFS disponible para esta ciudad');
            console.log('ℹ️ No se encontraron estaciones GBFS');
        }
    } catch (e) {
        console.error('❌ Error cargando GBFS:', e.message);
        app.estacionesBiciReales = [];
        validator.addUnavailable('gbfs', 'Estaciones de bicicleta compartida', 'Error de conexión con GBFS');
    }
    
    // 3. Cargar POIs REALES (Nominatim/Overpass)
    try {
        console.log('🏙️ Cargando puntos de interés del entorno...');
        const pois = await cargarPOIsReales(lat, lon, 1000);
        app.poisReales = pois;
        
        const totalPois = Object.values(pois).flat().length;
        if (totalPois > 0) {
            validator.addVerified('nominatim', 'POIs del entorno', totalPois);
            console.log(`✅ ${totalPois} POIs cargados`);
        } else {
            validator.addUnavailable('nominatim', 'POIs del entorno', 'Overpass no retornó POIs en el radio');
        }
    } catch (e) {
        console.error('❌ Error cargando POIs:', e.message);
        app.poisReales = {};
        validator.addUnavailable('nominatim', 'POIs del entorno', 'Error de conexión');
    }
    
    // 4. Calcular resumen de cobertura
    const cobertura = generarResumenCobertura(app.paradasReales, app.estacionesBiciReales, validator);
    app.coberturaTP = cobertura;
    
    // 5. Generar HTML de tablas verificadas
    app.htmlParadas = generarTablaParadas(app.paradasReales, validator);
    app.htmlEstaciones = generarTablaEstaciones(app.estacionesBiciReales, validator);
    app.htmlCalidadDatos = validator.toHTML();
    
    // Guardar validator para el informe
    app.dataValidator = validator;
    
    const summary = validator.getSummary();
    console.log(`📊 Calidad de datos: ${summary.totalVerified} verificados, ${summary.totalUnavailable} no disponibles`);
    console.log(`📈 Puntuación de calidad: ${Math.round(summary.qualityScore * 100)}%`);
    
    return app;
}

/**
 * Enriquecer solo el mapa con datos reales
 * (Versión ligera para el mapa interactivo)
 */
export async function enrichMapData(app) {
    const centro = app?.centro;
    if (!centro?.latitud || !centro?.longitud) return app;
    
    const lat = parseFloat(centro.latitud);
    const lon = parseFloat(centro.longitud);
    
    // Solo cargar paradas y bici para el mapa
    try {
        app.paradasReales = await cargarParadasReales(lat, lon, 800);
    } catch (e) { app.paradasReales = []; }
    
    try {
        app.estacionesBiciReales = await cargarEstacionesBiciReales(lat, lon, 1200);
    } catch (e) { app.estacionesBiciReales = []; }
    
    return app;
}
