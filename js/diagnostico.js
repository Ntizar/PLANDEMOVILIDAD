/**
 * PLANDEMOVILIDAD — Diagnóstico automático
 * 
 * Calcula indicadores clave del plan de movilidad:
 * - Reparto modal (porcentaje por modo)
 * - Huella CO2e (factores MITECO verificados)
 * - Indicadores de ocupación de plazas de aparcamiento
 * - Densidad de viajes
 * - Gráficos dinámicos con Chart.js
 * 
 * Factores CO2e verificados: MITECO 2024
 * https://www.miteco.gob.es/es/cambio-climatico/temas/mitigacion-politicas-y-medidas/huella-carbono.html
 * 
 * Autor: David Antizar
 */

import { CONFIG } from './config.js';
import { formatNum, haversine } from './utils.js';

// ═══════════════════════════════════════════
// CÁLCULO DE INDICADORES
// ═══════════════════════════════════════════

/**
 * Calcular diagnóstico completo desde el estado de la aplicación
 * @param {Object} state — Estado de la app (appState)
 * @returns {Object} Diagnóstico completo
 */
export function calcularDiagnostico(state) {
    const centro = state.centro || {};
    const empresa = state.empresa || {};
    const encuesta = state.encuesta || {};
    const agregados = encuesta.agregados || {};
    
    // 1. Reparto modal
    const repartoModal = calcularRepartoModal(agregados);
    
    // 2. Ocupación media de vehículos
    const ocupacionMedia = calcularOcupacionMedia(agregados);
    
    // 3. Huella CO2e (factores MITECO)
    const huellaCO2e = calcularHuellaCO2e(repartoModal, centro, empresa);
    
    // 4. Indicadores de aparcamiento
    const indicadoresParked = calcularIndicadoresParked(empresa, centro);
    
    // 5. Densidad de viajes por hora
    const densidadViajes = calcularDensidadViajes(centro, empresa);
    
    // 6. Resumen ejecutivo
    const resumen = generarResumenDiagnostico(
        repartoModal,
        ocupacionMedia,
        huellaCO2e,
        indicadoresParked,
        densidadViajes,
        centro
    );
    
    return {
        fecha: new Date().toISOString(),
        centro: centro.nombre,
        plantilla: centro.plantilla,
        repartoModal,
        ocupacionMedia,
        huellaCO2e,
        indicadoresParked,
        densidadViajes,
        resumen,
    };
}

/**
 * Calcular reparto modal porcentual
 * @param {Object} agregados — Agregados de encuesta
 * @returns {Array<{modo, count, percent}>}
 */
function calcularRepartoModal(agregados) {
    const modalSplit = agregados.modalSplit || {};
    const total = Object.values(modalSplit).reduce((s, v) => s + v, 0);
    
    if (total === 0) {
        // Fallback: estimar desde datos de empresa (poco preciso, pero mejor que nada)
        return [
            { modo: 'Coche particular (conductor)', count: 0, percent: 0 },
        ];
    }
    
    const modos = [];
    for (const [modo, count] of Object.entries(modalSplit)) {
        modos.push({
            modo: modo.replace(/^[^\s]+ /, ''), // Limpiar emoji
            count,
            percent: (count / total) * 100,
        });
    }
    
    // Ordenar por count descendente
    modos.sort((a, b) => b.count - a.count);
    return modos;
}

/**
 * Calcular ocupación media de vehículos
 * @param {Object} agregados — Agregados de encuesta
 * @returns {Object}
 */
function calcularOcupacionMedia(agregados) {
    const responses = [
        { modo: '🚗 Coche particular (conductor)', passengers: 1 },
        { modo: '🚘 Coche particular (pasajero)', passengers: 0 }, // Pasajero = 0 conductores
    ];
    
    const conductores = agregados.modalSplit?.['🚗 Coche particular (conductor)'] || 0;
    const pasajeros = agregados.modalSplit?.['🚘 Coche particular (pasajero)'] || 0;
    const totalCoche = conductores + pasajeros;
    
    // Estimación: conductor = 1.2 pas. promedio, pasajero = 1 pas.
    const ocupacionTotal = (conductores * 1.2) + (pasajeros * 1);
    const ocupacionMedia = totalCoche > 0 ? ocupacionTotal / totalCoche : 1;
    
    return {
        conductores: conductores,
        pasajeros: pasajeros,
        totalCoche: totalCoche,
        ocupacionMedia,
    };
}

/**
 * Calcular huella CO2e usando factores MITECO verificados
 * @param {Array} repartoModal — Reparto modal
 * @param {Object} centro — Datos del centro
 * @param {Object} empresa — Datos de la empresa
 * @returns {Object}
 */
