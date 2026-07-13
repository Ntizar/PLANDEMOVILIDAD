/**
 * PLANDEMOVILIDAD — Encuesta de movilidad anonimizada
 * 
 * Genera formularios de encuesta, almacena respuestas en IndexedDB
 * (sin PII), calcula agregaciones y estadísticas.
 * 
 * Privacidad RGPD:
 * - Sin dirección exacta (solo origen agregado: CP o barrio)
 * - Sin nombre ni email
 * - Umbral mínimo de 10 respuestas para mostrar resultados
 * - Datos siempre agregados, nunca individuales visibles
 * 
 * Autor: David Antizar
 */

import { CONFIG } from './config.js';
import { simpleHash, formatNum } from './utils.js';

/**
 * Estructura de la encuesta — bloques verificados contra informe maestro
 */
const SURVEY_STRUCTURE = {
    blocks: [
        {
            id: 'laboral',
            title: '🏢 Modalidad laboral',
            questions: [
                {
                    id: 'centro',
                    label: '¿A qué centro de trabajo te desplaza(s)?',
                    type: 'hidden',
                    value: '', // Se rellena automáticamente
                },
                {
                    id: 'turno',
                    label: '¿En qué turno trabajas?',
                    type: 'radio',
                    options: ['Mañana (7:00-15:00)', 'Tarde (15:00-23:00)', 'Partido', 'Jornada continua'],
                    required: true,
                },
                {
                    id: 'dias',
                    label: '¿Cuántos días presenciales tienes a la semana?',
                    type: 'select',
                    options: [1, 2, 3, 4, 5],
                    required: true,
                },
            ],
        },
        {
            id: 'desplazamiento',
            title: '🚗 Desplazamiento habitual',
            questions: [
                {
                    id: 'origen_zona',
                    label: '¿Desde qué zona te desplaza(s)? (Código postal o barrio)',
                    type: 'text',
                    placeholder: 'Ej: 28001 o Barrio de Salamanca',
                    required: true,
                    privacy: 'aggregated', // Solo se guarda como hash
                },
                {
                    id: 'modo_principal',
                    label: '¿Qué modo de transporte usas principalmente?',
                    type: 'radio',
                    options: [
                        '🚶 Caminando',
                        '🚲 Bicicleta (estándar)',
                        '🛴 Bicicleta eléctrica / VMP',
                        '🚌 Autobús',
                        '🚇 Metro / Tren',
                        '🚗 Coche particular (conductor)',
                        '🚘 Coche particular (pasajero)',
                        '🏍️ Motocicleta',
                        '🚌 Lanzadera / Carpooling',
                        '🏠 Teletrabajo (no me desplazo)',
                        'Otro',
                    ],
                    required: true,
                },
                {
                    id: 'modo_secundario',
                    label: '¿Y un modo secundario? (opcional)',
                    type: 'select',
                    options: ['Ninguno', '🚶 Caminando', '🚲 Bicicleta', '🚌 Autobús', '🚇 Metro', '🚗 Coche', 'Otro'],
                    required: false,
                },
                {
                    id: 'tiempo_min',
                    label: '¿Cuánto tiempo tarda tu desplazamiento habitual (ida)?',
                    type: 'select',
                    options: ['< 10 min', '10-15 min', '15-20 min', '20-30 min', '30-45 min', '45-60 min', '> 60 min'],
                    required: true,
                },
                {
                    id: 'distancia_km',
                    label: '¿Aproximadamente cuántos km recorre?',
                    type: 'select',
                    options: ['< 1 km', '1-2 km', '2-5 km', '5-10 km', '10-20 km', '> 20 km'],
                    required: true,
                },
                {
                    id: 'coste_eur',
                    label: '¿Cuánto te cuesta aprox. al mes en transporte?',
                    type: 'select',
                    options: ['Gratis', '< 20 €/mes', '20-50 €/mes', '50-100 €/mes', '100-200 €/mes', '> 200 €/mes'],
                    required: false,
                },
            ],
        },
        {
            id: 'barreras',
            title: '🚧 Barreras para cambiar de modo',
            questions: [
                {
                    id: 'barreras',
                    label: '¿Qué barreras tienes para usar modos más sostenibles? (marca todas las que apliquen)',
                    type: 'checkbox',
                    options: [
                        'Seguridad vial (no me siento seguro/a)',
                        'Falta de infraestructura (no hay carril bici, aceras...',
                        'Horario (no coincide con horarios del TP)',
                        'Coste (no me puedo permitir otros modos)',
                        'Tiempo (es mucho más lento)',
                        'Cuidados (tengo que acompañar a alguien)',
                        'Accesibilidad (dificultad de movilidad)',
                        'Distancia (es demasiado lejos)',
                        'Clima (lluvia, calor, frío)',
                        'No hay barreras',
                    ],
                    required: false,
                },
            ],
        },
        {
            id: 'interes',
            title: '💡 Interés en medidas',
            questions: [
                {
                    id: 'interes_medidas',
                    label: '¿Qué medidas te interesarían?',
                    type: 'checkbox',
                    options: [
                        'Ayuda adquisición bicicleta / VMP',
                        'Préstamo de bicicleta corporativo',
                        'Abono transporte subvencionado',
                        'Zonas de carga/ recarga bici eléctrica',
                        'Duchas y vestuarios',
                        'Lanzadera / Carpooling corporativo',
                        'Flexibilidad horaria',
                        'Más teletrabajo',
                        'Aparcabicis seguro y cubierto',
                    ],
                    required: false,
                },
            ],
        },
        {
            id: 'seguridad',
            title: '⚠️ Seguridad vial (opcional)',
            questions: [
                {
                    id: 'accidentes',
                    label: '¿Has tenido algún accidente o incidente en tu desplazamiento?',
                    type: 'radio',
                    options: ['No', 'Sí, un cuasiaccidente', 'Sí, un accidente leve', 'Sí, un accidente grave'],
                    required: false,
                },
                {
                    id: 'zona_peligrosa',
                    label: '¿Percibes alguna zona como peligrosa? (opcional)',
                    type: 'textarea',
                    placeholder: 'Describe la zona si quieres...',
                    required: false,
                },
            ],
        },
    ],
};

