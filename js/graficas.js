/**
 * PLANDEMOVILIDAD v2.0 — Gráficas avanzadas con Chart.js
 * 
 * Tipos de gráficas:
 * - Reparto modal (doughnut)
 * - Evolución temporal de KPIs (line)
 * - Comparativas centro vs nacional (bar)
 * - Distribución por departamento (bar horizontal)
 * - Co2e por modo (bar)
 * - Progreso de objetivos (polar area)
 * - Mapa de calor de distancias (scatter)
 * 
 * Autor: David Antizar
 */

import { CONFIG } from './config.js';

const BLUE = '#2563eb';
const ORANGE = '#f97316';
const GREEN = '#16a34a';
const RED = '#dc2626';
const GRAY = '#6b7280';
const COLORS = [BLUE, ORANGE, GREEN, RED, '#9333ea', '#0891b2', '#ea580c', '#6b7280'];

// ═══════════════════════════════════════════
// GRÁFICA: REPARTO MODAL (Doughnut)
// ═══════════════════════════════════════════

export function createModalSplitChart(containerId, datos) {
    const ctx = document.getElementById(containerId);
    if (!ctx) return null;
    
    const labels = Object.keys(datos);
    const values = Object.values(datos);
    
    // Filtrar modos con 0
    const filtered = labels.filter((_, i) => values[i] > 0);
    const filteredValues = values.filter(v => v > 0);
    
    return new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: filtered,
            datasets: [{
                data: filteredValues,
                backgroundColor: COLORS.slice(0, filtered.length),
                borderWidth: 2,
                borderColor: '#ffffff',
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { padding: 15, font: { size: 11 } }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const pct = Math.round(context.parsed / total * 100);
                            return `${context.label}: ${context.parsed} (${pct}%)`;
                        }
                    }
                }
            },
            cutout: '60%',
        }
    });
}

// ═══════════════════════════════════════════
// GRÁFICA: EVOLUCIÓN TEMPORAL (Line)
// ═══════════════════════════════════════════

export function createEvolucionChart(containerId, datosKPI) {
    const ctx = document.getElementById(containerId);
    if (!ctx) return null;
    
    const datasets = [];
    Object.keys(datosKPI).forEach((kpi, idx) => {
        const registros = datosKPI[kpi];
        datasets.push({
            label: kpi,
            data: registros.map(r => ({ x: r.fecha, y: r.valor })),
            borderColor: COLORS[idx % COLORS.length],
            backgroundColor: COLORS[idx % COLORS.length] + '20',
            tension: 0.3,
            fill: false,
            pointRadius: 4,
            pointHoverRadius: 6,
        });
    });
    
    return new Chart(ctx, {
        type: 'line',
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    type: 'category',
                    title: { display: true, text: 'Fecha' }
                },
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Valor' }
                }
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { padding: 15 }
                }
            }
        }
    });
}

// ═══════════════════════════════════════════
// GRÁFICA: COMPARATIVAS (Bar)
// ═══════════════════════════════════════════

