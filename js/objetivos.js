/**
 * PLANDEMOVILIDAD — Objetivos SMART
 * 
 * Genera objetivos específicos, medibles, alcanzables, relevantes
 * y temporales basados en el diagnóstico y DAFO.
 * 
 * Cada objetivo incluye:
 * - Descripción clara
 * - Indicador de seguimiento
 * - Línea base (desde dónde partimos)
 * - Meta (dónde queremos llegar)
 * - Plazo
 * 
 * Autor: David Antizar
 */

import { CONFIG } from './config.js';
import { formatNum } from './utils.js';

/**
 * Generar objetivos SMART desde el diagnóstico + DAFO + medidas
 * @param {Object} diagnostico
 * @param {Object} dafo
 * @param {Array} medidas
 * @param {Object} centro
 * @returns {Array} Objetivos SMART
 */
export function generarObjetivosSMART(diagnostico, dafo, medidas, centro) {
    const objetivos = [];
    const plantilla = centro.plantilla || 1;
    const co2eAnual = diagnostico.huellaCO2e?.totalCo2eTon || 0;
    const sosteniblePct = diagnostico.resumen?.porcentajeSostenible || 0;
    const motorizadoPct = diagnostico.resumen?.porcentajeMotorizado || 0;
    
    // Objetivo 1: Reducir modos motorizados
    const metaSostenible = Math.min(sosteniblePct + 20, 60); // +20% o hasta 60%
    objetivos.push({
        id: 'obj-01',
        descripcion: `Incrementar el porcentaje de desplazamientos sostenibles del ${formatNum(sosteniblePct, 1)}% actual al ${formatNum(metaSostenible, 1)}% en 24 meses.`,
        indicador: '% de desplazamientos sostenibles (medido en encuesta anual)',
        lineaBase: `${formatNum(sosteniblePct, 1)}%`,
        meta: `${formatNum(metaSostenible, 1)}% en 24 meses`,
        plazo: '24 meses',
        categoria: 'Modo',
        prioridad: 'Alta',
    });
    
    // Objetivo 2: Reducir CO2e
    const metaCO2e = Math.round(co2eAnual * 0.5); // Reducir 50%
    objetivos.push({
        id: 'obj-02',
        descripcion: `Reducir la huella de carbono de los desplazamientos de ${formatNum(co2eAnual, 1)} toneladas CO2e/año a ${metaCO2e} toneladas en 36 meses.`,
        indicador: 'Toneladas CO2e/año (calculado con factores MITECO)',
        lineaBase: `${formatNum(co2eAnual, 1)} t CO2e/año`,
        meta: `${metaCO2e} t CO2e/año en 36 meses`,
        plazo: '36 meses',
        categoria: 'Ambiental',
        prioridad: 'Alta',
    });
    
    // Objetivo 3: Mejorar ocupación de vehículos
    const ocupacionActual = diagnostico.resumen?.ocupacionMediaVehiculos || 1.1;
    objetivos.push({
        id: 'obj-03',
        descripcion: `Incrementar la ocupación media de vehículos del ${formatNum(ocupacionActual, 1)} al 1.5 pasajeros/vehículo en 18 meses.`,
        indicador: 'Ocupación media de vehículos (encuesta trimestral)',
        lineaBase: `${formatNum(ocupacionActual, 1)} pas./veh.`,
        meta: '1.5 pas./veh. en 18 meses',
        plazo: '18 meses',
        categoria: 'Eficiencia',
        prioridad: 'Media',
    });
    
    // Objetivo 4: Infraestructura bici
    objetivos.push({
        id: 'obj-04',
        descripcion: 'Habilitar aparcamiento seguro para bicicletas con recarga eléctrica en el centro de trabajo.',
        indicador: 'Número de plazas de aparcamiento bici con recarga',
        lineaBase: `${centro.plazasBici || 0} plazas`,
        meta: `${Math.max(plantilla * 0.1, 10)} plazas en 12 meses`,
        plazo: '12 meses',
        categoria: 'Infraestructura',
        prioridad: 'Alta',
    });
    
    // Objetivo 5: Encuesta continua
    objetivos.push({
        id: 'obj-05',
        descripcion: 'Mantener una encuesta de movilidad con al menos 20 respuestas válidas cada 6 meses para seguimiento continuo.',
        indicador: 'Número de respuestas por encuesta',
        lineaBase: `${state.encuesta?.respuestas?.length || 0} respuestas`,
        meta: '20 respuestas cada 6 meses',
        plazo: 'Continuo',
        categoria: 'Seguimiento',
        prioridad: 'Media',
    });
    
    // Objetivo 6: Teletrabajo
    const teletrabajoPct = state.empresa?.teletrabajoPct || 0;
    const metaTeletrabajo = Math.min(teletrabajoPct + 10, 40);
    if (metaTeletrabajo > teletrabajoPct) {
        objetivos.push({
            id: 'obj-06',
            descripcion: `Incrementar los días de teletrabajo del ${teletrabajoPct}% actual al ${metaTeletrabajo}% para reducir desplazamientos innecesarios.`,
            indicador: '% de días de teletrabajo (registro RRHH)',
            lineaBase: `${teletrabajoPct}%`,
            meta: `${metaTeletrabajo}% en 12 meses`,
            plazo: '12 meses',
            categoria: 'Organizativa',
            prioridad: 'Media',
        });
    }
    
    // Objetivo 7: Abono transporte
    objetivos.push({
        id: 'obj-07',
        descripcion: 'Implementar un programa de subvención del abono de transporte público para al menos el 30% de los empleados que lo soliciten.',
        indicador: '% de empleados con abono subvencionado',
        lineaBase: '0%',
        meta: '30% en 12 meses',
        plazo: '12 meses',
        categoria: 'Incentivo',
        prioridad: 'Alta',
    });
    
    return objetivos;
}

