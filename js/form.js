/**
 * PLANDEMOVILIDAD — Formularios de datos (centro + empresa)
 * 
 * Gestión de formularios interactivos para recoger datos del centro
 * de trabajo y de la empresa. Validación, guardado en IndexedDB,
 * geocodificación integrada.
 * 
 * Autor: David Antizar
 */

import { CONFIG } from './config.js';
import { initMap, addMarker, setCenter, getMap } from './map.js';
import { geocodeAddress } from './geocode.js';
import { generateId, formatNum } from './utils.js';

// Estado local de los formularios
let centroData = {};
let empresaData = {};

/**
 * Inicializar todos los formularios y sus eventos
 */
export function initForms() {
    initCentroForm();
    initEmpresaForm();
    initFlotaButtons();
}

/**
 * Inicializar formulario del centro
 */
function initCentroForm() {
    const form = document.getElementById('form-centro');
    const btnGeocode = document.getElementById('btn-geocode');
    const btnUbicacion = document.getElementById('btn-ubicacion-actual');
    
    if (!form) return;
    
    // Geolocalizar dirección
    if (btnGeocode) {
        btnGeocode.addEventListener('click', async () => {
            const direccion = document.getElementById('centro-direccion')?.value;
            if (!direccion) {
                alert('Introduce una dirección primero');
                return;
            }
            
            btnGeocode.textContent = '⏳ Geolocalizando...';
            btnGeocode.disabled = true;
            
            try {
                const geo = await geocodeAddress(direccion);
                
                // Rellenar campos
                const latInput = document.getElementById('centro-lat');
                const lonInput = document.getElementById('centro-lon');
                if (latInput) latInput.value = formatNum(geo.lat, 6);
                if (lonInput) lonInput.value = formatNum(geo.lon, 6);
                
                // Actualizar mapa
                const map = getMap();
                if (map) {
                    setCenter(geo.lat, geo.lon, 16);
                    // Limpiar marcadores previos y añadir nuevo
                    const marker = addMarker(geo.lat, geo.lon, {
                        tooltip: geo.display_name,
                        icon: 'red',
                    });
                }
            } catch (err) {
                alert(`Error geocodificando: ${err.message}`);
            } finally {
                btnGeocode.textContent = '🔍 Geolocalizar';
                btnGeocode.disabled = false;
            }
        });
    }
    
    // Usar ubicación actual
    if (btnUbicacion) {
        btnUbicacion.addEventListener('click', () => {
            if (!navigator.geolocation) {
                alert('Geolocalización no soportada en este navegador');
                return;
            }
            
            btnUbicacion.textContent = '⏳ Obteniendo ubicación...';
            btnUbicacion.disabled = true;
            
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const { latitude: lat, longitude: lon } = pos.coords;
                    const latInput = document.getElementById('centro-lat');
                    const lonInput = document.getElementById('centro-lon');
                    if (latInput) latInput.value = formatNum(lat, 6);
                    if (lonInput) lonInput.value = formatNum(lon, 6);
                    
                    const map = getMap();
                    if (map) {
                        setCenter(lat, lon, 16);
                        addMarker(lat, lon, { tooltip: 'Ubicación actual', icon: 'green' });
                    }
                    
                    btnUbicacion.textContent = '📍 Mi ubicación';
                    btnUbicacion.disabled = false;
                },
                (err) => {
                    alert(`Error obteniendo ubicación: ${err.message}`);
                    btnUbicacion.textContent = '📍 Mi ubicación';
                    btnUbicacion.disabled = false;
                },
                { enableHighAccuracy: true, timeout: 10000 }
            );
        });
    }
    
    // Click en mapa para fijar coordenadas
    const mapContainer = document.getElementById('centro-map');
    if (mapContainer) {
        // Se maneja en main.js cuando el mapa está inicializado
        mapContainer.dataset.hasClickHandler = 'true';
    }
    
    // Submit del formulario
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        saveCentroData();
    });
}

/**
 * Inicializar formulario de empresa
 */
function initEmpresaForm() {
    const form = document.getElementById('form-empresa');
    if (!form) return;
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        saveEmpresaData();
    });
}

/**
 * Inicializar botones de flota (añadir/eliminar)
 */