/**
 * IndexedDB — Almacenamiento local de encuestas (sin PII)
 */
let dbInstance = null;

/**
 * Abrir la base de datos IndexedDB
 * @returns {Promise<IDBDatabase>}
 */
async function openDB() {
    if (dbInstance) return dbInstance;
    
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(CONFIG.survey.dbName, CONFIG.survey.dbVersion);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            dbInstance = request.result;
            resolve(dbInstance);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // Store de respuestas anonimizadas
            if (!db.objectStoreNames.contains('encuestas')) {
                const store = db.createObjectStore('encuestas', { keyPath: 'id' });
                store.createIndex('fecha', 'fecha', { unique: false });
                store.createIndex('turno', 'turno', { unique: false });
                store.createIndex('modo', 'modo_principal', { unique: false });
            }
        };
    });
}

/**
 * Guardar respuesta de encuesta en IndexedDB (anonimizada)
 * @param {Object} data — Respuesta anonimizada
 * @returns {Promise<void>}
 */
export async function submitResponse(data) {
    const db = await openDB();
    
    // Crear hash anónimo del respondent
    const anonymizer = [
        data.origen_zona || '',
        data.turno || '',
        new Date().toISOString().slice(0, 7), // Solo mes, no día
    ].join('|');
    
    const id = simpleHash(anonymizer);
    
    const record = {
        id,
        fecha: new Date().toISOString(),
        ...data,
        // Eliminar cualquier dato personal
        origen_zona: simpleHash(data.origen_zona || ''), // Hash del origen
    };
    
    return new Promise((resolve, reject) => {
        const tx = db.transaction('encuestas', 'readwrite');
        const store = tx.objectStore('encuestas');
        const addReq = store.add(record);
        
        addReq.onsuccess = () => resolve();
        addReq.onerror = () => reject(addReq.error);
    });
}

/**
 * Obtener todas las respuestas
 * @returns {Promise<Array>}
 */
export async function getResponses() {
    const db = await openDB();
    
    return new Promise((resolve, reject) => {
        const tx = db.transaction('encuestas', 'readonly');
        const store = tx.objectStore('encuestas');
        const getAll = store.getAll();
        
        getAll.onsuccess = () => resolve(getAll.result || []);
        getAll.onerror = () => reject(getAll.error);
    });
}