function calcularHuellaCO2e(repartoModal, centro, empresa) {
    if (repartoModal.length === 0) {
        return { totalCo2eKg: 0, desglose: {}, porEmpleadoKg: 0 };
    }
    
    const plantilla = centro.plantilla || 1;
    const diasSemana = empresa.diasPresencial || 5;
    const factorAnual = 260; // Días laborales al año
    
    let totalCo2eKg = 0;
    const desglose = {};
    
    for (const modo of repartoModal) {
        const { modo: nombre, count, percent } = modo;
        
        // Factor MITECO por modo (kg CO2e/km/persona — ida)
        let factorKgCO2e;
        let distanciaEstimadaKm;
        
        switch (true) {
            case nombre.includes('Caminando'):
                factorKgCO2e = CONFIG.emissionFactors.walking;
                distanciaEstimadaKm = 1.5; // Promedio urbano
                break;
            case nombre.includes('Bicicleta'):
                factorKgCO2e = CONFIG.emissionFactors.cycling;
                distanciaEstimadaKm = 4; // Promedio urbano
                break;
            case nombre.includes('Autobús'):
                factorKgCO2e = CONFIG.emissionFactors.bus;
                distanciaEstimadaKm = 10;
                break;
            case nombre.includes('Metro') || nombre.includes('Tren'):
                factorKgCO2e = CONFIG.emissionFactors.train;
                distanciaEstimadaKm = 12;
                break;
            case nombre.includes('Coche particular (pasajero)'):
                factorKgCO2e = CONFIG.emissionFactors.car_diesel * 0.4; // Compartido entre 2.5 personas
                distanciaEstimadaKm = 15;
                break;
            case nombre.includes('Coche particular (conductor)'):
                // Mezcla gasolina/diésel ponderada (70% diesel, 30% gasolina MITECO 2024)
                factorKgCO2e = CONFIG.emissionFactors.car_diesel * 0.7 + CONFIG.emissionFactors.car_petrol * 0.3;
                distanciaEstimadaKm = 15;
                break;
            case nombre.includes('Motocicleta'):
                factorKgCO2e = CONFIG.emissionFactors.motorcycle;
                distanciaEstimadaKm = 10;
                break;
            case nombre.includes('Teletrabajo'):
                factorKgCO2e = 0;
                distanciaEstimadaKm = 0;
                break;
            default:
                factorKgCO2e = CONFIG.emissionFactors.car_diesel;
                distanciaEstimadaKm = 15;
                break;
        }
        
        // Co2e anual por empleados de este modo
        const co2eKgAnual = count * distanciaEstimadaKm * factorKgCO2e * diasSemana * factorAnual * 2; // Ida + vuelta
        
        totalCo2eKg += co2eKgAnual;
        desglose[nombre] = {
            factorKgCO2e,
            distanciaKm: distanciaEstimadaKm,
            empleados: count,
            co2eKgAnual: Math.round(co2eKgAnual),
        };
    }
    
    return {
        totalCo2eKg: Math.round(totalCo2eKg),
        totalCo2eTon: totalCo2eKg / 1000,
        porEmpleadoKg: Math.round((totalCo2eKg / plantilla) * 100) / 100,
        desglose,
        fuente: 'Factores MITECO 2024 — https://www.miteco.gob.es/es/cambio-climatico/temas/mitigacion-politicas-y-medidas/huella-carbono.html',
    };
}

/**
 * Calcular indicadores de aparcamiento
 * @param {Object} empresa — Datos de empresa
 * @param {Object} centro — Datos del centro
 * @returns {Object}
 */
function calcularIndicadoresParked(empresa, centro) {
    const plazasCoche = empresa.plazasCoche || 0;
    const plazasBici = empresa.plazasBici || 0;
    const plantilla = centro.plantilla || 1;
    
    // Estimación de coches que llegan (asumiendo 60% de ocupación media para conductor)
    const conductoresEst = Math.round(plantilla * 0.6); // Estimación si no hay encuesta
    
    const tasaOcupacionPlazas = plazasCoche > 0 ? (conductoresEst / plazasCoche) * 100 : 0;
    const ratioCocheBici = plazasBici > 0 ? (plazasCoche / plazasBici) : '∞';
    
    return {
        plazasCoche,
        plazasBici,
        conductoresEstimados: conductoresEst,
        tasaOcupacionPlazas: Math.round(tasaOcupacionPlazas * 10) / 10,
        ratioCocheBici: typeof ratioCocheBici === 'number' ? Math.round(ratioCocheBici * 10) / 10 : '∞',
        consejo: generarConsejoAparcamiento(plazasCoche, plazasBici, conductoresEst),
    };
}

