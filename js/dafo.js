/**
 * PLANDEMOVILIDAD — DAFO automático + Medidas priorizadas
 * 
 * Genera análisis DAFO cruzando el diagnóstico con la encuesta,
 * y propone medidas priorizadas con impacto, coste y plazo.
 * 
 * La matriz DAFO se construye automáticamente a partir de:
 * - Fortalezas: modos sostenibles con buena penetración
 * - Debilidades: dependencia del coche, baja ocupación vehículos
 * - Oportunidades: cercanía a transporte público, teletrabajo
 * - Amenazas: falta de infraestructura, seguridad vial
 * 
 * Las medidas se priorizan con matriz de impacto vs coste
 * 
 * Autor: David Antizar
 */

import { CONFIG } from './config.js';
import { formatNum } from './utils.js';

// ═══════════════════════════════════════════
// CATÁLOGO DE MEDIDAS
// ═══════════════════════════════════════════

/**
 * Catálogo completo de medidas de movilidad sostenible
 * Basado en informe maestro, categorizadas y priorizadas
 */
export const CATALOGO_MEDIADAS = {
    infraestructura: [
        {
            id: 'inf-01',
            nombre: 'Aparcamiento bici seguro con recarga',
            categoria: 'Infraestructura',
            impacto: 9,
            coste: 'Medio',
            plazo: 'Corto (3-6 meses)',
            descripcion: 'Instalar aparcamiento de bicicletas cubierto y vigilado con puntos de recarga para bicicletas eléctricas y VMPs.',
        },
        {
            id: 'inf-02',
            nombre: 'Carril bici / cicloporruta hasta el centro',
            categoria: 'Infraestructura',
            impacto: 8,
            coste: 'Alto',
            plazo: 'Largo (12-24 meses)',
            descripcion: 'Coordinar con el ayuntamiento para la instalación de carril bici protegido desde las principales arterias de acceso.',
        },
        {
            id: 'inf-03',
            nombre: 'Mejora de accesibilidad peatonal',
            categoria: 'Infraestructura',
            impacto: 7,
            coste: 'Medio',
            plazo: 'Corto (3-6 meses)',
            descripcion: 'Mejorar aceras, pasos de peatones y señalización en los accesos al centro.',
        },
        {
            id: 'inf-04',
            nombre: 'Zonas de carga/descarga seguras',
            categoria: 'Infraestructura',
            impacto: 5,
            coste: 'Bajo',
            plazo: 'Corto (1-3 meses)',
            descripcion: 'Delimitar zonas de carga/descarga exclusivas para bicicletas y VMPs.',
        },
    ],
    incentivos: [
        {
            id: 'inc-01',
            nombre: 'Ayuda adquisición de bicicleta/VMP',
            categoria: 'Incentivos',
            impacto: 8,
            coste: 'Medio',
            plazo: 'Corto (1-3 meses)',
            descripcion: 'Subvencionar hasta un 50% del coste de una bicicleta (estándar o eléctrica) o VMP, con un límite de 500-1000€ por empleado.',
        },
        {
            id: 'inc-02',
            nombre: 'Préstamo de bicicleta corporativo',
            categoria: 'Incentivos',
            impacto: 6,
            coste: 'Medio',
            plazo: 'Corto (1-3 meses)',
            descripcion: 'Crear un parque de bicicletas compartidas para que los empleados puedan cogerlas cuando lo necesiten.',
        },
        {
            id: 'inc-03',
            nombre: 'Abono transporte subvencionado',
            categoria: 'Incentivos',
            impacto: 9,
            coste: 'Alto',
            plazo: 'Corto (1-2 meses)',
            descripcion: 'Subvencionar entre el 50% y el 75% del abono de transporte público, en línea con la normativa estatal vigentes.',
        },
        {
            id: 'inc-04',
            nombre: 'Plan de puntos (gamificación)',
            categoria: 'Incentivos',
            impacto: 6,
            coste: 'Bajo',
            plazo: 'Corto (1-2 meses)',
            descripcion: 'Sistema de recompensas por cada día que el empleado use modos sostenibles, canjeable por beneficios.',
        },
    ],
    organizativas: [
        {
            id: 'org-01',
            nombre: 'Flexibilidad horaria',
            categoria: 'Organizativa',
            impacto: 8,
            coste: 'Bajo',
            plazo: 'Corto (1-2 meses)',
            descripcion: 'Permitir franjas horarias flexibles para evitar horas punta y reducir la congestión.',
        },
        {
            id: 'org-02',
            nombre: 'Más teletrabajo',
            categoria: 'Organizativa',
            impacto: 9,
            coste: 'Bajo',
            plazo: 'Corto (1-2 meses)',
            descripcion: 'Incrementar los días de teletrabajo, priorizando tareas que se puedan realizar de forma remota.',
        },
        {
            id: 'org-03',
            nombre: 'Lanzadera / Carpooling corporativo',
            categoria: 'Organizativa',
            impacto: 7,
            coste: 'Bajo',
            plazo: 'Medio (3-6 meses)',
            descripcion: 'Crear una plataforma interna para facilitar el carpooling entre empleados, con parking preferente para vehículos compartidos.',
        },
        {
            id: 'org-04',
            nombre: 'Duchas y vestuarios',
            categoria: 'Organizativa',
            impacto: 7,
            coste: 'Alto',
            plazo: 'Largo (6-12 meses)',
            descripcion: 'Instalar vestuarios con duchas para facilitar el desplazamiento activo (bici/caminando).',
        },
    ],
    comunicacion: [
        {
            id: 'com-01',
            nombre: 'Campana de sensibilización',
            categoria: 'Comunicación',
            impacto: 5,
            coste: 'Bajo',
            plazo: 'Corto (1 mes)',
            descripcion: 'Campaña interna de comunicación sobre los beneficios de la movilidad sostenible.',
        },
        {
            id: 'com-02',
            nombre: 'Semana sin coche',
            categoria: 'Comunicación',
            impacto: 6,
            coste: 'Bajo',
            plazo: 'Corto (1 mes)',
            descripcion: 'Organizar una semana sin coche con actividades, rutas guiadas y pruebas de bicicletas eléctricas.',
        },
        {
            id: 'com-03',
            nombre: 'Panel de seguimiento',
            categoria: 'Comunicación',
            impacto: 4,
            coste: 'Bajo',
            plazo: 'Corto (1 mes)',
            descripcion: 'Instalar un panel informativo en el centro mostrando la huella de CO2e y los objetivos.',
        },
    ],
};

