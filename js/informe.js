/**
 * PLANDEMOVILIDAD — Generación de informe con IA (NaN API)
 * 
 * Genera las 16 secciones del informe profesional usando prompts
 * específicos y bien calibrados para cada parte.
 * 
 * 16 prompts diseñados para:
 * - Portada con datos reales del centro
 * - Resumen ejecutivo ejecutivo
 * - Alcance y objetivos del PMST
 * - Marco normativo (RD 314/2006, Ley de Movilidad)
 * - Metodología y fuentes
 * - Caracterización del centro
 * - Diagnóstico territorial (isocronas, accesibilidad)
 * - Diagnóstico de encuesta (reparto modal, barreras)
 * - Seguridad vial
 * - Impacto ambiental (CO2e MITECO)
 * - DAFO
 * - Objetivos SMART
 * - Plan de acción con medidas priorizadas
 * - Comunicación y participación
 * - Seguimiento y evaluación
 * - Anexos
 * 
 * Autor: David Antizar
 */

import { CONFIG } from './config.js';

// ═══════════════════════════════════════════
// PROMPTS ESPECÍFICOS POR SECCIÓN
// ═══════════════════════════════════════════

/**
 * Prompts optimizados para cada sección del informe
 * Diseñados para qwen3.6 con contexto del diagnóstico
 */