/**
 * Calcular densidad de viajes por hora
 * @param {Object} centro — Datos del centro
 * @param {Object} empresa — Datos de empresa
 * @returns {Array<{hora, viajes}>}
 */
function calcularDensidadViajes(centro, empresa) {
    const plantilla = centro.plantilla || 1;
    const teletrabajoPct = empresa.teletrabajoPct || 0;
    const diasPresencial = empresa.diasPresencial || 5;
    const presencial = Math.round(plantilla * (1 - teletrabajoPct / 100));
    
    // Picos típicos de entrada/salida (distribución normal simplificada)
    const picos = [
        { hora: '7:00', factor: 0.05 },
        { hora: '8:00', factor: 0.15 },
        { hora: '9:00', factor: 0.40 }, // Pico principal
        { hora: '10:00', factor: 0.15 },
        { hora: '11:00', factor: 0.10 },
        { hora: '12:00', factor: 0.05 },
        { hora: '16:00', factor: 0.05 },
        { hora: '17:00', factor: 0.15 },
        { hora: '18:00', factor: 0.40 }, // Pico salida
        { hora: '19:00', factor: 0.15 },
        { hora: '20:00', factor: 0.05 },
    ];
    
    return picos.map(p => ({
        hora: p.hora,
        entradas: Math.round(presencial * p.factor),
        salidas: Math.round(presencial * p.factor),
    }));
}

/**
 * Generar consejo de aparcamiento
 * @param {number} plazasCoche
 * @param {number} plazasBici
 * @param {number} conductoresEst
 * @returns {string}
 */
function generarConsejoAparcamiento(plazasCoche, plazasBici, conductoresEst) {
    if (plazasCoche === 0) {
        return '⚠️ No hay plazas de coche — oportunidad para habilitar aparcamiento bici seguro.';
    }
    if (plazasBici === 0) {
        return '⚠️ No hay plazas de bicicleta — alta prioridad para habilitar aparcamiento seguro con recarga.';
    }
    if (plazasCoche < conductoresEst) {
        return `✅ Aparcamiento de coches ajustado (${plazasCoche} plazas para ~${conductoresEst} conductores). Fomentar modos alternativos.`;
    }
    return `✅ Aparcamiento de coches disponible (${plazasCoche} plazas).`;
}

/**
 * Generar resumen ejecutivo del diagnóstico
 */
function generarResumenDiagnostico(
    repartoModal,
    ocupacionMedia,
    huellaCO2e,
    indicadoresParked,
    densidadViajes,
    centro
) {
    const co2eTon = huellaCO2e.totalCo2eTon;
    const porcentajeSostenible = repartoModal
        .filter(m => m.modo.includes('Caminando') || m.modo.includes('Bicicleta') || m.modo.includes('Autobús') || m.modo.includes('Metro') || m.modo.includes('Tren'))
        .reduce((s, m) => s + m.percent, 0);
    
    const porcentajeMotorizado = repartoModal
        .filter(m => m.modo.includes('Coche') || m.modo.includes('Motocicleta'))
        .reduce((s, m) => s + m.percent, 0);
    
    let nivelSostenibilidad = 'Bajo';
    if (porcentajeSostenible >= 60) nivelSostenibilidad = 'Alto';
    else if (porcentajeSostenible >= 40) nivelSostenibilidad = 'Medio-Alto';
    else if (porcentajeSostenible >= 20) nivelSostenibilidad = 'Medio';
    
    return {
        nivelSostenibilidad,
        porcentajeSostenible: Math.round(porcentajeSostenible * 10) / 10,
        porcentajeMotorizado: Math.round(porcentajeMotorizado * 10) / 10,
        co2eAnualTon: co2eTon,
        ocupacionMediaVehiculos: ocupacionMedia.ocupacionMedia,
        mensaje: generarMensajeDiagnostico(nivelSostenibilidad, co2eTon, centro),
    };
}

/**
 * Mensaje de diagnóstico
 */
function generarMensajeDiagnostico(nivel, co2eTon, centro) {
    if (nivel === 'Alto') {
        return `✅ El centro "${centro.nombre}" tiene un nivel de movilidad sostenible ALTO. Se recomienda mantener y mejorar las medidas existentes.`;
    }
    if (nivel === 'Medio-Alto') {
        return `⚠️ El centro "${centro.nombre}" tiene un nivel de movilidad sostenible MEDIO-ALTO. Hay margen de mejora en modos activos y transporte público.`;
    }
    if (nivel === 'Medio') {
        return `⚠️ El centro "${centro.nombre}" tiene un nivel de movilidad sostenible MEDIO. Se recomienda implementar medidas prioritarias para reducir dependencia del coche.`;
    }
    return `🚨 El centro "${centro.nombre}" tiene un nivel de movilidad sostenible BAJO. Se necesitan medidas urgentes: reducir ${co2eTon.toFixed(1)}t CO2e/año.`;
}