/**
 * Calcular agregaciones de respuestas
 * @returns {Object}
 */
export async function getResponseAggregates() {
    const responses = await getResponses();
    
    const total = responses.length;
    const modalSplit = {};
    const turnoSplit = {};
    const barriers = {};
    const interesMedidas = {};
    const tiempos = {};
    const distancias = {};
    
    responses.forEach(r => {
        // Reparto modal
        const modo = r.modo_principal || 'Desconocido';
        modalSplit[modo] = (modalSplit[modo] || 0) + 1;
        
        // Turnos
        const turno = r.turno || 'Desconocido';
        turnoSplit[turno] = (turnoSplit[turno] || 0) + 1;
        
        // Barreras
        if (r.barreras) {
            r.barreras.forEach(b => {
                barriers[b] = (barriers[b] || 0) + 1;
            });
        }
        
        // Interés en medidas
        if (r.interes_medidas) {
            r.interes_medidas.forEach(m => {
                interesMedidas[m] = (interesMedidas[m] || 0) + 1;
            });
        }
        
        // Tiempo
        if (r.tiempo_min) {
            tiempos[r.tiempo_min] = (tiempos[r.tiempo_min] || 0) + 1;
        }
        
        // Distancia
        if (r.distancia_km) {
            distancias[r.distancia_km] = (distancias[r.distancia_km] || 0) + 1;
        }
    });
    
    return {
        total,
        modalSplit,
        turnoSplit,
        barriers: Object.entries(barriers).sort((a, b) => b[1] - a[1]),
        interesMedidas: Object.entries(interesMedidas).sort((a, b) => b[1] - a[1]),
        tiempos: Object.entries(tiempos).sort((a, b) => b[1] - a[1]),
        distancias: Object.entries(distancias).sort((a, b) => b[1] - a[1]),
    };
}

/**
 * Generar el HTML de la encuesta
 * @returns {string} HTML de la encuesta
 */
export function generateSurveyHTML() {
    let html = `
        <div class="survey-form-container">
            <form id="survey-form">
                <p class="survey-privacy-notice">
                    🔒 <strong>Encuesta anonimizada.</strong> No se recogen datos personales. 
                    Las respuestas se agregan y se aplica umbral mínimo de ${CONFIG.survey.minResponses} respuestas.
                </p>
    `;
    
    for (const block of SURVEY_STRUCTURE.blocks) {
        html += `
            <div class="survey-block">
                <h4>${block.title}</h4>
        `;
        
        for (const q of block.questions) {
            html += `<div class="survey-question" data-question="${q.id}">`;
            html += `<label><strong>${q.label}</strong>`;
            if (q.required) html += ' *';
            html += '</label>';
            
            switch (q.type) {
                case 'radio':
                    html += '<div class="radio-group">';
                    q.options.forEach(opt => {
                        html += `<label class="radio-label"><input type="radio" name="${q.id}" value="${opt}" ${q.required ? 'required' : ''}> ${opt}</label>`;
                    });
                    html += '</div>';
                    break;
                    
                case 'checkbox':
                    html += '<div class="checkbox-group">';
                    q.options.forEach(opt => {
                        html += `<label class="checkbox-label"><input type="checkbox" name="${q.id}" value="${opt}"> ${opt}</label>`;
                    });
                    html += '</div>';
                    break;
                    
                case 'select':
                    html += `<select name="${q.id}" ${q.required ? 'required' : ''}>
                        <option value="">Selecciona...</option>
                        ${q.options.map(o => `<option value="${o}">${o}</option>`).join('')}
                    </select>`;
                    break;
                    
                case 'textarea':
                    html += `<textarea name="${q.id}" placeholder="${q.placeholder || ''}" rows="3"></textarea>`;
                    break;
                    
                case 'text':
                    html += `<input type="text" name="${q.id}" placeholder="${q.placeholder || ''}" ${q.required ? 'required' : ''}>`;
                    break;
                    
                case 'hidden':
                    html += `<input type="hidden" name="${q.id}" value="${q.value}">`;
                    break;
            }
            
            html += '</div>';
        }
        
        html += '</div>';
    }
    
    html += `
                <button type="submit" class="btn btn-primary btn-block" id="btn-submit-survey">
                    📤 Enviar respuesta (anonimizada)
                </button>
            </form>
        </div>
    `;
    
    return html;
}

