/**
 * PLANDEMOVILIDAD v2.0 — Gestión completa de Planes de Movilidad Sostenible
 * 
 * Nueva arquitectura con módulos profesionales:
 * - Mapa interactivo con Leaflet
 * - Gráficas avanzadas con Chart.js
 * - Gestión de empleados (CRUD)
 * - Oferta de transporte público
 * - Flota corporativa
 * - Comparativas
 * - Seguimiento y evaluación
 * - Export profesional
 * 
 * Autor: David Antizar
 */

import { CONFIG } from './config.js';

// ═══════════════════════════════════════════
// ESTADO GLOBAL DE LA APLICACIÓN
// ═══════════════════════════════════════════

const APP_STATE_KEY = 'pmst_app_state_v2';

let appState = {
    centro: {},
    empresa: {},
    empleados: [],
    encuestas: [],
    diagnostico: {},
    dafo: {},
    medidas: [],
    objetivos: [],
    seguimiento: [],
    flota: [],
    transportePublico: [],
    comparativas: {},
    informe: {},
    configuracion: {
        isochroneRadius: 900,
        isochroneTime: 15,
        gtfsStopRadius: 500,
    },
};

// ═══════════════════════════════════════════
// PERSISTENCIA (IndexedDB)
// ═══════════════════════════════════════════

let db = null;

export function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('pmst_db_v2', 1);
        
        request.onupgradeneeded = (e) => {
            const database = e.target.result;
            
            // Empleados
            if (!database.objectStoreNames.contains('empleados')) {
                const store = database.createObjectStore('empleados', { keyPath: 'id' });
                store.createIndex('departamento', 'departamento', { unique: false });
                store.createIndex('centro', 'centro', { unique: false });
            }
            
            // Encuestas
            if (!database.objectStoreNames.contains('encuestas')) {
                database.createObjectStore('encuestas', { keyPath: 'id' });
            }
            
            // Flota
            if (!database.objectStoreNames.contains('flota')) {
                database.createObjectStore('flota', { keyPath: 'id' });
            }
            
            // Seguimiento
            if (!database.objectStoreNames.contains('seguimiento')) {
                const store = database.createObjectStore('seguimiento', { keyPath: 'id' });
                store.createIndex('fecha', 'fecha', { unique: false });
                store.createIndex('kpi', 'kpi', { unique: false });
            }
        };
        
        request.onsuccess = (e) => {
            db = e.target.result;
            resolve(db);
        };
        
        request.onerror = (e) => reject(e.target.error);
    });
}