const PROMPTS = {
    portada: {
        system: `Eres un experto en movilidad sostenible y redacción de informes técnicos. Genera el contenido de la portada de un Plan de Movilidad Sostenible al Trabajo (PMST/PTST) en formato Markdown.`,
        user: (data) => `Genera la portada del informe para:
- Centro: ${data.centro.nombre}
- Dirección: ${data.centro.direccion}
- Actividad: ${data.centro.actividad || 'No especificada'}
- Plantilla: ${data.centro.plantilla} trabajadores
- Fecha: ${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
- Empresa: ${data.empresa ? data.empresa.nombre || 'No especificada' : 'No especificada'}

Formato:
# PLAN DE MOVILIDAD SOSTENIBLE AL TRABAJO
## ${data.centro.nombre}
### Plan de Movilidad Sostenible al Trabajo (PMST/PTST)

Incluye: fecha, autor, centro, plantilla, dirección.`,
    },
    
    resumen_ejecutivo: {
        system: `Eres un consultor de movilidad sostenible. Genera un resumen ejecutivo profesional y conciso.`,
        user: (data) => `Genera un resumen ejecutivo (máx. 300 palabras) para el PMST de ${data.centro.nombre}.

Datos clave:
- Plantilla: ${data.centro.plantilla} trabajadores
- Reparto modal: ${JSON.stringify(data.diagnostico?.repartoModal || [])}
- Huella CO2e: ${data.diagnostico?.huellaCO2e?.totalCo2eTon || 0} t/año
- Nivel de sostenibilidad: ${data.diagnostico?.resumen?.nivelSostenibilidad || 'N/D'}
- DAFO: Fortalezas=${(data.dafo?.fortalezas || []).length}, Debilidades=${(data.dafo?.debilidades || []).length}, Oportunidades=${(data.dafo?.oportunidades || []).length}, Amenazas=${(data.dafo?.amenazas || []).length}
- Medidas priorizadas: ${data.medidas?.length || 0} medidas identificadas
- Objetivos: ${data.objetivos?.length || 0} objetivos SMART

Estructura: 1) Contexto, 2) Hallazgos principales, 3) Medidas clave, 4) Impacto esperado.`,
    },
    
    alcance_objetivos_gobernanza: {
        system: `Experto en gobernanza de planes de movilidad. Genera el capítulo de alcance y gobernanza.`,
        user: (data) => `Genera el capítulo de Alcance, Objetivos y Gobernanza para el PMST de ${data.centro.nombre}.
- Plantilla: ${data.centro.plantilla}
- Turnos: ${data.centro.turnos?.join(', ') || 'No especificados'}
- Teletrabajo: ${data.empresa?.teletrabajoPct || 0}%
- Días presencial: ${data.empresa?.diasPresencial || 5}

Incluye: ámbito de aplicación, objetivos generales, estructura de gobernanza (comité de movilidad, responsables).`,
    },
    
    marco_normativo: {
        system: `Experto en normativa de movilidad sostenible en España.`,
        user: (data) => `Genera el capítulo de Marco Normativo para el PMST de ${data.centro.nombre}.

Incluye referencias a:
- Real Decreto 314/2006 (código de buenas prácticas)
- Ley de Movilidad Sostenible (Ley 12/2023)
- Real Decreto-ley 8/2021 (ley de movilidad sostenible)
- Normativa autonómica y local aplicable
- Directivas europeas sobre movilidad sostenible

Nota: Las referencias normativas son de conocimiento general. No necesitas buscar datos específicos del centro.`,
    },
    
    metodologia_fuentes: {
        system: `Experto en metodología de estudios de movilidad.`,
        user: (data) => `Genera el capítulo de Metodología y Fuentes de datos para el PMST de ${data.centro.nombre}.

Fuentes utilizadas:
- Encuesta de movilidad (anonimizada, ${data.encuesta?.respuestas?.length || 0} respuestas)
- Factores de emisión CO2e: MITECO 2024
- Isocronas: OpenRouteService v2
- Geocodificación: Nominatim (OpenStreetMap)
- Transporte público: NAP Transportes / GTFS España

Incluye: método de recogida de datos, límites de la encuesta, factores de emisión utilizados.`,
    },
    
    caracterizacion_centro: {
        system: `Experto en caracterización de centros de trabajo.`,
        user: (data) => `Genera la caracterización del centro ${data.centro.nombre}.

Datos:
- Dirección: ${data.centro.direccion}
- Coordenadas: ${data.centro.lat}, ${data.centro.lon}
- Actividad: ${data.centro.actividad || 'No especificada'}
- Plantilla: ${data.centro.plantilla} trabajadores
- Superficie: ${data.centro.superficie ? data.centro.superficie + ' m²' : 'N/D'}
- Turnos: ${data.centro.turnos?.join(', ') || 'No especificados'}

Incluye: descripción del centro, localización, horarios, infraestructuras disponibles.`,
    },
    
    diagnostico_territorial: {
        system: `Experto en análisis territorial de movilidad.`,
        user: (data) => `Genera el diagnóstico territorial del centro ${data.centro.nombre}.

Datos:
- Ubicación: ${data.centro.lat}, ${data.centro.lon}
- Isocronas calculadas: ${data.isocronas ? data.isocronas.length : 0}
- Transporte público: ${data.transitStops ? data.transitStops.length : 0} paradas cercanas

Incluye: análisis de accesibilidad, cobertura de transporte público, entorno urbano.`,
    },
    
    diagnostico_encuesta: {
        system: `Experto en análisis de encuestas de movilidad.`,
        user: (data) => `Genera el diagnóstico basado en la encuesta de movilidad de ${data.centro.nombre}.

Datos de la encuesta:
- Respuestas válidas: ${data.encuesta?.respuestas?.length || 0}
- Reparto modal: ${JSON.stringify(data.diagnostico?.repartoModal || [])}
- Barreras principales: ${JSON.stringify(data.encuesta?.agregados?.barriers || [])}
- Interés en medidas: ${JSON.stringify(data.encuesta?.agregados?.interesMedidas || [])}

Incluye: análisis del reparto modal, distribución de tiempos y distancias, barreras percibidas, demanda de medidas.`,
    },
    
    seguridad_vial: {
        system: `Experto en seguridad vial en entornos de trabajo.`,
        user: (data) => `Genera el capítulo de Seguridad Vial para el PMST de ${data.centro.nombre}.

Incluye: análisis de puntos negros, incidentes reportados en encuesta, medidas de mejora de seguridad vial, recomendaciones para accesos seguros.`,
    },
    
    impacto_ambiental: {
        system: `Experto en evaluación de impacto ambiental de la movilidad.`,
        user: (data) => `Genera el capítulo de Impacto Ambiental para el PMST de ${data.centro.nombre}.

Datos:
- Huella CO2e total: ${data.diagnostico?.huellaCO2e?.totalCo2eTon || 0} t/año
- Por empleado: ${data.diagnostico?.huellaCO2e?.porEmpleadoKg || 0} kg CO2e/año
- Desglose por modo: ${JSON.stringify(data.diagnostico?.huellaCO2e?.desglose || {})}
- Fuente factores: MITECO 2024

Incluye: cálculo de emisiones, comparación con escenarios, objetivos de reducción, compensación.`,
    },
    
    dafo: {
        system: `Experto en análisis DAFO aplicado a movilidad sostenible.`,
        user: (data) => `Genera el capítulo de Análisis DAFO para el PMST de ${data.centro.nombre}.

Fortalezas: ${(data.dafo?.fortalezas || []).join(' | ')}
Debilidades: ${(data.dafo?.debilidades || []).join(' | ')}
Oportunidades: ${(data.dafo?.oportunidades || []).join(' | ')}
Amenazas: ${(data.dafo?.amenazas || []).join(' | ')}

Incluye: matriz DAFO, análisis cruzado (estrategias FO, DO, FA, DA).`,
    },
    
    objetivos_smart: {
        system: `Experto en formulación de objetivos SMART para movilidad sostenible.`,
        user: (data) => `Genera el capítulo de Objetivos SMART para el PMST de ${data.centro.nombre}.

Objetivos ya generados:
${JSON.stringify(data.objetivos || [], null, 2)}

Incluye: descripción de cada objetivo, indicador, línea base, meta, plazo, categoría.`,
    },
    
    plan_accion: {
        system: `Experto en planificación de acción de movilidad sostenible.`,
        user: (data) => `Genera el capítulo de Plan de Acción para el PMST de ${data.centro.nombre}.

Medidas priorizadas:
${JSON.stringify(data.medidas?.slice(0, 10) || [], null, 2)}

Plan de acción:
${JSON.stringify(data.planAccion || {}, null, 2)}

Incluye: cronograma por fases, responsables estimados, presupuesto orientativo, hitos de seguimiento.`,
    },
    
    comunicacion_participacion: {
        system: `Experto en comunicación y participación en planes de movilidad.`,
        user: (data) => `Genera el capítulo de Comunicación y Participación para el PMST de ${data.centro.nombre}.

Incluye: estrategia de comunicación interna, calendario de actividades, mecanismos de participación, campaña de sensibilización, semana sin coche.`,
    },
    
    seguimiento_evaluacion: {
        system: `Experto en seguimiento y evaluación de planes de movilidad.`,
        user: (data) => `Genera el capítulo de Seguimiento y Evaluación para el PMST de ${data.centro.nombre}.

Incluye: indicadores de seguimiento, frecuencia de evaluación, responsables, sistema de reporte, revisión del plan, encuesta de seguimiento.`,
    },
    
    anexos: {
        system: `Experto en documentación técnica de planes de movilidad.`,
        user: (data) => `Genera el capítulo de Anexos para el PMST de ${data.centro.nombre}.

Incluye:
- Anexo A: Cuestionario de encuesta
- Anexo B: Tabla de factores de emisión MITECO
- Anexo C: Resultados completos de la encuesta
- Anexo D: Mapa de isocronas
- Anexo E: Catálogo de medidas completo`,
    },
};