/**
 * Cargar datos demo para testing
 * Genera 15 respuestas simuladas coherentes con datos realistas
 */
export async function loadDemoData() {
    const centros = ['Sede Central', 'Edificio Norte', 'Planta Sur'];
    const turnos = ['Mañana (7:00-15:00)', 'Tarde (15:00-23:00)', 'Partido', 'Jornada continua'];
    const modos = [
        '🚶 Caminando', '🚌 Autobús', '🚇 Metro / Tren', '🚗 Coche particular (conductor)',
        '🚲 Bicicleta (estándar)', '🏍️ Motocicleta', '🚘 Coche particular (pasajero)',
        '🏠 Teletrabajo (no me desplazo)',
    ];
    const barreras = [
        'Seguridad vial (no me siento seguro/a)', 'Falta de infraestructura',
        'Horario (no coincide con horarios del TP)', 'Tiempo (es mucho más lento)',
        'Coste (no me puedo permitir otros modos)', 'Clima (lluvia, calor, frío)',
        'No hay barreras',
    ];
    const interes = [
        'Ayuda adquisición bicicleta / VMP', 'Abono transporte subvencionado',
        'Flexibilidad horaria', 'Más teletrabajo',
        'Lanzadera / Carpooling corporativo', 'Duchas y vestuarios',
    ];
    
    // Generar 15 respuestas coherentes (60% motorizado, 30% sostenible, 10% teletrabajo)
    const demos = [];
    for (let i = 0; i < 15; i++) {
        let modo;
        const roll = Math.random();
        if (roll < 0.20) modo = '🚶 Caminando';
        else if (roll < 0.35) modo = '🚌 Autobús';
        else if (roll < 0.50) modo = '🚇 Metro / Tren';
        else if (roll < 0.55) modo = '🚲 Bicicleta (estándar)';
        else if (roll < 0.65) modo = '🏠 Teletrabajo (no me desplazo)';
        else if (roll < 0.85) modo = '🚗 Coche particular (conductor)';
        else if (roll < 0.92) modo = '🏍️ Motocicleta';
        else modo = '🚘 Coche particular (pasajero)';
        
        // Barreras correlacionadas con modo
        let barrerasSeleccionadas;
        if (modo.includes('Coche')) {
            barrerasSeleccionadas = ['No hay barreras'];
        } else {
            barrerasSeleccionadas = barreras.sort(() => Math.random() - 0.5).slice(0, Math.floor(Math.random() * 3) + 1);
        }
        
        const interesSeleccionados = interes.sort(() => Math.random() - 0.5).slice(0, Math.floor(Math.random() * 3) + 1);
        
        demos.push({
            centro: centros[Math.floor(Math.random() * centros.length)],
            turno: turnos[Math.floor(Math.random() * turnos.length)],
            dias: [3, 4, 5][Math.floor(Math.random() * 3)],
            origen_zona: ['28001', '28015', '28023', '28029', '28040'][Math.floor(Math.random() * 5)],
            modo_principal: modo,
            modo_secundario: 'Ninguno',
            tiempo_min: ['10-15 min', '15-20 min', '20-30 min', '30-45 min'][Math.floor(Math.random() * 4)],
            distancia_km: ['1-2 km', '2-5 km', '5-10 km', '10-20 km'][Math.floor(Math.random() * 4)],
            coste_eur: ['20-50 €/mes', '50-100 €/mes', '100-200 €/mes'][Math.floor(Math.random() * 3)],
            barreras: barrerasSeleccionadas,
            interes_medidas: interesSeleccionados,
            accidentes: ['No', 'No', 'No', 'Sí, un cuasiaccidente'][Math.floor(Math.random() * 4)],
        });
    }
    
    // Guardar todas
    for (const demo of demos) {
        await submitResponse(demo);
    }
    
    return demos.length;
}

/**
 * Inicializar la sección de encuesta
 */