function initFlotaButtons() {
    const btnAdd = document.getElementById('btn-add-flota');
    if (btnAdd) {
        btnAdd.addEventListener('click', () => {
            const container = document.getElementById('flota-container');
            if (!container) return;
            
            const index = container.children.length;
            const item = document.createElement('div');
            item.className = 'flota-item';
            item.dataset.index = index;
            item.innerHTML = `
                <div class="form-row">
                    <div class="form-group">
                        <input type="text" placeholder="Tipo (Ej: furgoneta)" class="flota-tipo">
                    </div>
                    <div class="form-group">
                        <input type="text" placeholder="Combustible (gasolina/diésel/eléctrico)" class="flota-combustible">
                    </div>
                    <div class="form-group">
                        <input type="number" placeholder="Nº unidades" min="1" class="flota-unidades">
                    </div>
                    <button type="button" class="btn btn-small btn-danger flota-remove" title="Eliminar">&times;</button>
                </div>
            `;
            
            container.appendChild(item);
        });
    }
    
    // Delegación de eventos para botones eliminar
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('flota-remove')) {
            const item = e.target.closest('.flota-item');
            if (item) item.remove();
        }
    });
}

/**
 * Recoger datos del formulario del centro
 * @returns {Object} Datos del centro
 */
function getCentroFormData() {
    const turns = [];
    document.querySelectorAll('input[name="turno"]:checked').forEach(cb => {
        turns.push(cb.value);
    });
    
    return {
        nombre: document.getElementById('centro-nombre')?.value?.trim() || '',
        direccion: document.getElementById('centro-direccion')?.value?.trim() || '',
        lat: parseFloat(document.getElementById('centro-lat')?.value) || null,
        lon: parseFloat(document.getElementById('centro-lon')?.value) || null,
        actividad: document.getElementById('centro-actividad')?.value?.trim() || '',
        plantilla: parseInt(document.getElementById('centro-plantilla')?.value) || 0,
        superficie: parseInt(document.getElementById('centro-superficie')?.value) || null,
        turnos: turns,
    };
}

/**
 * Recoger datos del formulario de empresa
 * @returns {Object} Datos de la empresa
 */
function getEmpresaFormData() {
    const flota = [];
    document.querySelectorAll('.flota-item').forEach(item => {
        const tipo = item.querySelector('.flota-tipo')?.value?.trim();
        const combustible = item.querySelector('.flota-combustible')?.value?.trim();
        const unidades = parseInt(item.querySelector('.flota-unidades')?.value) || 0;
        
        if (tipo && unidades > 0) {
            flota.push({ tipo, combustible, unidades });
        }
    });
    
    return {
        teletrabajoPct: parseInt(document.getElementById('emp-teletrabajo')?.value) || 0,
        diasPresencial: parseInt(document.getElementById('emp-dias-presencial')?.value) || 5,
        plazasCoche: parseInt(document.getElementById('emp-pk-coche')?.value) || 0,
        plazasBici: parseInt(document.getElementById('emp-pk-bici')?.value) || 0,
        duchas: document.getElementById('emp-duchas')?.checked || false,
        recarga: document.getElementById('emp-recarga')?.checked || false,
        ayudaTransporte: document.getElementById('emp-ayuda-transporte')?.checked || false,
        flota,
        politicaViajes: document.getElementById('emp-politica-viajes')?.value?.trim() || '',
    };
}

/**
 * Guardar datos del centro en estado global y localStorage
 */
function saveCentroData() {
    const data = getCentroFormData();
    
    if (!data.nombre || !data.direccion || !data.plantilla) {
        alert('Los campos * son obligatorios');
        return;
    }
    
    if (!data.lat || !data.lon) {
        alert('Es necesario geolocalizar el centro (clic en "Geolocalizar" o "Mi ubicación")');
        return;
    }
    
    centroData = data;
    window.appState.centro = data;
    
    // Guardar en localStorage
    localStorage.setItem('pmst_centro', JSON.stringify(data));
    
    // Mostrar feedback
    alert(`✅ Centro "${data.nombre}" guardado correctamente.\n${data.plantilla} trabajadores en ${data.turnos.length > 0 ? data.turnos.join(', ') : 'un solo turno'}.`);
}

