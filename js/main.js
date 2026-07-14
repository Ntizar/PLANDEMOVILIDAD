/**
 * PLANDEMOVILIDAD — Orquestador principal (main.js)
 * 
 * Wrapper que re-exporta funciones de módulos especializados.
 * Usa cache-busting en imports para evitar stale cache del browser.
 * 
 * Autor: David Antizar
 */

// ── Imports con cache-busting ─────────────────────────────────
import { calcularDiagnostico as _calcDiag } from './diagnostico.js?v=2';
import { calcularDAFO as _calcDafo, priorizarMedidas as _priorMed } from './dafo.js?v=2';
import { generarObjetivosSMART as _genObj } from './objetivos.js?v=2';
import { initMap, loadIsocrones, loadParadas, loadPOI, loadEmpleadosMarkers } from './mapa.js?v=2';

export { initMap, loadIsocrones, loadParadas, loadPOI, loadEmpleadosMarkers };

/**
 * Calcular diagnóstico
 */
export function calcularDiagnostico(state) {
    return _calcDiag(state);
}

/**
 * Calcular DAFO
 */
export function calcularDAFO(diagnostico, encuesta) {
    return _calcDafo(diagnostico, encuesta);
}

/**
 * Generar medidas — prioriza desde DAFO + diagnóstico
 */
export function generarMedidas(state) {
    const diagnostico = state.diagnostico || _calcDiag(state);
    const encuesta = state.encuesta || { agregados: {} };
    const dafo = _calcDafo(diagnostico, encuesta);
    return _priorMed(dafo, diagnostico);
}

/**
 * Generar objetivos SMART — desde diagnóstico + DAFO + medidas
 */
export function generarObjetivos(state) {
    const diagnostico = state.diagnostico || _calcDiag(state);
    const encuesta = state.encuesta || { agregados: {} };
    const dafo = _calcDafo(diagnostico, encuesta);
    const medidas = state.medidas || generarMedidas(state);
    const centro = state.centro || {};
    return _genObj(diagnostico, dafo, medidas, centro);
}
