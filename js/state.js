/**
 * PLANDEMOVILIDAD — Estado centralizado + persistencia multi-empresa
 * 
 * Gestiona el estado global de la aplicación, con persistencia en IndexedDB
 * para soportar múltiples empresas y datos de encuestas importados.
 * 
 * Autor: David Antizar
 * Hecho con ❤️ por David Antizar
 */

// ═══════════════════════════════════════════
// ESTADO CENTRAL
// ═══════════════════════════════════════════

const DB_NAME = 'pmst_db_v3';
const DB_VERSION = 2;

let db = null;
let empresaActiva = null;

// Estado por defecto de una empresa nueva
function crearEstadoEmpresaDefault() {
    return {
        id: crypto.randomUUID(),
        fechaCreacion: new Date().toISOString(),
        fechaModificacion: new Date().toISOString(),
        
        // Datos del centro
        centro: {
            nombre: '',
            direccion: '',
            lat: null,
            lon: null,
            municipio: '',
            provincia: '',
            comunidadAutonoma: '',
            plantilla: 0,
            turnos: { manana: 0, tarde: 0, partido: 0 },
        },
        
        // Datos de la empresa
        empresa: {
            nombre: '',
            cif: '',
            sector: '',
            cnae: '',
            tamanyo: '', // micro, pequena, mediana, grande
        },
        
        // Empleados (array de objetos)
        empleados: [],
        
        // Resultados de encuesta (importados desde CSV)
        encuesta: {
            fechaRecogida: null,
            totalEncuestados: 0,
            tasaRespuesta: 0,
            respuestas: [], // Array de respuestas individuales
            agregados: {
                repartoModal: {},
                distribucionDistancias: {},
                distribucionTiempos: {},
                porDepto: {},
            },
        },
        
        // Diagnóstico calculado
        diagnostico: {
            repartoModal: [],
            co2e: {},
            comparativas: {},
            nivelSostenibilidad: '',
        },
        
        // DAFO
        dafo: {
            fortalezas: [],
            debilidades: [],
            oportunidades: [],
            amenazas: [],
        },
        
        // Medidas propuestas
        medidas: [],
        
        // Objetivos SMART
        objetivos: [],
        
        // Flota corporativa
        flota: [],
        
        // Transporte público cercano (cargado desde APIs)
        transportePublico: {
            paradas: [], // Datos NAP DGT
            gbfs: [],    // Estaciones bici GBFS
            isocronas: [], // Isochronas ORS
        },
        
        // KPIs multi-año
        kpiMatrix: {
            years: [],
            data: {}, // { '2024': { kpi1: val, ... }, '2025': { ... } }
        },
        
        // Seguimiento anual
        seguimiento: [],
        
        // Configuración
        configuracion: {
            isochroneRadius: 900,
            isochroneTime: 15,
            gtfsStopRadius: 500,
            gbfsRadius: 2000,
        },
    };
}

// ═══════════════════════════════════════════
// IndexedDB
// ═══════════════════════════════════════════

function openDB() {
    return new Promise((resolve, reject) => {
        if (db) return resolve(db);
        
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onupgradeneeded = (e) => {
            const database = e.target.result;
            
            // Store de empresas (catálogo)
            if (!database.objectStoreNames.contains('empresas')) {
                const store = database.createObjectStore('empresas', { keyPath: 'id' });
                store.createIndex('nombre', 'nombre', { unique: false });
                store.createIndex('fechaCreacion', 'fechaCreacion', { unique: false });
            }
            
            // Store de datos completos por empresa
            if (!database.objectStoreNames.contains('datosEmpresa')) {
                const store = database.createObjectStore('datosEmpresa', { keyPath: 'empresaId' });
            }
            
            // Store de respuestas de encuesta (raw)
            if (!database.objectStoreNames.contains('respuestas')) {
                const store = database.createObjectStore('respuestas', { keyPath: 'id' });
                store.createIndex('empresaId', 'empresaId', { unique: false });
            }
        };
        
        request.onsuccess = (e) => {
            db = e.target.result;
            resolve(db);
        };
        
        request.onerror = (e) => reject(e.target.error);
    });
}