/**
 * Calcular el DAFO automáticamente desde el diagnóstico
 * @param {Object} diagnostico — Resultado de calcularDiagnostico
 * @param {Object} encuesta — Agregados de la encuesta
 * @returns {Object} Matriz DAFO
 */
export function calcularDAFO(diagnostico, encuesta) {
    const repartoModal = diagnostico.repartoModal || [];
    const huellaCO2e = diagnostico.huellaCO2e || {};
    const indicadoresParked = diagnostico.indicadoresParked || {};
    const resumen = diagnostico.resumen || {};
    const agregados = encuesta.agregados || {};
    
    // Fortalezas: modos sostenibles con buena penetración
    const fortalezas = [];
    
    const sosteniblePct = repartoModal
        .filter(m => ['Caminando', 'Bicicleta', 'Autobús', 'Metro / Tren'].some(
            keyword => m.modo.includes(keyword)
        ))
        .reduce((s, m) => s + m.percent, 0);
    
    if (sosteniblePct >= 30) {
        fortalezas.push(`✅ ${formatNum(sosteniblePct, 1)}% de los desplazamientos son sostenibles (caminar, bici, TP)`);
    }
    
    if (repartoModal.some(m => m.modo.includes('Caminando') && m.percent >= 15)) {
        fortalezas.push('🚶 Alto porcentaje de desplazamientos a pie — centro accesible a pie');
    }
    
    if (repartoModal.some(m => m.modo.includes('Bicicleta') && m.percent >= 10)) {
        fortalezas.push('🚲 Base de ciclistas consolidada — posible escalar modo');
    }
    
    if (repartoModal.some(m => m.modo.includes('Teletrabajo') && m.percent >= 20)) {
        fortalezas.push('🏠 Alta tasa de teletrabajo reduce desplazamientos');
    }
    
    if (indicadoresParked.plazasBici > 0) {
        fortalezas.push('🅿️ Infraestructura de aparcamiento bici ya disponible');
    }
    
    if (indicadoresParked?.consejo?.includes('Disponible') || !indicadoresParked?.consejo) {
        fortalezas.push('✅ Aparcamiento de coches disponible');
    }
    
    // Si no hay fortalezas, añadir alguna genérica
    if (fortalezas.length === 0) {
        fortalezas.push('📊 Datos de movilidad recopilados y analizados');
        fortalezas.push('🏢 Compromiso de la empresa con la elaboración del PMST');
    }
    
    // Debilidades: dependencia del coche, baja ocupación
    const debilidades = [];
    
    const motorizadoPct = repartoModal
        .filter(m => ['Coche particular (conductor)', 'Coche particular (pasajero)', 'Motocicleta'].some(
            keyword => m.modo.includes(keyword)
        ))
        .reduce((s, m) => s + m.percent, 0);
    
    if (motorizadoPct >= 50) {
        debilidades.push(`🚗 ${formatNum(motorizadoPct, 1)}% de desplazamientos en vehículo privado`);
    }
    
    if (indicadoresParked.ocupacionMediaVehiculos < 1.3) {
        debilidades.push(`👤 Baja ocupación media de vehículos (${indicadoresParked.ocupacionMediaVehiculos} pasajeros)`);
    }
    
    if (huellaCO2e.totalCo2eTon > 10) {
        debilidades.push(`🔥 Huella CO2e elevada: ${formatNum(huellaCO2e.totalCo2eTon, 1)} t/año`);
    }
    
    if (indicadoresParked.tasaOcupacionPlazas > 80) {
        debilidades.push(`🅿️ Tasa de ocupación de plazas de coche alta (${formatNum(indicadoresParked.tasaOcupacionPlazas, 1)}%)`);
    }
    
    if (indicadoresParked.plazasCoche === 0 && motorizadoPct > 60) {
        debilidades.push('⚠️ Sin aparcamiento de coches a pesar de alta motorización');
    }
    
    if (agregados.barriers && agregados.barriers.length > 0) {
        const primeraBarrera = agregados.barriers[0];
        if (primeraBarrera && primeraBarrera[0].includes('Seguridad')) {
            debilidades.push('⚠️ Seguridad vial percibida como principal barrera');
        }
        if (primeraBarrera && primeraBarrera[0].includes('Infraestructura')) {
            debilidades.push('⚠️ Falta de infraestructura ciclista/peatonal');
        }
    }
    
    if (debilidades.length === 0) {
        debilidades.push('📊 Necesidad de ampliar la base de datos con más respuestas');
    }
    
    // Oportunidades: cercanía a TP, teletrabajo, ayudas existentes
    const oportunidades = [];
    
    // Verificar si hay cercanía a transporte público (isocrona)
    oportunidades.push('🚌 Posibilidad de ampliar cobertura de transporte público');
    oportunidades.push('🏠 Potencial de teletrabajo no explotado al máximo');
    oportunidades.push('💰 Ayudas estatales y autonómicas para movilidad sostenible');
    oportunidades.push('🚲 Tendencia creciente de adopción de bicicleta eléctrica y VMP');
    oportunidades.push('📱 Apps de movilidad para facilitar el carpooling');
    
    if (agregados.interesMedidas && agregados.interesMedidas.some(m => m[0].includes('bicicleta'))) {
        oportunidades.push('💡 Demanda de los empleados por ayuda en adquisición de bici/VMP');
    }
    
    if (agregados.interesMedidas && agregados.interesMedidas.some(m => m[0].includes('flexibilidad'))) {
        oportunidades.push('💡 Demanda de flexibilidad horaria');
    }
    
    // Amenazas: clima, normativa, resistencia al cambio
    const amenazas = [];
    
    amenazas.push('🌧️ Condit climáticos adversos pueden afectar a modos activos');
    amenazas.push('📉 Resistencia al cambio por parte de empleados motorizados');
    amenazas.push('🏗️ Obras viarias que puedan afectar temporalmente a accesos');
    amenazas.push('⚖️ Cambios normativos que afecten a flota corporativa');
    
    if (agregados.barriers && agregados.barriers.some(b => b[0].includes('Horario'))) {
        amenazas.push('⏰ Horarios rígidos dificultan el uso de transporte público');
    }
    
    return {
        fortalezas,
        debilidades,
        oportunidades,
        amenazas,
        fecha: new Date().toISOString(),
    };
}