/**
 * Guardar datos de la empresa en estado global y localStorage
 */
function saveEmpresaData() {
    const data = getEmpresaFormData();
    empresaData = data;
    window.appState.empresa = data;
    
    localStorage.setItem('pmst_empresa', JSON.stringify(data));
    
    alert('✅ Datos de empresa guardados correctamente.');
}

/**
 * Cargar datos guardados desde localStorage
 */
export function loadSavedData() {
    // Cargar centro
    const centroJson = localStorage.getItem('pmst_centro');
    if (centroJson) {
        try {
            centroData = JSON.parse(centroJson);
            window.appState.centro = centroData;
            
            // Rellenar formulario
            const setVal = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.value = val;
            };
            
            setVal('centro-nombre', centroData.nombre || '');
            setVal('centro-direccion', centroData.direccion || '');
            setVal('centro-lat', centroData.lat ? centroData.lat.toFixed(6) : '');
            setVal('centro-lon', centroData.lon ? centroData.lon.toFixed(6) : '');
            setVal('centro-actividad', centroData.actividad || '');
            setVal('centro-plantilla', centroData.plantilla || '');
            setVal('centro-superficie', centroData.superficie || '');
            
            // Marcar turnos
            if (centroData.turnos) {
                centroData.turnos.forEach(t => {
                    const cb = document.querySelector(`input[name="turno"][value="${t}"]`);
                    if (cb) cb.checked = true;
                });
            }
            
            // Centrar mapa
            if (centroData.lat && centroData.lon) {
                setCenter(centroData.lat, centroData.lon, 16);
                addMarker(centroData.lat, centroData.lon, {
                    tooltip: centroData.nombre,
                    icon: 'red',
                });
            }
        } catch (err) {
            console.error('Error cargando datos del centro:', err);
        }
    }
    
    // Cargar empresa
    const empresaJson = localStorage.getItem('pmst_empresa');
    if (empresaJson) {
        try {
            empresaData = JSON.parse(empresaJson);
            window.appState.empresa = empresaData;
            
            const setVal = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.value = val;
            };
            
            setVal('emp-teletrabajo', empresaData.teletrabajoPct || '');
            setVal('emp-dias-presencial', empresaData.diasPresencial || '');
            setVal('emp-pk-coche', empresaData.plazasCoche || '');
            setVal('emp-pk-bici', empresaData.plazasBici || '');
            
            const setChecked = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.checked = val;
            };
            
            setChecked('emp-duchas', empresaData.duchas || false);
            setChecked('emp-recarga', empresaData.recarga || false);
            setChecked('emp-ayuda-transporte', empresaData.ayudaTransporte || false);
            setVal('emp-politica-viajes', empresaData.politicaViajes || '');
            
            // Rellenar flota
            if (empresaData.flota && empresaData.flota.length > 0) {
                const container = document.getElementById('flota-container');
                if (container) {
                    container.innerHTML = ''; // Limpiar item por defecto
                    empresaData.flota.forEach((v, i) => {
                        const item = document.createElement('div');
                        item.className = 'flota-item';
                        item.dataset.index = i;
                        item.innerHTML = `
                            <div class="form-row">
                                <div class="form-group">
                                    <input type="text" value="${v.tipo || ''}" placeholder="Tipo" class="flota-tipo">
                                </div>
                                <div class="form-group">
                                    <input type="text" value="${v.combustible || ''}" placeholder="Combustible" class="flota-combustible">
                                </div>
                                <div class="form-group">
                                    <input type="number" value="${v.unidades || ''}" placeholder="Nº" min="1" class="flota-unidades">
                                </div>
                                <button type="button" class="btn btn-small btn-danger flota-remove" title="Eliminar">&times;</button>
                            </div>
                        `;
                        container.appendChild(item);
                    });
                }
            }
        } catch (err) {
            console.error('Error cargando datos de la empresa:', err);
        }
    }
}

/**
 * Obtener datos actuales del centro
 * @returns {Object}
 */
export function getCentroData() {
    return centroData;
}

/**
 * Obtener datos actuales de la empresa
 * @returns {Object}
 */
export function getEmpresaData() {
    return empresaData;
}