/**
 * Generar una sección del informe usando la API de NaN
 * @param {string} sectionId — ID de la sección
 * @param {Object} data — Datos completos del diagnóstico
 * @returns {Promise<string>} Contenido Markdown generado
 */
export async function generateSection(sectionId, data) {
    const prompt = PROMPTS[sectionId];
    if (!prompt) {
        throw new Error(`Sección no reconocida: ${sectionId}`);
    }
    
    try {
        // Llamar al proxy en server.mjs que reenvía a NaN API
        const response = await fetch(CONFIG.ai.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt: prompt.user(data),
                system: prompt.system,
                model: CONFIG.ai.model,
                temperature: CONFIG.ai.temperature,
                maxTokens: CONFIG.ai.maxTokens,
            }),
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        return result.content || result.text || '';
    } catch (err) {
        console.warn(`⚠️ IA no disponible para sección "${sectionId}": ${err.message}`);
        // Fallback: generar contenido básico con datos reales
        return generateFallbackSection(sectionId, data);
    }
}

/**
 * Generar contenido de fallback sin IA
 * Usa datos reales del diagnóstico para crear contenido mínimo
 */
function generateFallbackSection(sectionId, data) {
    const centro = data.centro || {};
    const diagnostico = data.diagnostico || {};
    const dafo = data.dafo || {};
    const encuesta = data.encuesta || {};
    const medidas = data.medidas || [];
    const objetivos = data.objetivos || [];
    
    const fallbacks = {
        portada: `# PLAN DE MOVILIDAD SOSTENIBLE AL TRABAJO\n\n## ${centro.nombre}\n\n### Plan de Movilidad Sostenible al Trabajo (PMST/PTST)\n\n**Fecha:** ${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}\n**Centro:** ${centro.nombre}\n**Dirección:** ${centro.direccion}\n**Plantilla:** ${centro.plantilla} trabajadores\n\n---\n\n*Generado con PLANDEMOVILIDAD — Herramienta automática de generación de planes de movilidad.*`,
        
        resumen_ejecutivo: `# Resumen Ejecutivo\n\nEste informe presenta el diagnóstico y plan de acción para el centro **${centro.nombre}** (${centro.plantilla} trabajadores).\n\n## Hallazgos principales\n\n- **Reparto modal:** ${diagnostico.repartoModal?.map(m => `${m.modo} (${m.percent.toFixed(1)}%)`).join(', ') || 'No disponible'}\n- **Huella CO2e:** ${diagnostico.huellaCO2e?.totalCo2eTon || 0} toneladas/año\n- **Nivel de sostenibilidad:** ${diagnostico.resumen?.nivelSostenibilidad || 'No determinado'}\n- **Medidas identificadas:** ${medidas.length} medidas priorizadas\n- **Objetivos SMART:** ${objetivos.length} objetivos formulados\n\n## Medidas clave\n\n${medidas.slice(0, 5).map(m => `- **${m.nombre}** (${m.prioridad}): ${m.descripcion}`).join('\n') || 'No se han identificado medidas.'}`,
        
        diagnostico_encuesta: `# Diagnóstico de Encuesta\n\nSe recogieron **${encuesta.respuestas?.length || 0}** respuestas válidas.\n\n## Reparto modal\n\n| Modo | Personas | % |\n|------|----------|---|\n${diagnostico.repartoModal?.map(m => `| ${m.modo} | ${m.count} | ${m.percent.toFixed(1)}% |`).join('\n') || 'No disponible'}\n\n## Barreras principales\n\n${(encuesta.agregados?.barriers || []).map(([bar, count]) => `- ${bar}: ${count} menciones`).join('\n') || 'No se registraron barreras.'}`,
        
        impacto_ambiental: `# Impacto Ambiental\n\n## Huella de carbono\n\n- **Total anual:** ${diagnostico.huellaCO2e?.totalCo2eTon || 0} toneladas CO2e\n- **Por empleado:** ${diagnostico.huellaCO2e?.porEmpleadoKg || 0} kg CO2e/año\n- **Fuente:** Factores de emisión MITECO 2024\n\n## Desglose por modo\n\n| Modo | Factor (kg CO2e/km) | Distancia (km) | CO2e (t/año) |\n|------|---------------------|----------------|---------------|\n${diagnostico.huellaCO2e?.desglose ? Object.entries(diagnostico.huellaCO2e.desglose).map(([modo, d]) => `| ${modo} | ${d.factorKgCO2e.toFixed(3)} | ${d.distanciaKm} | ${d.co2eKgAnual / 1000} |`).join('\n') : 'No disponible'}\n\n## Objetivos de reducción\n\nSe recomienda reducir las emisiones al menos un **50% en 36 meses**, alcanzando ${((diagnostico.huellaCO2e?.totalCo2eTon || 0) * 0.5).toFixed(1)} toneladas CO2e/año.`,
        
        dafo: `# Análisis DAFO\n\n## Fortalezas\n${(dafo.fortalezas || []).map(f => `- ${f}`).join('\n') || 'No se identificaron fortalezas.'}\n\n## Debilidades\n${(dafo.debilidades || []).map(d => `- ${d}`).join('\n') || 'No se identificaron debilidades.'}\n\n## Oportunidades\n${(dafo.oportunidades || []).map(o => `- ${o}`).join('\n') || 'No se identificaron oportunidades.'}\n\n## Amenazas\n${(dafo.amenazas || []).map(a => `- ${a}`).join('\n') || 'No se identificaron amenazas.'}`,
        
        plan_accion: `# Plan de Acción\n\n## Medidas priorizadas\n\n| Prioridad | Medida | Impacto | Coste | Plazo |\n|-----------|--------|---------|-------|-------|\n${medidas.map(m => `| ${m.prioridad} | ${m.nombre} | ${m.impacto}/10 | ${m.coste} | ${m.plazo} |`).join('\n') || 'No se han identificado medidas.'}\n\n## Fases\n\n### Fase 1: Acciones rápidas (0-6 meses)\n${medidas.filter(m => m.prioridad === 'Alta' && m.plazo.includes('Corto')).map(m => `- **${m.nombre}**: ${m.descripcion}`).join('\n') || 'No hay medidas en esta fase.'}\n\n### Fase 2: Consolidación (6-12 meses)\n${medidas.filter(m => m.prioridad === 'Media').map(m => `- **${m.nombre}**: ${m.descripcion}`).join('\n') || 'No hay medidas en esta fase.'}\n\n### Fase 3: Madurez (12-24 meses)\n${medidas.filter(m => m.prioridad === 'Baja').map(m => `- **${m.nombre}**: ${m.descripcion}`).join('\n') || 'No hay medidas en esta fase.'}`,
        
        seguimiento_evaluacion: `# Seguimiento y Evaluación\n\n## Indicadores de seguimiento\n\n1. **% modos sostenibles** — Encuesta semestral\n2. **Huella CO2e** — Cálculo anual con factores MITECO\n3. **Ocupación media vehículos** — Encuesta trimestral\n4. **Uso de infraestructuras** — Contaje mensual\n5. **Satisfacción empleados** — Encuesta anual\n\n## Frecuencia de evaluación\n\n- **Trimestral:** Indicadores de uso de infraestructuras\n- **Semestral:** Encuesta de movilidad\n- **Anual:** Cálculo de huella CO2e y revisión de objetivos\n\n## Responsables\n\n- **Coordinador de movilidad:** Responsable del seguimiento\n- **Comité de movilidad:** Revisión semestral\n- **Dirección:** Aprobación anual del plan`,
        
        anexos: `# Anexos\n\n## Anexo A: Cuestionario de encuesta\n\nEl cuestionario de encuesta de movilidad incluyó los siguientes bloques:\n\n1. **Modalidad laboral:** turno, días presencial\n2. **Desplazamiento habitual:** origen, modo principal/secundario, tiempo, distancia, coste\n3. **Barreras:** seguridad, infraestructura, horario, coste, clima\n4. **Interés en medidas:** ayuda bici, abono transporte, flexibilidad, teletrabajo\n5. **Seguridad vial:** accidentes, zonas peligrosas\n\n## Anexo B: Factores de emisión MITECO 2024\n\n| Modo | Factor (kg CO2e/km) |\n|------|---------------------|\n| Gasolina | 0.171 |\n| Diésel | 0.158 |\n| Eléctrico | 0.053 |\n| Autobús | 0.063 |\n| Tren | 0.030 |\n| Motocicleta | 0.103 |\n| Avión | 0.255 |\n| Bicicleta | 0.000 |\n| Caminar | 0.000 |\n\nFuente: MITECO — https://www.miteco.gob.es/es/cambio-climatico/temas/mitigacion-politicas-y-medidas/huella-carbono.html`,
    };
    
    // Fallback genérico para secciones sin template específico
    if (!fallbacks[sectionId]) {
        return `# ${sectionId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}\n\nContenido generado automáticamente para el centro **${centro.nombre}**.\n\nPara contenido detallado, se requiere conexión con la API de IA generativa.`;
    }
    
    return fallbacks[sectionId];
}