async function dbPut(storeName, data) {
    const database = await openDB();
    return new Promise((resolve, reject) => {
        const tx = database.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.put(data);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function dbGet(storeName, key) {
    const database = await openDB();
    return new Promise((resolve, reject) => {
        const tx = database.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function dbGetAll(storeName) {
    const database = await openDB();
    return new Promise((resolve, reject) => {
        const tx = database.transaction(storeName, 'readonly');
        const store = tx.objectStore(storeName);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function dbDelete(storeName, key) {
    const database = await openDB();
    return new Promise((resolve, reject) => {
        const tx = database.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.delete(key);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

async function dbClear(storeName) {
    const database = await openDB();
    return new Promise((resolve, reject) => {
        const tx = database.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// ═══════════════════════════════════════════
// GESTIÓN DE EMPRESAS
// ═══════════════════════════════════════════

/**
 * Inicializar el sistema de estado
 */
export async function initState() {
    await openDB();
    
    // Cargar empresa activa (la última usada)
    const empresas = await dbGetAll('empresas');
    
    if (empresas.length === 0) {
        // Crear empresa por defecto
        const defaultEmpresa = crearEstadoEmpresaDefault();
        defaultEmpresa.nombre = 'Mi Empresa';
        defaultEmpresa.centro.nombre = 'Centro Principal';
        
        await dbPut('empresas', { 
            id: defaultEmpresa.id, 
            nombre: defaultEmpresa.nombre, 
            fechaCreacion: defaultEmpresa.fechaCreacion 
        });
        await dbPut('datosEmpresa', { 
            empresaId: defaultEmpresa.id, 
            datos: defaultEmpresa 
        });
        
        empresaActiva = defaultEmpresa;
    } else {
        // Cargar la última empresa usada (la más reciente)
        empresas.sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion));
        empresaActiva = await cargarDatosEmpresa(empresas[0].id);
    }
    
    return empresaActiva;
}

/**
 * Cargar datos completos de una empresa
 */
export async function cargarDatosEmpresa(empresaId) {
    const datos = await dbGet('datosEmpresa', empresaId);
    if (datos) {
        return datos.datos;
    }
    return null;
}

/**
 * Guardar datos de la empresa activa
 */
export async function guardarEmpresaActiva() {
    if (!empresaActiva) return;
    
    empresaActiva.fechaModificacion = new Date().toISOString();
    
    // Guardar catálogo
    await dbPut('empresas', {
        id: empresaActiva.id,
        nombre: empresaActiva.empresa?.nombre || empresaActiva.centro?.nombre || 'Sin nombre',
        fechaCreacion: empresaActiva.fechaCreacion,
        fechaModificacion: empresaActiva.fechaModificacion,
    });
    
    // Guardar datos completos
    await dbPut('datosEmpresa', {
        empresaId: empresaActiva.id,
        datos: empresaActiva,
    });
}

/**
 * Crear nueva empresa
 */
export async function crearEmpresa(nombre) {
    const nueva = crearEstadoEmpresaDefault();
    nueva.empresa.nombre = nombre;
    nueva.centro.nombre = nombre;
    
    await dbPut('empresas', { 
        id: nueva.id, 
        nombre, 
        fechaCreacion: nueva.fechaCreacion 
    });
    await dbPut('datosEmpresa', { 
        empresaId: nueva.id, 
        datos: nueva 
    });
    
    return nueva;
}

/**
 * Listar todas las empresas
 */
export async function listarEmpresas() {
    return await dbGetAll('empresas');
}

/**
 * Cambiar de empresa activa
 */
export async function cambiarEmpresa(empresaId) {
    // Guardar la actual primero
    if (empresaActiva) {
        await guardarEmpresaActiva();
    }
    
    // Cargar la nueva
    empresaActiva = await cargarDatosEmpresa(empresaId);
    return empresaActiva;
}

/**
 * Eliminar una empresa
 */
export async function eliminarEmpresa(empresaId) {
    await dbDelete('empresas', empresaId);
    await dbDelete('datosEmpresa', empresaId);
    
    // Si era la activa, cargar otra
    if (empresaActiva?.id === empresaId) {
        const empresas = await listarEmpresas();
        if (empresas.length > 0) {
            empresaActiva = await cargarDatosEmpresa(empresas[0].id);
        } else {
            empresaActiva = await crearEmpresa('Mi Empresa');
        }
    }
}

// ═══════════════════════════════════════════
// ACCESO A DATOS
// ═══════════════════════════════════════════

/**
 * Obtener la empresa activa (lectura)
 */
export function getEmpresaActiva() {
    return empresaActiva;
}

/**
 * Actualizar un campo de la empresa activa
 */
export function actualizarCampo(ruta, valor) {
    if (!empresaActiva) return;
    
    const partes = ruta.split('.');
    let obj = empresaActiva;
    for (let i = 0; i < partes.length - 1; i++) {
        if (!obj[partes[i]]) obj[partes[i]] = {};
        obj = obj[partes[i]];
    }
    obj[partes[partes.length - 1]] = valor;
    
    empresaActiva.fechaModificacion = new Date().toISOString();
}

/**
 * Obtener valor por ruta
 */
export function obtenerCampo(ruta) {
    if (!empresaActiva) return undefined;
    
    const partes = ruta.split('.');
    let obj = empresaActiva;
    for (const parte of partes) {
        if (obj === undefined || obj === null) return undefined;
        obj = obj[parte];
    }
    return obj;
}

/**
 * Agregar empleado a la empresa activa
 */
export function agregarEmpleado(datos) {
    if (!empresaActiva) return null;
    
    const empleado = {
        id: crypto.randomUUID(),
        fechaCreacion: new Date().toISOString(),
        ...datos,
    };
    
    empresaActiva.empleados.push(empleado);
    empresaActiva.fechaModificacion = new Date().toISOString();
    
    return empleado;
}

/**
 * Obtener todos los empleados
 */
export function getEmpleados() {
    return empresaActiva?.empleados || [];
}

/**
 * Actualizar un empleado
 */
export function actualizarEmpleado(id, datos) {
    if (!empresaActiva) return null;
    
    const idx = empresaActiva.empleados.findIndex(e => e.id === id);
    if (idx === -1) return null;
    
    empresaActiva.empleados[idx] = { ...empresaActiva.empleados[idx], ...datos };
    empresaActiva.fechaModificacion = new Date().toISOString();
    
    return empresaActiva.empleados[idx];
}

/**
 * Eliminar un empleado
 */
export function eliminarEmpleado(id) {
    if (!empresaActiva) return;
    
    empresaActiva.empleados = empresaActiva.empleados.filter(e => e.id !== id);
    empresaActiva.fechaModificacion = new Date().toISOString();
}

// ═══════════════════════════════════════════
// ENCUESTA (importación CSV)
// ═══════════════════════════════════════════

/**
 * Importar respuestas de encuesta desde CSV parseado
 * @param {Array} respuestas - Array de objetos con los datos
 * @param {string} modo - 'reemplazar' o 'fusionar'
 */
export function importarEncuesta(respuestas, modo = 'reemplazar') {
    if (!empresaActiva) return;
    
    if (modo === 'reemplazar') {
        empresaActiva.encuesta.respuestas = respuestas;
    } else {
        empresaActiva.encuesta.respuestas = [
            ...empresaActiva.encuesta.respuestas,
            ...respuestas,
        ];
    }
    
    empresaActiva.encuesta.totalEncuestados = empresaActiva.encuesta.respuestas.length;
    empresaActiva.encuesta.fechaRecogida = new Date().toISOString();
    
    // Recalcular agregados
    empresaActiva.encuesta.agregados = calcularAgregados(empresaActiva.encuesta.respuestas);
    
    empresaActiva.fechaModificacion = new Date().toISOString();
    
    return empresaActiva.encuesta;
}

/**
 * Calcular estadísticas agregadas desde respuestas individuales
 */
function calcularAgregados(respuestas) {
    if (!respuestas || respuestas.length === 0) {
        return {
            repartoModal: {},
            distribucionDistancias: {},
            distribucionTiempos: {},
            porDepto: {},
        };
    }
    
    // Reparto modal
    const repartoModal = {};
    respuestas.forEach(r => {
        const modo = r.modo_principal || r.modo || 'desconocido';
        repartoModal[modo] = (repartoModal[modo] || 0) + 1;
    });
    
    // Distribución distancias
    const distribucionDistancias = {
        '0-3 km': 0, '3-7 km': 0, '7-15 km': 0, '15-30 km': 0, '30+ km': 0,
    };
    respuestas.forEach(r => {
        const d = parseFloat(r.distancia_km || r.distancia || 0);
        if (d <= 3) distribucionDistancias['0-3 km']++;
        else if (d <= 7) distribucionDistancias['3-7 km']++;
        else if (d <= 15) distribucionDistancias['7-15 km']++;
        else if (d <= 30) distribucionDistancias['15-30 km']++;
        else distribucionDistancias['30+ km']++;
    });
    
    // Distribución tiempos
    const distribucionTiempos = {
        '0-15 min': 0, '15-30 min': 0, '30-45 min': 0, '45-60 min': 0, '60+ min': 0,
    };
    respuestas.forEach(r => {
        const t = parseFloat(r.tiempo_viaje_min || r.tiempo || 0);
        if (t <= 15) distribucionTiempos['0-15 min']++;
        else if (t <= 30) distribucionTiempos['15-30 min']++;
        else if (t <= 45) distribucionTiempos['30-45 min']++;
        else if (t <= 60) distribucionTiempos['45-60 min']++;
        else distribucionTiempos['60+ min']++;
    });
    
    // Por departamento
    const porDepto = {};
    respuestas.forEach(r => {
        const dept = r.departamento || 'Sin departamento';
        if (!porDepto[dept]) {
            porDepto[dept] = { total: 0, modos: {}, distanciaMedia: 0, tiempoMedio: 0 };
        }
        porDepto[dept].total++;
        const modo = r.modo_principal || r.modo || 'desconocido';
        porDepto[dept].modos[modo] = (porDepto[dept].modos[modo] || 0) + 1;
    });
    
    // Calcular medias por depto
    Object.keys(porDepto).forEach(dept => {
        const respsDept = respuestas.filter(r => (r.departamento || 'Sin departamento') === dept);
        const distTotal = respsDept.reduce((sum, r) => sum + parseFloat(r.distancia_km || r.distancia || 0), 0);
        const tiempoTotal = respsDept.reduce((sum, r) => sum + parseFloat(r.tiempo_viaje_min || r.tiempo || 0), 0);
        porDepto[dept].distanciaMedia = respsDept.length > 0 ? (distTotal / respsDept.length).toFixed(1) : 0;
        porDepto[dept].tiempoMedio = respsDept.length > 0 ? (tiempoTotal / respsDept.length).toFixed(0) : 0;
    });
    
    return {
        repartoModal,
        distribucionDistancias,
        distribucionTiempos,
        porDepto,
    };
}

/**
 * Obtener la encuesta de la empresa activa
 */
export function getEncuesta() {
    return empresaActiva?.encuesta || { respuestas: [], agregados: {} };
}

// ═══════════════════════════════════════════
// KPIs MULTI-AÑO
// ═══════════════════════════════════════════

/**
 * Guardar datos de KPIs para un año
 */
export function guardarKpiAnio(anio, datos) {
    if (!empresaActiva) return;
    
    if (!empresaActiva.kpiMatrix.years.includes(anio)) {
        empresaActiva.kpiMatrix.years.push(anio);
        empresaActiva.kpiMatrix.years.sort();
    }
    
    empresaActiva.kpiMatrix.data[anio] = datos;
    empresaActiva.fechaModificacion = new Date().toISOString();
}

/**
 * Obtener datos de KPIs para todos los años
 */
export function getKpiMatrix() {
    return empresaActiva?.kpiMatrix || { years: [], data: {} };
}

// ═══════════════════════════════════════════
// FLORA CORPORATIVA
// ═══════════════════════════════════════════

/**
 * Agregar vehículo a la flota
 */
export function agregarVehiculo(datos) {
    if (!empresaActiva) return null;
    
    const vehiculo = {
        id: crypto.randomUUID(),
        fechaCreacion: new Date().toISOString(),
        ...datos,
    };
    
    empresaActiva.flota.push(vehiculo);
    empresaActiva.fechaModificacion = new Date().toISOString();
    
    return vehiculo;
}

/**
 * Obtener flota completa
 */
export function getFlota() {
    return empresaActiva?.flota || [];
}

// ═══════════════════════════════════════════
// TRANSPORTE PÚBLICO (APIs externas)
// ═══════════════════════════════════════════

/**
 * Guardar datos de transporte público cargados desde APIs
 */
export function guardarTransportePublico(tipo, datos) {
    if (!empresaActiva) return;
    
    if (tipo === 'paradas') {
        empresaActiva.transportePublico.paradas = datos;
    } else if (tipo === 'gbfs') {
        empresaActiva.transportePublico.gbfs = datos;
    } else if (tipo === 'isocronas') {
        empresaActiva.transportePublico.isocronas = datos;
    }
    
    empresaActiva.fechaModificacion = new Date().toISOString();
}

/**
 * Obtener datos de transporte público
 */
export function getTransportePublico(tipo) {
    if (!empresaActiva) return [];
    return empresaActiva.transportePublico[tipo] || [];
}

// ═══════════════════════════════════════════
// EXPORTAR A window.pmstApp (compatibilidad)
// ═══════════════════════════════════════════

/**
 * Exportar funciones al namespace global para compatibilidad
 * con módulos existentes que usan window.pmstApp
 */
export function exportToGlobal() {
    if (typeof window === 'undefined') return;
    
    if (!window.pmstApp) window.pmstApp = {};
    
    // Gestión de empresas
    window.pmstApp.crearEmpresa = crearEmpresa;
    window.pmstApp.listarEmpresas = listarEmpresas;
    window.pmstApp.cambiarEmpresa = cambiarEmpresa;
    window.pmstApp.eliminarEmpresa = eliminarEmpresa;
    window.pmstApp.getEmpresaActiva = getEmpresaActiva;
    window.pmstApp.guardarEmpresaActiva = guardarEmpresaActiva;
    
    // Datos
    window.pmstApp.actualizarCampo = actualizarCampo;
    window.pmstApp.obtenerCampo = obtenerCampo;
    
    // Empleados
    window.pmstApp.agregarEmpleadoV2 = agregarEmpleado;
    window.pmstApp.getEmpleadosV2 = getEmpleados;
    window.pmstApp.actualizarEmpleado = actualizarEmpleado;
    window.pmstApp.eliminarEmpleado = eliminarEmpleado;
    
    // Encuesta
    window.pmstApp.importarEncuesta = importarEncuesta;
    window.pmstApp.getEncuesta = getEncuesta;
    
    // KPIs
    window.pmstApp.guardarKpiAnio = guardarKpiAnio;
    window.pmstApp.getKpiMatrix = getKpiMatrix;
    
    // Flota
    window.pmstApp.agregarVehiculo = agregarVehiculo;
    window.pmstApp.getFlota = getFlota;
    
    // Transporte público
    window.pmstApp.guardarTransportePublico = guardarTransportePublico;
    window.pmstApp.getTransportePublico = getTransportePublico;
}