/**
 * Priorizar medidas usando matriz de impacto vs coste
 * @param {Object} dafo — Matriz DAFO
 * @param {Object} diagnostico — Diagnóstico
 * @returns {Array} Medidas priorizadas
 */
export function priorizarMedidas(dafo, diagnostico) {
    const medidas = [];
    
    // Recoger todas las medidas del catálogo
    for (const categoria of Object.values(CATALOGO_MEDIADAS)) {
        for (const medida of categoria) {
            medidas.push({ ...medida });
        }
    }
    
    // Ajustar prioridad basada en el diagnóstico específico
    const motorizadoPct = (diagnostico.resumen?.porcentajeMotorizado || 0);
    const sosteniblePct = (diagnostico.resumen?.porcentajeSostenible || 0);
    const co2eTon = (diagnostico.huellaCO2e?.totalCo2eTon || 0);
    
    for (const medida of medidas) {
        let puntuacion = 0;
        
        // Impacto base (0-10)
        puntuacion += medida.impacto;
        
        // Ajuste por coste (los baratos tienen mayor puntuación relativa)
        if (medida.coste === 'Bajo') puntuacion += 3;
        else if (medida.coste === 'Medio') puntuacion += 1;
        else if (medida.coste === 'Alto') puntuacion -= 1;
        
        // Ajuste por urgencia basada en diagnóstico
        if (co2eTon > 10 && medida.categoria === 'Organizativa') puntuacion += 2;
        if (motorizadoPct > 60 && medida.categoria === 'Incentivos') puntuacion += 2;
        if (sosteniblePct < 20 && medida.categoria === 'Infraestructura') puntuacion += 2;
        
        // Ajuste por DAFO: cruzar fortalezas y oportunidades
        const dafoStr = JSON.stringify(dafo);
        if (dafoStr.includes('bicicleta') && medida.nombre.toLowerCase().includes('bicicleta')) {
            puntuacion += 1;
        }
        if (dafoStr.includes('transporte público') && medida.nombre.toLowerCase().includes('transporte')) {
            puntuacion += 1;
        }
        
        medida.puntuacion = Math.round(puntuacion * 10) / 10;
        
        // Clasificar prioridad
        if (medida.puntuacion >= 9) {
            medida.prioridad = 'Alta';
        } else if (medida.puntuacion >= 7) {
            medida.prioridad = 'Media';
        } else {
            medida.prioridad = 'Baja';
        }
    }
    
    // Ordenar por puntuación descendente
    medidas.sort((a, b) => b.puntuacion - a.puntuacion);
    
    return medidas;
}