/**
 * Generar el informe completo con todas las secciones
 * @param {Object} data — Estado completo de la app
 * @param {Array} sections — Secciones a generar (default: todas)
 * @returns {Promise<string>} Informe completo en Markdown
 */
export async function generateFullReport(data, sections = null) {
    const allSections = CONFIG.ai.sections;
    const sectionsToGenerate = sections || allSections;
    
    const reportParts = [];
    let completed = 0;
    const total = sectionsToGenerate.length;
    
    // Actualizar progreso
    const progressEl = document.getElementById('informe-progress');
    if (progressEl) {
        progressEl.textContent = `Generando sección 1 de ${total}...`;
    }
    
    for (const sectionId of sectionsToGenerate) {
        try {
            const content = await generateSection(sectionId, data);
            reportParts.push(content);
            completed++;
            
            if (progressEl) {
                progressEl.textContent = `Generando sección ${completed} de ${total}...`;
            }
        } catch (err) {
            console.error(`Error generando sección "${sectionId}":`, err);
            // Incluir fallback en caso de error
            const fallback = generateFallbackSection(sectionId, data);
            reportParts.push(`> ⚠️ Error generando esta sección con IA. Contenido de fallback:\n\n${fallback}`);
            completed++;
            
            if (progressEl) {
                progressEl.textContent = `Sección ${completed} de ${total} (error IA, fallback usado)`;
            }
        }
    }
    
    // Unir todas las secciones
    const fullReport = reportParts.join('\n\n---\n\n');
    
    // Guardar en estado
    window.appState.informe.estado = 'complete';
    window.appState.informe.contenido = fullReport;
    localStorage.setItem('pmst_informe', fullReport);
    
    if (progressEl) {
        progressEl.textContent = `✅ Informe completo generado (${completed}/${total} secciones)`;
    }
    
    return fullReport;
}