export function createComparativasChart(containerId, datos) {
    const ctx = document.getElementById(containerId);
    if (!ctx) return null;
    
    const labels = ['Coche', 'Transporte público', 'Bicicleta', 'Caminando', 'Teletrabajo'];
    const centro = labels.map(l => {
        const key = l === 'Coche' ? 'coche_particular' :
                    l === 'Transporte público' ? 'transporte_publico' :
                    l === 'Bicicleta' ? 'bicicleta' :
                    l === 'Caminando' ? 'caminando' : 'teletrabajo';
        return Math.round((datos.centro[key] || 0) * 100);
    });
    const nacional = labels.map(l => {
        const key = l === 'Coche' ? 'coche_particular' :
                    l === 'Transporte público' ? 'transporte_publico' :
                    l === 'Bicicleta' ? 'bicicleta' :
                    l === 'Caminando' ? 'caminando' : 'teletrabajo';
        return Math.round((datos.nacional[key] || 0) * 100);
    });
    
    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Tu centro',
                    data: centro,
                    backgroundColor: BLUE,
                    borderRadius: 4,
                },
                {
                    label: 'Media nacional',
                    data: nacional,
                    backgroundColor: GRAY,
                    borderRadius: 4,
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: { display: true, text: '% de empleados' },
                    ticks: { callback: v => v + '%' }
                }
            },
            plugins: {
                legend: { position: 'bottom' },
                tooltip: {
                    callbacks: {
                        label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y}%`
                    }
                }
            }
        }
    });
}

// ═══════════════════════════════════════════
// GRÁFICA: CO2E POR MODO (Horizontal Bar)
// ═══════════════════════════════════════════

export function createCO2eChart(containerId, datos) {
    const ctx = document.getElementById(containerId);
    if (!ctx) return null;
    
    const labels = Object.keys(datos);
    const values = Object.values(datos);
    
    // Ordenar por valor
    const sorted = labels.map((l, i) => ({ label: l, value: values[i] }))
        .sort((a, b) => b.value - a.value);
    
    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sorted.map(s => s.label),
            datasets: [{
                label: 'kg CO2e/año',
                data: sorted.map(s => s.value),
                backgroundColor: sorted.map((_, i) => COLORS[i % COLORS.length]),
                borderRadius: 4,
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    beginAtZero: true,
                    title: { display: true, text: 'kg CO2e/año' }
                }
            },
            plugins: {
                legend: { display: false },
            }
        }
    });
}

// ═══════════════════════════════════════════
// GRÁFICA: PROGRESO DE OBJETIVOS (Polar Area)
// ═══════════════════════════════════════════

export function createObjetivosChart(containerId, objetivos) {
    const ctx = document.getElementById(containerId);
    if (!ctx) return null;
    
    const labels = objetivos.map(o => o.titulo || o.nombre);
    const valores = objetivos.map(o => {
        if (o.progreso !== undefined) return o.progreso;
        // Calcular progreso estimado
        const lineaBase = parseFloat(o.lineaBase) || 0;
        const meta = parseFloat(o.meta) || 0;
        const actual = parseFloat(o.actual) || lineaBase;
        if (lineaBase === 0) return 0;
        return Math.min(100, Math.round((actual / meta) * 100));
    });
    
    return new Chart(ctx, {
        type: 'polarArea',
        data: {
            labels,
            datasets: [{
                data: valores,
                backgroundColor: COLORS.slice(0, labels.length).map(c => c + '80'),
                borderColor: COLORS.slice(0, labels.length),
                borderWidth: 2,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        callback: v => v + '%',
                        stepSize: 25,
                    }
                }
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { font: { size: 10 }, padding: 10 }
                }
            }
        }
    });
}

// ═══════════════════════════════════════════
// GRÁFICA: DISTRIBUCIÓN POR DEPARTAMENTO (Bar Horizontal)
// ═══════════════════════════════════════════

export function createDepartamentosChart(containerId, datos) {
    const ctx = document.getElementById(containerId);
    if (!ctx) return null;
    
    const labels = Object.keys(datos);
    const valores = Object.values(datos);
    
    // Ordenar
    const sorted = labels.map((l, i) => ({ label: l, count: valores[i] }))
        .sort((a, b) => b.count - a.count);
    
    return new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sorted.map(s => s.label),
            datasets: [{
                label: 'Empleados',
                data: sorted.map(s => s.count),
                backgroundColor: BLUE,
                borderRadius: 4,
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { beginAtZero: true }
            },
            plugins: { legend: { display: false } }
        }
    });
}

// ═══════════════════════════════════════════
// GRÁFICA: MAPA DE CALOR DE DISTANCIAS (Scatter)
// ═══════════════════════════════════════════

export function createDistanciasChart(containerId, datos) {
    const ctx = document.getElementById(containerId);
    if (!ctx) return null;
    
    // Datos de ejemplo: distancia vs tiempo de viaje
    const scatterData = datos.map((d, i) => ({
        x: d.distancia_km || 0,
        y: d.tiempo_viaje_min || 0,
        r: 5,
    }));
    
    return new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Empleados',
                data: scatterData,
                backgroundColor: BLUE + '80',
                borderColor: BLUE,
                borderWidth: 1,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: { display: true, text: 'Distancia (km)' },
                    beginAtZero: true,
                },
                y: {
                    title: { display: true, text: 'Tiempo (min)' },
                    beginAtZero: true,
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => `Dist: ${ctx.parsed.x} km, Tiempo: ${ctx.parsed.y} min`
                    }
                }
            }
        }
    });
}

// ═══════════════════════════════════════════
// GRÁFICA: FLOTA POR COMBUSTIBLE (Pie)
// ═══════════════════════════════════════════

export function createFlotaChart(containerId, datos) {
    const ctx = document.getElementById(containerId);
    if (!ctx) return null;
    
    const labels = Object.keys(datos);
    const values = Object.values(datos);
    
    return new Chart(ctx, {
        type: 'pie',
        data: {
            labels,
            datasets: [{
                data: values,
                backgroundColor: [BLUE, GREEN, ORANGE, RED, '#9333ea'],
                borderWidth: 2,
                borderColor: '#ffffff',
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom' },
                tooltip: {
                    callbacks: {
                        label: ctx => `${ctx.label}: ${ctx.parsed} vehículos`
                    }
                }
            }
        }
    });
}

// ═══════════════════════════════════════════
// GRÁFICA: COBERTURA DE TRANSPORTE (Doughnut)
// ═══════════════════════════════════════════

export function createCoberturaChart(containerId, datos) {
    const ctx = document.getElementById(containerId);
    if (!ctx) return null;
    
    const cobertura500m = datos.cobertura500m || 0;
    const total = datos.totalParadas || 1;
    const pctCobertura = Math.round(cobertura500m / total * 100);
    
    return new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Cobertura (<500m)', 'Sin cobertura'],
            datasets: [{
                data: [cobertura500m, total - cobertura500m],
                backgroundColor: [GREEN, GRAY],
                borderWidth: 2,
                borderColor: '#ffffff',
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: { position: 'bottom' },
                title: {
                    display: true,
                    text: `Cobertura: ${pctCobertura}%`,
                    font: { size: 16 },
                }
            }
        }
    });
}

// ═══════════════════════════════════════════
// EXPORTAR GRÁFICAS COMO IMÁGENES
// ═══════════════════════════════════════════

export function exportChartAsPNG(chartInstance, filename) {
    if (!chartInstance) return;
    const canvas = chartInstance.canvas;
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
}

// ═══════════════════════════════════════════
// FUNCIONES GLOBALES
// ═══════════════════════════════════════════

window.pmstApp = window.pmstApp || {};
window.pmstApp.charts = {};

export { BLUE, ORANGE, GREEN, RED, GRAY, COLORS };