/**
 * Generar plan de acción con cronograma
 * @param {Array} medidas — Medidas priorizadas
 * @param {Object} centro — Datos del centro
 * @returns {Object} Plan de acción
 */
export function generarPlanDeAccion(medidas, centro) {
    const alta = medidas.filter(m => m.prioridad === 'Alta');
    const media = medidas.filter(m => m.prioridad === 'Media');
    const baja = medidas.filter(m => m.prioridad === 'Baja');
    
    return {
        nombreCentro: centro.nombre,
        fecha: new Date().toISOString(),
        fases: [
            {
                nombre: 'Fase 1: Acciones rápidas (0-6 meses)',
                medidas: alta.filter(m => m.plazo.includes('Corto')),
                objetivo: 'Lograr cambios visibles rápidamente para generar confianza',
            },
            {
                nombre: 'Fase 2: Consolidación (6-12 meses)',
                medidas: alta.filter(m => m.plazo.includes('Medio'))
                    .concat(media.filter(m => m.plazo.includes('Corto'))),
                objetivo: 'Consolidar las medidas iniciales y añadir nuevas',
            },
            {
                nombre: 'Fase 3: Madurez (12-24 meses)',
                medidas: media.concat(baja),
                objetivo: 'Alcanzar un modelo de movilidad sostenible completo',
            },
        ],
        resumenPorCategoria: {
            Infraestructura: alta.filter(m => m.categoria === 'Infraestructura').length + media.filter(m => m.categoria === 'Infraestructura').length,
            Incentivos: alta.filter(m => m.categoria === 'Incentivos').length + media.filter(m => m.categoria === 'Incentivos').length,
            Organizativa: alta.filter(m => m.categoria === 'Organizativa').length + media.filter(m => m.categoria === 'Organizativa').length,
            Comunicacion: alta.filter(m => m.categoria === 'Comunicacion').length + media.filter(m => m.categoria === 'Comunicacion').length,
        },
    };
}

// ═══════════════════════════════════════════
// RENDERIZADO DEL DAFO
// ═══════════════════════════════════════════

/**
 * Renderizar la matriz DAFO en el DOM
 * @param {Object} dafo — Matriz DAFO
 */
export function renderDAFO(dafo) {
    const dafoGrid = document.getElementById('dafo-matriz');
    if (!dafoGrid) return;
    
    dafoGrid.innerHTML = `
        <div class="dafo-grid">
            <div class="dafo-matrix fortalezas">
                <h3>💪 Fortalezas</h3>
                <ul>${dafo.fortalezas.map(f => `<li>${f}</li>`).join('')}</ul>
            </div>
            <div class="dafo-matrix debilidades">
                <h3>⚠️ Debilidades</h3>
                <ul>${dafo.debilidades.map(d => `<li>${d}</li>`).join('')}</ul>
            </div>
            <div class="dafo-matrix oportunidades">
                <h3>🌟 Oportunidades</h3>
                <ul>${dafo.oportunidades.map(o => `<li>${o}</li>`).join('')}</ul>
            </div>
            <div class="dafo-matrix amenazas">
                <h3>🔥 Amenazas</h3>
                <ul>${dafo.amenazas.map(a => `<li>${a}</li>`).join('')}</ul>
            </div>
        </div>
    `;
}