export function saveToDB(storeName, data) {
    return new Promise((resolve, reject) => {
        if (!db) return reject('DB no inicializada');
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.put(data);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export function getAllFromDB(storeName) {
    return new Promise((resolve, reject) => {
        if (!db) return reject('DB no inicializada');
        const tx = db.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export function deleteFromDB(storeName, id) {
    return new Promise((resolve, reject) => {
        if (!db) return reject('DB no inicializada');
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// ═══════════════════════════════════════════
// GESTIÓN DE EMPLEADOS
// ═══════════════════════════════════════════

const DEPARTAMENTOS = [
    'Dirección General',
    'Subdirección General de Movilidad',
    'Subdirección General de Transportes',
    'Subdirección General de Infraestructuras',
    'Subdirección General de Tecnología',
    'Subdirección General de Recursos',
    'Servicio de Coordinación Técnica',
    'Servicio de Planificación',
    'Servicio de Operaciones',
    'Servicio de Administración',
    'Otro',
];

export function getDepartamentos() {
    return DEPARTAMENTOS;
}

export function addEmpleado(empleado) {
    const emp = {
        id: 'EMP-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substr(2, 4).toUpperCase(),
        nombre: empleado.nombre,
        departamento: empleado.departamento,
        centro: empleado.centro || 'Nuevos Ministerios',
        puesto: empleado.puesto || '',
        email: empleado.email || '',
        modo_principal: empleado.modo_principal || '',
        distancia_km: empleado.distancia_km || 0,
        tiempo_viaje_min: empleado.tiempo_viaje_min || 0,
        fecha_alta: new Date().toISOString().split('T')[0],
        encuesta_completada: false,
    };
    saveToDB('empleados', emp);
    appState.empleados.push(emp);
    return emp;
}

export function getEmpleados() {
    return getAllFromDB('empleados').then(emps => {
        appState.empleados = emps;
        return emps;
    });
}

export function updateEmpleado(id, datos) {
    const idx = appState.empleados.findIndex(e => e.id === id);
    if (idx >= 0) {
        appState.empleados[idx] = { ...appState.empleados[idx], ...datos };
        saveToDB('empleados', appState.empleados[idx]);
    }
    return appState.empleados[idx];
}

export function deleteEmpleado(id) {
    deleteFromDB('empleados', id);
    appState.empleados = appState.empleados.filter(e => e.id !== id);
}

export function getEmpleadosPorDepartamento() {
    const grupos = {};
    appState.empleados.forEach(emp => {
        const dept = emp.departamento || 'Sin departamento';
        if (!grupos[dept]) grupos[dept] = [];
        grupos[dept].push(emp);
    });
    return grupos;
}

export function getEstadisticasEmpleados() {
    const emps = appState.empleados;
    if (emps.length === 0) return null;
    
    const modos = {};
    emps.forEach(e => {
        const modo = e.modo_principal || 'No especificado';
        modos[modo] = (modos[modo] || 0) + 1;
    });
    
    const distancias = emps.filter(e => e.distancia_km > 0).map(e => e.distancia_km);
    const mediaDistancia = distancias.length > 0 ? distancias.reduce((a, b) => a + b, 0) / distancias.length : 0;
    
    return {
        total: emps.length,
        departamentos: Object.keys(grupos || {}).length,
        modos: modos,
        distanciaMedia: Math.round(mediaDistancia * 10) / 10,
        encuestaCompletada: emps.filter(e => e.encuesta_completada).length,
    };
}

// ═══════════════════════════════════════════
// GESTIÓN DE FLOTA CORPORATIVA
// ═══════════════════════════════════════════

export function addVehiculo(vehiculo) {
    const veh = {
        id: 'VEH-' + Date.now().toString(36).toUpperCase(),
        tipo: vehiculo.tipo || 'Coche',
        combustible: vehiculo.combustible || 'Gasolina',
        matricula: vehiculo.matricula || '',
        modelo: vehiculo.modelo || '',
        anio: vehiculo.anio || new Date().getFullYear(),
        km_anuales: vehiculo.km_anuales || 0,
        conductor_asignado: vehiculo.conductor_asignado || '',
        activo: true,
    };
    saveToDB('flota', veh);
    appState.flota.push(veh);
    return veh;
}

export function getFlota() {
    return getAllFromDB('flota').then(vehs => {
        appState.flota = vehs;
        return vehs;
    });
}

export function updateVehiculo(id, datos) {
    const idx = appState.flota.findIndex(v => v.id === id);
    if (idx >= 0) {
        appState.flota[idx] = { ...appState.flota[idx], ...datos };
        saveToDB('flota', appState.flota[idx]);
    }
    return appState.flota[idx];
}

export function deleteVehiculo(id) {
    deleteFromDB('flota', id);
    appState.flota = appState.flota.filter(v => v.id !== id);
}

export function getEstadisticasFlota() {
    const vehs = appState.flota;
    if (vehs.length === 0) return null;
    
    const combustibles = {};
    vehs.forEach(v => {
        combustibles[v.combustible] = (combustibles[v.combustible] || 0) + 1;
    });
    
    const totalKm = vehs.reduce((a, v) => a + (v.km_anuales || 0), 0);
    const factores = { 'Gasolina': 2.3, 'Diésel': 2.1, 'Eléctrico': 0, 'Híbrido': 1.2, 'GLP': 1.5 };
    let co2eTotal = 0;
    vehs.forEach(v => {
        const factor = factores[v.combustible] || 2.3;
        co2eTotal += (v.km_anuales || 0) * factor / 1000;
    });
    
    return {
        total: vehs.length,
        combustibles: combustibles,
        totalKm: totalKm,
        co2eToneladas: Math.round(co2eTotal * 10) / 10,
    };
}

// ═══════════════════════════════════════════
// OFERTA DE TRANSPORTE PÚBLICO
// ═══════════════════════════════════════════

export async function cargarTransportePublico(lat, lon, radio) {
    const radioCargar = radio || CONFIG.gtfs.stopRadius;
    const paradas = [];
    
    try {
        // Usar Nominatim para buscar paradas de transporte
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=public+transport+stop&bounded=1&viewbox=${lon-0.01},${lat+0.01},${lon+0.01},${lat-0.01}&limit=50`;
        
        const response = await fetch(url, {
            headers: { 'User-Agent': CONFIG.nominatim.userAgent },
        });
        
        if (response.ok) {
            const data = await response.json();
            data.forEach(stop => {
                const dist = calcularDistancia(lat, lon, parseFloat(stop.lat), parseFloat(stop.lon));
                if (dist <= radioCargar) {
                    paradas.push({
                        id: stop.place_id,
                        nombre: stop.display_name,
                        lat: parseFloat(stop.lat),
                        lon: parseFloat(stop.lon),
                        distancia: Math.round(dist),
                        tipo: detectarTipoParada(stop.display_name),
                    });
                }
            });
        }
    } catch (e) {
        console.warn('Error cargando transporte público:', e);
    }
    
    // Ordenar por distancia
    paradas.sort((a, b) => a.distancia - b.distancia);
    
    appState.transportePublico = paradas;
    return paradas;
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

function calcularDistancia(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getEstadisticasTransporte() {
    const paradas = appState.transportePublico;
    if (paradas.length === 0) return null;
    
    const tipos = {};
    paradas.forEach(p => {
        tipos[p.tipo] = (tipos[p.tipo] || 0) + 1;
    });
    
    const distancias = paradas.map(p => p.distancia);
    const mediaDist = distancias.reduce((a, b) => a + b, 0) / distancias.length;
    const minDist = Math.min(...distancias);
    const maxDist = Math.max(...distancias);
    
    // Cobertura: % de empleados a menos de 500m de una parada
    const cobertura500m = paradas.filter(p => p.distancia <= 500).length;
    
    return {
        totalParadas: paradas.length,
        tipos: tipos,
        distanciaMedia: Math.round(mediaDist),
        distanciaMin: minDist,
        distanciaMax: maxDist,
        cobertura500m: cobertura500m,
    };
}

// ═══════════════════════════════════════════
// SEGUIMIENTO Y EVALUACIÓN
// ═══════════════════════════════════════════

export function registrarSeguimiento(kpi, valor, nota) {
    const registro = {
        id: 'SEG-' + Date.now().toString(36).toUpperCase(),
        fecha: new Date().toISOString().split('T')[0],
        kpi: kpi,
        valor: valor,
        nota: nota || '',
    };
    saveToDB('seguimiento', registro);
    appState.seguimiento.push(registro);
    return registro;
}

export function getSeguimiento() {
    return getAllFromDB('seguimiento').then(registros => {
        appState.seguimiento = registros;
        return registros;
    });
}

export function getSeguimientoPorKPI(kpi) {
    return getSeguimiento().then(registros => {
        return registros.filter(r => r.kpi === kpi).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    });
}

export function getEstadisticasSeguimiento() {
    const registros = appState.seguimiento;
    if (registros.length === 0) return null;
    
    const kpis = {};
    registros.forEach(r => {
        if (!kpis[r.kpi]) kpis[r.kpi] = [];
        kpis[r.kpi].push({ fecha: r.fecha, valor: r.valor });
    });
    
    return kpis;
}

// ═══════════════════════════════════════════
// COMPARATIVAS NACIONALES
// ═══════════════════════════════════════════

// Datos de referencia MITECO y estudios nacionales
const DATOS_NACIONALES = {
    repartoModal: {
        coche_particular: 0.68,  // 68% coche (conductor + pasajero)
        transporte_publico: 0.15, // 15% transporte público
        bicicleta: 0.02,          // 2% bicicleta
        caminando: 0.10,          // 10% caminando
        teletrabajo: 0.05,        // 5% teletrabajo
    },
    co2eMedio: 3500,  // kg CO2e/año por trabajador en desplazamientos
    distanciaMedia: 12, // km
    teletrabajoMedia: 0.15, // 15%
    transportePublicoMedia: 0.15, // 15%
};

export function getComparativas() {
    const emps = appState.empleados;
    if (emps.length === 0) return null;
    
    // Calcular reparto modal del centro
    const modos = {};
    emps.forEach(e => {
        const modo = e.modo_principal || 'No especificado';
        modos[modo] = (modos[modo] || 0) + 1;
    });
    
    const total = emps.length;
    const ratio = {
        coche_particular: ((modos['🚗 Coche particular (conductor)'] || 0) + (modos['🚘 Coche particular (pasajero)'] || 0)) / total,
        transporte_publico: ((modos['🚌 Autobús'] || 0) + (modos['🚇 Metro / Tren'] || 0)) / total,
        bicicleta: (modos['🚲 Bicicleta (estándar)'] || 0) / total,
        caminando: (modos['🚶 Caminando'] || 0) / total,
        teletrabajo: (modos['🏠 Teletrabajo (no me desplazo)'] || 0) / total,
    };
    
    // Comparar con datos nacionales
    return {
        centro: ratio,
        nacional: DATOS_NACIONALES.repartoModal,
        diferencia: {
            coche_particular: Math.round((ratio.coche_particular - DATOS_NACIONALES.coche_particular) * 100),
            transporte_publico: Math.round((ratio.transporte_publico - DATOS_NACIONALES.transporte_publico) * 100),
            bicicleta: Math.round((ratio.bicicleta - DATOS_NACIONALES.bicicleta) * 100),
            caminando: Math.round((ratio.caminando - DATOS_NACIONALES.caminando) * 100),
            teletrabajo: Math.round((ratio.teletrabajo - DATOS_NACIONALES.teletrabajo) * 100),
        },
        co2e: {
            centro: appState.diagnostico?.co2e?.totalToneladas || 0,
            nacional: DATOS_NACIONALES.co2eMedio,
            diferencia: appState.diagnostico?.co2e?.totalToneladas ? 
                Math.round((appState.diagnostico.co2e.totalToneladas - DATOS_NACIONALES.co2eMedio) / DATOS_NACIONALES.co2eMedio * 100) : 0,
        },
        teletrabajo: {
            centro: Math.round((ratio.teletrabajo * 100)),
            nacional: Math.round(DATOS_NACIONALES.teletrabajo * 100),
            diferencia: Math.round((ratio.teletrabajo - DATOS_NACIONALES.teletrabajo) * 100),
        },
    };
}

// ═══════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════

export function initApp() {
    initDB().then(() => {
        console.log('✅ DB inicializada');
        getEmpleados();
        getFlota();
        getSeguimiento();
    });
}

// Exportar para uso en HTML
window.pmstApp = {
    initDB,
    initApp,
    addEmpleado,
    getEmpleados,
    updateEmpleado,
    deleteEmpleado,
    getDepartamentos,
    getEmpleadosPorDepartamento,
    getEstadisticasEmpleados,
    addVehiculo,
    getFlota,
    updateVehiculo,
    deleteVehiculo,
    getEstadisticasFlota,
    cargarTransportePublico,
    getEstadisticasTransporte,
    registrarSeguimiento,
    getSeguimiento,
    getSeguimientoPorKPI,
    getEstadisticasSeguimiento,
    getComparativas,
    DATOS_NACIONALES,
    get appState() { return appState; },
};