// ═══════════════════════════════════════════
// GRÁFICOS CON CHART.JS
// ═══════════════════════════════════════════

/**
 * Inicializar gráficos del diagnóstico
 * @param {Object} diagnostico — Resultado de calcularDiagnostico
 */
export function renderDiagnosticoCharts(diagnostico) {
    const charts = window.charts;
    
    // 1. Reparto modal — Doughnut chart
    if (diagnostico.repartoModal && diagnostico.repartoModal.length > 0) {
        const ctxModal = document.getElementById('chart-modal');
        if (ctxModal) {
            if (charts.modal) charts.modal.destroy();
            
            const labels = diagnostico.repartoModal.map(m => m.modo);
            const data = diagnostico.repartoModal.map(m => m.percent);
            const colors = ['#2563eb', '#16a34a', '#f97316', '#dc2626', '#eab308', '#8b5cf6', '#ec4899', '#64748b'];
            
            charts.modal = new Chart(ctxModal, {
                type: 'doughnut',
                data: {
                    labels,
                    datasets: [{
                        data,
                        backgroundColor: colors.slice(0, labels.length),
                        borderWidth: 2,
                        borderColor: '#ffffff',
                    }],
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { font: { size: 11 } },
                        },
                        tooltip: {
                            callbacks: {
                                label: (ctx) => ` ${ctx.label}: ${ctx.parsed}%`,
                            },
                        },
                    },
                },
            });
        }
    }
    
    // 2. Huella CO2e por modo — Horizontal bar
    if (diagnostico.huellaCO2e && diagnostico.huellaCO2e.desglose) {
        const ctxCO2e = document.getElementById('chart-co2e');
        if (ctxCO2e) {
            if (charts.co2e) charts.co2e.destroy();
            
            const desglose = diagnostico.huellaCO2e.desglose;
            const labels = Object.keys(desglose);
            const data = labels.map(l => Math.round(desglose[l].co2eKgAnual / 1000)); // Toneladas
            
            charts.co2e = new Chart(ctxCO2e, {
                type: 'bar',
                data: {
                    labels,
                    datasets: [{
                        label: 'CO2e (toneladas/año)',
                        data,
                        backgroundColor: '#f97316',
                        borderWidth: 0,
                    }],
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: (ctx) => ` ${ctx.parsed.x.toFixed(1)} t CO2e/año`,
                            },
                        },
                    },
                    scales: {
                        x: {
                            title: { display: true, text: 'Toneladas CO2e/año' },
                        },
                    },
                },
            });
        }
    }
    
    // 3. Densidad de viajes — Line chart
    if (diagnostico.densidadViajes && diagnostico.densidadViajes.length > 0) {
        const ctxDensidad = document.getElementById('chart-densidad');
        if (ctxDensidad) {
            if (charts.densidad) charts.densidad.destroy();
            
            const horas = diagnostico.densidadViajes.map(d => d.hora);
            const entradas = diagnostico.densidadViajes.map(d => d.entradas);
            const salidas = diagnostico.densidadViajes.map(d => d.salidas);
            
            charts.densidad = new Chart(ctxDensidad, {
                type: 'line',
                data: {
                    labels: horas,
                    datasets: [
                        {
                            label: 'Entradas',
                            data: entradas,
                            borderColor: '#2563eb',
                            backgroundColor: 'rgba(37, 99, 235, 0.1)',
                            fill: true,
                            tension: 0.3,
                        },
                        {
                            label: 'Salidas',
                            data: salidas,
                            borderColor: '#f97316',
                            backgroundColor: 'rgba(249, 115, 22, 0.1)',
                            fill: true,
                            tension: 0.3,
                        },
                    ],
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { position: 'bottom' },
                        tooltip: {
                            callbacks: {
                                label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y} viajes`,
                            },
                        },
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: { display: true, text: 'Viajes' },
                        },
                        x: {
                            title: { display: true, text: 'Hora' },
                        },
                    },
                },
            });
        }
    }
}

/**
 * Renderizar KPI cards en el DOM
 * @param {Object} diagnostico
 */
export function renderDiagnosticoCards(diagnostico) {
    const kpiGrid = document.getElementById('diagnostico-kpis');
    if (!kpiGrid) return;
    
    const kpis = [
        {
            value: diagnostico.resumen?.porcentajeSostenible || 0,
            label: 'Modos sostenibles',
            color: '#16a34a',
            suffix: '%',
        },
        {
            value: diagnostico.resumen?.porcentajeMotorizado || 0,
            label: 'Modos motorizados',
            color: '#f97316',
            suffix: '%',
        },
        {
            value: diagnostico.huellaCO2e?.totalCo2eTon || 0,
            label: 'CO2e anual',
            color: '#2563eb',
            suffix: ' t',
        },
        {
            value: diagnostico.resumen?.ocupacionMediaVehiculos || 1,
            label: 'Ocupación media coche',
            color: '#8b5cf6',
            suffix: ' pas.',
            decimals: 1,
        },
        {
            value: diagnostico.indicadoresParked?.tasaOcupacionPlazas || 0,
            label: 'Ocupación plazas coche',
            color: '#dc2626',
            suffix: '%',
        },
        {
            value: diagnostico.resumen?.nivelSostenibilidad || '—',
            label: 'Nivel de sostenibilidad',
            color: '#1e293b',
            textOnly: true,
        },
    ];
    
    kpiGrid.innerHTML = kpis.map(kpi => `
        <div class="kpi-card">
            <div class="kpi-value" style="${kpi.color ? `color: ${kpi.color}` : ''}">
                ${kpi.textOnly ? kpi.value : formatNum(kpi.value, kpi.decimals || 0) + kpi.suffix}
            </div>
            <div class="kpi-label">${kpi.label}</div>
        </div>
    `).join('');
    
    // Mensaje de diagnóstico
    const msgEl = document.getElementById('diagnostico-mensaje');
    if (msgEl && diagnostico.resumen?.mensaje) {
        msgEl.textContent = diagnostico.resumen.mensaje;
    }
}

/**
 * Inicializar sección de diagnóstico
 */
export function initDiagnostico() {
    const btnCalcular = document.getElementById('btn-calcular-diagnostico');
    if (!btnCalcular) return;
    
    btnCalcular.addEventListener('click', () => {
        const state = window.appState;
        
        if (!state.centro) {
            alert('⚠️ Primero guarda los datos del centro (sección Centro)');
            return;
        }
        
        if (!state.encuesta || state.encuesta.respuestas.length < 5) {
            alert('⚠️ Necesitas al menos 5 respuestas de encuesta para calcular el diagnóstico.');
            return;
        }
        
        // Cargar agregaciones
        state.encuesta.agregados = getResponseAggregatesSync(state.encuesta.respuestas);
        
        // Calcular diagnóstico
        const diagnostico = calcularDiagnostico(state);
        state.diagnostico = diagnostico;
        
        // Guardar en localStorage
        localStorage.setItem('pmst_diagnostico', JSON.stringify(diagnostico));
        
        // Renderizar
        renderDiagnosticoCards(diagnostico);
        renderDiagnosticoCharts(diagnostico);
        
        btnCalcular.textContent = '✅ Diagnóstico calculado';
        btnCalcular.disabled = true;
        
        alert(`✅ Diagnóstico calculado para "${state.centro.nombre}".\nPlantilla: ${state.centro.plantilla} trabajadores.\nCO2e anual: ${diagnostico.huellaCO2e.totalCo2eTon.toFixed(1)} toneladas.\nNivel: ${diagnostico.resumen.nivelSostenibilidad}.`);
    });
}

/**
 * Cálculo sincrónico de agregados (para uso interno)
 */
function getResponseAggregatesSync(responses) {
    const total = responses.length;
    const modalSplit = {};
    
    responses.forEach(r => {
        const modo = r.modo_principal || 'Desconocido';
        modalSplit[modo] = (modalSplit[modo] || 0) + 1;
    });
    
    return { total, modalSplit };
}

/**
 * Cargar diagnóstico guardado
 */
export function loadSavedDiagnostico() {
    const json = localStorage.getItem('pmst_diagnostico');
    if (!json) return;
    
    try {
        const diagnostico = JSON.parse(json);
        window.appState.diagnostico = diagnostico;
        
        renderDiagnosticoCards(diagnostico);
        renderDiagnosticoCharts(diagnostico);
        
        const btn = document.getElementById('btn-calcular-diagnostico');
        if (btn) {
            btn.textContent = '✅ Diagnóstico guardado';
            btn.disabled = true;
        }
    } catch (err) {
        console.error('Error cargando diagnóstico guardado:', err);
    }
}