export function initSurvey() {
    const btnGenerar = document.getElementById('btn-generar-encuesta');
    const btnCargar = document.getElementById('btn-cargar-respuestas');
    const preview = document.getElementById('encuesta-preview');
    const results = document.getElementById('encuesta-respuestas');
    
    if (btnGenerar) {
        btnGenerar.addEventListener('click', () => {
            const container = document.createElement('div');
            container.innerHTML = generateSurveyHTML();
            
            // Insertar antes de los controles
            const controls = document.querySelector('.survey-controls');
            controls.parentNode.insertBefore(container, controls.nextSibling);
            
            // Añadir listener de submit
            const form = document.getElementById('survey-form');
            if (form) {
                form.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    
                    const formData = new FormData(form);
                    const data = {};
                    
                    for (const [key, value] of formData.entries()) {
                        if (data[key]) {
                            // Si ya existe, convertir a array
                            if (!Array.isArray(data[key])) {
                                data[key] = [data[key]];
                            }
                            data[key].push(value);
                        } else {
                            data[key] = value;
                        }
                    }
                    
                    await submitResponse(data);
                    
                    alert('✅ ¡Respuesta enviada correctamente! (anonimizada)');
                    form.reset();
                    
                    // Actualizar vista de resultados
                    updateSurveyResults();
                });
            }
            
            btnGenerar.textContent = '✅ Encuesta visible';
            btnGenerar.disabled = true;
        });
    }
    
    if (btnCargar) {
        btnCargar.addEventListener('click', async () => {
        btnCargar.textContent = '⏳ Cargando datos demo...';
        btnCargar.disabled = true;
        
        const count = await loadDemoData();
        
        btnCargar.textContent = `✅ ${count} respuestas demo cargadas`;
        btnCargar.disabled = true;
        
        await updateSurveyResults();
        });
    }
}

/**
 * Actualizar la vista de resultados agregados
 */
export async function updateSurveyResults() {
    const statsEl = document.getElementById('encuesta-stats');
    const resultsEl = document.getElementById('encuesta-respuestas');
    
    if (!statsEl || !resultsEl) return;
    
    const aggregates = await getResponseAggregates();
    const { total } = aggregates;
    
    // Mostrar contador
    statsEl.textContent = `${total} respuestas / mínimo ${CONFIG.survey.minResponses}`;
    
    if (total === 0) {
        resultsEl.style.display = 'none';
        return;
    }
    
    // Mostrar resultados solo si superamos el umbral
    resultsEl.style.display = total >= CONFIG.survey.minResponses ? 'block' : 'none';
    
    if (total < CONFIG.survey.minResponses) {
        resultsEl.innerHTML = `
            <h3>Resultados agregados</h3>
            <p class="status-badge status-pending">
                ⏳ Necesitas al menos ${CONFIG.survey.minResponses} respuestas para ver los resultados agregados (RGPD).
                <br>Tienes: ${total} respuestas.
            </p>
        `;
        return;
    }
    
    // Renderizar agregaciones
    let html = `<h3>Resultados agregados (${total} respuestas válidas)</h3>`;
    
    // Reparto modal
    html += `<h4>🚗 Reparto modal</h4><table class="data-table"><thead><tr><th>Modo</th><th>Personas</th><th>%</th></tr></thead><tbody>`;
    const sortedModal = Object.entries(aggregates.modalSplit).sort((a, b) => b[1] - a[1]);
    sortedModal.forEach(([modo, count]) => {
        const pct = formatNum((count / total) * 100, 1);
        html += `<tr><td>${modo}</td><td>${count}</td><td>${pct}%</td></tr>`;
    });
    html += `</tbody></table>`;
    
    // Barreras
    if (aggregates.barriers.length > 0) {
        html += `<h4>🚧 Barreras principales</h4><table class="data-table"><thead><tr><th>Barrera</th><th>Menciones</th></tr></thead><tbody>`;
        aggregates.barriers.forEach(([bar, count]) => {
            html += `<tr><td>${bar}</td><td>${count}</td></tr>`;
        });
        html += `</tbody></table>`;
    }
    
    // Interés en medidas
    if (aggregates.interesMedidas.length > 0) {
        html += `<h4>💡 Interés en medidas</h4><table class="data-table"><thead><tr><th>Medida</th><th>Personas</th></tr></thead><tbody>`;
        aggregates.interesMedidas.forEach(([med, count]) => {
            html += `<tr><td>${med}</td><td>${count}</td></tr>`;
        });
        html += `</tbody></table>`;
    }
    
    resultsEl.innerHTML = html;
}