/**
 * Renderizar tabla de medidas priorizadas
 * @param {Array} medidas — Medidas priorizadas
 */
export function renderMedidasTabla(medidas) {
    const tabla = document.getElementById('medidas-tabla');
    if (!tabla) return;
    
    // Agrupar por categoría
    const categorias = {};
    for (const medida of medidas) {
        if (!categorias[medida.categoria]) categorias[medida.categoria] = [];
        categorias[medida.categoria].push(medida);
    }
    
    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Prioridad</th>
                    <th>Medida</th>
                    <th>Categoría</th>
                    <th>Puntuación</th>
                    <th>Impacto</th>
                    <th>Coste</th>
                    <th>Plazo</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    for (const medida of medidas) {
        const priorityClass = medida.prioridad === 'Alta' ? 'priority-alta'
            : medida.prioridad === 'Media' ? 'priority-media' : 'priority-baja';
        
        html += `
            <tr>
                <td><span class="priority-badge ${priorityClass}">${medida.prioridad}</span></td>
                <td>${medida.nombre}</td>
                <td>${medida.categoria}</td>
                <td>${formatNum(medida.puntuacion, 1)}</td>
                <td>${medida.impacto}/10</td>
                <td>${medida.coste}</td>
                <td>${medida.plazo}</td>
            </tr>
        `;
    }
    
    html += '</tbody></table>';
    tabla.innerHTML = html;
}

/**
 * Inicializar sección DAFO
 */
export function initDAFO() {
    const btnDAFO = document.getElementById('btn-calcular-dafo');
    const btnMedidas = document.getElementById('btn-generar-medidas');
    
    if (!btnDAFO) return;
    
    btnDAFO.addEventListener('click', () => {
        const state = window.appState;
        
        if (!state.diagnostico) {
            alert('⚠️ Primero calcula el diagnóstico');
            return;
        }
        
        if (!state.encuesta || state.encuesta.respuestas.length < 5) {
            alert('⚠️ Necesitas al menos 5 respuestas de encuesta');
            return;
        }
        
        // Cargar agregaciones
        state.encuesta.agregados = getResponseAggregatesSync(state.encuesta.respuestas);
        
        // Calcular DAFO
        const dafo = calcularDAFO(state.diagnostico, state.encuesta);
        state.dafo = dafo;
        
        // Guardar
        localStorage.setItem('pmst_dafo', JSON.stringify(dafo));
        
        // Renderizar
        renderDAFO(dafo);
        
        btnDAFO.textContent = '✅ DAFO calculado';
        btnDAFO.disabled = true;
    });
    
    if (btnMedidas) {
        btnMedidas.addEventListener('click', () => {
            if (!state.dafo) {
                alert('⚠️ Primero calcula el DAFO');
                return;
            }
            
            const medidas = priorizarMedidas(state.dafo, state.diagnostico);
            const plan = generarPlanDeAccion(medidas, state.centro);
            
            state.medidas = medidas;
            state.planAccion = plan;
            
            // Guardar
            localStorage.setItem('pmst_medidas', JSON.stringify({ medidas, plan }));
            
            // Renderizar
            renderMedidasTabla(medidas);
            
            btnMedidas.textContent = '✅ Medidas generadas';
            btnMedidas.disabled = true;
        });
    }
}

/**
 * Cálculo sincrónico de agregados
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
 * Cargar DAFO y medidas guardados
 */
export function loadSavedDAFO() {
    const dafoJson = localStorage.getItem('pmst_dafo');
    if (dafoJson) {
        try {
            const dafo = JSON.parse(dafoJson);
            window.appState.dafo = dafo;
            renderDAFO(dafo);
            
            const btn = document.getElementById('btn-calcular-dafo');
            if (btn) {
                btn.textContent = '✅ DAFO guardado';
                btn.disabled = true;
            }
        } catch (err) {
            console.error('Error cargando DAFO:', err);
        }
    }
    
    const medidasJson = localStorage.getItem('pmst_medidas');
    if (medidasJson) {
        try {
            const { medidas, plan } = JSON.parse(medidasJson);
            window.appState.medidas = medidas;
            window.appState.planAccion = plan;
            renderMedidasTabla(medidas);
            
            const btn = document.getElementById('btn-generar-medidas');
            if (btn) {
                btn.textContent = '✅ Medidas guardadas';
                btn.disabled = true;
            }
        } catch (err) {
            console.error('Error cargando medidas:', err);
        }
    }
}