/**
 * Cargar informe guardado
 */
export function loadSavedInforme() {
    const json = localStorage.getItem('pmst_informe');
    if (!json) return;
    
    try {
        window.appState.informe.contenido = json;
        window.appState.informe.estado = 'complete';
        
        // Actualizar editor y preview
        const editor = document.getElementById('informe-editor');
        const preview = document.getElementById('informe-preview');
        
        if (editor) editor.value = json;
        if (preview) preview.innerHTML = markdownToHTML(json);
        
        const btn = document.getElementById('btn-generar-informe');
        if (btn) {
            btn.textContent = '✅ Informe guardado';
            btn.disabled = true;
        }
    } catch (err) {
        console.error('Error cargando informe guardado:', err);
    }
}

/**
 * Convertir Markdown a HTML simple
 * @param {string} md — Markdown
 * @returns {string} HTML
 */
export function markdownToHTML(md) {
    if (!md) return '';
    
    return md
        // Headers
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h1>$1</h1>')
        // Bold
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        // Italic
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        // Tables
        .replace(/\|(.+)\|/g, (match) => {
            if (match.includes('---')) return ''; // Saltar separador
            const cells = match.split('|').filter(c => c.trim());
            const isHeader = false;
            return '<tr>' + cells.map(c => `<td>${c.trim()}</td>`).join('') + '</tr>';
        })
        // Horizontal rules
        .replace(/^---$/gm, '<hr>')
        // Line breaks
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>')
        // Wrap in paragraph
        .replace(/^(.*)$/, '<p>$1</p>')
        // Clean up
        .replace(/<p><(h[123]|hr|tr)/g, '<$1')
        .replace(/<\/(h[123]|hr|tr)><\/p>/g, '</$1>');
}