/**
 * Renderizar objetivos SMART en el DOM
 * @param {Array} objetivos
 */
export function renderObjetivos(objetivos) {
    const container = document.getElementById('objetivos-container');
    if (!container || !objetivos || objetivos.length === 0) return;
    
    container.innerHTML = objetivos.map(obj => `
        <div class="objetivo-card">
            <div class="objetivo-header">
                <h4>${obj.descripcion}</h4>
                <span class="priority-badge priority-${obj.prioridad.toLowerCase()}">${obj.prioridad}</span>
            </div>
            <div class="objetivo-details">
                <div class="objetivo-field">
                    <strong>Indicador:</strong> ${obj.indicador}
                </div>
                <div class="objetivo-field">
                    <strong>Línea base:</strong> ${obj.lineaBase}
                </div>
                <div class="objetivo-field">
                    <strong>Meta:</strong> ${obj.meta}
                </div>
                <div class="objetivo-field">
                    <strong>Plazo:</strong> ${obj.plazo}
                </div>
            </div>
        </div>
    `).join('');
}

/**
 * Inicializar sección de objetivos
 */
export function initObjetivos() {
    const btnGenerar = document.getElementById('btn-generar-objetivos');
    if (!btnGenerar) return;
    
    btnGenerar.addEventListener('click', () => {
        const state = window.appState;
        
        if (!state.diagnostico || !state.dafo || !state.medidas) {
            alert('⚠️ Primero completa el diagnóstico, DAFO y medidas');
            return;
        }
        
        const objetivos = generarObjetivosSMART(
            state.diagnostico,
            state.dafo,
            state.medidas,
            state.centro
        );
        
        state.objetivos = objetivos;
        localStorage.setItem('pmst_objetivos', JSON.stringify(objetivos));
        
        renderObjetivos(objetivos);
        
        // Mostrar container
        const container = document.getElementById('objetivos-container');
        if (container) container.style.display = 'block';
        
        btnGenerar.textContent = '✅ Objetivos generados';
        btnGenerar.disabled = true;
    });
}

/**
 * Cargar objetivos guardados
 */
export function loadSavedObjetivos() {
    const json = localStorage.getItem('pmst_objetivos');
    if (!json) return;
    
    try {
        const objetivos = JSON.parse(json);
        window.appState.objetivos = objetivos;
        renderObjetivos(objetivos);
        
        const btn = document.getElementById('btn-generar-objetivos');
        if (btn) {
            btn.textContent = '✅ Objetivos guardados';
            btn.disabled = true;
        }
    } catch (err) {
        console.error('Error cargando objetivos:', err);
    }
}