/**
 * Actualizar la vista previa del informe
 */
export function updateInformePreview() {
    const editor = document.getElementById('informe-editor');
    const preview = document.getElementById('informe-preview');
    
    if (!editor || !preview) return;
    
    const md = editor.value;
    preview.innerHTML = markdownToHTML(md);
}

/**
 * Inicializar sección de informe
 */
export function initInforme() {
    const btnGenerar = document.getElementById('btn-generar-informe');
    const editor = document.getElementById('informe-editor');
    const preview = document.getElementById('informe-preview');
    
    // Live preview
    if (editor && preview) {
        editor.addEventListener('input', updateInformePreview);
    }
    
    if (btnGenerar) {
        btnGenerar.addEventListener('click', async () => {
            const state = window.appState;
            
            // Verificar que todas las secciones previas están completas
            if (!state.centro || !state.diagnostico || !state.dafo || !state.medidas || !state.objetivos) {
                alert('⚠️ Primero completa todas las secciones: Centro, Diagnóstico, DAFO, Medidas y Objetivos');
                return;
            }
            
            btnGenerar.textContent = '⏳ Generando informe...';
            btnGenerar.disabled = true;
            
            // Preparar datos para la IA
            const data = {
                centro: state.centro,
                empresa: state.empresa,
                diagnostico: state.diagnostico,
                dafo: state.dafo,
                encuesta: state.encuesta,
                medidas: state.medidas,
                objetivos: state.objetivos,
                planAccion: state.planAccion,
                isocronas: state.isocronas || [],
                transitStops: state.transitStops || [],
            };
            
            try {
                const report = await generateFullReport(data);
                
                if (editor) editor.value = report;
                if (preview) preview.innerHTML = markdownToHTML(report);
                
                btnGenerar.textContent = '✅ Informe generado';
            } catch (err) {
                console.error('Error generando informe:', err);
                alert('❌ Error generando el informe. Revisa la consola para más detalles.');
                btnGenerar.textContent = '❌ Error — Reintentar';
                btnGenerar.disabled = false;
            }
        });
    }
}
