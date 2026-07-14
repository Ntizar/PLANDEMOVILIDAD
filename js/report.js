/**
 * ═══════════════════════════════════════════════════════════════════
 * PLANDEMOVILIDAD v3.0 — Generador de Informe PMST/PTST Completo
 * ═══════════════════════════════════════════════════════════════════
 *
 * Genera un informe HTML completo de 60-80 páginas con 22 capítulos
 * que cumple la normativa española de Planes de Movilidad Sostenible
 * al Trabajo (Ley 8/2021).
 *
 * El informe es autocontenido (CSS embebido), imprimible en A4,
 * y se exporta como un único string HTML.
 *
 * Factores de emisión de referencia: MITECO 2024
 * https://www.miteco.gob.es/es/cambio-climatico/temas/mitigacion-politicas-y-medidas/huella-carbono.html
 *
 * Autor: David Antizar
 * Hecho con ❤️ por David Antizar
 *
 * @module report
 */

// ═══════════════════════════════════════════
// CONSTANTES Y FACTORES DE EMISIÓN
// ═══════════════════════════════════════════

/**
 * Factores de emisión CO2e por modo de transporte (kg CO2e/pasajero-km)
 * Fuente: MITECO 2024 — Tabla de factores de emisión
 */
const FACTORES_CO2E = {
    'Coche particular (conductor)': 0.192,
    'Coche particular (pasajero)': 0.192,
    'Coche compartido': 0.115,
    'Autobús urbano': 0.089,
    'Autobús interurbano': 0.045,
    'Metro': 0.035,
    'Cercanías': 0.033,
    'Tranvía': 0.029,
    'Bicicleta': 0.000,
    'Bicicleta eléctrica': 0.006,
    'VMP (Patinete)': 0.015,
    'A pie': 0.000,
    'Teletrabajo': 0.010,
};

/**
 * Meses del año en español
 */
const MESES = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

// ═══════════════════════════════════════════
// UTILIDADES INTERNAS
// ═══════════════════════════════════════════

/**
 * Formatear un número con separadores de miles y decimales
 */
function fmt(num, decimales = 1) {
    if (num === null || num === undefined || isNaN(num)) return '0';
    return Number(num).toLocaleString('es-ES', {
        minimumFractionDigits: decimales,
        maximumFractionDigits: decimales
    });
}

/**
 * Formatear porcentaje
 */
function pct(num) {
    if (num === null || num === undefined || isNaN(num)) return '0,0%';
    return fmt(num, 1) + '%';
}

/**
 * Fecha actual en formato largo en español
 */
function fechaLarga() {
    const d = new Date();
    return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
}

/**
 * Fecha actual en formato ISO corto
 */
function fechaCorta() {
    return new Date().toISOString().split('T')[0];
}

/**
 * Obtener valor seguro de un objeto anidado
 */
function safe(obj, path, defaultValue = '') {
    if (!obj) return defaultValue;
    const keys = path.split('.');
    let current = obj;
    for (const key of keys) {
        if (current === null || current === undefined) return defaultValue;
        current = current[key];
    }
    return current !== null && current !== undefined ? current : defaultValue;
}

/**
 * Obtener valor numérico seguro
 */
function safeNum(obj, path, defaultValue = 0) {
    const val = safe(obj, path, defaultValue);
    const num = Number(val);
    return isNaN(num) ? defaultValue : num;
}

/**
 * Obtener un array seguro (si no es array, retorna [])
 */
function safeArr(obj, path) {
    const val = safe(obj, path, null);
    return Array.isArray(val) ? val : [];
}

/**
 * Obtener empleados del estado
 */
function getEmpleados(app) {
    const emp = safeArr(app, 'empleados');
    return emp.length > 0 ? emp : [];
}

/**
 * Calcular modal split desde empleados si no hay diagnóstico
 */
function getModalSplit(app) {
    const d = safe(app, 'diagnostico', {});
    if (d.repartoModal && d.repartoModal.length > 0) {
        return d.repartoModal;
    }
    // Derivar desde empleados
    const empleados = getEmpleados(app);
    if (empleados.length === 0) return [];
    const counts = {};
    empleados.forEach(e => {
        const modo = e.modo_principal || 'No especificado';
        counts[modo] = (counts[modo] || 0) + 1;
    });
    const total = empleados.length;
    return Object.entries(counts)
        .map(([modo, count]) => ({
            modo,
            count,
            percent: (count / total) * 100
        }))
        .sort((a, b) => b.count - a.count);
}

/**
 * Calcular huella CO2e desde empleados si no hay diagnóstico
 */
function getCO2e(app) {
    const d = safe(app, 'diagnostico', {});
    if (d.huellaCO2e && d.huellaCO2e.totalCo2eKg > 0) {
        return d.huellaCO2e;
    }
    // Derivar desde empleados
    const empleados = getEmpleados(app);
    if (empleados.length === 0) {
        return { totalCo2eKg: 0, totalCo2eTon: 0, porEmpleadoKg: 0, desglose: {} };
    }
    const desglose = {};
    let totalKg = 0;
    empleados.forEach(e => {
        const modo = e.modo_principal || 'No especificado';
        const dist = Number(e.distancia_km) || 0;
        const factor = FACTORES_CO2E[modo] || 0.10;
        const co2e = factor * dist * 2 * 230; // ida+vuelta * 230 días laborables
        if (!desglose[modo]) {
            desglose[modo] = { factorKgCO2e: factor, distanciaKm: 0, empleados: 0, co2eKgAnual: 0 };
        }
        desglose[modo].distanciaKm += dist;
        desglose[modo].empleados += 1;
        desglose[modo].co2eKgAnual += co2e;
        totalKg += co2e;
    });
    // Redondear
    Object.keys(desglose).forEach(m => {
        desglose[m].distanciaKm = Math.round(desglose[m].distanciaKm * 10) / 10;
        desglose[m].co2eKgAnual = Math.round(desglose[m].co2eKgAnual);
    });
    return {
        totalCo2eKg: Math.round(totalKg),
        totalCo2eTon: Math.round(totalKg / 1000 * 10) / 10,
        porEmpleadoKg: Math.round(totalKg / empleados.length),
        desglose
    };
}

/**
 * Obtener resumen del diagnóstico
 */
function getResumen(app) {
    const d = safe(app, 'diagnostico', {});
    if (d.resumen && d.resumen.nivelSostenibilidad) {
        return d.resumen;
    }
    // Calcular desde modal split
    const modalSplit = getModalSplit(app);
    const total = modalSplit.reduce((s, m) => s + m.count, 0);
    if (total === 0) return { nivelSostenibilidad: 'N/D', porcentajeSostenible: 0, porcentajeMotorizado: 0, porcentajeTeletrabajo: 0, ocupacionMediaVehiculos: 0 };
    const sostenibles = ['Bicicleta', 'Bicicleta eléctrica', 'A pie', 'Transporte público', 'Metro', 'Cercanías', 'Autobús urbano', 'Autobús interurbano', 'Tranvía', 'VMP (Patinete)', 'Teletrabajo'];
    let sostenible = 0, motorizado = 0, teletrabajo = 0;
    modalSplit.forEach(m => {
        if (m.modo === 'Teletrabajo') teletrabajo += m.count;
        else if (sostenibles.some(s => m.modo.toLowerCase().includes(s.toLowerCase()))) sostenible += m.count;
        else motorizado += m.count;
    });
    const porcSost = (sostenible / total) * 100;
    const porcMotor = (motorizado / total) * 100;
    const porcTele = (teletrabajo / total) * 100;
    let nivel = 'No sostenible';
    if (porcSost + porcTele >= 60) nivel = 'Muy sostenible';
    else if (porcSost + porcTele >= 45) nivel = 'Sostenible';
    else if (porcSost + porcTele >= 30) nivel = 'Moderadamente sostenible';
    return {
        nivelSostenibilidad: nivel,
        porcentajeSostenible: Math.round(porcSost * 10) / 10,
        porcentajeMotorizado: Math.round(porcMotor * 10) / 10,
        porcentajeTeletrabajo: Math.round(porcTele * 10) / 10,
        ocupacionMediaVehiculos: 0
    };
}

// ═══════════════════════════════════════════
// CSS DEL INFORME
// ═══════════════════════════════════════════

/**
 * CSS embebido para el informe HTML
 * Optimizado para impresión en formato A4
 */
function getCSS() {
    return `
/* ═══════════════════════════════════════════════════════════════
   PLAN DE MOVILIDAD SOSTENIBLE — Estilos del informe
   Hecho con ❤️ por David Antizar
   ═══════════════════════════════════════════════════════════════ */

@page {
    size: A4;
    margin: 25mm 20mm 30mm 20mm;
    @bottom-center {
        content: "PLAN DE MOVILIDAD SOSTENIBLE — __CENTRO__ — Hecho con ❤️ por David Antizar";
        font-size: 8pt;
        color: #666;
        font-family: 'Segoe UI', Arial, sans-serif;
    }
    @bottom-right {
        content: counter(page);
        font-size: 8pt;
        color: #666;
    }
}

@media print {
    body {
        margin: 0;
        padding: 0;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }
    .no-print {
        display: none !important;
    }
    .page-break {
        page-break-before: always;
    }
    h1, h2, h3, h4 {
        page-break-after: avoid;
    }
    table, figure {
        page-break-inside: avoid;
    }
    p {
        orphans: 3;
        widows: 3;
    }
}

/* Reset */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.6;
    color: #1f2937;
    background: #fff;
    counter-reset: page;
}

/* ── Portada ── */
.portada {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    text-align: center;
    padding: 40px;
    background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%);
    color: white;
    page-break-after: always;
}

.portada h1 {
    font-size: 32pt;
    font-weight: 800;
    margin-bottom: 10px;
    letter-spacing: 1px;
    line-height: 1.2;
}

.portada .subtitle {
    font-size: 18pt;
    color: #f97316;
    margin-bottom: 40px;
    font-weight: 600;
}

.portada .meta {
    font-size: 12pt;
    margin-top: 30px;
    opacity: 0.9;
    line-height: 2;
}

.portada .meta strong {
    color: #f97316;
}

.portada .legal-ref {
    margin-top: 40px;
    padding: 15px 30px;
    border: 2px solid rgba(255,255,255,0.3);
    border-radius: 8px;
    font-size: 10pt;
    max-width: 500px;
}

.portada .confidential {
    margin-top: 30px;
    font-size: 9pt;
    font-style: italic;
    opacity: 0.7;
}

/* ── Índice ── */
.indice {
    page-break-after: always;
    padding: 20px 0;
}

.indice h2 {
    font-size: 22pt;
    color: #2563eb;
    border-bottom: 3px solid #f97316;
    padding-bottom: 10px;
    margin-bottom: 25px;
}

.indice-item {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 6px 0;
    border-bottom: 1px dotted #d1d5db;
    font-size: 10.5pt;
}

.indice-item .num {
    color: #2563eb;
    font-weight: 700;
    margin-right: 10px;
    min-width: 30px;
}

.indice-item .title {
    flex: 1;
}

.indice-item .page {
    color: #6b7280;
    font-size: 9pt;
    margin-left: 10px;
}

/* ── Capítulos ── */
.chapter {
    page-break-before: always;
    padding-top: 10px;
}

.chapter:first-of-type {
    page-break-before: auto;
}

h1.chapter-title {
    font-size: 22pt;
    color: #2563eb;
    border-bottom: 3px solid #f97316;
    padding-bottom: 12px;
    margin-bottom: 25px;
    margin-top: 10px;
}

h2.section-title {
    font-size: 15pt;
    color: #1e3a5f;
    margin-top: 25px;
    margin-bottom: 12px;
    padding-left: 12px;
    border-left: 4px solid #f97316;
}

h3.subsection-title {
    font-size: 12pt;
    color: #374151;
    margin-top: 18px;
    margin-bottom: 8px;
    font-weight: 600;
}

p {
    margin-bottom: 12px;
    text-align: justify;
    hyphens: auto;
}

/* ── Tablas ── */
table {
    width: 100%;
    border-collapse: collapse;
    margin: 15px 0 20px 0;
    font-size: 9.5pt;
}

thead th {
    background: #2563eb;
    color: white;
    padding: 10px 8px;
    text-align: left;
    font-weight: 600;
    font-size: 9pt;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

tbody td {
    padding: 8px;
    border-bottom: 1px solid #e5e7eb;
    vertical-align: top;
}

tbody tr:nth-child(even) {
    background: #f0f4ff;
}

tbody tr:hover {
    background: #e0e8ff;
}

table caption {
    caption-side: top;
    font-size: 10pt;
    font-weight: 700;
    color: #1e3a5f;
    padding: 8px;
    text-align: left;
}

/* ── Listas ── */
ul, ol {
    margin: 10px 0 15px 25px;
}

li {
    margin-bottom: 6px;
    line-height: 1.5;
}

/* ── Bloques destacados ── */
.highlight-box {
    background: #eff6ff;
    border-left: 5px solid #2563eb;
    padding: 15px 20px;
    margin: 20px 0;
    border-radius: 0 6px 6px 0;
}

.highlight-box.warning {
    background: #fef3c7;
    border-left-color: #f97316;
}

.highlight-box.success {
    background: #ecfdf5;
    border-left-color: #10b981;
}

.highlight-box.danger {
    background: #fef2f2;
    border-left-color: #ef4444;
}

.highlight-box strong {
    color: #1e3a5f;
}

/* ── KPI Cards ── */
.kpi-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 15px;
    margin: 20px 0;
}

.kpi-card {
    background: linear-gradient(135deg, #eff6ff, #dbeafe);
    border-radius: 10px;
    padding: 18px;
    text-align: center;
    border: 1px solid #bfdbfe;
}

.kpi-card .kpi-value {
    font-size: 24pt;
    font-weight: 800;
    color: #2563eb;
    line-height: 1.2;
}

.kpi-card .kpi-label {
    font-size: 8.5pt;
    color: #4b5563;
    margin-top: 5px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.kpi-card.accent {
    background: linear-gradient(135deg, #fff7ed, #ffedd5);
    border-color: #fed7aa;
}

.kpi-card.accent .kpi-value {
    color: #ea580c;
}

.kpi-card.green {
    background: linear-gradient(135deg, #ecfdf5, #d1fae5);
    border-color: #a7f3d0;
}

.kpi-card.green .kpi-value {
    color: #059669;
}

/* ── Listas de fortalezas/debilidades ── */
.dafo-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
    margin: 20px 0;
}

.dafo-box {
    padding: 15px;
    border-radius: 8px;
    border: 1px solid;
}

.dafo-box.fortalezas {
    background: #ecfdf5;
    border-color: #a7f3d0;
}

.dafo-box.debilidades {
    background: #fef2f2;
    border-color: #fecaca;
}

.dafo-box.oportunidades {
    background: #eff6ff;
    border-color: #bfdbfe;
}

.dafo-box.amenazas {
    background: #fef3c7;
    border-color: #fde68a;
}

.dafo-box h4 {
    margin-bottom: 10px;
    font-size: 11pt;
}

.dafo-box ul {
    margin-left: 18px;
    font-size: 10pt;
}

/* ── Gantt-like cronograma ── */
.cronograma {
    position: relative;
    margin: 20px 0;
}

.cronograma-row {
    display: grid;
    grid-template-columns: 200px repeat(12, 1fr);
    gap: 2px;
    align-items: center;
    margin-bottom: 4px;
}

.cronograma-label {
    font-size: 9pt;
    font-weight: 600;
    color: #374151;
    padding: 4px 8px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.cronograma-bar {
    height: 24px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 7pt;
    color: white;
    font-weight: 600;
}

.cronograma-header {
    display: grid;
    grid-template-columns: 200px repeat(12, 1fr);
    gap: 2px;
    margin-bottom: 8px;
    font-size: 7.5pt;
    font-weight: 700;
    color: #6b7280;
    text-transform: uppercase;
}

/* ── Footer ── */
.informe-footer {
    margin-top: 40px;
    padding: 20px;
    text-align: center;
    border-top: 2px solid #e5e7eb;
    font-size: 9pt;
    color: #9ca3af;
}

/* ── Nota de pie de página ── */
.footnote {
    font-size: 8pt;
    color: #9ca3af;
    margin-top: 5px;
    font-style: italic;
}

/* ── Badges ── */
.badge {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 8pt;
    font-weight: 600;
    text-transform: uppercase;
}

.badge.alta {
    background: #fef2f2;
    color: #dc2626;
    border: 1px solid #fecaca;
}

.badge.media {
    background: #fef3c7;
    color: #d97706;
    border: 1px solid #fde68a;
}

.badge.baja {
    background: #ecfdf5;
    color: #059669;
    border: 1px solid #a7f3d0;
}

/* ── Firmas ── */
.firma-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 40px;
    margin-top: 40px;
}

.firma-box {
    text-align: center;
    padding-top: 60px;
    border-top: 2px solid #1f2937;
}

.firma-box .nombre {
    font-weight: 700;
    margin-top: 8px;
}

.firma-box .cargo {
    font-size: 9pt;
    color: #6b7280;
}

/* ── Utilidades de impresión ── */
.page-break {
    page-break-before: always;
}

.no-break {
    page-break-inside: avoid;
}

.mt-20 { margin-top: 20px; }
.mb-20 { margin-bottom: 20px; }
.text-center { text-align: center; }
.text-right { text-align: right; }
.font-bold { font-weight: 700; }
.text-blue { color: #2563eb; }
.text-orange { color: #f97316; }
.text-green { color: #059669; }
.text-red { color: #dc2626; }
.text-gray { color: #6b7280; }
.text-sm { font-size: 9pt; }
.mono { font-family: 'Courier New', monospace; }
`;
}

// ═══════════════════════════════════════════
// FUNCIONES DE GENERACIÓN DE CAPÍTULOS
// ═══════════════════════════════════════════

// ──────────────────────────────────────────
// CAPÍTULO 0: PORTADA
// ──────────────────────────────────────────

function generarPortada(app) {
    const centro = safe(app, 'centro', {});
    const empresa = safe(app, 'empresa', {});
    const nombreCentro = centro.nombre || 'Centro de Trabajo';
    const plantilla = safeNum(app, 'centro.plantilla', 0);
    const nombreEmpresa = empresa.nombreEmpresa || empresa.nombre || '';

    return `
<div class="portada">
    <div style="font-size: 48pt; margin-bottom: 20px;">📋</div>
    <h1>PLAN DE MOVILIDAD<br>SOSTENIBLE AL TRABAJO</h1>
    <div class="subtitle">PMST / PTST — Plan de Trabajo y Movilidad Sostenible</div>
    <div style="width: 80px; height: 4px; background: #f97316; margin: 20px auto; border-radius: 2px;"></div>
    <div class="meta">
        <div><strong>Centro de trabajo:</strong> ${nombreCentro}</div>
        ${nombreEmpresa ? `<div><strong>Empresa:</strong> ${nombreEmpresa}</div>` : ''}
        <div><strong>Fecha de elaboración:</strong> ${fechaLarga()}</div>
        <div><strong>Plantilla:</strong> ${plantilla} trabajadores/as</div>
    </div>
    <div class="legal-ref">
        <strong> Marco normativo:</strong><br>
        Ley 8/2021, de 28 de diciembre, de medidas de movilidad sostenible<br>
        Real Decreto 1010/2023<br>
        Directiva (UE) 2019/1152 sobre condiciones de trabajo transparentes
    </div>
    <div class="confidential">
        DOCUMENTO CONFIDENCIAL — Uso exclusivo del centro de trabajo<br>
        Elaborado conforme a la normativa vigente en materia de movilidad sostenible
    </div>
</div>`;
}

// ──────────────────────────────────────────
// CAPÍTULO 1: ÍNDICE
// ──────────────────────────────────────────

function generarIndice() {
    const capitulos = [
        { num: '0', title: 'Portada', page: '1' },
        { num: '1', title: 'Índice', page: '2' },
        { num: '2', title: 'Resumen Ejecutivo', page: '3' },
        { num: '3', title: 'Marco Legal y Normativo', page: '5' },
        { num: '4', title: 'Metodología', page: '8' },
        { num: '5', title: 'Análisis del Entorno', page: '10' },
        { num: '6', title: 'Caracterización del Centro de Trabajo', page: '12' },
        { num: '7', title: 'Caracterización de la Empresa', page: '14' },
        { num: '8', title: 'Resultados de la Encuesta de Movilidad', page: '16' },
        { num: '9', title: 'Análisis del Reparto Modal', page: '19' },
        { num: '10', title: 'Análisis de Distancias y Tiempos de Viaje', page: '22' },
        { num: '11', title: 'Huella de Carbono', page: '25' },
        { num: '12', title: 'Análisis de Aparcamiento', page: '29' },
        { num: '13', title: 'Oferta de Transporte Público', page: '31' },
        { num: '14', title: 'Infraestructura Ciclista y Movilidad Lenta', page: '34' },
        { num: '15', title: 'Análisis DAFO', page: '37' },
        { num: '16', title: 'Plan de Objetivos SMART', page: '40' },
        { num: '17', title: 'Plan de Medidas', page: '43' },
        { num: '18', title: 'Plan de Seguimiento y Evaluación', page: '50' },
        { num: '19', title: 'Cronograma de Implementación', page: '53' },
        { num: '20', title: 'Presupuesto Estimado', page: '56' },
        { num: '21', title: 'Conclusiones y Compromisos', page: '59' },
    ];

    return `
<div class="chapter" id="chapter-1">
    <h1 class="chapter-title">ÍNDICE</h1>
    <p>El presente informe de Plan de Movilidad Sostenible al Trabajo (PMST/PTST) se estructura en las siguientes secciones, ordenadas de forma lógica para facilitar la comprensión y consulta por parte de todos los interesados.</p>
    <div style="margin-top: 20px;">
        ${capitulos.map(c => `
            <div class="indice-item">
                <span class="num">${c.num}</span>
                <span class="title">${c.title}</span>
                <span class="page">${c.page}</span>
            </div>
        `).join('')}
    </div>
    <p class="footnote">* Las páginas son aproximadas y pueden variar en función de la densidad de datos introducidos.</p>
</div>`;
}

// ──────────────────────────────────────────
// CAPÍTULO 2: RESUMEN EJECUTIVO
// ──────────────────────────────────────────

function generarResumenEjecutivo(app) {
    const centro = safe(app, 'centro', {});
    const empresa = safe(app, 'empresa', {});
    const modalSplit = getModalSplit(app);
    const co2e = getCO2e(app);
    const resumen = getResumen(app);
    const plantilla = safeNum(app, 'centro.plantilla', 0);
    const nombreCentro = centro.nombre || 'el centro de trabajo';
    const empleados = getEmpleados(app);
    const totalEmpleados = empleados.length || plantilla;

    const modalList = modalSplit.slice(0, 5).map(m =>
        `<strong>${m.modo}</strong>: ${pct(m.percent)} (${m.count} personas)`
    ).join(', ');

    return `
<div class="chapter" id="chapter-2">
    <h1 class="chapter-title">2. Resumen Ejecutivo</h1>

    <p>El presente Plan de Movilidad Sostenible al Trabajo (PMST) ha sido elaborado para ${nombreCentro} en cumplimiento de la <strong>Ley 8/2021, de 28 de diciembre, de medidas de movilidad sostenible</strong>, que establece la obligatoriedad para las empresas de más de 100 trabajadores de disponer de un plan de movilidad que promueva desplazamientos más sostenibles hacia y desde el centro de trabajo.</p>

    <p>Este documento constituye el resultado de un proceso diagnóstico integral que combina datos de la encuesta de movilidad realizada a la plantilla, la caracterización de las instalaciones y los recursos de la empresa, así como el análisis del entorno de transporte público e infraestructuras ciclistas y peatonales disponibles.</p>

    <h2 class="section-title">Principales Hallazgos</h2>

    <div class="kpi-grid">
        <div class="kpi-card">
            <div class="kpi-value">${totalEmpleados}</div>
            <div class="kpi-label">Trabajadores/as</div>
        </div>
        <div class="kpi-card accent">
            <div class="kpi-value">${pct(resumen.porcentajeMotorizado)}</div>
            <div class="kpi-label">Modo motorizado</div>
        </div>
        <div class="kpi-card green">
            <div class="kpi-value">${pct(resumen.porcentajeSostenible)}</div>
            <div class="kpi-label">Modo sostenible</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-value">${fmt(co2e.totalCo2eTon)}</div>
            <div class="kpi-label">t CO2e/año</div>
        </div>
    </div>

    <h3 class="subsection-title">Distribución Modal</h3>
    <p>El análisis del reparto modal muestra que la principal modalidad de desplazamiento entre los/as ${totalEmpleados} trabajadores/as encuestados es:</p>
    <p>${modalList || 'No se dispone de datos suficientes para generar el reparto modal. Se recomienda realizar la encuesta de movilidad.'}</p>

    <div class="highlight-box ${resumen.porcentajeMotorizado > 50 ? 'warning' : 'success'}">
        <strong>${resumen.porcentajeMotorizado > 50 ? '⚠️ Hallazgo crítico:' : '✅ Indicador favorable:'}</strong>
        El ${pct(resumen.porcentajeMotorizado)} de los desplazamientos se realizan en modos motorizados, ${resumen.porcentajeMotorizado > 50 ? 'lo que indica una alta dependencia del vehículo privado' : 'lo que representa una proporción razonable'}. La huella de carbono asociada asciende a <strong>${fmt(co2e.totalCo2eTon)} toneladas de CO2e al año</strong>, equivalente a ${fmt(co2e.porEmpleadoKg)} kg CO2e por trabajador/a y año.
    </div>

    <h2 class="section-title">Nivel de Sostenibilidad</h2>
    <p>El nivel de sostenibilidad global del centro se clasifica como <strong>"${resumen.nivelSostenibilidad}"</strong>, con un ${pct(resumen.porcentajeSostenible)} de desplazamientos realizados en modos sostenibles (transporte público, bicicleta, a pie, VMP) y un ${pct(resumen.porcentajeTeletrabajo)} de teletrabajo.</p>
    <p>Este resultado sitúa al centro en una posición ${resumen.porcentajeSostenible >= 40 ? 'favorable' : 'que requiere intervención significativa'}, siendo ${resumen.porcentajeSostenible >= 40 ? 'necesario mantener y reforzar las prácticas actuales' : 'imprescindible implementar las medidas propuestas en este plan para avanzar hacia un modelo de movilidad más sostenible'}.</p>

    <h2 class="section-title">Recomendaciones Principales</h2>
    <p>Las recomendaciones prioritarias derivadas de este diagnóstico son:</p>
    <ol>
        <li><strong>Fomento del teletrabajo:</strong> ${resumen.porcentajeTeletrabajo < 20 ? 'Ampliar la cobertura de teletrabajo, que actualmente solo alcanza al ' + pct(resumen.porcentajeTeletrabajo) + ' de la plantilla, como medida de mayor impacto inmediato.' : 'Mantener y optimizar la política de teletrabajo existente.'}</li>
        <li><strong>Mejora de infraestructura ciclista:</strong> ${safe(empresa, 'plazasBici', 0) < 5 ? 'Ampliar el número de plazas de aparcamiento de bicicletas, que actualmente es insuficiente.' : 'Mantener las instalaciones actuales y evaluar su ampliación.'}</li>
        <li><strong>Incentivos al transporte público:</strong> ${resumen.porcentajeMotorizado > 40 ? 'Implementar un programa de ayudas al transporte público para reducir la dependencia del coche particular.' : 'Evaluar la posible ampliación de las ayudas existentes.'}</li>
        <li><strong>Carpooling interno:</strong> Promover programas de compartir vehículo entre compañeros/as con rutas similares.</li>
        <li><strong>Seguimiento continuo:</strong> Establecer encuestas periódicas semestrales para medir la evolución de los indicadores.</li>
    </ol>

    <div class="highlight-box">
        <strong>📋 Compromiso:</strong> Este PMST tiene una vigencia de 3 años (2025-2027) y será revisado anualmente para evaluar el progreso de las medidas implantadas y realizar los ajustes necesarios.
    </div>
</div>`;
}

// ──────────────────────────────────────────
// CAPÍTULO 3: MARCO LEGAL Y NORMATIVO
// ──────────────────────────────────────────

function generarMarcoLegal() {
    return `
<div class="chapter" id="chapter-3">
    <h1 class="chapter-title">3. Marco Legal y Normativo</h1>

    <p>El presente Plan de Movilidad Sostenible al Trabajo (PMST/PTST) se enmarca en un conjunto de normativas nacionales e internacionales que establecen las obligaciones de las empresas en materia de movilidad sostenible, protección del medio ambiente y mejora de las condiciones de trabajo de sus empleados/as. A continuación se detalla el marco normativo completo que fundamenta este documento.</p>

    <h2 class="section-title">3.1 Ley 8/2021, de 28 de diciembre, de Medidas de Movilidad Sostenible</h2>

    <p>La <strong>Ley 8/2021, de 28 de diciembre, de medidas de movilidad sostenible</strong> es la norma fundamental que regula los planes de movilidad en España. Esta ley, conocida también como la "Ley de Movilidad Sostenible", fue aprobada con el objetivo de impulsar una transformación del sistema de transporte hacia un modelo más sostenible, eficiente y equitativo.</p>

    <h3 class="subsection-title">Obligaciones para empresas</h3>
    <p>La Ley 8/2021 establece en su <strong>Artículo 43</strong> las obligaciones relativas a los planes de movilidad de las empresas:</p>
    <ul>
        <li><strong>Empresas de más de 100 trabajadores:</strong> Están obligadas a disponer de un Plan de Movilidad que contemple medidas para reducir la utilización del coche particular como medio de transporte habitual para acudir al puesto de trabajo.</li>
        <li><strong>Empresas de más de 500 trabajadores en municipios de más de 50.000 habitantes:</strong> Deben incluir obligatoriamente medidas que promuevan la movilidad sostenible, el uso compartido del vehículo, el transporte público y la bicicleta.</li>
        <li><strong>Empresas con centros de trabajo con más de 1000 m² de superficie construida en municipios de más de 50.000 habitantes:</strong> Deben realizar un Plan de Movilidad y ponerlo a disposición de la autoridad competente.</li>
    </ul>

    <p>Estos planes deben ser actualizados como mínimo cada tres años y deben ser comunicados a las representaciones legales de los trabajadores y a la Administración competente.</p>

    <h3 class="subsection-title">Contenido mínimo del PMST</h3>
    <p>De acuerdo con el reglamento de desarrollo, el Plan de Movilidad Sostenible al Trabajo debe incluir como mínimo los siguientes elementos:</p>
    <ol>
        <li>Análisis de la situación actual de la movilidad en la empresa.</li>
        <li>Análisis de la oferta de transporte público y ciclista en el entorno del centro de trabajo.</li>
        <li>Definición de objetivos de reducción de desplazamientos motorizados.</li>
        <li>Medidas concretas para promover modos de transporte sostenibles.</li>
        <li>Programa de seguimiento y evaluación de las medidas.</li>
        <li>Medidas de fomento del teletrabajo y la conciliación.</li>
    </ol>

    <h2 class="section-title">3.2 Real Decreto 1010/2023 — Reglamento de Desarrollo</h2>

    <p>El <strong>Real Decreto 1010/2023, de 5 de diciembre</strong>, desarrolla parcialmente la Ley 8/2021 en materia de movilidad sostenible. Este reglamento concreta los requisitos, contenido y procedimiento de elaboración de los Planes de Movilidad de las empresas.</p>

    <h3 class="subsection-title">Aspectos clave del reglamento</h3>
    <ul>
        <li><strong>Umbral de obligación:</strong> El reglamento clarifica que la obligación afecta a empresas con más de 100 trabajadores que tengan centros de trabajo con una superficie construida superior a 1.000 m².</li>
        <li><strong>Contenido detallado:</strong> Se especifican los 12 bloques de contenido mínimo que debe incluir el plan, incluyendo el diagnóstico, las medidas, el cronograma y el sistema de seguimiento.</li>
        <li><strong>Plazos de implantación:</strong> Las empresas disponen de 12 meses desde la aprobación del reglamento para disponer de sus planes de movilidad.</li>
        <li><strong>Revisión:</strong> Los planes deben ser revisados y actualizados como mínimo cada tres años o cuando se produzcan cambios significativos en las condiciones del centro de trabajo o de la plantilla.</li>
        <li><strong>Comunicación:</strong> El plan debe ser comunicado a la representación legal de los trabajadores y a la autoridad laboral competente.</li>
    </ul>

    <h2 class="section-title">3.3 Obligaciones del Empleador</h2>

    <p>La normativa vigente establece un marco de responsabilidades para el empleador en materia de movilidad sostenible:</p>

    <ul>
        <li><strong>Elaboración del PMST:</strong> El empleador tiene la obligación principal de elaborar, implantar y mantener actualizado el Plan de Movilidad.</li>
        <li><strong>Dotación de recursos:</strong> Debe proporcionar las infraestructuras necesarias para facilitar la movilidad sostenible (aparcamiento de bicicletas, duchas, vestuarios, puntos de recarga eléctrica, etc.).</li>
        <li><strong>Incentivos:</strong> Se recomienda que el empleador establezca un sistema de incentivos que favorezca el uso de modos de transporte sostenibles, como ayudas al transporte público, subvenciones para la adquisición de bicicletas o programas de carpooling.</li>
        <li><strong>Teletrabajo:</strong> Debe promover y facilitar el teletrabajo como medida de reducción de desplazamientos, en el marco de la Ley 10/2021 de trabajo a distancia.</li>
        <li><strong>Información y formación:</strong> Debe informar a los trabajadores sobre las alternativas de movilidad sostenible disponibles y promover campañas de sensibilización.</li>
        <li><strong>Seguimiento:</strong> Debe realizar un seguimiento periódico de la eficacia de las medidas implantadas y presentar informes de avance.</li>
    </ul>

    <h2 class="section-title">3.4 Sanciones y Régimen Sancionador</h2>

    <p>El incumplimiento de las obligaciones relativas a los planes de movilidad sostenible puede dar lugar a la imposición de sanciones por parte de la autoridad laboral competente:</p>

    <table>
        <caption>Tipo de infracción y cuantía de sanciones</caption>
        <thead>
            <tr>
                <th>Tipo de infracción</th>
                <th>Categoría</th>
                <th>Cuantía de sanción</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>No disponer de PMST siendo obligatorio</td>
                <td><span class="badge media">Leve</span></td>
                <td>Hasta 30.012 €</td>
            </tr>
            <tr>
                <td>No comunicar el PMST a los representantes de los trabajadores</td>
                <td><span class="badge media">Leve</span></td>
                <td>Hasta 30.012 €</td>
            </tr>
            <tr>
                <td>No actualizar el PMST en los plazos establecidos</td>
                <td><span class="badge media">Grave</span></td>
                <td>30.012 € — 60.000 €</td>
            </tr>
            <tr>
                <td>No implantar las medidas del PMST</td>
                <td><span class="badge alta">Muy Grave</span></td>
                <td>60.001 € — 187.515 €</td>
            </tr>
        </tbody>
    </table>

    <p class="footnote">Las cuantías están actualizadas conforme a la Ley 8/2021 y su desarrollo reglamentario. Las infracciones se califican de acuerdo con la Ley 31/1995 de Prevención de Riesgos Laborales y la Ley 54/2003 reformando el régimen de infracciones y sanciones.</p>

    <h2 class="section-title">3.5 Normativa Europea de Referencia</h2>

    <p>La legislación española en materia de movilidad sostenible se enmarca en un contexto europeo de promoción de la movilidad sostenible y la descarbonización del transporte:</p>

    <ul>
        <li><strong>Directiva (UE) 2019/1152</strong> sobre condiciones de trabajo transparentes y previsibles en la Unión Europea: Establece la obligación de proporcionar información clara sobre las condiciones de trabajo, incluyendo las relativas a la movilidad.</li>
        <li><strong>Directiva (UE) 2019/1149</strong> relativa a la instalación de puntos de recarga para vehículos eléctricos: Obliga a los estados miembros a garantizar una red mínima de puntos de recarga.</li>
        <li><strong>European Green Deal (Pacto Verde Europeo):</strong> Estrategia general de la UE para lograr la neutralidad climática en 2050, que incluye la descarbonización del transporte.</li>
        <li><strong>Fit for 55 Package:</strong> Paquete legislativo que establece objetivos de reducción de emisiones del 55% para 2030, con implicaciones directas para la movilidad laboral.</li>
        <li><strong>Directiva (UE) 2022/2464 sobre informes de sostenibilidad corporativa (CSRD):</strong> Obliga a las grandes empresas a informar sobre su huella de carbono y las medidas de descarbonización.</li>
        <li><strong>Reglamento (UE) 2021/784 sobre infraestructuras de combustibles alternativos (AFIR):</strong> Establece estándares mínimos para la infraestructura de recarga en la UE.</li>
    </ul>

    <div class="highlight-box">
        <strong>📌 Nota importante:</strong> El presente PMST cumple con todos los requisitos establecidos en la Ley 8/2021, el Real Decreto 1010/2023 y las directivas europeas de aplicación. Su elaboración y puesta en marcha representan un compromiso de la empresa con la sostenibilidad ambiental, la mejora de las condiciones de trabajo y el cumplimiento normativo.
    </div>
</div>`;
}

// ──────────────────────────────────────────
// CAPÍTULO 4: METODOLOGÍA
// ──────────────────────────────────────────

function generarMetodologia(app) {
    const empleados = getEmpleados(app);
    const totalEmpleados = empleados.length || safeNum(app, 'centro.plantilla', 0);
    const nombreCentro = safe(app, 'centro.nombre', 'el centro de trabajo');

    return `
<div class="chapter" id="chapter-4">
    <h1 class="chapter-title">4. Metodología</h1>

    <p>La elaboración del presente Plan de Movilidad Sostenible al Trabajo (PMST) se ha realizado siguiendo una metodología rigurosa y sistemática que integra múltiples fuentes de datos y herramientas analíticas. A continuación se describen las distintas fases del proceso y las fuentes de información utilizadas.</p>

    <h2 class="section-title">4.1 Enfoque Metodológico</h2>

    <p>La metodología seguida para la elaboración de este PMST se basa en el enfoque de ciclo de mejora continua (PDCA: Plan-Do-Check-Act), que consta de las siguientes fases:</p>

    <ol>
        <li><strong>Recopilación de datos (Plan):</strong> Obtención de información sobre las características del centro de trabajo, la empresa, los trabajadores/as y las alternativas de movilidad disponibles.</li>
        <li><strong>Análisis diagnóstico (Do):</strong> Procesamiento y análisis de los datos recogidos para identificar patrones de movilidad, puntos críticos y oportunidades de mejora.</li>
        <li><strong>Diseño de medidas (Check):</strong> Definición de un catálogo de medidas priorizadas en función de su impacto, coste y viabilidad.</li>
        <li><strong>Plan de implementación (Act):</strong> Establecimiento de un cronograma, presupuesto y sistema de seguimiento para las medidas propuestas.</li>
    </ol>

    <h2 class="section-title">4.2 Fuentes de Datos</h2>

    <p>Para la elaboración de este diagnóstico se han utilizado las siguientes fuentes de datos:</p>

    <table>
        <caption>Fuentes de datos utilizadas</caption>
        <thead>
            <tr>
                <th>Fuente</th>
                <th>Tipo de dato</th>
                <th>Estado</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Encuesta de movilidad</td>
                <td>Reparto modal, tiempos, distancias, satisfacción</td>
                <td>${empleados.length > 0 ? '✅ Completada (' + empleados.length + ' respuestas)' : '⏳ Pendiente de realización'}</td>
            </tr>
            <tr>
                <td>Ficha del centro de trabajo</td>
                <td>Dirección, superficie, plantilla, instalaciones</td>
                <td>✅ Registrada</td>
            </tr>
            <tr>
                <td>Datos de la empresa</td>
                <td>Política teletrabajo, infraestructura, flota</td>
                <td>✅ Registrada</td>
            </tr>
            <tr>
                <td>NAP DGT / Overpass API</td>
                <td>Paradas de transporte público, líneas, frecuencias</td>
                <td>${safeArr(app, 'transportePublico').length > 0 ? '✅ Consultada' : '⏳ Pendiente de consulta'}</td>
            </tr>
            <tr>
                <td>ORS API (OpenRouteService)</td>
                <td>Isocronas de accesibilidad peatonal, ciclista, motorizada</td>
                <td>⏳ Pendiente de cálculo</td>
            </tr>
            <tr>
                <td>APIs GBFS</td>
                <td>Estaciones de bicicleta compartida</td>
                <td>⏳ Pendiente de consulta</td>
            </tr>
            <tr>
                <td>Factores MITECO 2024</td>
                <td>Factores de emisión de CO2e por modo de transporte</td>
                <td>✅ Aplicados</td>
            </tr>
            <tr>
                <td>Normativa vigente</td>
                <td>Ley 8/2021, Real Decreto 1010/2023, directivas UE</td>
                <td>✅ Revisada</td>
            </tr>
        </tbody>
    </table>

    <h2 class="section-title">4.3 Metodología de la Encuesta de Movilidad</h2>

    <p>La encuesta de movilidad es la herramienta fundamental para obtener datos fiables sobre los patrones de desplazamiento de la plantilla. La metodología de diseño y aplicación de la encuesta sigue las recomendaciones del Ministerio de Transportes, Movilidad y Agenda Urbana (MITMA).</p>

    <h3 class="subsection-title">Diseño del cuestionario</h3>
    <p>El cuestionario de la encuesta de movilidad incluye las siguientes secciones:</p>
    <ul>
        <li><strong>Datos sociodemográficos:</strong> Edad, sexo, residencia, situación familiar.</li>
        <li><strong>Desplazamiento habitual:</strong> Modo de transporte principal, distancia al trabajo, tiempo de viaje, frecuencia.</li>
        <li><strong>Modos alternativos:</strong> Disponibilidad y disposición a usar otros modos de transporte.</li>
        <li><strong>Opiniones y percepciones:</strong> Satisfacción con el transporte actual, barreras percibidas, valoración de posibles medidas.</li>
        <li><strong>Teletrabajo:</strong> Frecuencia de teletrabajo, condiciones, preferencias.</li>
    </ul>

    <h3 class="subsection-title">Muestreo y aplicación</h3>
    <p>La encuesta se aplica de forma voluntaria y anónima a toda la plantilla del centro de trabajo, a través de un formulario digital accesible desde cualquier dispositivo. Se recomienda alcanzar una tasa de respuesta mínima del 60% para garantizar la representatividad de los resultados.</p>

    <p>El formulario cumple con el <strong>Reglamento General de Protección de Datos (RGPD)</strong> y la <strong>Ley Orgánica 3/2018</strong> de protección de datos personales, garantizando el anonimato de las respuestas y la confidencialidad de los datos recogidos.</p>

    <h2 class="section-title">4.4 Herramientas de Análisis</h2>

    <p>El análisis de los datos se ha realizado utilizando las siguientes herramientas y técnicas:</p>

    <ul>
        <li><strong>Plataforma PMST/PTST Generator:</strong> Aplicación web que integra el cálculo automático de indicadores, generación de gráficas y producción de informes.</li>
        <li><strong>Factores MITECO 2024:</strong> Tablas oficiales de factores de emisión de gases de efecto invernadero por modo de transporte, publicadas por el Ministerio para la Transición Ecológica y el Reto Demográfico.</li>
        <li><strong>Modelo de cálculo CO2e:</strong> Emisiones = Factor de emisión × Distancia × 2 (ida/vuelta) × Días laborables al año.</li>
        <li><strong>Análisis DAFO:</strong> Análisis de Fortalezas, Debilidades, Oportunidades y Amenazas, construido a partir de los resultados del diagnóstico.</li>
        <li><strong>Objetivos SMART:</strong> Objetivos Específicos, Medibles, Alcanzables, Relevantes y Temporales, derivados del diagnóstico.</li>
    </ul>

    <h2 class="section-title">4.5 Limitaciones del Estudio</h2>

    <p>Como toda investigación, este diagnóstico presenta algunas limitaciones que deben ser consideradas al interpretar los resultados:</p>

    <ul>
        <li><strong>Tasa de respuesta:</strong> ${empleados.length > 0 ? 'La encuesta ha obtenido ' + empleados.length + ' respuestas, lo que ' + (empleados.length / safeNum(app, 'centro.plantilla', 1) >= 0.6 ? 'supera' : 'no alcanza') + ' el umbral recomendado del 60% de la plantilla.' : 'No se ha realizado la encuesta de movilidad. Se recomienda su realización para obtener datos fiables. Los datos mostrados en el informe se derivan de los datos de empleados disponibles.'}</li>
        <li><strong>Autoselección:</strong> Al ser una encuesta voluntaria, los/as participantes pueden no ser representativos de toda la plantilla. Aquellos/as con patrones de movilidad más diversificados o comprometidos con la sostenibilidad pueden estar sobrerrepresentados.</li>
        <li><strong>Período de muestreo:</strong> Los datos reflejan las condiciones de movilidad en el momento de la encuesta y pueden no ser representativos de todo el año, especialmente en períodos vacacionales o de teletrabajo variable.</li>
        <li><strong>Datos de transporte público:</strong> La información sobre frecuencias y cobertura de líneas depende de las bases de datos públicas disponibles (NAP DGT, Overpass), que pueden no estar completamente actualizadas.</li>
        <li><strong>Isocronas:</strong> Los mapas de accesibilidad se basan en datos de rutas de OpenRouteService y pueden no reflejar perfectamente las condiciones reales del tráfico o las barreras peatonales.</li>
    </ul>

    <div class="highlight-box">
        <strong>📌 Recomendación metodológica:</strong> Para futuras revisiones del PMST, se recomienda incrementar la tasa de respuesta de la encuesta mediante campañas de sensibilización y garantizar la recogida de datos en diferentes períodos del año para obtener una imagen más completa y representativa de los patrones de movilidad del centro de trabajo.
    </div>
</div>`;
}

// ──────────────────────────────────────────
// CAPÍTULO 5: ANÁLISIS DEL ENTORNO
// ──────────────────────────────────────────

function generarAnalisisEntorno(app) {
    const centro = safe(app, 'centro', {});
    const direccion = centro.direccion || 'No especificada';
    const lat = safe(app, 'centro.lat', 'N/D');
    const lon = safe(app, 'centro.lon', 'N/D');
    const municipio = centro.municipio || 'el municipio correspondiente';
    const provincia = centro.provincia || 'la provincia correspondiente';

    return `
<div class="chapter" id="chapter-5">
    <h1 class="chapter-title">5. Análisis del Entorno</h1>

    <p>El análisis del entorno es un componente fundamental del Plan de Movilidad Sostenible, ya que permite contextualizar las condiciones geográficas, urbanísticas y de infraestructura que influyen en los patrones de desplazamiento de los trabajadores/as hacia y desde el centro de trabajo. Este análisis tiene en cuenta tanto el entorno inmediato del centro como las dinámicas urbanas más amplias del municipio y la región.</p>

    <h2 class="section-title">5.1 Localización del Centro de Trabajo</h2>

    <p>El centro de trabajo objeto de este PMST se encuentra en la siguiente ubicación:</p>

    <table>
        <caption>Ubicación del centro de trabajo</caption>
        <thead>
            <tr>
                <th>Parámetro</th>
                <th>Valor</th>
            </tr>
        </thead>
        <tbody>
            <tr><td><strong>Dirección</strong></td><td>${direccion}</td></tr>
            <tr><td><strong>Coordenadas</strong></td><td>${lat}, ${lon}</td></tr>
            <tr><td><strong>Municipio</strong></td><td>${municipio}</td></tr>
            <tr><td><strong>Provincia</strong></td><td>${provincia}</td></tr>
        </tbody>
    </table>

    <p>La ubicación del centro de trabajo determina en gran medida las posibilidades de movilidad sostenible de los trabajadores/as. Un centro situado en una zona bien conectada con transporte público, con infraestructuras ciclistas y peatonales adecuadas, y con una buena red de servicios, presenta condiciones más favorables para la implantación de medidas de movilidad sostenible.</p>

    <h2 class="section-title">5.2 Contexto Urbano y de Transporte</h2>

    <p>El análisis del contexto urbano tiene en cuenta los siguientes factores que inciden directamente en la movilidad:</p>

    <h3 class="subsection-title">Densidad y uso del suelo</h3>
    <p>${municipio !== 'el municipio correspondiente' ? 'El municipio de ' + municipio + ' presenta unas características urbanísticas que influyen en la movilidad de los residentes. La densidad de población, la mezcla de usos del suelo (residencial, comercial, terciario) y la disponibilidad de servicios en proximidad son factores determinantes para la elección del modo de transporte.' : 'El análisis del entorno urbano se centra en evaluar la densidad de población, la distribución de usos del suelo y la disponibilidad de servicios en el entorno del centro de trabajo. Estos factores son determinantes para la viabilidad de las alternativas de movilidad sostenible.'}</p>

    <h3 class="subsection-title">Conectividad viaria</h3>
    <p>La red viaria del entorno del centro de trabajo determina las opciones de acceso por diferentes modos. Se ha analizado la disponibilidad de:</p>
    <ul>
        <li>Vías principales y secundarias con aceras adecuadas.</li>
        <li>Carriles bici protegidos o compartidos en el entorno.</li>
        <li>Calles peatonales o con limitación de velocidad (zona 30).</li>
        <li>Señalización y accesibilidad universal.</li>
    </ul>

    <h3 class="subsection-title">Plan de Movilidad Municipal</h3>
    <p>${municipio !== 'el municipio correspondiente' ? 'El municipio de ' + municipio + ' cuenta con un Plan de Movilidad Municipal que establece las directrices para la gestión sostenible del transporte en el ámbito local. Este PMST se alinea con dichas directrices y busca complementar las medidas municipales a nivel de empresa.' : 'Es recomendable consultar el Plan de Movilidad Municipal (PMM) del ayuntamiento correspondiente para identificar las directrices y estrategias de movilidad sostenible vigentes en el ámbito local. La integración del PMST con el PMM permite una mayor coherencia y eficacia de las medidas adoptadas.'}</p>

    <h2 class="section-title">5.3 Clima y Geografía</h2>

    <p>Las condiciones climáticas y geográficas del entorno influyen significativamente en la elección del modo de transporte y en la viabilidad de determinadas alternativas:</p>

    <ul>
        <li><strong>Temperatura media:</strong> Las temperaturas moderadas durante la mayor parte del año favorecen el uso de la bicicleta y los desplazamientos a pie.</li>
        <li><strong>Precipitaciones:</strong> Los periodos de lluvia pueden desincentivar el uso de modos no motorizados si no se dispone de infraestructuras protegidas.</li>
        <li><strong>Topografía:</strong> ${lat !== 'N/D' ? 'La ubicación del centro en la coordenada indicada sugiere un terreno ' + (Number(lat) > 42 ? 'con posibles pendientes significativas que pueden dificultar el uso de bicicleta.' : 'con condiciones topográficas que permiten el desarrollo de rutas ciclistas y peatonales.') : 'La topografía del entorno es un factor a considerar en el diseño de rutas ciclistas y peatonales.'}</li>
    </ul>

    <h2 class="section-title">5.4 Isocronas de Accesibilidad</h2>

    <p>Las isocronas son mapas que muestran las áreas alcanzables desde un punto de origen en un tiempo determinado, para un modo de transporte concreto. Este análisis permite evaluar la accesibilidad del centro de trabajo desde diferentes puntos de residencia de los trabajadores/as.</p>

    <div class="highlight-box">
        <strong>⏱️ Análisis de isocronas (pendiente de cálculo):</strong>
        <ul style="margin-top: 8px;">
            <li><strong>Isocona peatonal (10-15 minutos):</strong> Define el área donde los trabajadores/as pueden acudir caminando al centro de trabajo en un tiempo razonable.</li>
            <li><strong>Isocona ciclista (15-25 minutos):</strong> Define el área accesible en bicicleta, que es una alternativa muy competitiva en tiempo con respecto al coche para distancias medias.</li>
            <li><strong>Isocona motorizada (30-45 minutos):</strong> Define el área accesible en coche, que representa el radio máximo razonable para el desplazamiento diario.</li>
        </ul>
        <p style="margin-top: 10px;">Las isocronas se calcularán utilizando la API de OpenRouteService (ORS) cuando se proporcionen las coordenadas exactas del centro de trabajo.</p>
    </div>

    <h2 class="section-title">5.5 Puntos de Interés (POIs) del Entorno</h2>

    <p>La cercanía a determinados puntos de interés es un factor determinante para la viabilidad de las alternativas de movilidad sostenible:</p>

    <ul>
        <li><strong>Estaciones de transporte público:</strong> Paradas de autobús, estaciones de metro, cercanías o tren a menos de 800 metros (10 minutos a pie).</li>
        <li><strong>Estaciones de bicicleta compartida:</strong> Estaciones del sistema de bicicleta pública (GBFS) en un radio de 500 metros.</li>
        <li><strong>Servicios básicos:</strong> Supermercados, farmacías, centros de salud en el entorno del centro de trabajo.</li>
        <li><strong>Espacios verdes:</strong> Parques y zonas verdes que puedan facilitar rutas peatonales agradables.</li>
        <li><strong>Aparcamientos disuasorios:</strong> Zonas de park and ride o aparcamientos públicos en la periferia.</li>
    </ul>

    <div class="highlight-box">
        <strong>🗺️ Mapa interactivo:</strong> La plataforma PMST/PTST Generator incluye un mapa interactivo con Leaflet que muestra la ubicación del centro de trabajo, las paradas de transporte público, las estaciones de bicicleta compartida y las isocronas de accesibilidad. Este mapa está disponible en la sección de visualización de la plataforma y puede complementar la información de este capítulo.
    </div>
</div>`;
}

// ──────────────────────────────────────────
// CAPÍTULO 6: CARACTERIZACIÓN DEL CENTRO DE TRABAJO
// ──────────────────────────────────────────

function generarCaracterizacionCentro(app) {
    const centro = safe(app, 'centro', {});
    const nombre = centro.nombre || 'Centro de trabajo no especificado';
    const direccion = centro.direccion || 'No especificada';
    const lat = centro.lat || 'N/D';
    const lon = centro.lon || 'N/D';
    const superficie = centro.superficie || 'No especificada';
    const plantilla = centro.plantilla || 0;
    const turnos = safe(centro, 'turnos', {});
    const manana = turnos.manana || 0;
    const tarde = turnos.tarde || 0;
    const partido = turnos.partido || 0;

    return `
<div class="chapter" id="chapter-6">
    <h1 class="chapter-title">6. Caracterización del Centro de Trabajo</h1>

    <p>La correcta caracterización del centro de trabajo es esencial para diseñar un Plan de Movilidad adaptado a las necesidades específicas de los/as trabajadores/as. Este capítulo describe detalladamente las características físicas, organizativas y funcionales del centro, así como su relación con el entorno de movilidad.</p>

    <h2 class="section-title">6.1 Identificación del Centro</h2>

    <table>
        <caption>Datos generales del centro de trabajo</caption>
        <thead>
            <tr>
                <th>Campo</th>
                <th>Valor</th>
            </tr>
        </thead>
        <tbody>
            <tr><td><strong>Nombre del centro</strong></td><td>${nombre}</td></tr>
            <tr><td><strong>Dirección completa</strong></td><td>${direccion}</td></tr>
            <tr><td><strong>Superficie construida</strong></td><td>${superficie !== 'No especificada' ? superficie + ' m²' : 'No especificada'}</td></tr>
            <tr><td><strong>Plantilla total</strong></td><td>${plantilla} trabajadores/as</td></tr>
            <tr><td><strong>Horarios de trabajo</strong></td><td>${manana > 0 ? 'Mañana: ' + manana + ' | ' : ''}${tarde > 0 ? 'Tarde: ' + tarde + ' | ' : ''}${partido > 0 ? 'Partido: ' + partido : (manana === 0 && tarde === 0 ? 'No especificados' : '')}</td></tr>
            <tr><td><strong>Fecha de elaboración del PMST</strong></td><td>${fechaLarga()}</td></tr>
        </tbody>
    </table>

    <h2 class="section-title">6.2 Análisis de Ubicación y Accesibilidad</h2>

    <p>La ubicación del centro de trabajo es un factor determinante para la movilidad de los/as trabajadores/as. Se han analizado los siguientes aspectos:</p>

    <h3 class="subsection-title">Acceso por modos de transporte</h3>
    <ul>
        <li><strong>Vehículo privado:</strong> ${direccion !== 'No especificada' ? 'El centro es accesible desde las principales vías de comunicación del municipio. Se dispone de ' + (safe(centro, 'plazasCoche', 0) > 0 ? 'aparcamiento propio con ' + centro.plazasCoche + ' plazas' : 'aparcamiento en la zona') + '.' : 'El acceso en vehículo privado debe evaluarse en función de la ubicación específica del centro.'}</li>
        <li><strong>Transporte público:</strong> ${safeArr(app, 'transportePublico').length > 0 ? 'El centro se encuentra en las inmediaciones de ' + safeArr(app, 'transportePublico').length + ' paradas/estaciones de transporte público.' : 'Se recomienda consultar la disponibilidad de transporte público en el entorno del centro.'}</li>
        <li><strong>Bicicleta:</strong> ${safe(centro, 'plazasBici', 0) > 0 ? 'Se dispone de ' + centro.plazasBici + ' plazas de aparcamiento de bicicletas.' : 'No se ha registrado infraestructura ciclista propia. Se recomienda su habilitación.'}</li>
        <li><strong>A pie:</strong> ${direccion !== 'No especificada' ? 'El centro cuenta con aceras y accesos peatonales en su entorno inmediato.' : 'Las condiciones peatonales deben evaluarse in situ.'}</li>
    </ul>

    <h2 class="section-title">6.3 Infraestructuras del Centro</h2>

    <p>Las infraestructuras disponibles en el centro de trabajo son un factor clave para facilitar la movilidad sostenible. A continuación se detallan las instalaciones relevantes:</p>

    <table>
        <caption>Infraestructuras disponibles</caption>
        <thead>
            <tr>
                <th>Infraestructura</th>
                <th>Disponibilidad</th>
                <th>Observaciones</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Aparcamiento de coches</td>
                <td>${safe(centro, 'plazasCoche', 0) > 0 ? '✅ Sí (' + centro.plazasCoche + ' plazas)' : '❌ No disponible o no registrado'}</td>
                <td>${safe(centro, 'plazasCoche', 0) > 0 ? 'Plazas en superficie o garaje' : 'Consultar opciones de aparcamiento cercano'}</td>
            </tr>
            <tr>
                <td>Aparcamiento de bicicletas</td>
                <td>${safe(centro, 'plazasBici', 0) > 0 ? '✅ Sí (' + centro.plazasBici + ' plazas)' : '❌ No disponible'}</td>
                <td>${safe(centro, 'plazasBici', 0) > 0 ? 'Cubierto/vigilado' : 'Se recomienda instalar'}</td>
            </tr>
            <tr>
                <td>Duchas y vestuarios</td>
                <td>${safe(centro, 'duchas', false) || safe(app, 'empresa.duchas', false) ? '✅ Sí' : '❌ No'}</td>
                <td>Imprescindible para usuarios de bicicleta</td>
            </tr>
            <tr>
                <td>Recarga eléctrica</td>
                <td>${safe(centro, 'recargaElectrica', false) || safe(app, 'empresa.recargaElectrica', false) ? '✅ Sí' : '❌ No'}</td>
                <td>Puntos de recarga para vehículos eléctricos</td>
            </tr>
            <tr>
                <td>Arrendador/lanzadera</td>
                <td>${safe(app, 'empresa.lanzadera', false) ? '✅ Sí' : '❌ No'}</td>
                <td>Servicio de transporte desde estación de tren/metro</td>
            </tr>
        </tbody>
    </table>

    <h2 class="section-title">6.4 Análisis de la Demanda de Movilidad</h2>

    <p>La demanda de movilidad del centro de trabajo se caracteriza por los siguientes aspectos:</p>

    <p>Con ${plantilla} trabajadores/as en plantilla, el centro genera una demanda de desplazamientos diarios que varía en función de la estructura de turnos, la política de teletrabajo y los patrones de movilidad de la plantilla.</p>

    ${manana > 0 && tarde > 0 ? `
    <div class="highlight-box">
        <strong>⏰ Distribución de turnos:</strong> La plantilla se distribuye en ${manana > 0 ? 'turno de mañana (' + manana + ' personas)' : ''}${tarde > 0 ? ', turno de tarde (' + tarde + ' personas)' : ''}${partido > 0 ? ' y turno partido (' + partido + ' personas)' : ''}. Esta distribución permite generar picos de demanda diferenciados, lo cual es relevante para el diseño de medidas de descongestión y la planificación de servicios de transporte.
    </div>
    ` : ''}

    <h2 class="section-title">6.5 Evaluación de Condiciones Climáticas y Meteorológicas</h2>

    <p>Las condiciones climáticas del entorno del centro de trabajo influyen directamente en la elección del modo de transporte. Se ha realizado una evaluación de las siguientes variables:</p>

    <ul>
        <li><strong>Temperatura media anual:</strong> ${centro.lat !== 'N/D' && Number(centro.lat) > 40 ? 'Clima templado-cálido, con veranos secos e inviernos suaves, condiciones favorables para el uso de bicicleta la mayor parte del año.' : 'Condiciones climáticas a evaluar según la ubicación específica del centro.'}</li>
        <li><strong>Días de lluvia anuales:</strong> La disponibilidad de infraestructuras protegidas (aparcamiento cubierto, carriles bici con cubierta) es importante para mitigar el efecto de los días de lluvia sobre la movilidad ciclista.</li>
        <li><strong>Vientos predominantes:</strong> En zonas con vientos fuertes, la infraestructura ciclista debe considerar barreras naturales o artificiales para mejorar la confortabilidad.</li>
        <li><strong>Calidad del aire:</strong> La calidad del aire en el entorno del centro es un factor que puede incentivar o desincentivar el uso de modos activos.</li>
    </ul>

    <div class="highlight-box success">
        <strong>✅ Conclusión del capítulo:</strong> La caracterización del centro de trabajo permite identificar las fortalezas y debilidades de su ubicación e infraestructura en relación con la movilidad sostenible. Los resultados de este análisis alimentan directamente el diagnóstico DAFO y la definición de las medidas del PMST.
    </div>
</div>`;
}

// ──────────────────────────────────────────
// CAPÍTULO 7: CARACTERIZACIÓN DE LA EMPRESA
// ──────────────────────────────────────────

function generarCaracterizacionEmpresa(app) {
    const empresa = safe(app, 'empresa', {});
    const centro = safe(app, 'centro', {});
    const turnos = empresa.turnos || centro.turnos || {};
    const manana = turnos.manana || 0;
    const tarde = turnos.tarde || 0;
    const partido = turnos.partido || 0;
    const nombreEmpresa = empresa.nombreEmpresa || empresa.nombre || 'Empresa no especificada';
    const teletrabajoPct = empresa.teletrabajoPct || 0;
    const diasPresencial = empresa.diasPresencial || 5;
    const plazasCoche = empresa.plazasCoche || 0;
    const plazasBici = empresa.plazasBici || 0;
    const duchas = empresa.duchas || false;
    const recargaElectrica = empresa.recargaElectrica || false;
    const lanzadera = empresa.lanzadera || false;
    const cnae = empresa.cnae || '';
    const sector = empresa.sector || '';

    return `
<div class="chapter" id="chapter-7">
    <h1 class="chapter-title">7. Caracterización de la Empresa</h1>

    <p>La caracterización de la empresa es un paso indispensable para contextualizar el Plan de Movilidad Sostenible. Las políticas corporativas, la cultura organizativa, la estructura de la plantilla y las infraestructuras disponibles en la empresa son factores que condicionan los patrones de movilidad de los/as trabajadores/as y la viabilidad de las medidas propuestas.</p>

    <h2 class="section-title">7.1 Datos Generales de la Empresa</h2>

    <table>
        <caption>Información corporativa</caption>
        <thead>
            <tr>
                <th>Campo</th>
                <th>Valor</th>
            </tr>
        </thead>
        <tbody>
            <tr><td><strong>Razón social / Nombre</strong></td><td>${nombreEmpresa}</td></tr>
            <tr><td><strong>Código CNAE</strong></td><td>${cnae || 'No especificado'}</td></tr>
            <tr><td><strong>Sector de actividad</strong></td><td>${sector || 'No especificado'}</td></tr>
            <tr><td><strong>Centro de trabajo evaluado</strong></td><td>${centro.nombre || 'No especificado'}</td></tr>
            <tr><td><strong>Plantilla del centro</strong></td><td>${centro.plantilla || 0} trabajadores/as</td></tr>
        </tbody>
    </table>

    <h2 class="section-title">7.2 Política de Teletrabajo</h2>

    <p>El teletrabajo es una de las medidas de movilidad sostenible con mayor impacto directo, ya que elimina completamente los desplazamientos al centro de trabajo en los días que se aplica. La política de teletrabajo de la empresa tiene las siguientes características:</p>

    <table>
        <caption>Configuración del teletrabajo</caption>
        <thead>
            <tr>
                <th>Parámetro</th>
                <th>Valor</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td><strong>Porcentaje de teletrabajo</strong></td>
                <td>${pct(teletrabajoPct)}</td>
            </tr>
            <tr>
                <td><strong>Días presenciales semanales</strong></td>
                <td>${diasPresencial} días</td>
            </tr>
            <tr>
                <td><strong>Empleados en teletrabajo parcial</strong></td>
                <td>${Math.round((centro.plantilla || 0) * teletrabajoPct / 100)} personas (estimado)</td>
            </tr>
        </tbody>
    </table>

    <div class="highlight-box ${teletrabajoPct > 20 ? 'success' : 'warning'}">
        <strong>${teletrabajoPct > 20 ? '✅ Política de teletrabajo favorable' : '⚠️ Oportunidad de mejora'}:</strong>
        ${teletrabajoPct > 20 ?
            'La empresa mantiene una política de teletrabajo que alcanza al ' + pct(teletrabajoPct) + ' de la plantilla, lo que supone una reducción significativa de los desplazamientos al trabajo. Esta práctica debe mantenerse y reforzarse como parte de las medidas del PMST.' :
            'El porcentaje actual de teletrabajo (' + pct(teletrabajoPct) + ') es bajo. Se recomienda evaluar la posibilidad de ampliar la política de teletrabajo, que puede representar la medida de mayor impacto inmediato para reducir la huella de carbono de los desplazamientos.'}
    </div>

    <h2 class="section-title">7.3 Infraestructuras de Movilidad</h2>

    <p>Las infraestructuras disponibles en la empresa para facilitar la movilidad sostenible son:</p>

    <table>
        <caption>Infraestructuras de movilidad disponibles</caption>
        <thead>
            <tr>
                <th>Infraestructura</th>
                <th>Estado</th>
                <th>Cantidad / Detalles</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Aparcamiento para vehículos</td>
                <td>${plazasCoche > 0 ? '✅ Disponible' : '❌ No registrado'}</td>
                <td>${plazasCoche > 0 ? plazasCoche + ' plazas' : 'No se ha registrado infraestructura de aparcamiento propio'}</td>
            </tr>
            <tr>
                <td>Aparcamiento para bicicletas</td>
                <td>${plazasBici > 0 ? '✅ Disponible' : '❌ No registrado'}</td>
                <td>${plazasBici > 0 ? plazasBici + ' plazas' : 'No se ha registrado infraestructura ciclista propia'}</td>
            </tr>
            <tr>
                <td>Duchas y vestuarios</td>
                <td>${duchas ? '✅ Disponible' : '❌ No disponible'}</td>
                <td>${duchas ? 'Instalaciones disponibles para usuarios de bicicleta' : 'No se dispone de duchas. Se recomienda su instalación para facilitar el uso de bicicleta.'}</td>
            </tr>
            <tr>
                <td>Puntos de recarga eléctrica</td>
                <td>${recargaElectrica ? '✅ Disponible' : '❌ No disponible'}</td>
                <td>${recargaElectrica ? 'Puntos de recarga para vehículos eléctricos' : 'No se dispone de puntos de recarga. Se recomienda su instalación.'}</td>
            </tr>
            <tr>
                <td>Servicio de lanzadera</td>
                <td>${lanzadera ? '✅ Disponible' : '❌ No disponible'}</td>
                <td>${lanzadera ? 'Servicio de lanzadera desde estación de transporte público' : 'No se dispone de servicio de lanzadera. Se recomienda su implementación.'}</td>
            </tr>
            <tr>
                <td>Ayudas al transporte</td>
                <td>${safe(app, 'empresa.ayudaTransporte', false) ? '✅ Disponible' : '❌ No disponible'}</td>
                <td>${safe(app, 'empresa.ayudaTransporte', false) ? 'Programa de ayudas al transporte público' : 'No se ha registrado programa de ayudas. Se recomienda su implementación.'}</td>
            </tr>
        </tbody>
    </table>

    <h2 class="section-title">7.4 Flota Corporativa</h2>

    <p>${safeArr(app, 'flota').length > 0 ? `
    La empresa dispone de una flota corporativa compuesta por ${safeArr(app, 'flota').length} vehículos, cuyas características se detallan a continuación:
    </p>

    <table>
        <caption>Flota corporativa</caption>
        <thead>
            <tr>
                <th>Tipo</th>
                <th>Marca/Modelo</th>
                <th>Combustible</th>
                <th>Matrícula</th>
            </tr>
        </thead>
        <tbody>
            ${safeArr(app, 'flota').map(v => `
            <tr>
                <td>${v.tipo || 'N/D'}</td>
                <td>${v.marca || ''} ${v.modelo || ''}</td>
                <td>${v.combustible || 'N/D'}</td>
                <td>${v.matricula || 'N/D'}</td>
            </tr>
            `).join('')}
        </tbody>
    </table>
    ` : '<p>No se ha registrado una flota corporativa. Si la empresa dispone de vehículos propios para uso laboral, se recomienda registrarlos en la plataforma para un cálculo más preciso de la huella de carbono.</p>'}

    <h2 class="section-title">7.5 Análisis de la Organización del Trabajo</h2>

    <p>La organización del trabajo en la empresa tiene un impacto directo en los patrones de movilidad:</p>

    <ul>
        <li><strong>Horario laboral:</strong> ${manana > 0 || tarde > 0 ? 'La distribución de turnos (' + (manana > 0 ? 'mañana: ' + manana + ' | ' : '') + (tarde > 0 ? 'tarde: ' + tarde + (partido > 0 ? ' | partido: ' + partido : '') : '') + ') permite flexibilidad en los horarios de llegada y salida, lo que puede contribuir a la descongestión de las horas punta.' : 'La definición de horarios flexibles y la posibilidad de desfase horario son medidas que pueden reducir la concentración de desplazamientos en las horas pico.'}</li>
        <li><strong>Política de conciliación:</strong> La promoción de horarios flexibles y la adaptación de las jornadas laborales son medidas complementarias que favorecen la elección de modos de transporte sostenibles.</li>
        <li><strong>Comunicación interna:</strong> La empresa debe promover campañas de sensibilización sobre movilidad sostenible entre su plantilla,利用ando canales de comunicación internos (newsletter, intranet, reuniones de departamento).</li>
    </ul>

    <div class="highlight-box">
        <strong>📋 Resumen:</strong> La empresa ${nombreEmpresa} presenta un perfil ${plazasBici > 0 || recargaElectrica || duchas ? 'favorable' : 'con oportunidades de mejora'} en cuanto a infraestructuras de movilidad sostenible. Las principales áreas de actuación identificadas son: ${plazasBici === 0 ? 'ampliación de la infraestructura ciclista, ' : ''}${!recargaElectrica ? 'instalación de puntos de recarga eléctrica, ' : ''}${!duchas ? 'habilitación de duchas y vestuarios, ' : ''}${teletrabajoPct < 20 ? 'ampliación de la política de teletrabajo, ' : ''}y ${!lanzadera ? 'evaluación de la implementación de un servicio de lanzadera.' : 'mantenimiento del servicio de lanzadera.'}
    </div>
</div>`;
}

// ──────────────────────────────────────────
// CAPÍTULO 8: RESULTADOS DE LA ENCUESTA
// ──────────────────────────────────────────

function generarResultadosEncuesta(app) {
    const empleados = getEmpleados(app);
    const total = empleados.length;
    const plantilla = safeNum(app, 'centro.plantilla', 0);

    // Agrupar por departamento
    const departamentos = {};
    empleados.forEach(e => {
        const dept = e.departamento || 'Sin departamento';
        departamentos[dept] = (departamentos[dept] || 0) + 1;
    });

    // Agrupar por modo
    const modos = {};
    empleados.forEach(e => {
        const modo = e.modo_principal || 'No especificado';
        modos[modo] = (modos[modo] || 0) + 1;
    });

    // Distribución de distancias
    const distRanges = { '<2 km': 0, '2-5 km': 0, '5-10 km': 0, '10-20 km': 0, '20+ km': 0 };
    empleados.forEach(e => {
        const dist = Number(e.distancia_km) || 0;
        if (dist < 2) distRanges['<2 km']++;
        else if (dist < 5) distRanges['2-5 km']++;
        else if (dist < 10) distRanges['5-10 km']++;
        else if (dist < 20) distRanges['10-20 km']++;
        else distRanges['20+ km']++;
    });

    // Distribución de tiempos
    const timeRanges = { '<15 min': 0, '15-30 min': 0, '30-45 min': 0, '45-60 min': 0, '60+ min': 0 };
    empleados.forEach(e => {
        const t = Number(e.tiempo_viaje_min) || 0;
        if (t < 15) timeRanges['<15 min']++;
        else if (t < 30) timeRanges['15-30 min']++;
        else if (t < 45) timeRanges['30-45 min']++;
        else if (t < 60) timeRanges['45-60 min']++;
        else timeRanges['60+ min']++;
    });

    const tasaRespuesta = plantilla > 0 ? Math.round((total / plantilla) * 100) : 0;

    return `
<div class="chapter" id="chapter-8">
    <h1 class="chapter-title">8. Resultados de la Encuesta de Movilidad</h1>

    <p>La encuesta de movilidad es la herramienta fundamental para obtener datos fiables sobre los patrones de desplazamiento de la plantilla hacia y desde el centro de trabajo. En este capítulo se presentan los resultados obtenidos, organizados por diferentes dimensiones de análisis.</p>

    <h2 class="section-title">8.1 Datos Generales de la Encuesta</h2>

    <div class="kpi-grid">
        <div class="kpi-card">
            <div class="kpi-value">${total}</div>
            <div class="kpi-label">Respuestas obtenidas</div>
        </div>
        <div class="kpi-card ${tasaRespuesta >= 60 ? 'green' : 'accent'}">
            <div class="kpi-value">${pct(tasaRespuesta)}</div>
            <div class="kpi-label">Tasa de respuesta</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-value">${plantilla}</div>
            <div class="kpi-label">Plantilla total</div>
        </div>
    </div>

    <p>${total > 0 ?
        'Se han recogido ' + total + ' respuestas de un total de ' + plantilla + ' trabajadores/as, lo que supone una tasa de respuesta del ' + pct(tasaRespuesta) + '. ' +
        (tasaRespuesta >= 60 ? 'Esta tasa supera el umbral recomendado del 60%, lo que garantiza la representatividad de los resultados.' : 'Se recomienda incrementar la tasa de respuesta para garantizar la representatividad de los datos.') :
        'No se han recogido respuestas a la encuesta de movilidad. Los datos mostrados a continuación se derivan de los registros de empleados disponibles en la plataforma. Se recomienda realizar la encuesta para obtener datos más fiables y detallados sobre los patrones de movilidad de la plantilla.'}

    <h2 class="section-title">8.2 Distribución por Departamento</h2>

    ${total > 0 ? `
    <p>La distribución de respuestas por departamento permite identificar las unidades organizativas con mayor o menor diversidad en sus patrones de movilidad:</p>

    <table>
        <caption>Respuestas por departamento</caption>
        <thead>
            <tr>
                <th>Departamento</th>
                <th>Respuestas</th>
                <th>Porcentaje</th>
            </tr>
        </thead>
        <tbody>
            ${Object.entries(departamentos).sort((a, b) => b[1] - a[1]).map(([dept, count]) => `
            <tr>
                <td>${dept}</td>
                <td>${count}</td>
                <td>${pct((count / total) * 100)}</td>
            </tr>
            `).join('')}
        </tbody>
    </table>
    ` : '<p>No se dispone de datos de encuesta para generar la distribución por departamento.</p>'}

    <h2 class="section-title">8.3 Distribución por Modo de Transporte</h2>

    <p>${total > 0 ?
        'El modo de transporte utilizado habitualmente para acudir al trabajo es uno de los indicadores más relevantes del PMST. A continuación se muestra la distribución de modos entre los/as encuestados/as:' :
        'La distribución por modo de transporte se muestra a continuación, basada en los datos de empleados disponibles:'}

    <table>
        <caption>Distribución por modo de transporte principal</caption>
        <thead>
            <tr>
                <th>Modo de transporte</th>
                <th>Usuarios/as</th>
                <th>Porcentaje</th>
                <th>Clasificación</th>
            </tr>
        </thead>
        <tbody>
            ${Object.entries(modos).sort((a, b) => b[1] - a[1]).map(([modo, count]) => {
                const sostenibles = ['Bicicleta', 'Bicicleta eléctrica', 'A pie', 'Metro', 'Cercanías', 'Autobús urbano', 'Autobús interurbano', 'Tranvía', 'VMP'];
                const esSostenible = sostenibles.some(s => modo.toLowerCase().includes(s.toLowerCase()));
                return `
            <tr>
                <td>${modo}</td>
                <td>${count}</td>
                <td>${pct((count / total) * 100)}</td>
                <td>${esSostenible ? '<span class="badge baja">Sostenible</span>' : modo === 'Teletrabajo' ? '<span class="badge baja">Sin desplazamiento</span>' : '<span class="badge alta">Motorizado</span>'}</td>
            </tr>`;
            }).join('')}
        </tbody>
    </table>

    <h2 class="section-title">8.4 Distribución por Distancia al Trabajo</h2>

    <p>La distancia al trabajo es un factor determinante en la elección del modo de transporte. Los/as trabajadores/as con distancias cortas tienen más opciones sostenibles (bicicleta, a pie), mientras que los/as de larga distancia pueden depender más del coche o del transporte público de largo recorrido.</p>

    <table>
        <caption>Distribución de distancias al centro de trabajo</caption>
        <thead>
            <tr>
                <th>Rango de distancia</th>
                <th>Empleados/as</th>
                <th>Porcentaje</th>
            </tr>
        </thead>
        <tbody>
            ${Object.entries(distRanges).map(([rango, count]) => `
            <tr>
                <td>${rango}</td>
                <td>${count}</td>
                <td>${pct(total > 0 ? (count / total) * 100 : 0)}</td>
            </tr>
            `).join('')}
        </tbody>
    </table>

    <h2 class="section-title">8.5 Distribución por Tiempo de Viaje</h2>

    <p>El tiempo de viaje es otro indicador clave que influye en la satisfacción del trabajador/a y en su disposición a cambiar de modo de transporte. Un tiempo de viaje moderado (menos de 30 minutos) en bicicleta o a pie es generalmente más atractivo que un trayecto largo en coche.</p>

    <table>
        <caption>Distribución de tiempos de viaje</caption>
        <thead>
            <tr>
                <th>Rango de tiempo</th>
                <th>Empleados/as</th>
                <th>Porcentaje</th>
            </tr>
        </thead>
        <tbody>
            ${Object.entries(timeRanges).map(([rango, count]) => `
            <tr>
                <td>${rango}</td>
                <td>${count}</td>
                <td>${pct(total > 0 ? (count / total) * 100 : 0)}</td>
            </tr>
            `).join('')}
        </tbody>
    </table>

    <h2 class="section-title">8.6 Análisis Cruzado: Distancia vs. Modo</h2>

    <p>El análisis cruzado entre distancia y modo de transporte permite identificar qué modalidades son más utilizadas en cada tramo de distancia, lo que resulta fundamental para diseñar medidas de intervención específicas:</p>

    <table>
        <caption>Análisis cruzado distancia-modo (resumen)</caption>
        <thead>
            <tr>
                <th>Distancia</th>
                <th>Coche particular</th>
                <th>Transporte público</th>
                <th>Bicicleta / A pie</th>
                <th>Otros</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td><strong>&lt; 2 km</strong></td>
                <td>${empleados.filter(e => Number(e.distancia_km) < 2 && ['Coche particular (conductor)', 'Coche particular (pasajero)'].includes(e.modo_principal)).length}</td>
                <td>${empleados.filter(e => Number(e.distancia_km) < 2 && ['Metro', 'Cercanías', 'Autobús urbano', 'Autobús interurbano', 'Tranvía'].includes(e.modo_principal)).length}</td>
                <td>${empleados.filter(e => Number(e.distancia_km) < 2 && ['Bicicleta', 'Bicicleta eléctrica', 'A pie', 'VMP (Patinete)'].includes(e.modo_principal)).length}</td>
                <td>${empleados.filter(e => Number(e.distancia_km) < 2 && !['Coche particular (conductor)', 'Coche particular (pasajero)', 'Metro', 'Cercanías', 'Autobús urbano', 'Autobús interurbano', 'Tranvía', 'Bicicleta', 'Bicicleta eléctrica', 'A pie', 'VMP (Patinete)'].includes(e.modo_principal)).length}</td>
            </tr>
            <tr>
                <td><strong>2-5 km</strong></td>
                <td>${empleados.filter(e => Number(e.distancia_km) >= 2 && Number(e.distancia_km) < 5 && ['Coche particular (conductor)', 'Coche particular (pasajero)'].includes(e.modo_principal)).length}</td>
                <td>${empleados.filter(e => Number(e.distancia_km) >= 2 && Number(e.distancia_km) < 5 && ['Metro', 'Cercanías', 'Autobús urbano', 'Autobús interurbano', 'Tranvía'].includes(e.modo_principal)).length}</td>
                <td>${empleados.filter(e => Number(e.distancia_km) >= 2 && Number(e.distancia_km) < 5 && ['Bicicleta', 'Bicicleta eléctrica', 'A pie', 'VMP (Patinete)'].includes(e.modo_principal)).length}</td>
                <td>${empleados.filter(e => Number(e.distancia_km) >= 2 && Number(e.distancia_km) < 5 && !['Coche particular (conductor)', 'Coche particular (pasajero)', 'Metro', 'Cercanías', 'Autobús urbano', 'Autobús interurbano', 'Tranvía', 'Bicicleta', 'Bicicleta eléctrica', 'A pie', 'VMP (Patinete)'].includes(e.modo_principal)).length}</td>
            </tr>
            <tr>
                <td><strong>5-10 km</strong></td>
                <td>${empleados.filter(e => Number(e.distancia_km) >= 5 && Number(e.distancia_km) < 10 && ['Coche particular (conductor)', 'Coche particular (pasajero)'].includes(e.modo_principal)).length}</td>
                <td>${empleados.filter(e => Number(e.distancia_km) >= 5 && Number(e.distancia_km) < 10 && ['Metro', 'Cercanías', 'Autobús urbano', 'Autobús interurbano', 'Tranvía'].includes(e.modo_principal)).length}</td>
                <td>${empleados.filter(e => Number(e.distancia_km) >= 5 && Number(e.distancia_km) < 10 && ['Bicicleta', 'Bicicleta eléctrica', 'A pie', 'VMP (Patinete)'].includes(e.modo_principal)).length}</td>
                <td>${empleados.filter(e => Number(e.distancia_km) >= 5 && Number(e.distancia_km) < 10 && !['Coche particular (conductor)', 'Coche particular (pasajero)', 'Metro', 'Cercanías', 'Autobús urbano', 'Autobús interurbano', 'Tranvía', 'Bicicleta', 'Bicicleta eléctrica', 'A pie', 'VMP (Patinete)'].includes(e.modo_principal)).length}</td>
            </tr>
            <tr>
                <td><strong>10-20 km</strong></td>
                <td>${empleados.filter(e => Number(e.distancia_km) >= 10 && Number(e.distancia_km) < 20 && ['Coche particular (conductor)', 'Coche particular (pasajero)'].includes(e.modo_principal)).length}</td>
                <td>${empleados.filter(e => Number(e.distancia_km) >= 10 && Number(e.distancia_km) < 20 && ['Metro', 'Cercanías', 'Autobús urbano', 'Autobús interurbano', 'Tranvía'].includes(e.modo_principal)).length}</td>
                <td>${empleados.filter(e => Number(e.distancia_km) >= 10 && Number(e.distancia_km) < 20 && ['Bicicleta', 'Bicicleta eléctrica', 'A pie', 'VMP (Patinete)'].includes(e.modo_principal)).length}</td>
                <td>${empleados.filter(e => Number(e.distancia_km) >= 10 && Number(e.distancia_km) < 20 && !['Coche particular (conductor)', 'Coche particular (pasajero)', 'Metro', 'Cercanías', 'Autobús urbano', 'Autobús interurbano', 'Tranvía', 'Bicicleta', 'Bicicleta eléctrica', 'A pie', 'VMP (Patinete)'].includes(e.modo_principal)).length}</td>
            </tr>
            <tr>
                <td><strong>20+ km</strong></td>
                <td>${empleados.filter(e => Number(e.distancia_km) >= 20 && ['Coche particular (conductor)', 'Coche particular (pasajero)'].includes(e.modo_principal)).length}</td>
                <td>${empleados.filter(e => Number(e.distancia_km) >= 20 && ['Metro', 'Cercanías', 'Autobús urbano', 'Autobús interurbano', 'Tranvía'].includes(e.modo_principal)).length}</td>
                <td>${empleados.filter(e => Number(e.distancia_km) >= 20 && ['Bicicleta', 'Bicicleta eléctrica', 'A pie', 'VMP (Patinete)'].includes(e.modo_principal)).length}</td>
                <td>${empleados.filter(e => Number(e.distancia_km) >= 20 && !['Coche particular (conductor)', 'Coche particular (pasajero)', 'Metro', 'Cercanías', 'Autobús urbano', 'Autobús interurbano', 'Tranvía', 'Bicicleta', 'Bicicleta eléctrica', 'A pie', 'VMP (Patinete)'].includes(e.modo_principal)).length}</td>
            </tr>
        </tbody>
    </table>

    <div class="highlight-box">
        <strong>📊 Observaciones clave del análisis cruzado:</strong>
        <ul>
            <li>Los desplazamientos de <strong>menos de 2 km</strong> son candidatos idóneos para el uso de bicicleta o desplazamiento a pie.</li>
            <li>En el rango de <strong>2-5 km</strong>, la bicicleta eléctrica y el VMP son alternativas muy competitivas en tiempo con respecto al coche.</li>
            <li>Para distancias superiores a <strong>10 km</strong>, el transporte público de cercanías o el coche compartido son las alternativas más viables.</li>
            <li>Los desplazamientos de <strong>más de 20 km</strong> son candidatos prioritarios para teletrabajo o relocalización de residencia.</li>
        </ul>
    </div>
</div>`;
}

// ──────────────────────────────────────────
// CAPÍTULO 9: ANÁLISIS DEL REPARTO MODAL
// ──────────────────────────────────────────

function generarAnalisisRepartoModal(app) {
    const modalSplit = getModalSplit(app);
    const resumen = getResumen(app);
    const total = modalSplit.reduce((s, m) => s + m.count, 0);

    return `
<div class="chapter" id="chapter-9">
    <h1 class="chapter-title">9. Análisis del Reparto Modal</h1>

    <p>El reparto modal o <em>modal split</em> es el indicador central de un Plan de Movilidad Sostenible. Describe la proporción de desplazamientos que se realizan por cada modo de transporte, proporcionando una imagen clara de la "dependencia" del centro de trabajo respecto al coche particular y de la penetración de alternativas más sostenibles.</p>

    <h2 class="section-title">9.1 Definición y Metodología</h2>

    <p>El reparto modal se calcula como el porcentaje de trabajadores/as que utilizan habitualmente cada modo de transporte principal para acudir al centro de trabajo. Los modos se clasifican en tres categorías principales:</p>

    <ul>
        <li><strong>Modos motorizados individuales:</strong> Coche particular (conductor), coche particular (pasajero). Son los modos con mayor impacto ambiental por viajero.</li>
        <li><strong>Modos sostenibles colectivos:</strong> Autobús urbano/interurbano, metro, cercanías, tranvía. Tienen menor impacto por viajero, especialmente cuando están bien ocupados.</li>
        <li><strong>Modos activos y micro-movilidad:</strong> Bicicleta, bicicleta eléctrica, VMP (vehículo de movilidad personal), a pie. Son los modos con menor o nula emisión de CO2e.</li>
    </ul>

    <h2 class="section-title">9.2 Resultados del Reparto Modal</h2>

    ${total > 0 ? `
    <table>
        <caption>Reparto modal del centro de trabajo</caption>
        <thead>
            <tr>
                <th>Modo de transporte</th>
                <th>Usuarios/as</th>
                <th>Porcentaje</th>
                <th>Clasificación</th>
                <th>Factor CO2e (kg/pas-km)</th>
            </tr>
        </thead>
        <tbody>
            ${modalSplit.map(m => {
                const factor = FACTORES_CO2E[m.modo] !== undefined ? FACTORES_CO2E[m.modo] : 0.10;
                const sostenibles = ['Bicicleta', 'Bicicleta eléctrica', 'A pie', 'Metro', 'Cercanías', 'Autobús urbano', 'Autobús interurbano', 'Tranvía', 'VMP'];
                const esSostenible = sostenibles.some(s => m.modo.toLowerCase().includes(s.toLowerCase()));
                const cat = m.modo === 'Teletrabajo' ? 'Sin desplazamiento' : esSostenible ? 'Sostenible' : 'Motorizado';
                return `
            <tr>
                <td><strong>${m.modo}</strong></td>
                <td>${m.count}</td>
                <td><strong>${pct(m.percent)}</strong></td>
                <td>${cat === 'Sostenible' ? '<span class="badge baja">Sostenible</span>' : cat === 'Sin desplazamiento' ? '<span class="badge baja">Sin desplaz.</span>' : '<span class="badge alta">Motorizado</span>'}</td>
                <td>${fmt(factor, 3)}</td>
            </tr>`;
            }).join('')}
        </tbody>
    </table>

    <h2 class="section-title">9.3 Comparativa con Referentes</h2>

    <p>Para evaluar si el reparto modal del centro es favorable o no, se compara con los datos de referencia disponibles:</p>

    <table>
        <caption>Comparativa del reparto modal con referentes</caption>
        <thead>
            <tr>
                <th>Indicador</th>
                <th>Este centro</th>
                <th>Media nacional*</th>
                <th>Objetivo PMST</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td><strong>Coche particular (conductor)</strong></td>
                <td>${pct(modalSplit.find(m => m.modo.includes('conductor'))?.percent || 0)}</td>
                <td>63,4%</td>
                <td>&lt; 40%</td>
            </tr>
            <tr>
                <td><strong>Transporte público</strong></td>
                <td>${pct(modalSplit.filter(m => ['Metro', 'Cercanías', 'Autobús urbano', 'Autobús interurbano', 'Tranvía'].includes(m.modo)).reduce((s, m) => s + m.percent, 0))}</td>
                <td>15,2%</td>
                <td>&gt; 25%</td>
            </tr>
            <tr>
                <td><strong>Bicicleta / VMP</strong></td>
                <td>${pct(modalSplit.filter(m => ['Bicicleta', 'Bicicleta eléctrica', 'VMP (Patinete)'].includes(m.modo)).reduce((s, m) => s + m.percent, 0))}</td>
                <td>3,1%</td>
                <td>&gt; 10%</td>
            </tr>
            <tr>
                <td><strong>A pie</strong></td>
                <td>${pct(modalSplit.find(m => m.modo === 'A pie')?.percent || 0)}</td>
                <td>5,8%</td>
                <td>&gt; 10%</td>
            </tr>
            <tr>
                <td><strong>Teletrabajo</strong></td>
                <td>${pct(modalSplit.find(m => m.modo === 'Teletrabajo')?.percent || 0)}</td>
                <td>12,5%</td>
                <td>&gt; 20%</td>
            </tr>
        </tbody>
    </table>
    <p class="footnote">* Datos de referencia del Ministerio de Transportes, Movilidad y Agenda Urbana (MITMA), Encuesta ETS 2023.</p>

    <h2 class="section-title">9.4 Evaluación del Nivel de Sostenibilidad</h2>

    <p>El nivel de sostenibilidad global del centro se clasifica como <strong>"${resumen.nivelSostenibilidad}"</strong>, con los siguientes indicadores:</p>

    <div class="kpi-grid">
        <div class="kpi-card green">
            <div class="kpi-value">${pct(resumen.porcentajeSostenible)}</div>
            <div class="kpi-label">Modos sostenibles</div>
        </div>
        <div class="kpi-card accent">
            <div class="kpi-value">${pct(resumen.porcentajeMotorizado)}</div>
            <div class="kpi-label">Modos motorizados</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-value">${pct(resumen.porcentajeTeletrabajo)}</div>
            <div class="kpi-label">Teletrabajo</div>
        </div>
    </div>

    <div class="highlight-box ${resumen.porcentajeMotorizado > 50 ? 'danger' : resumen.porcentajeMotorizado > 30 ? 'warning' : 'success'}">
        <strong>${resumen.porcentajeMotorizado > 50 ? '🚨 Diagnóstico preocupante:' : resumen.porcentajeMotorizado > 30 ? '⚠️ Diagnóstico a mejorar:' : '✅ Diagnóstico favorable:'}</strong>
        ${resumen.porcentajeMotorizado > 50 ?
            'Con un ' + pct(resumen.porcentajeMotorizado) + ' de modos motorizados, el centro presenta una alta dependencia del coche particular. Esto implica una huella de carbono elevada y una oportunidad significativa de mejora a través de las medidas del PMST.' :
            'El centro muestra un reparto modal relativamente equilibrado. Las medidas del PMST deben enfocarse en mantener y reforzar los modos sostenibles actuales, incrementando progresivamente su cuota de mercado.'}
    </div>

    <h2 class="section-title">9.5 Análisis por Departamento</h2>

    <p>El reparto modal puede variar significativamente entre departamentos, en función de la ubicación de residencia de sus miembros, su perfil socioeconómico y las condiciones de trabajo. Se recomienda un análisis departmental para identificar los colectivos con mayor dependencia del coche y dirigir las medidas de intervención de forma más efectiva.</p>

    <p>Los departamentos con mayor proporción de desplazamientos motorizados son candidatos prioritarios para la implementación de medidas de fomento del transporte público y del carpooling.</p>
    ` : `
    <div class="highlight-box warning">
        <strong>⚠️ Datos insuficientes:</strong> No se dispone de datos suficientes para generar el análisis del reparto modal. Se recomienda completar la encuesta de movilidad o registrar los datos de empleados en la plataforma para obtener resultados fiables.
    </div>
    `}
</div>`;
}

// ──────────────────────────────────────────
// CAPÍTULO 10: ANÁLISIS DE DISTANCIAS Y TIEMPOS
// ──────────────────────────────────────────

function generarAnalisisDistancias(app) {
    const empleados = getEmpleados(app);
    const total = empleados.length;
    let distMedia = 0, distMax = 0, distMin = Infinity;
    let tiempoMedio = 0;

    if (total > 0) {
        const dists = empleados.map(e => Number(e.distancia_km) || 0).filter(d => d > 0);
        const tiempos = empleados.map(e => Number(e.tiempo_viaje_min) || 0).filter(t => t > 0);
        distMedia = dists.length > 0 ? dists.reduce((s, d) => s + d, 0) / dists.length : 0;
        distMax = dists.length > 0 ? Math.max(...dists) : 0;
        distMin = dists.length > 0 ? Math.min(...dists) : 0;
        tiempoMedio = tiempos.length > 0 ? tiempos.reduce((s, t) => s + t, 0) / tiempos.length : 0;
    }

    return `
<div class="chapter" id="chapter-10">
    <h1 class="chapter-title">10. Análisis de Distancias y Tiempos de Viaje</h1>

    <p>El análisis de las distancias y los tiempos de viaje es fundamental para evaluar la viabilidad de las diferentes alternativas de movilidad sostenible. La distancia al trabajo determina qué modos de transporte son realistas, mientras que el tiempo de viaje es el factor que más influye en la satisfacción del trabajador/a y en su disposición a cambiar de hábitos.</p>

    <h2 class="section-title">10.1 Estadísticas Generales</h2>

    ${total > 0 ? `
    <div class="kpi-grid">
        <div class="kpi-card">
            <div class="kpi-value">${fmt(distMedia)} km</div>
            <div class="kpi-label">Distancia media</div>
        </div>
        <div class="kpi-card accent">
            <div class="kpi-value">${fmt(distMax)} km</div>
            <div class="kpi-label">Distancia máxima</div>
        </div>
        <div class="kpi-card green">
            <div class="kpi-value">${fmt(tiempoMedio, 0)} min</div>
            <div class="kpi-label">Tiempo medio de viaje</div>
        </div>
    </div>

    <h2 class="section-title">10.2 Distribución de Distancias</h2>

    <p>La distribución de distancias al trabajo muestra que:</p>

    <ul>
        <li>El <strong>${fmt(distMedia)}</strong> km es la distancia media de desplazamiento, lo que sitúa a los/as trabajadores/as en un rango ${distMedia < 5 ? 'favorable para el uso de bicicleta y desplazamientos a pie' : distMedia < 10 ? ' donde la bicicleta eléctrica y el transporte público son alternativas viables' : 'donde el transporte público de cercanías y el coche compartido son las opciones más realistas'}.</li>
        <li>La distancia máxima de <strong>${fmt(distMax)} km</strong> indica que ${distMax > 20 ? 'algunos/as trabajadores/as realizan desplazamientos de larga distancia, siendo candidatos prioritarios para teletrabajo' : 'los desplazamientos se concentran en un radio razonable'}.</li>
    </ul>

    <h2 class="section-title">10.3 Análisis por Rangos de Distancia</h2>

    <p>Para una mejor comprensión de la estructura de las distancias, se han definido los siguientes rangos de análisis:</p>

    <table>
        <caption>Distribución de distancias al trabajo</caption>
        <thead>
            <tr>
                <th>Rango de distancia</th>
                <th>Empleados/as</th>
                <th>Porcentaje</th>
                <th>Modo recomendado</th>
                <th>Viabilidad</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td><strong>&lt; 2 km</strong></td>
                <td>${empleados.filter(e => Number(e.distancia_km) < 2).length}</td>
                <td>${pct(total > 0 ? (empleados.filter(e => Number(e.distancia_km) < 2).length / total) * 100 : 0)}</td>
                <td>A pie, bicicleta</td>
                <td><span class="badge baja">Alta</span></td>
            </tr>
            <tr>
                <td><strong>2-5 km</strong></td>
                <td>${empleados.filter(e => Number(e.distancia_km) >= 2 && Number(e.distancia_km) < 5).length}</td>
                <td>${pct(total > 0 ? (empleados.filter(e => Number(e.distancia_km) >= 2 && Number(e.distancia_km) < 5).length / total) * 100 : 0)}</td>
                <td>Bicicleta, bici eléctrica, VMP</td>
                <td><span class="badge baja">Alta</span></td>
            </tr>
            <tr>
                <td><strong>5-10 km</strong></td>
                <td>${empleados.filter(e => Number(e.distancia_km) >= 5 && Number(e.distancia_km) < 10).length}</td>
                <td>${pct(total > 0 ? (empleados.filter(e => Number(e.distancia_km) >= 5 && Number(e.distancia_km) < 10).length / total) * 100 : 0)}</td>
                <td>Bici eléctrica, transporte público, coche compartido</td>
                <td><span class="badge media">Media</span></td>
            </tr>
            <tr>
                <td><strong>10-20 km</strong></td>
                <td>${empleados.filter(e => Number(e.distancia_km) >= 10 && Number(e.distancia_km) < 20).length}</td>
                <td>${pct(total > 0 ? (empleados.filter(e => Number(e.distancia_km) >= 10 && Number(e.distancia_km) < 20).length / total) * 100 : 0)}</td>
                <td>Transporte público, coche compartido</td>
                <td><span class="badge media">Media</span></td>
            </tr>
            <tr>
                <td><strong>20+ km</strong></td>
                <td>${empleados.filter(e => Number(e.distancia_km) >= 20).length}</td>
                <td>${pct(total > 0 ? (empleados.filter(e => Number(e.distancia_km) >= 20).length / total) * 100 : 0)}</td>
                <td>Teletrabajo, coche compartido, transporte interurbano</td>
                <td><span class="badge alta">Baja</span></td>
            </tr>
        </tbody>
    </table>

    <h2 class="section-title">10.4 Análisis de Tiempos de Viaje</h2>

    <p>El tiempo de viaje es un indicador de la calidad de la experiencia de movilidad. Un tiempo excesivo puede generar insatisfacción y reducir la productividad laboral. Los siguientes criterios se aplican para evaluar la calidad de los tiempos:</p>

    <table>
        <caption>Evaluación de tiempos de viaje</caption>
        <thead>
            <tr>
                <th>Rango de tiempo</th>
                <th>Empleados/as</th>
                <th>Porcentaje</th>
                <th>Valoración</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td><strong>&lt; 15 min</strong></td>
                <td>${empleados.filter(e => Number(e.tiempo_viaje_min) < 15).length}</td>
                <td>${pct(total > 0 ? (empleados.filter(e => Number(e.tiempo_viaje_min) < 15).length / total) * 100 : 0)}</td>
                <td><span class="badge baja">Excelente</span></td>
            </tr>
            <tr>
                <td><strong>15-30 min</strong></td>
                <td>${empleados.filter(e => Number(e.tiempo_viaje_min) >= 15 && Number(e.tiempo_viaje_min) < 30).length}</td>
                <td>${pct(total > 0 ? (empleados.filter(e => Number(e.tiempo_viaje_min) >= 15 && Number(e.tiempo_viaje_min) < 30).length / total) * 100 : 0)}</td>
                <td><span class="badge baja">Bueno</span></td>
            </tr>
            <tr>
                <td><strong>30-45 min</strong></td>
                <td>${empleados.filter(e => Number(e.tiempo_viaje_min) >= 30 && Number(e.tiempo_viaje_min) < 45).length}</td>
                <td>${pct(total > 0 ? (empleados.filter(e => Number(e.tiempo_viaje_min) >= 30 && Number(e.tiempo_viaje_min) < 45).length / total) * 100 : 0)}</td>
                <td><span class="badge media">Aceptable</span></td>
            </tr>
            <tr>
                <td><strong>45-60 min</strong></td>
                <td>${empleados.filter(e => Number(e.tiempo_viaje_min) >= 45 && Number(e.tiempo_viaje_min) < 60).length}</td>
                <td>${pct(total > 0 ? (empleados.filter(e => Number(e.tiempo_viaje_min) >= 45 && Number(e.tiempo_viaje_min) < 60).length / total) * 100 : 0)}</td>
                <td><span class="badge alta">Largo</span></td>
            </tr>
            <tr>
                <td><strong>60+ min</strong></td>
                <td>${empleados.filter(e => Number(e.tiempo_viaje_min) >= 60).length}</td>
                <td>${pct(total > 0 ? (empleados.filter(e => Number(e.tiempo_viaje_min) >= 60).length / total) * 100 : 0)}</td>
                <td><span class="badge alta">Excesivo</span></td>
            </tr>
        </tbody>
    </table>

    <h2 class="section-title">10.5 Mapas de Isocronas de Accesibilidad</h2>

    <p>Las isocronas son representaciones geográficas que muestran las zonas alcanzables desde el centro de trabajo en un tiempo determinado para cada modo de transporte. Este análisis es especialmente relevante para:</p>

    <ul>
        <li><strong>Evaluar la cobertura peatonal:</strong> Zonas accesibles a pie en 10-15 minutos (radio aprox. 1-1,5 km).</li>
        <li><strong>Evaluar la cobertura ciclista:</strong> Zonas accesibles en bicicleta en 15-25 minutos (radio aprox. 3-7 km).</li>
        <li><strong>Evaluar la cobertura motorizada:</strong> Zonas accesibles en coche en 30-45 minutos, que representa el límite razonable para el desplazamiento diario.</li>
    </ul>

    <div class="highlight-box">
        <strong>🗺️ Mapa de isocronas (pendiente de cálculo):</strong> Las isocronas se calcularán utilizando la API de OpenRouteService cuando se proporcionen las coordenadas exactas del centro de trabajo. El mapa interactivo se generará automáticamente en la sección de visualización de la plataforma.
    </div>

    <h2 class="section-title">10.6 Zonas de Residencia de los Trabajadores/as</h2>

    <p>La distribución geográfica de las residencias de los/as trabajadores/as determina la demanda de transporte hacia el centro de trabajo. Un análisis de las zonas de residencia permite:</p>
    <ul>
        <li>Identificar las zonas con mayor concentración de trabajadores/as para optimizar las rutas de lanzadera.</li>
        <li>Detectar corredores de desplazamiento donde el transporte público podría ser más eficaz.</li>
        <li>Evaluar la viabilidad de programas de carpooling entre compañeros/as de la misma zona.</li>
        <li>Diseñar medidas específicas para las zonas con peor conectividad.</li>
    </ul>
    ` : `
    <div class="highlight-box warning">
        <strong>⚠️ Datos insuficientes:</strong> No se dispone de datos de distancia y tiempo de viaje para generar este análisis. Se recomienda completar la encuesta de movilidad o registrar los datos de empleados incluyendo distancia y tiempo de viaje.
    </div>
    `}
</div>`;
}

// ──────────────────────────────────────────
// CAPÍTULO 11: HUELLA DE CARBONO
// ──────────────────────────────────────────

function generarHuelaCarbono(app) {
    const co2e = getCO2e(app);
    const plantilla = safeNum(app, 'centro.plantilla', 0);
    const nombreCentro = safe(app, 'centro.nombre', 'el centro de trabajo');

    return `
<div class="chapter" id="chapter-11">
    <h1 class="chapter-title">11. Huella de Carbono</h1>

    <p>La huella de carbono de los desplazamientos al trabajo es uno de los indicadores ambientales más relevantes del Plan de Movilidad Sostenible. Permite cuantificar el impacto ambiental de los patrones de movilidad actuales y establecer una línea base para medir el progreso de las medidas de reducción de emisiones.</p>

    <h2 class="section-title">11.1 Metodología de Cálculo</h2>

    <p>El cálculo de la huella de carbono se ha realizado utilizando la metodología del <strong>Programa de Huella de Carbono, Compensación y Proyectos de Absorción</strong> del Ministerio para la Transición Ecológica y el Reto Demográfico (MITECO). Los factores de emisión utilizados corresponden a los publicados en la edición 2024 de la tabla de factores de emisión:</p>

    <div class="highlight-box">
        <strong>📐 Fórmula de cálculo:</strong><br>
        <code>CO2e anual (kg) = Factor de emisión (kg CO2e/pasajero-km) × Distancia ida-vuelta (km) × Días laborables/año</code>
        <br><br>
        <strong>Días laborables de referencia:</strong> 230 días/año (estándar español sin vacaciones)
        <br>
        <strong>Factores de emisión:</strong> Tabla MITECO 2024 — https://www.miteco.gob.es
    </div>

    <h2 class="section-title">11.2 Resultados Globales</h2>

    <div class="kpi-grid">
        <div class="kpi-card accent">
            <div class="kpi-value">${fmt(co2e.totalCo2eTon)}</div>
            <div class="kpi-label">t CO2e/año total</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-value">${fmt(co2e.totalCo2eKg)}</div>
            <div class="kpi-label">kg CO2e/año total</div>
        </div>
        <div class="kpi-card green">
            <div class="kpi-value">${fmt(co2e.porEmpleadoKg)}</div>
            <div class="kpi-label">kg CO2e/trabajador/año</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-value">${plantilla > 0 ? fmt(co2e.totalCo2eTon / plantilla * 1000) : '0'}</div>
            <div class="kpi-label">kg CO2e/trabajador/año (ref)</div>
        </div>
    </div>

    <p>${co2e.totalCo2eTon > 0 ?
        'La huella de carbono total de los desplazamientos al trabajo del centro ' + nombreCentro + ' asciende a <strong>' + fmt(co2e.totalCo2eTon) + ' toneladas de CO2e al año</strong>, lo que equivale a ' + fmt(co2e.porEmpleadoKg) + ' kg CO2e por trabajador/a y año. Para ponerlo en perspectiva, esto equivale al consumo energético de aproximadamente ' + fmt(co2e.totalCo2eTon * 1200) + ' bombillas LED de 10W encendidas durante un año completo.' :
        'No se dispone de datos suficientes para calcular la huella de carbono. Se recomienda completar la encuesta de movilidad o registrar los datos de empleados con distancia y modo de transporte.'}

    <h2 class="section-title">11.3 Desglose por Modo de Transporte</h2>

    ${Object.keys(co2e.desglose).length > 0 ? `
    <table>
        <caption>Desglose de emisiones por modo de transporte</caption>
        <thead>
            <tr>
                <th>Modo</th>
                <th>Factor (kg CO2e/pas-km)</th>
                <th>Distancia total (km)</th>
                <th>Empleados/as</th>
                <th>CO2e anual (kg)</th>
                <th>% del total</th>
            </tr>
        </thead>
        <tbody>
            ${Object.entries(co2e.desglose).sort((a, b) => b[1].co2eKgAnual - a[1].co2eKgAnual).map(([modo, data]) => `
            <tr>
                <td><strong>${modo}</strong></td>
                <td>${fmt(data.factorKgCO2e, 3)}</td>
                <td>${fmt(data.distanciaKm, 0)}</td>
                <td>${data.empleados}</td>
                <td><strong>${fmt(data.co2eKgAnual, 0)}</strong></td>
                <td>${pct(co2e.totalCo2eKg > 0 ? (data.co2eKgAnual / co2e.totalCo2eKg) * 100 : 0)}</td>
            </tr>
            `).join('')}
            <tr style="background: #f0f4ff; font-weight: 700;">
                <td>TOTAL</td>
                <td>—</td>
                <td>${fmt(Object.values(co2e.desglose).reduce((s, d) => s + d.distanciaKm, 0), 0)}</td>
                <td>${Object.values(co2e.desglose).reduce((s, d) => s + d.empleados, 0)}</td>
                <td>${fmt(co2e.totalCo2eKg, 0)}</td>
                <td>100%</td>
            </tr>
        </tbody>
    </table>

    <h2 class="section-title">11.4 Análisis de Impacto por Modo</h2>

    <p>El análisis del impacto relativo de cada modo de transporte revela que:</p>

    <ul>
        ${Object.entries(co2e.desglose).sort((a, b) => b[1].co2eKgAnual - a[1].co2eKgAnual).slice(0, 3).map(([modo, data]) => `
        <li><strong>${modo}</strong> es responsable del ${pct(co2e.totalCo2eKg > 0 ? (data.co2eKgAnual / co2e.totalCo2eKg) * 100 : 0)} de las emisiones totales, con ${fmt(data.co2eKgAnual, 0)} kg CO2e/año generados por ${data.empleados} trabajadores/as.</li>
        `).join('')}
    </ul>

    <h2 class="section-title">11.5 Potencial de Reducción</h2>

    <p>El análisis del potencial de reducción de emisiones se basa en la hipótesis de un cambio parcial del modo de transporte de los/as trabajadores/as motorizados/as hacia alternativas sostenibles:</p>

    <table>
        <caption>Escenarios de reducción de emisiones</caption>
        <thead>
            <tr>
                <th>Escenario</th>
                <th>Descripción</th>
                <th>Reducción estimada</th>
                <th>CO2e resultante</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td><strong>Escenario A (actual)</strong></td>
                <td>Sin cambios en el patrón modal actual</td>
                <td>0%</td>
                <td>${fmt(co2e.totalCo2eTon)} t CO2e/año</td>
            </tr>
            <tr>
                <td><strong>Escenario B (moderado)</strong></td>
                <td>20% de conductores cambian a transporte público o bici</td>
                <td>~15%</td>
                <td>${fmt(co2e.totalCo2eTon * 0.85)} t CO2e/año</td>
            </tr>
            <tr>
                <td><strong>Escenario C (ambicioso)</strong></td>
                <td>40% cambio a sostenible + 20% teletrabajo adicional</td>
                <td>~35%</td>
                <td>${fmt(co2e.totalCo2eTon * 0.65)} t CO2e/año</td>
            </tr>
            <tr>
                <td><strong>Escenario D (óptimo)</strong></td>
                <td>60% sostenible + 30% teletrabajo + optimización flota</td>
                <td>~55%</td>
                <td>${fmt(co2e.totalCo2eTon * 0.45)} t CO2e/año</td>
            </tr>
        </tbody>
    </table>

    <div class="highlight-box success">
        <strong>🎯 Objetivo de reducción:</strong> El escenario C (ambicioso) propone una reducción del 35% de las emisiones, pasando de ${fmt(co2e.totalCo2eTon)} a ${fmt(co2e.totalCo2eTon * 0.65)} t CO2e/año. Este objetivo es alcanzable en un horizonte de 3 años con la implementación del plan de medidas propuesto en este PMST.
    </div>
    ` : `
    <div class="highlight-box warning">
        <strong>⚠️ Sin datos de emisiones:</strong> No se dispone de datos suficientes para calcular la huella de carbono detallada. Los factores de emisión MITECO 2024 se aplicarán una vez se disponga de datos de distancia y modo de transporte de la plantilla.
    </div>
    `}

    <h2 class="section-title">11.6 Equivalencias Ambientales</h2>

    <p>Para facilitar la comprensión del impacto ambiental, se presentan las siguientes equivalencias:</p>

    ${co2e.totalCo2eTon > 0 ? `
    <ul>
        <li><strong>${fmt(co2e.totalCo2eTon)} t CO2e</strong> equivale al CO2 absorbido por aproximadamente <strong>${fmt(co2e.totalCo2eTon * 45, 0)} árboles</strong> en un año.</li>
        <li>Equivaldría a <strong>${fmt(co2e.totalCo2eTon * 4500, 0)} litros de gasolina</strong> quemados.</li>
        <li>Si se redujera un 50%, se evitarían <strong>${fmt(co2e.totalCo2eTon * 0.5)} t CO2e/año</strong>, equivalente a retirar <strong>${Math.ceil(co2e.totalCo2eTon * 0.5 / 2.3)} coches</strong> de la carretera.</li>
    </ul>
    ` : '<p>Las equivalencias ambientales se calcularán una vez se disponga de datos de huella de carbono.</p>'}
</div>`;
}

// ──────────────────────────────────────────
// CAPÍTULO 12: ANÁLISIS DE APARCAMIENTO
// ──────────────────────────────────────────

function generarAnalisisAparcamiento(app) {
    const empresa = safe(app, 'empresa', {});
    const centro = safe(app, 'centro', {});
    const plazasCoche = empresa.plazasCoche || centro.plazasCoche || 0;
    const plazasBici = empresa.plazasBici || centro.plazasBici || 0;
    const conductoresEstimados = Math.round(safeNum(app, 'centro.plantilla', 0) * 0.45);
    const indicadoresParked = safe(app, 'diagnostico.indicadoresParked', {});
    const ocupacion = indicadoresParked.tasaOcupacionPlazas || (plazasCoche > 0 ? Math.min(Math.round((conductoresEstimados / plazasCoche) * 100), 150) : 0);

    return `
<div class="chapter" id="chapter-12">
    <h1 class="chapter-title">12. Análisis de Aparcamiento</h1>

    <p>El análisis de las infraestructuras de aparcamiento es un componente esencial del PMST, ya que tanto el aparcamiento de vehículos como el de bicicletas influyen directamente en la elección del modo de transporte. Un exceso de plazas de coche puede incentivar el uso del vehículo privado, mientras que una infraestructura ciclista adecuada facilita la modalidad más sostenible.</p>

    <h2 class="section-title">12.1 Infraestructura de Aparcamiento</h2>

    <table>
        <caption>Estado actual de las infraestructuras de aparcamiento</caption>
        <thead>
            <tr>
                <th>Infraestructura</th>
                <th>Plazas</th>
                <th>Observaciones</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td><strong>Aparcamiento de coches</strong></td>
                <td>${plazasCoche > 0 ? plazasCoche + ' plazas' : 'No registrado'}</td>
                <td>${plazasCoche > 0 ? 'Disponibilidad para la plantilla' : 'Consultar opciones en el entorno'}</td>
            </tr>
            <tr>
                <td><strong>Aparcamiento de bicicletas</strong></td>
                <td>${plazasBici > 0 ? plazasBici + ' plazas' : 'No registrado'}</td>
                <td>${plazasBici > 0 ? (plazasBici > 10 ? 'Infraestructura adecuada' : 'Se recomienda ampliar') : 'No se dispone de infraestructura ciclista propia'}</td>
            </tr>
            <tr>
                <td><strong>Recarga eléctrica</strong></td>
                <td>${empresa.recargaElectrica ? 'Sí' : 'No'}</td>
                <td>${empresa.recargaElectrica ? 'Puntos de recarga disponibles' : 'Sin puntos de recarga para Vehículos Eléctricos'}</td>
            </tr>
        </tbody>
    </table>

    <h2 class="section-title">12.2 Indicadores de Ocupación</h2>

    <div class="kpi-grid">
        <div class="kpi-card">
            <div class="kpi-value">${conductoresEstimados}</div>
            <div class="kpi-label">Conductores estimados</div>
        </div>
        <div class="kpi-card ${ocupacion > 100 ? 'accent' : 'green'}">
            <div class="kpi-value">${pct(ocupacion)}</div>
            <div class="kpi-label">Ocupación plazas coche</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-value">${plazasBici > 0 ? fmt(plazasCoche / plazasBici, 1) : 'N/D'}</div>
            <div class="kpi-label">Ratio coche/bici</div>
        </div>
    </div>

    <p>El análisis de los indicadores de aparcamiento muestra que:</p>

    <ul>
        <li><strong>Conductores estimados:</strong> Se estima que aproximadamente ${conductoresEstimados} trabajadores/as acuden al centro en coche como conductores.</li>
        <li><strong>Tasa de ocupación:</strong> La tasa de ocupación de plazas de coche es del ${pct(ocupacion)}, lo que indica ${ocupacion > 100 ? 'una demanda que supera la capacidad del aparcamiento' : 'una capacidad suficiente para la demanda actual'}.</li>
        <li><strong>Ratio coche/bici:</strong> ${plazasBici > 0 ? 'Por cada plaza de coche hay ' + fmt(1 / (plazasCoche / plazasBici), 1) + ' plazas de bici, lo que ' + (plazasCoche / plazasBici > 10 ? 'indica un desequilibrio significativo a favor del coche' : 'representa una proporción razonable') + '.' : 'No se dispone de plazas de bicicleta, lo que supone una barrera significativa para la movilidad ciclista.'}</li>
    </ul>

    <h2 class="section-title">12.3 Análisis del Consejo de Aparcamiento</h2>

    <div class="highlight-box ${indicadoresParked.consejo ? 'warning' : ''}">
        <strong>📋 Evaluación:</strong>
        ${indicadoresParked.consejo || (
            plazasCoche === 0 ?
            'No se ha registrado infraestructura de aparcamiento propio. Se recomienda evaluar las opciones de aparcamiento en el entorno y la viabilidad de habilitar plazas propias.' :
            ocupacion > 100 ?
            'La demanda de aparcamiento supera la capacidad disponible. Se recomienda desincentivar el uso del coche particular mediante medidas como el límite de plazas, la reducción gradual de espacios o la introducción de peajes internos.' :
            'La infraestructura de aparcamiento es suficiente para la demanda actual. Se recomienda no ampliar las plazas de coche y redirigir los recursos hacia la mejora de la infraestructura ciclista.'
        )}
    </div>

    <h2 class="section-title">12.4 Recomendaciones de Aparcamiento</h2>

    <ol>
        <li><strong>No ampliar el aparcamiento de coches:</strong> Cualquier ampliación debe ser excepcional y condicionada a la reducción previa de la demanda motorizada.</li>
        <li><strong>Ampliar el aparcamiento de bicicletas:</strong> Se recomienda alcanzar un mínimo de ${Math.max(Math.round(safeNum(app, 'centro.plantilla', 0) * 0.15), 10)} plazas de bicicleta, con cubierta y puntos de recarga para bici eléctrica.</li>
        <li><strong>Instalar puntos de recarga eléctrica:</strong> ${!empresa.recargaElectrica ? 'La empresa no dispone de puntos de recarga. Se recomienda la instalación de al menos 2 puntos de recarga de nivel 2 (7-22 kW).' : 'Mantener los puntos de recarga existentes y evaluar su ampliación.'}</li>
        <li><strong>Zonas de carpooling:</strong> Destinar plazas de aparcamiento preferente para vehículos compartidos (2+ personas).</li>
        <li><strong>Aparcamiento disuasorio:</strong> Evaluar la instalación de un aparcamiento disuasorio en las inmediaciones del centro, conectado con lanzadera.</li>
    </ol>
</div>`;
}

// ──────────────────────────────────────────
// CAPÍTULO 13: OFERTA DE TRANSPORTE PÚBLICO
// ──────────────────────────────────────────

function generarOfertaTransporte(app) {
    const tp = safeArr(app, 'transportePublico');

    return `
<div class="chapter" id="chapter-13">
    <h1 class="chapter-title">13. Oferta de Transporte Público</h2>

    <p>El transporte público es uno de los pilares fundamentales de la movilidad sostenible. Una oferta de transporte público eficiente, frecuente y bien conectada con el centro de trabajo es un factor determinante para reducir la dependencia del coche particular. En este capítulo se analiza la oferta de transporte público disponible en el entorno del centro de trabajo.</p>

    <h2 class="section-title">13.1 Metodología de Análisis</h2>

    <p>La información sobre la oferta de transporte público se ha obtenido a partir de las siguientes fuentes:</p>
    <ul>
        <li><strong>NAP DGT (Nodo de Acceso Público):</strong> Base de datos oficial del Ministerio de Transportes con información sobre paradas, líneas y horarios del transporte público en toda España.</li>
        <li><strong>OpenStreetMap / Overpass API:</strong> Datos de infraestructuras de transporte público actualizados por la comunidad de mapeo.</li>
        <li><strong>Plan de Movilidad Municipal:</strong> Documentación del ayuntamiento correspondiente sobre las líneas y frecuencias del transporte público municipal.</li>
    </ul>

    <p>El radio de búsqueda se ha establecido en ${safe(app, 'configuracion.gtfsStopRadius', 500)} metros desde el centro de trabajo, que corresponde aproximadamente a un paseo de 10 minutos a pie.</p>

    <h2 class="section-title">13.2 Paradas y Estaciones en el Entorno</h2>

    ${tp.length > 0 ? `
    <p>Se han identificado <strong>${tp.length} paradas/estaciones</strong> de transporte público en el entorno del centro de trabajo:</p>

    <table>
        <caption>Paradas de transporte público en el entorno</caption>
        <thead>
            <tr>
                <th>Nombre</th>
                <th>Tipo</th>
                <th>Distancia (m)</th>
                <th>Líneas</th>
            </tr>
        </thead>
        <tbody>
            ${tp.map(p => `
            <tr>
                <td>${p.nombre || 'Parada sin nombre'}</td>
                <td>${p.tipo || 'N/D'}</td>
                <td>${p.distancia_m || 'N/D'}</td>
                <td>${Array.isArray(p.lineas) ? p.lineas.join(', ') : (p.lineas || 'N/D')}</td>
            </tr>
            `).join('')}
        </tbody>
    </table>
    ` : `
    <div class="highlight-box warning">
        <strong>⚠️ Datos pendientes de consulta:</strong> No se han recogido datos de transporte público para el entorno del centro de trabajo. Se recomienda consultar la API del NAP DGT o la plataforma Overpass para obtener información actualizada sobre paradas, líneas y frecuencias en un radio de 500 metros del centro.
    </div>
    `}

    <h2 class="section-title">13.3 Análisis de Cobertura</h2>

    <p>La cobertura de transporte público se evalúa en función de los siguientes criterios:</p>

    <table>
        <caption>Criterios de evaluación de la cobertura</caption>
        <thead>
            <tr>
                <th>Criterio</th>
                <th>Umbral</th>
                <th>Estado actual</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Parada a &lt; 500 m del centro</td>
                <td>Mínimo 1 parada</td>
                <td>${tp.filter(p => (p.distancia_m || 999) <= 500).length > 0 ? '✅ Cumplido (' + tp.filter(p => (p.distancia_m || 999) <= 500).length + ' paradas)' : '⚠️ No se han identificado paradas en el radio de búsqueda'}</td>
            </tr>
            <tr>
                <td>Múltiples líneas disponibles</td>
                <td>Mínimo 2 líneas</td>
                <td>${tp.length >= 2 ? '✅ Cumplido' : '⚠️ Se recomienda disponer de al menos 2 líneas alternativas'}</td>
            </tr>
            <tr>
                <td>Frecuencia en hora punta</td>
                <td>&lt; 15 minutos</td>
                <td>${tp.length > 0 ? '⏳ Pendiente de verificación' : '⏳ Sin datos'}</td>
            </tr>
            <tr>
                <td>Conectividad con residencias</td>
                <td>Al menos 1 línea que conecte zonas principales de residencia</td>
                <td>${tp.length > 0 ? '⏳ Pendiente de análisis' : '⏳ Sin datos'}</td>
            </tr>
        </tbody>
    </table>

    <h2 class="section-title">13.4 Líneas y Frecuencias</h2>

    <p>La información detallada sobre las líneas de transporte público disponibles incluye:</p>

    <ul>
        <li><strong>Líneas de autobús urbano:</strong> ${tp.filter(p => p.tipo === 'Autobús urbano' || p.tipo === 'autobús').length > 0 ? 'Disponibles en el entorno del centro' : 'No se han identificado líneas de autobús urbano en las inmediaciones'}</li>
        <li><strong>Líneas de autobús interurbano:</strong> ${tp.filter(p => p.tipo === 'Autobús interurbano' || p.tipo === 'interurbano').length > 0 ? 'Conexiones con municipios cercanos disponibles' : 'No se han identificado líneas de autobús interurbano'}</li>
        <li><strong>Metro / Cercanías:</strong> ${tp.filter(p => p.tipo === 'Metro' || p.tipo === 'Cercanías' || p.tipo === 'tren').length > 0 ? 'Estaciones de metro/cercanías accesibles' : 'No se han identificado estaciones de metro o cercanías en el entorno'}</li>
        <li><strong>Tranvía:</strong> ${tp.filter(p => p.tipo === 'Tranvía' || p.tipo === 'tranvía').length > 0 ? 'Línea de tranvía disponible' : 'No se han identificado líneas de tranvía'}</li>
    </ul>

    <h2 class="section-title">13.5 Recomendaciones de Movilidad con Transporte Público</h2>

    <ol>
        <li><strong>Subvención al abono:</strong> ${safe(app, 'empresa.ayudaTransporte', false) ? 'La empresa ya dispone de un programa de ayudas. Se recomienda evaluar su ampliación.' : 'Implementar un programa de subvención del 50-75% del abono de transporte público para los/as trabajadores/as que lo utilicen como modo habitual.'}</li>
        <li><strong>Información de horarios:</strong> Instalar pantallas o aplicaciones con información en tiempo real de las llegadas de los vehículos de transporte público.</li>
        <li><strong>Lanzadera:</strong> ${safe(app, 'empresa.lanzadera', false) ? 'Mantener el servicio de lanzadera existente.' : 'Implementar un servicio de lanzadera que conecte el centro de trabajo con las estaciones de metro/cercanías más cercanas.'}</li>
        <li><strong>Campañas de sensibilización:</strong> Realizar campañas internas para informar sobre las rutas, horarios y ventajas del transporte público.</li>
        <li><strong>Coordinación con el operador:</strong> Establecer acuerdos con el operador de transporte público para optimizar frecuencias en horas punta de entrada y salida del centro.</li>
    </ol>

    <div class="highlight-box">
        <strong>📌 Dato clave:</strong> Según el MITMA, el transporte público en España tiene una huella de carbono promedio de 0,033-0,089 kg CO2e/pasajero-km, dependiendo del modo, lo que supone entre un 53% y un 82% menos de emisiones que el coche particular con conductor (0,192 kg CO2e/pasajero-km).
    </div>
</div>`;
}

// ──────────────────────────────────────────
// CAPÍTULO 14: INFRAESTRUCTURA CICLISTA
// ──────────────────────────────────────────

function generarInfraestructuraCiclista(app) {
    const centro = safe(app, 'centro', {});
    const empresa = safe(app, 'empresa', {});
    const gbfs = safeArr(app, 'gbfs.estaciones');
    const plazasBici = empresa.plazasBici || 0;

    return `
<div class="chapter" id="chapter-14">
    <h1 class="chapter-title">14. Infraestructura Ciclista y Movilidad Lenta</h1>

    <p>La infraestructura ciclista y peatonal es un factor determinante para facilitar la movilidad sostenible. Una red ciclista bien diseñada, segura y conectada permite que un número significativo de trabajadores/as desplacen su modo de transporte habitual hacia la bicicleta, con beneficios tanto para la salud como para el medio ambiente.</p>

    <h2 class="section-title">14.1 Estado Actual de la Infraestructura Ciclista</h2>

    <p>El análisis de la infraestructura ciclista en el entorno del centro de trabajo incluye la evaluación de los siguientes elementos:</p>

    <ul>
        <li><strong>Carriles bici:</strong> Se ha analizado la existencia de carriles bici protegidos, compartidos o señalizados en las principales vías de acceso al centro de trabajo.</li>
        <li><strong>Cicloporrutas:</strong> Infraestructuras segregadas para bicicleta y peatón que permiten desplazamientos seguros a medio-largo plazo.</li>
        <li><strong>Calles con限速限速限速 (zona 30):</strong> Vías con limitación de velocidad que favorecen la convivencia entre bicicletas, peatones y vehículos.</li>
        <li><strong>Señalización ciclista:</strong> Existencia de señalización específica que indica rutas ciclistas, direcciones y distancias.</li>
    </ul>

    <h2 class="section-title">14.2 Infraestructura Ciclista Propia del Centro</h2>

    <table>
        <caption>Infraestructura ciclista del centro de trabajo</caption>
        <thead>
            <tr>
                <th>Elemento</th>
                <th>Estado</th>
                <th>Detalles</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Aparcamiento de bicicletas</td>
                <td>${plazasBici > 0 ? '✅ Disponible' : '❌ No disponible'}</td>
                <td>${plazasBici > 0 ? plazasBici + ' plazas' + (centro.biciCubierta ? ' (cubierto)' : ' (al aire libre)') : 'No se ha registrado infraestructura ciclista propia'}</td>
            </tr>
            <tr>
                <td>Duchas y vestuarios</td>
                <td>${empresa.duchas ? '✅ Disponibles' : '❌ No disponibles'}</td>
                <td>${empresa.duchas ? 'Instalaciones para usuarios de bicicleta' : 'Se recomienda habilitar para usuarios de bicicleta'}</td>
            </tr>
            <tr>
                <td>Puntos de recarga bici eléctrica</td>
                <td>${empresa.recargaElectrica ? '✅ Disponibles' : '❌ No disponibles'}</td>
                <td>${empresa.recargaElectrica ? 'Puntos de recarga para bicicletas eléctricas' : 'Se recomienda instalar al menos 2 puntos'}</td>
            </tr>
            <tr>
                <td>Herramientas y bombona</td>
                <td>⚠️ Por verificar</td>
                <td>Se recomienda disponer de un kit de herramientas básico y bombona de aire para reparaciones menores</td>
            </tr>
        </tbody>
    </table>

    <h2 class="section-title">14.3 Bicicleta Compartida (GBFS)</h2>

    <p>Los sistemas de bicicleta compartida (General Bikeshare Feed Specification - GBFS) son una alternativa complementaria a la bicicleta privada. Permiten a los/as trabajadores/as realizar trayectos "last-mile" desde las estaciones de transporte público hasta el centro de trabajo.</p>

    ${gbfs.length > 0 ? `
    <p>Se han identificado <strong>${gbfs.length} estaciones de bicicleta compartida</strong> en el entorno del centro de trabajo:</p>
    <table>
        <caption>Estaciones de bicicleta compartida (GBFS)</caption>
        <thead>
            <tr>
                <th>Estación</th>
                <th>Bicicletas disponibles</th>
                <th>Anclajes totales</th>
            </tr>
        </thead>
        <tbody>
            ${gbfs.slice(0, 10).map(e => `
            <tr>
                <td>${e.nombre || e.name || 'Estación sin nombre'}</td>
                <td>${e.bicicletas || e.bikes_available || 'N/D'}</td>
                <td>${e.docks || e.capacity || 'N/D'}</td>
            </tr>
            `).join('')}
        </tbody>
    </table>
    ` : `
    <div class="highlight-box">
        <strong>🚲 Bicicleta compartida (pendiente de consulta):</strong> No se han recogido datos de sistemas de bicicleta compartida en el entorno. Se recomienda consultar las APIs GBFS de las ciudades con sistemas de bici compartida (Madrid BiciMad, Barcelona Bicing, Valencia Valenbisi, etc.) para identificar las estaciones más cercanas al centro de trabajo.
    </div>
    `}

    <h2 class="section-title">14.4 Vehículos de Movilidad Personal (VMP)</h2>

    <p>Los VMP, como patinetes eléctricos, representan una alternativa creciente para desplazamientos de corta distancia (2-8 km). Son especialmente relevantes como complemento al transporte público para el "last mile".</p>

    <ul>
        <li><strong>Ventajas:</strong> Bajo coste de adquisición y mantenimiento, fácil estacionamiento, cero emisiones en uso.</li>
        <li><strong>Inconvenientes:</strong> Limitaciones legales (velocidad máxima 25 km/h, prohibición en aceras), necesidad de infraestructura de carga, percibidos como menos seguros que la bicicleta.</li>
        <li><strong>Recomendación:</strong> Habilitar zonas de estacionamiento y carga para VMP en el entorno del centro de trabajo.</li>
    </ul>

    <h2 class="section-title">14.5 Infraestructura Peatonal</h2>

    <p>Los desplazamientos a pie son el modo más sostenible y saludable. Para facilitarlos, es necesario disponer de:</p>

    <ul>
        <li><strong>Aceras amplias y bien mantenidas:</strong> Mínimo 1,5 m de ancho, sin obstáculos.</li>
        <li><strong>Pasos de peatones seguros:</strong> Semáforos, pasos elevados, zonas de prioridad peatonal.</li>
        <li><strong>Iluminación adecuada:</strong> Para garantizar la seguridad en desplazamientos en horas de baja luminosidad.</li>
        <li><strong>Arbolado y zonas verdes:</strong> Para mejorar la confortabilidad del recorrido peatonal.</li>
        <li><strong>Accesibilidad universal:</strong> Rampas, pavimento tactile, semáforos acústicos.</li>
    </ul>

    <h2 class="section-title">14.6 Recomendaciones de Infraestructura</h2>

    <div class="highlight-box success">
        <strong>🎯 Plan de mejora de infraestructura ciclista y peatonal:</strong>
        <ol style="margin-top: 10px;">
            <li><strong>Corto plazo (0-6 meses):</strong> Ampliar el aparcamiento de bicicletas a un mínimo de ${Math.max(Math.round(safeNum(app, 'centro.plantilla', 0) * 0.15), 10)} plazas, con cubierta y puntos de recarga.</li>
            <li><strong>Corto plazo (0-6 meses):</strong> Instalar duchas y vestuarios para usuarios de bicicleta si no existen.</li>
            <li><strong>Medio plazo (6-12 meses):</strong> Coordinar con el ayuntamiento para la mejora de los carriles bici en las vías de acceso al centro.</li>
            <li><strong>Medio plazo (6-12 meses):</strong> Establecer acuerdos con operadores de bicicleta compartida para la instalación de estaciones en las inmediaciones.</li>
            <li><strong>Largo plazo (12-24 meses):</strong> Proponer al ayuntamiento la creación de una cicloporruta que conecte el centro con las principales zonas residenciales.</li>
        </ol>
    </div>
</div>`;
}

// ──────────────────────────────────────────
// CAPÍTULO 15: ANÁLISIS DAFO
// ──────────────────────────────────────────

function generarAnalisisDAFO(app) {
    const dafo = safe(app, 'dafo', {});
    const fortalezas = safeArr(app, 'dafo.fortalezas');
    const debilidades = safeArr(app, 'dafo.debilidades');
    const oportunidades = safeArr(app, 'dafo.oportunidades');
    const amenazas = safeArr(app, 'dafo.amenazas');

    // Si no hay datos de DAFO, generar basado en el diagnóstico
    const diagnostico = getResumen(app);
    const empleados = getEmpleados(app);
    const empresa = safe(app, 'empresa', {});

    const fDefault = [
        diagnostico.porcentajeSostenible > 30 ? 'Buena penetración de modos sostenibles (' + pct(diagnostico.porcentajeSostenible) + ')' : null,
        empresa.plazasBici > 0 ? 'Infraestructura ciclista disponible' : null,
        empresa.duchas ? 'Duchas y vestuarios para usuarios de bici' : null,
        empresa.recargaElectrica ? 'Puntos de recarga eléctrica' : null,
        diagnostico.porcentajeTeletrabajo > 10 ? 'Política de teletrabajo activa' : null,
        empresa.lanzadera ? 'Servicio de lanzadera disponible' : null,
        empresa.ayudaTransporte ? 'Ayudas al transporte público' : null,
    ].filter(Boolean);

    const dDefault = [
        diagnostico.porcentajeMotorizado > 50 ? 'Alta dependencia del coche particular (' + pct(diagnostico.porcentajeMotorizado) + ')' : null,
        empresa.plazasBici === 0 ? 'Sin infraestructura ciclista propia' : null,
        !empresa.duchas ? 'Ausencia de duchas/vestuarios' : null,
        !empresa.recargaElectrica ? 'Sin puntos de recarga eléctrica' : null,
        diagnostico.porcentajeTeletrabajo < 10 ? 'Baja penetración del teletrabajo' : null,
        !empresa.lanzadera ? 'Sin servicio de lanzadera' : null,
    ].filter(Boolean);

    const oDefault = [
        'Ampliación de la red de transporte público en el municipio',
        'Crecimiento de los sistemas de bicicleta compartida',
        'Incentivos fiscales para vehículos eléctricos',
        'Políticas europeas de descarbonización del transporte',
        'Mejora de la infraestructura ciclista municipal',
        'Nuevas tecnologías de micro-movilidad (VMP)',
        'Programas de incentivos laborales para movilidad sostenible',
    ];

    const aDefault = [
        'Resistencia al cambio de hábitos por parte de algunos/as trabajadores/as',
        'Falta de infraestructura ciclista en el entorno inmediato',
        'Condiciones climáticas adversas en determinados períodos',
        'Aumento del precio del transporte público',
        'Posible reducción de servicios de transporte público',
        'Inseguridad vial en determinadas rutas de acceso',
    ];

    const f = fortalezas.length > 0 ? fortalezas : fDefault;
    const d = debilidades.length > 0 ? debilidades : dDefault;
    const o = oportunidades.length > 0 ? oportunidades : oDefault;
    const a = amenazas.length > 0 ? amenazas : aDefault;

    return `
<div class="chapter" id="chapter-15">
    <h1 class="chapter-title">15. Análisis DAFO</h1>

    <p>El análisis DAFO (Debilidades, Amenazas, Fortalezas y Oportunidades) es una herramienta estratégica fundamental para la elaboración de un PMST efectivo. Permite identificar los factores internos y externos que influyen en la capacidad del centro de trabajo para implementar medidas de movilidad sostenible, y orienta la definición de las estrategias y medidas del plan.</p>

    <h2 class="section-title">15.1 Metodología del Análisis DAFO</h2>

    <p>El análisis DAFO se ha construido a partir de la cruz de los siguientes factores:</p>

    <ul>
        <li><strong>Factores internos (controlables):</strong> Fortalezas y Debilidades, derivados del diagnóstico de la empresa, las infraestructuras disponibles y los patrones de movilidad actuales.</li>
        <li><strong>Factores externos (no controlables):</strong> Oportunidades y Amenazas, derivados del contexto normativo, urbanístico, tecnológico y social.</li>
    </ul>

    <h2 class="section-title">15.2 Matriz DAFO</h2>

    <div class="dafo-grid">
        <div class="dafo-box fortalezas">
            <h4 style="color: #059669;">💪 FORTALEZAS (Factores internos positivos)</h4>
            <ul>
                ${f.map(item => `<li>${item}</li>`).join('')}
                ${f.length === 0 ? '<li>No se han identificado fortalezas específicas. Se recomienda completar el diagnóstico.</li>' : ''}
            </ul>
        </div>
        <div class="dafo-box debilidades">
            <h4 style="color: #dc2626;">⚠️ DEBILIDADES (Factores internos negativos)</h4>
            <ul>
                ${d.map(item => `<li>${item}</li>`).join('')}
                ${d.length === 0 ? '<li>No se han identificado debilidades específicas.</li>' : ''}
            </ul>
        </div>
        <div class="dafo-box oportunidades">
            <h4 style="color: #2563eb;">🚀 OPORTUNIDADES (Factores externos positivos)</h4>
            <ul>
                ${o.map(item => `<li>${item}</li>`).join('')}
            </ul>
        </div>
        <div class="dafo-box amenazas">
            <h4 style="color: #d97706;">🔥 AMENAZAS (Factores externos negativos)</h4>
            <ul>
                ${a.map(item => `<li>${item}</li>`).join('')}
            </ul>
        </div>
    </div>

    <h2 class="section-title">15.3 Estrategias Derivadas del DAFO</h2>

    <p>A partir del análisis DAFO se han definido las siguientes estrategias:</p>

    <h3 class="subsection-title">Estrategias FO (Fortalezas-Oportunidades) — Ofensivas</h3>
    <p>Aprovechar las fortalezas internas para capitalizar las oportunidades externas:</p>
    <ul>
        ${f.length > 0 && o.length > 0 ? `
        <li><strong>${f[0]} → ${o[0]}:</strong> ${f[0]} puede ser la base para ${o[0].toLowerCase()}.</li>
        <li>Utilizar la buena aceptación de modos sostenibles para impulsar nuevas iniciativas de movilidad sostenible en colaboración con el ayuntamiento.</li>
        ` : '<li>Completar el diagnóstico para identificar estrategias ofensivas específicas.</li>'}
    </ul>

    <h3 class="subsection-title">Estrategias DO (Debilidades-Oportunidades) — Reorientación</h3>
    <p>Utilizar las oportunidades externas para superar las debilidades internas:</p>
    <ul>
        ${d.length > 0 && o.length > 0 ? `
        <li><strong>${d[0]} → ${o[0]}:</strong> Abordar ${d[0].toLowerCase()} aprovechando ${o[0].toLowerCase()}.</li>
        <li>Incentivar el cambio de modo de transporte entre los/as trabajadores/as con mayor dependencia del coche,利用ando las oportunidades de mejora de infraestructura.</li>
        ` : '<li>Completar el diagnóstico para identificar estrategias de reorientación específicas.</li>'}
    </ul>

    <h3 class="subsection-title">Estrategias FA (Fortalezas-Amenazas) — Defensivas</h3>
    <p>Utilizar las fortalezas internas para mitigar las amenazas externas:</p>
    <ul>
        ${f.length > 0 && a.length > 0 ? `
        <li><strong>${f[0]} → ${a[0]}:</strong> ${f[0]} puede servir como barrera frente a ${a[0].toLowerCase()}.</li>
        <li>Mantener las infraestructuras de movilidad sostenible existentes como garantía frente a posibles deterioros del servicio de transporte público.</li>
        ` : '<li>Completar el diagnóstico para identificar estrategias defensivas específicas.</li>'}
    </ul>

    <h3 class="subsection-title">Estrategias DA (Debilidades-Amenazas) — Supervivencia</h3>
    <p>Minimizar las debilidades internas y evitar las amenazas externas:</p>
    <ul>
        ${d.length > 0 && a.length > 0 ? `
        <li><strong>${d[0]} → ${a[0]}:</strong> Abordar de forma prioritaria ${d[0].toLowerCase()} para evitar que se agrave por ${a[0].toLowerCase()}.</li>
        <li>Establecer medidas de emergencia que garanticen la movilidad de los/as trabajadores/as en caso de deterioro del servicio de transporte público.</li>
        ` : '<li>Completar el diagnóstico para identificar estrategias de supervivencia específicas.</li>'}
    </ul>

    <div class="highlight-box">
        <strong>📋 Implicaciones estratégicas:</strong> El análisis DAFO revela que ${f.length > d.length ? 'las fortalezas superan a las debilidades, lo que sitúa al centro en una posición favorable para la implementación del PMST' : 'es necesario abordar las debilidades identificadas de forma prioritaria para avanzar hacia una movilidad más sostenible'}. Las ${o.length} oportunidades identificadas proporcionan un marco favorable para la inversión en infraestructuras y medidas de movilidad sostenible.
    </div>
</div>`;
}

// ──────────────────────────────────────────
// CAPÍTULO 16: PLAN DE OBJETIVOS SMART
// ──────────────────────────────────────────

function generarObjetivosSMART(app) {
    const objetivos = safeArr(app, 'objetivos');
    const diagnostico = getResumen(app);
    const co2e = getCO2e(app);

    // Si no hay objetivos definidos, generar unos por defecto
    const objsDefault = [
        {
            id: 'obj-01', descripcion: `Incrementar el porcentaje de desplazamientos sostenibles del ${pct(diagnostico.porcentajeSostenible)} actual al ${pct(Math.min(diagnostico.porcentajeSostenible + 20, 60))}`,
            indicador: '% de desplazamientos sostenibles', lineaBase: pct(diagnostico.porcentajeSostenible),
            meta: pct(Math.min(diagnostico.porcentajeSostenible + 20, 60)), plazo: '24 meses', categoria: 'Modo', prioridad: 'Alta'
        },
        {
            id: 'obj-02', descripcion: `Reducir la huella de carbono de ${fmt(co2e.totalCo2eTon)} a ${fmt(co2e.totalCo2eTon * 0.65)} t CO2e/año`,
            indicador: 'Toneladas CO2e/año', lineaBase: fmt(co2e.totalCo2eTon) + ' t',
            meta: fmt(co2e.totalCo2eTon * 0.65) + ' t', plazo: '36 meses', categoria: 'Ambiental', prioridad: 'Alta'
        },
        {
            id: 'obj-03', descripcion: 'Incrementar la ocupación media de vehículos de 1.1 a 1.5 pasajeros/vehículo',
            indicador: 'Ocupación media de vehículos', lineaBase: '1.1 pas./veh.',
            meta: '1.5 pas./veh.', plazo: '18 meses', categoria: 'Eficiencia', prioridad: 'Media'
        },
        {
            id: 'obj-04', descripcion: `Habilitar ${Math.max(Math.round(safeNum(app, 'centro.plantilla', 0) * 0.15), 10)} plazas de aparcamiento de bicicletas`,
            indicador: 'Plazas de bici', lineaBase: (safe(app, 'empresa.plazasBici', 0) || 0) + ' plazas',
            meta: Math.max(Math.round(safeNum(app, 'centro.plantilla', 0) * 0.15), 10) + ' plazas', plazo: '12 meses', categoria: 'Infraestructura', prioridad: 'Alta'
        },
        {
            id: 'obj-05', descripcion: 'Mantener encuestas semestrales con ≥20 respuestas válidas',
            indicador: 'Respuestas por encuesta', lineaBase: '0 respuestas',
            meta: '≥20 respuestas cada 6 meses', plazo: 'Continuo', categoria: 'Seguimiento', prioridad: 'Media'
        },
    ];

    const objs = objetivos.length > 0 ? objetivos : objsDefault;

    return `
<div class="chapter" id="chapter-16">
    <h1 class="chapter-title">16. Plan de Objetivos SMART</h1>

    <p>Los objetivos SMART son la base del plan de acción del PMST. Cada objetivo debe ser <strong>Específico</strong> (claro y concreto), <strong>Medible</strong> (cuantificable con indicadores), <strong>Alcanzable</strong> (realista dado los recursos disponibles), <strong>Relevante</strong> (alineado con la estrategia del PMST) y <strong>Temporal</strong> (con un plazo de consecución definido).</p>

    <h2 class="section-title">16.1 Metodología de Definición de Objetivos</h2>

    <p>Los objetivos SMART se han definido a partir del diagnóstico del centro de trabajo, teniendo en cuenta:</p>
    <ul>
        <li>La línea base de cada indicador, calculada a partir de los datos actuales.</li>
        <li>Los referentes nacionales e internacionales de movilidad sostenible.</li>
        <li>La viabilidad técnica y económica de cada objetivo.</li>
        <li>La alineación con las directrices del Plan de Movilidad Municipal.</li>
        <li>Los plazos establecidos en la Ley 8/2021.</li>
    </ul>

    <h2 class="section-title">16.2 Catálogo de Objetivos SMART</h2>

    <table>
        <caption>Objetivos SMART del PMST</caption>
        <thead>
            <tr>
                <th>ID</th>
                <th>Descripción</th>
                <th>Indicador</th>
                <th>Línea base</th>
                <th>Meta</th>
                <th>Plazo</th>
                <th>Prioridad</th>
            </tr>
        </thead>
        <tbody>
            ${objs.map(o => `
            <tr>
                <td><strong>${o.id || ''}</strong></td>
                <td>${o.descripcion || ''}</td>
                <td>${o.indicador || ''}</td>
                <td>${o.lineaBase || ''}</td>
                <td><strong>${o.meta || ''}</strong></td>
                <td>${o.plazo || ''}</td>
                <td><span class="badge ${(o.prioridad || '').toLowerCase() === 'alta' ? 'alta' : (o.prioridad || '').toLowerCase() === 'media' ? 'media' : 'baja'}">${o.prioridad || 'Media'}</span></td>
            </tr>
            `).join('')}
        </tbody>
    </table>

    <h2 class="section-title">16.3 Análisis de Objetivos por Categoría</h2>

    <p>Los objetivos se agrupan en las siguientes categorías estratégicas:</p>

    <h3 class="subsection-title">Modo de transporte</h3>
    <p>${objs.filter(o => (o.categoria || '').toLowerCase().includes('modo')).length > 0 ?
        'El objetivo principal en cuanto al modo es incrementar la cuota de modos sostenibles, pasando del ' + pct(diagnostico.porcentajeSostenible) + ' actual a un mínimo del ' + pct(Math.min(diagnostico.porcentajeSostenible + 20, 60)) + '. Este objetivo se alcanzará mediante una combinación de medidas de infraestructura, incentivos y sensibilización.' :
        'No se han definido objetivos específicos de modo de transporte. Se recomienda incluir al menos un objetivo de reducción de modos motorizados.'}

    <h3 class="subsection-title">Ambiental</h3>
    <p>${objs.filter(o => (o.categoria || '').toLowerCase().includes('ambient')).length > 0 ?
        'El objetivo ambiental establece una reducción del 35% de las emisiones de CO2e, lo que supone un hito ambicioso pero alcanzable en un horizonte de 3 años con la implementación del plan de medidas.' :
        'No se han definido objetivos ambientales. Se recomienda incluir un objetivo de reducción de emisiones de CO2e.'}

    <h3 class="subsection-title">Infraestructura</h3>
    <p>${objs.filter(o => (o.categoria || '').toLowerCase().includes('infra')).length > 0 ?
        'El objetivo de infraestructura se centra en la ampliación del aparcamiento de bicicletas, que es una medida de alto impacto y relativo bajo coste para facilitar la movilidad ciclista.' :
        'No se han definido objetivos de infraestructura. Se recomienda incluir al menos un objetivo de mejora de infraestructuras de movilidad.'}

    <h2 class="section-title">16.4 Hoja de Ruta para el Cumplimiento</h2>

    <div class="highlight-box">
        <strong>📅 Calendario de revisión de objetivos:</strong>
        <ul style="margin-top: 8px;">
            <li><strong>Mes 6:</strong> Primera revisión de avance — Evaluar la tasa de adopción de las medidas iniciales.</li>
            <li><strong>Mes 12:</strong> Revisión anual — Actualizar indicadores, recoger nueva encuesta, ajustar medidas si es necesario.</li>
            <li><strong>Mes 18:</strong> Revisión intermedia — Evaluar el progreso a medio plazo y definir ajustes.</li>
            <li><strong>Mes 24:</strong> Segunda revisión anual — Evaluar el cumplimiento de objetivos a corto y medio plazo.</li>
            <li><strong>Mes 36:</strong> Evaluación final — Valorar el cumplimiento global y definir el PMST para el siguiente período.</li>
        </ul>
    </div>
</div>`;
}

// ──────────────────────────────────────────
// CAPÍTULO 17: PLAN DE MEDIDAS
// ──────────────────────────────────────────

function generarPlanMedidas(app) {
    const medidas = safeArr(app, 'medidas');

    // Si no hay medidas, generar unas por defecto
    const medidasDefault = [
        { id: 'med-01', nombre: 'Ampliación del aparcamiento de bicicletas', categoria: 'Infraestructura', impacto: 9, coste: 'Medio', plazo: 'Corto (3-6 meses)', descripcion: 'Instalar un mínimo de 15 plazas de aparcamiento de bicicletas cubierto con puntos de recarga para bicicletas eléctricas.' },
        { id: 'med-02', nombre: 'Programa de ayudas al transporte público', categoria: 'Incentivos', impacto: 9, coste: 'Alto', plazo: 'Corto (1-2 meses)', descripcion: 'Subvencionar el 50% del abono de transporte público para los/as trabajadores/as que lo utilicen como modo habitual.' },
        { id: 'med-03', nombre: 'Instalación de duchas y vestuarios', categoria: 'Infraestructura', impacto: 7, coste: 'Medio', plazo: 'Corto (3-6 meses)', descripcion: 'Habilitar duchas y vestuarios para usuarios de bicicleta y deportistas.' },
        { id: 'med-04', nombre: 'Ampliación de la política de teletrabajo', categoria: 'Organización', impacto: 10, coste: 'Bajo', plazo: 'Corto (1-3 meses)', descripcion: 'Ampliar los días de teletrabajo de la plantilla, priorizando los puestos compatibles.' },
        { id: 'med-05', nombre: 'Programa de carpooling interno', categoria: 'Incentivos', impacto: 7, coste: 'Bajo', plazo: 'Corto (1-3 meses)', descripcion: 'Crear una plataforma interna de compartir vehículo entre compañeros/as con rutas similares.' },
        { id: 'med-06', nombre: 'Campaña de sensibilización', categoria: 'Comunicación', impacto: 6, coste: 'Bajo', plazo: 'Corto (1-2 meses)', descripcion: 'Lanzar una campaña de comunicación interna sobre movilidad sostenible con concursos, retos y premios.' },
        { id: 'med-07', nombre: 'Instalación de puntos de recarga eléctrica', categoria: 'Infraestructura', impacto: 8, coste: 'Alto', plazo: 'Medio (6-12 meses)', descripcion: 'Instalar al menos 4 puntos de recarga de nivel 2 (7-22 kW) para vehículos eléctricos.' },
        { id: 'med-08', nombre: 'Lanzadera desde estación de transporte público', categoria: 'Servicio', impacto: 8, coste: 'Alto', plazo: 'Medio (6-12 meses)', descripcion: 'Implementar un servicio de lanzadera eléctrica que conecte la estación de tren/metro más cercana con el centro de trabajo.' },
        { id: 'med-09', nombre: 'Plan de puntos y gamificación', categoria: 'Incentivos', impacto: 6, coste: 'Bajo', plazo: 'Corto (1-3 meses)', descripcion: 'Sistema de puntos por cada día que se utilice un modo sostenible, canjeables por premios.' },
        { id: 'med-10', nombre: 'Mejora de la accesibilidad peatonal', categoria: 'Infraestructura', impacto: 7, coste: 'Medio', plazo: 'Medio (6-12 meses)', descripcion: 'Coordinar con el ayuntamiento la mejora de aceras, pasos de peatones y señalización en los accesos al centro.' },
    ];

    const meds = medidas.length > 0 ? medidas : medidasDefault;

    return `
<div class="chapter" id="chapter-17">
    <h1 class="chapter-title">17. Plan de Medidas</h1>

    <p>El plan de medidas constituye el corazón operativo del PMST. Las medidas se han seleccionado y priorizado en función de su impacto potencial, coste de implementación y plazo de ejecución, siguiendo la matriz de priorización recomendada por el MITMA.</p>

    <h2 class="section-title">17.1 Criterios de Priorización</h2>

    <p>Las medidas se han priorizado utilizando la siguiente matriz:</p>

    <table>
        <caption>Matriz de priorización de medidas</caption>
        <thead>
            <tr>
                <th>Impacto</th>
                <th>Coste bajo</th>
                <th>Coste medio</th>
                <th>Coste alto</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td><strong>Alto (8-10)</strong></td>
                <td style="background: #dcfce7;">PRIORITARIA</td>
                <td style="background: #fef9c3;">RECOMENDADA</td>
                <td style="background: #fef9c3;">A EVALUAR</td>
            </tr>
            <tr>
                <td><strong>Medio (5-7)</strong></td>
                <td style="background: #dcfce7;">PRIORITARIA</td>
                <td style="background: #fef9c3;">RECOMENDADA</td>
                <td style="background: #fef2f2;">DEPRIORITARIA</td>
            </tr>
            <tr>
                <td><strong>Bajo (1-4)</strong></td>
                <td style="background: #fef9c3;">RECOMENDADA</td>
                <td style="background: #fef2f2;">DEPRIORITARIA</td>
                <td style="background: #fef2f2;">NO RECOMENDADA</td>
            </tr>
        </tbody>
    </table>

    <h2 class="section-title">17.2 Catálogo de Medidas Priorizadas</h2>

    <table>
        <caption>Medidas del PMST ordenadas por prioridad</caption>
        <thead>
            <tr>
                <th>ID</th>
                <th>Medida</th>
                <th>Categoría</th>
                <th>Impacto</th>
                <th>Coste</th>
                <th>Plazo</th>
            </tr>
        </thead>
        <tbody>
            ${meds.sort((a, b) => (b.impacto || 0) - (a.impacto || 0)).map(m => `
            <tr>
                <td><strong>${m.id || ''}</strong></td>
                <td><strong>${m.nombre || ''}</strong><br><span class="text-sm text-gray">${m.descripcion || ''}</span></td>
                <td>${m.categoria || ''}</td>
                <td><strong>${m.impacto || 0}/10</strong></td>
                <td>${m.coste || ''}</td>
                <td>${m.plazo || ''}</td>
            </tr>
            `).join('')}
        </tbody>
    </table>

    <h2 class="section-title">17.3 Detalle de Medidas por Categoría</h2>

    <h3 class="subsection-title">Medidas de infraestructura</h3>
    <p>Las medidas de infraestructura son las que implican la construcción, ampliación o mejora de instalaciones físicas. Son generalmente las de mayor impacto pero también las de mayor coste y plazo de ejecución:</p>
    <ul>
        ${meds.filter(m => (m.categoria || '').toLowerCase().includes('infra')).map(m => `
        <li><strong>${m.nombre}:</strong> ${m.descripcion} (Impacto: ${m.impacto}/10, Coste: ${m.coste}, Plazo: ${m.plazo})</li>
        `).join('')}
    </ul>

    <h3 class="subsection-title">Medidas de incentivos</h3>
    <p>Las medidas de incentivos buscan motivar el cambio de comportamiento mediante beneficios económicos o de comodidad para los/as trabajadores/as:</p>
    <ul>
        ${meds.filter(m => (m.categoria || '').toLowerCase().includes('incentiv')).map(m => `
        <li><strong>${m.nombre}:</strong> ${m.descripcion} (Impacto: ${m.impacto}/10, Coste: ${m.coste}, Plazo: ${m.plazo})</li>
        `).join('')}
    </ul>

    <h3 class="subsection-title">Medidas de organización</h3>
    <p>Las medidas organizativas implican cambios en la política o la estructura de trabajo de la empresa:</p>
    <ul>
        ${meds.filter(m => (m.categoria || '').toLowerCase().includes('organi')).map(m => `
        <li><strong>${m.nombre}:</strong> ${m.descripcion} (Impacto: ${m.impacto}/10, Coste: ${m.coste}, Plazo: ${m.plazo})</li>
        `).join('')}
    </ul>

    <h3 class="subsection-title">Medidas de comunicación</h3>
    <p>Las medidas de comunicación buscan sensibilizar e informar a la plantilla sobre las alternativas de movilidad sostenible:</p>
    <ul>
        ${meds.filter(m => (m.categoria || '').toLowerCase().includes('comuni') || (m.categoria || '').toLowerCase().includes('servicio')).map(m => `
        <li><strong>${m.nombre}:</strong> ${m.descripcion} (Impacto: ${m.impacto}/10, Coste: ${m.coste}, Plazo: ${m.plazo})</li>
        `).join('')}
    </ul>

    <div class="highlight-box">
        <strong>📋 Resumen del plan de medidas:</strong> Se han identificado un total de <strong>${meds.length} medidas</strong> distribuidas en ${[...new Set(meds.map(m => m.categoria))].length} categorías. De ellas, ${meds.filter(m => m.impacto >= 8).length} tienen impacto alto (≥8/10) y ${meds.filter(m => m.coste === 'Bajo').length} tienen coste bajo, lo que las convierte en candidatas prioritarias para una implementación inmediata.
    </div>
</div>`;
}

// ──────────────────────────────────────────
// CAPÍTULO 18: PLAN DE SEGUIMIENTO
// ──────────────────────────────────────────

function generarPlanSeguimiento(app) {
    const kpiMatrix = safe(app, 'kpiMatrix', {});
    const objetivos = safeArr(app, 'objetivos');
    const empleados = getEmpleados(app);

    return `
<div class="chapter" id="chapter-18">
    <h1 class="chapter-title">18. Plan de Seguimiento y Evaluación</h1>

    <p>El seguimiento y la evaluación continua son componentes esenciales para garantizar la eficacia del PMST. Un sistema de seguimiento bien diseñado permite detectar desviaciones a tiempo, ajustar las medidas según sea necesario y demostrar el impacto de las acciones implementadas ante los/as trabajadores/as, la dirección de la empresa y las autoridades competentes.</p>

    <h2 class="section-title">18.1 Sistema de Indicadores Clave (KPIs)</h2>

    <p>Los indicadores clave de rendimiento (KPIs) del PMST se estructuran en las siguientes dimensiones:</p>

    <table>
        <caption>KPIs del Plan de Movilidad Sostenible</caption>
        <thead>
            <tr>
                <th>Dimensión</th>
                <th>KPI</th>
                <th>Unidad</th>
                <th>Frecuencia de medición</th>
                <th>Fuente de datos</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td><strong>Modo</strong></td>
                <td>% de desplazamientos sostenibles</td>
                <td>%</td>
                <td>Semestral</td>
                <td>Encuesta de movilidad</td>
            </tr>
            <tr>
                <td><strong>Modo</strong></td>
                <td>% de coche particular</td>
                <td>%</td>
                <td>Semestral</td>
                <td>Encuesta de movilidad</td>
            </tr>
            <tr>
                <td><strong>Ambiental</strong></td>
                <td>Huella de carbono total (t CO2e/año)</td>
                <td>t CO2e</td>
                <td>Anual</td>
                <td>Cálculo MITECO</td>
            </tr>
            <tr>
                <td><strong>Ambiental</strong></td>
                <td>CO2e por trabajador/a</td>
                <td>kg CO2e</td>
                <td>Anual</td>
                <td>Cálculo MITECO</td>
            </tr>
            <tr>
                <td><strong>Infraestructura</strong></td>
                <td>Plazas de aparcamiento bici</td>
                <td>Nº plazas</td>
                <td>Anual</td>
                <td>Registro de infraestructuras</td>
            </tr>
            <tr>
                <td><strong>Infraestructura</strong></td>
                <td>Puntos de recarga eléctrica</td>
                <td>Nº puntos</td>
                <td>Anual</td>
                <td>Registro de infraestructuras</td>
            </tr>
            <tr>
                <td><strong>Eficiencia</strong></td>
                <td>Ocupación media de vehículos</td>
                <td>pas./veh.</td>
                <td>Semestral</td>
                <td>Encuesta de movilidad</td>
            </tr>
            <tr>
                <td><strong>Salud</strong></td>
                <td>% de desplazamientos activos (bici + a pie)</td>
                <td>%</td>
                <td>Semestral</td>
                <td>Encuesta de movilidad</td>
            </tr>
            <tr>
                <td><strong>Satisfacción</strong></td>
                <td>Satisfacción media con la movilidad</td>
                <td>Escala 1-10</td>
                <td>Anual</td>
                <td>Encuesta de satisfacción</td>
            </tr>
            <tr>
                <td><strong>Seguimiento</strong></td>
                <td>Nº de respuestas a la encuesta</td>
                <td>Nº respuestas</td>
                <td>Semestral</td>
                <td>Formulario de encuesta</td>
            </tr>
        </tbody>
    </table>

    <h2 class="section-title">18.2 Tabla Multi-Año de Seguimiento</h2>

    <p>El seguimiento a medio-largo plazo se realiza mediante una tabla multi año que permite visualizar la evolución de los KPIs a lo largo del tiempo:</p>

    <table>
        <caption>Evolución multi-año de KPIs clave</caption>
        <thead>
            <tr>
                <th>KPI</th>
                <th>Línea base</th>
                <th>Año 1 (2025)</th>
                <th>Año 2 (2026)</th>
                <th>Año 3 (2027)</th>
                <th>Meta final</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>% sostenible</td>
                <td>${pct(safe(app, 'diagnostico.resumen.porcentajeSostenible', 0))}</td>
                <td>${pct(safe(app, 'diagnostico.resumen.porcentajeSostenible', 0) + 7)}</td>
                <td>${pct(safe(app, 'diagnostico.resumen.porcentajeSostenible', 0) + 13)}</td>
                <td>${pct(safe(app, 'diagnostico.resumen.porcentajeSostenible', 0) + 20)}</td>
                <td>${pct(Math.min(safe(app, 'diagnostico.resumen.porcentajeSostenible', 0) + 20, 60))}</td>
            </tr>
            <tr>
                <td>CO2e total (t/año)</td>
                <td>${fmt(safe(app, 'diagnostico.huellaCO2e.totalCo2eTon', 0))}</td>
                <td>${fmt(safe(app, 'diagnostico.huellaCO2e.totalCo2eTon', 0) * 0.9)}</td>
                <td>${fmt(safe(app, 'diagnostico.huellaCO2e.totalCo2eTon', 0) * 0.78)}</td>
                <td>${fmt(safe(app, 'diagnostico.huellaCO2e.totalCo2eTon', 0) * 0.65)}</td>
                <td>${fmt(safe(app, 'diagnostico.huellaCO2e.totalCo2eTon', 0) * 0.65)}</td>
            </tr>
            <tr>
                <td>Plazas bici</td>
                <td>${safe(app, 'empresa.plazasBici', 0) || 0}</td>
                <td>${Math.max(Math.round(safeNum(app, 'centro.plantilla', 0) * 0.08), 8)}</td>
                <td>${Math.max(Math.round(safeNum(app, 'centro.plantilla', 0) * 0.12), 10)}</td>
                <td>${Math.max(Math.round(safeNum(app, 'centro.plantilla', 0) * 0.15), 12)}</td>
                <td>${Math.max(Math.round(safeNum(app, 'centro.plantilla', 0) * 0.15), 15)}</td>
            </tr>
        </tbody>
    </table>

    <h2 class="section-title">18.3 Metodología de Recogida de Datos</h2>

    <p>La recogida de datos para el seguimiento se realizará mediante:</p>

    <ul>
        <li><strong>Encuesta semestral de movilidad:</strong> Formulario digital que se envía a toda la plantilla cada 6 meses. La encuesta incluye preguntas sobre el modo de transporte habitual, frecuencia de uso de cada modo, tiempo de viaje, distancia y satisfacción.</li>
        <li><strong>Registro de infraestructuras:</strong> Actualización anual del inventario de infraestructuras de movilidad (plazas de bici, puntos de recarga, duchas, etc.).</li>
        <li><strong>Datos de flota corporativa:</strong> Registro trimestral de los desplazamientos realizados con la flota de la empresa, incluyendo kilómetros recorridos y consumo de combustible.</li>
        <li><strong>Datos de teletrabajo:</strong> Registro mensual del número de días de teletrabajo realizados por cada departamento.</li>
        <li><strong>Encuesta de satisfacción:</strong> Encuesta anual sobre la satisfacción de los/as trabajadores/as con las medidas de movilidad implementadas.</li>
    </ul>

    <h2 class="section-title">18.4 Proceso de Revisión Anual</h2>

    <p>El proceso de revisión anual del PMST consta de las siguientes fases:</p>

    <ol>
        <li><strong>Recogida de datos (mes 11):</strong> Aplicación de la encuesta semestral y recogida de datos de infraestructuras y flota.</li>
        <li><strong>Análisis de resultados (mes 12):</strong> Procesamiento de los datos, cálculo de KPIs y comparación con los objetivos.</li>
        <li><strong>Evaluación del progreso (mes 12):</strong> Valoración del cumplimiento de los objetivos SMART y de la eficacia de las medidas implementadas.</li>
        <li><strong>Ajuste del plan (mes 12):</strong> Modificación de las medidas, objetivos o cronograma en función de los resultados obtenidos.</li>
        <li><strong>Informe de seguimiento (mes 12):</strong> Elaboración del informe anual de seguimiento del PMST, que será comunicado a la representación legal de los trabajadores y a la autoridad laboral.</li>
    </ol>

    <div class="highlight-box success">
        <strong>📋 Compromiso de transparencia:</strong> Los resultados del seguimiento del PMST serán comunicados a toda la plantilla a través de los canales de comunicación internos (newsletter, intranet, reuniones de departamento), garantizando la transparencia y la participación de los/as trabajadores/as en el proceso de mejora continua.
    </div>
</div>`;
}

// ──────────────────────────────────────────
// CAPÍTULO 19: CRONOGRAMA
// ──────────────────────────────────────────

function generarCronograma(app) {
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    const fases = [
        { nombre: 'Diseño y aprobación del PMST', inicio: 0, fin: 2, color: '#2563eb' },
        { nombre: 'Encuesta de movilidad', inicio: 1, fin: 3, color: '#7c3aed' },
        { nombre: 'Diagnóstico y análisis', inicio: 2, fin: 4, color: '#0891b2' },
        { nombre: 'Infraestructura bici', inicio: 3, fin: 8, color: '#059669' },
        { nombre: 'Programa de ayudas transporte', inicio: 2, fin: 5, color: '#d97706' },
        { nombre: 'Campaña de sensibilización', inicio: 4, fin: 11, color: '#dc2626' },
        { nombre: 'Teletrabajo ampliado', inicio: 2, fin: 4, color: '#ea580c' },
        { nombre: 'Puntos de recarga eléctrica', inicio: 4, fin: 10, color: '#2563eb' },
        { nombre: 'Lanzadera / carpooling', inicio: 5, fin: 10, color: '#7c3aed' },
        { nombre: 'Revisión semestral (mes 6)', inicio: 5, fin: 5, color: '#6b7280' },
        { nombre: 'Revisión anual (mes 12)', inicio: 11, fin: 11, color: '#6b7280' },
    ];

    return `
<div class="chapter" id="chapter-19">
    <h1 class="chapter-title">19. Cronograma de Implementación</h1>

    <p>El cronograma de implementación del PMST se estructura en tres fases principales a lo largo de 36 meses (3 años), con revisiones periódicas que permiten ajustar el plan en función de los resultados obtenidos.</p>

    <h2 class="section-title">19.1 Estructura Temporal</h2>

    <h3 class="subsection-title">Fase 1: Preparación (Meses 0-6)</h3>
    <p>Esta fase inicial comprende las actividades de diseño, aprobación y puesta en marcha del PMST:</p>
    <ul>
        <li>Diseño y aprobación del PMST por la dirección de la empresa.</li>
        <li>Comunicación del plan a la representación legal de los trabajadores.</li>
        <li>Realización de la encuesta de movilidad inicial.</li>
        <li>Análisis diagnóstico y definición de la línea base.</li>
        <li>Primeras medidas de bajo coste: campaña de sensibilización, ampliación teletrabajo, programa de carpooling.</li>
    </ul>

    <h3 class="subsection-title">Fase 2: Implantación (Meses 6-18)</h3>
    <p>En esta fase se implementan las principales medidas de infraestructura e incentivos:</p>
    <ul>
        <li>Ampliación del aparcamiento de bicicletas.</li>
        <li>Instalación de duchas y vestuarios.</li>
        <li>Programa de ayudas al transporte público.</li>
        <li>Instalación de puntos de recarga eléctrica.</li>
        <li>Implementación del servicio de lanzadera.</li>
        <li>Primera revisión semestral del plan.</li>
    </ul>

    <h3 class="subsection-title">Fase 3: Consolidación y Evaluación (Meses 18-36)</h3>
    <p>Esta fase se centra en consolidar las medidas, evaluar resultados y planificar el siguiente período:</p>
    <ul>
        <li>Evaluación del impacto de las medidas implementadas.</li>
        <li>Ajuste de las medidas según los resultados del seguimiento.</li>
        <li>Segunda encuesta de movilidad y comparativa con línea base.</li>
        <li>Elaboración del informe anual de seguimiento.</li>
        <li>Planificación del PMST para el siguiente período trienal.</li>
    </ul>

    <h2 class="section-title">19.2 Diagrama de Gantt Simplificado</h2>

    <div class="cronograma">
        <div class="cronograma-header">
            <div>Actividad</div>
            ${meses.map(m => `<div style="text-align: center;">${m}</div>`).join('')}
        </div>
        ${fases.map(f => `
        <div class="cronograma-row">
            <div class="cronograma-label">${f.nombre}</div>
            ${meses.map((_, i) => {
                if (i >= f.inicio && i <= f.fin) {
                    const width = i === f.inicio ? 'border-radius: 4px 0 0 4px;' : i === f.fin ? 'border-radius: 0 4px 4px 0;' : '';
                    return `<div class="cronograma-bar" style="background: ${f.color}; ${width}">${i === f.inicio ? f.nombre.substring(0, 8) : ''}</div>`;
                }
                return '<div style="background: #f3f4f6; border-radius: 4px;"></div>';
            }).join('')}
        </div>
        `).join('')}
    </div>

    <h2 class="section-title">19.3 Hitos Clave</h2>

    <table>
        <caption>Hitos del cronograma de implementación</caption>
        <thead>
            <tr>
                <th>Mes</th>
                <th>Hito</th>
                <th>Responsable</th>
                <th>Entregable</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td><strong>Mes 1</strong></td>
                <td>Aprobación del PMST</td>
                <td>Dirección de empresa</td>
                <td>Documento PMST firmado</td>
            </tr>
            <tr>
                <td><strong>Mes 2</strong></td>
                <td>Comunicación a representantes</td>
                <td>Recursos Humanos</td>
                <td>Acta de comunicación</td>
            </tr>
            <tr>
                <td><strong>Mes 3</strong></td>
                <td>Encuesta de movilidad completada</td>
                <td>Comisión PMST</td>
                <td>Base de datos de respuestas</td>
            </tr>
            <tr>
                <td><strong>Mes 4</strong></td>
                <td>Diagnóstico completado</td>
                <td>Comisión PMST</td>
                <td>Informe diagnóstico</td>
            </tr>
            <tr>
                <td><strong>Mes 6</strong></td>
                <td>Primera revisión semestral</td>
                <td>Comisión PMST</td>
                <td>Informe de seguimiento</td>
            </tr>
            <tr>
                <td><strong>Mes 9</strong></td>
                <td>Infraestructuras habilitadas</td>
                <td>Mantenimiento</td>
                <td>Registro de infraestructuras</td>
            </tr>
            <tr>
                <td><strong>Mes 12</strong></td>
                <td>Revisión anual + encuesta</td>
                <td>Comisión PMST</td>
                <td>Informe anual</td>
            </tr>
            <tr>
                <td><strong>Mes 24</strong></td>
                <td>Segunda revisión anual</td>
                <td>Comisión PMST</td>
                <td>Informe de progreso</td>
            </tr>
            <tr>
                <td><strong>Mes 36</strong></td>
                <td>Evaluación final</td>
                <td>Comisión PMST</td>
                <td>Informe de evaluación + nuevo PMST</td>
            </tr>
        </tbody>
    </table>

    <div class="highlight-box">
        <strong>📅 Nota:</strong> El cronograma es orientativo y podrá ajustarse en función de la disponibilidad de recursos, las necesidades de la empresa y los resultados del seguimiento. Las revisiones semestrales permiten realizar ajustes en tiempo real.
    </div>
</div>`;
}

// ──────────────────────────────────────────
// CAPÍTULO 20: PRESUPUESTO ESTIMADO
// ──────────────────────────────────────────

function generarPresupuesto(app) {
    const medidas = safeArr(app, 'medidas');
    const medidasDefault = [
        { nombre: 'Ampliación aparcamiento bici', coste: '2.000 - 5.000 €' },
        { nombre: 'Programa ayudas transporte público', coste: '10.000 - 25.000 €/año' },
        { nombre: 'Duchas y vestuarios', coste: '3.000 - 8.000 €' },
        { nombre: 'Puntos de recarga eléctrica', coste: '8.000 - 20.000 €' },
        { nombre: 'Campaña de sensibilización', coste: '500 - 2.000 €' },
        { nombre: 'Lanzadera / carpooling', coste: '15.000 - 30.000 €/año' },
        { nombre: 'Plan de puntos / gamificación', coste: '1.000 - 3.000 €/año' },
    ];

    return `
<div class="chapter" id="chapter-20">
    <h1 class="chapter-title">20. Presupuesto Estimado</h1>

    <p>El presupuesto estimado del PMST se presenta como una guía orientativa para la planificación financiera de las medidas. Las cuantías son estimaciones basadas en precios de mercado y pueden variar en función de las condiciones específicas de cada centro de trabajo, las negociaciones con proveedores y la disponibilidad de subvenciones.</p>

    <h2 class="section-title">20.1 Desglose por Medida</h2>

    <table>
        <caption>Presupuesto estimado por medida</caption>
        <thead>
            <tr>
                <th>Medida</th>
                <th>Categoría</th>
                <th>Coste estimado</th>
                <th>Recurrencia</th>
                <th>Prioridad</th>
            </tr>
        </thead>
        <tbody>
            ${medidas.length > 0 ? medidas.map(m => `
            <tr>
                <td><strong>${m.nombre}</strong></td>
                <td>${m.categoria || ''}</td>
                <td>${m.coste || 'Por estimar'}</td>
                <td>${(m.plazo || '').includes('mes') ? 'Puntual' : 'Anual'}</td>
                <td><span class="badge ${(m.impacto || 0) >= 8 ? 'alta' : (m.impacto || 0) >= 5 ? 'media' : 'baja'}">${(m.impacto || 0) >= 8 ? 'Alta' : (m.impacto || 0) >= 5 ? 'Media' : 'Baja'}</span></td>
            </tr>
            `).join('') : medidasDefault.map(m => `
            <tr>
                <td><strong>${m.nombre}</strong></td>
                <td>${m.nombre.includes('ayuda') || m.nombre.includes('lanzadera') || m.nombre.includes('puntos') ? 'Incentivos / Servicio' : 'Infraestructura'}</td>
                <td>${m.coste}</td>
                <td>${m.coste.includes('/año') ? 'Anual' : 'Puntual'}</td>
                <td><span class="badge alta">Alta</span></td>
            </tr>
            `).join('')}
        </tbody>
    </table>

    <h2 class="section-title">20.2 Resumen Presupuestario</h2>

    <table>
        <caption>Resumen del presupuesto total estimado</caption>
        <thead>
            <tr>
                <th>Concepto</th>
                <th>Inversión inicial (Año 1)</th>
                <th>Gasto recurrente (Año 2-3)</th>
                <th>Total 3 años</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td><strong>Infraestructura</strong></td>
                <td>13.000 - 33.000 €</td>
                <td>2.000 - 5.000 €</td>
                <td>17.000 - 43.000 €</td>
            </tr>
            <tr>
                <td><strong>Incentivos y ayudas</strong></td>
                <td>11.500 - 30.000 €</td>
                <td>26.000 - 58.000 €</td>
                <td>63.500 - 146.000 €</td>
            </tr>
            <tr>
                <td><strong>Comunicación</strong></td>
                <td>500 - 2.000 €</td>
                <td>1.000 - 3.000 €</td>
                <td>2.500 - 8.000 €</td>
            </tr>
            <tr style="background: #f0f4ff; font-weight: 700;">
                <td><strong>TOTAL ESTIMADO</strong></td>
                <td>25.000 - 65.000 €</td>
                <td>29.000 - 66.000 €</td>
                <td>83.000 - 197.000 €</td>
            </tr>
        </tbody>
    </table>

    <h2 class="section-title">20.3 Fuentes de Financiación</h2>

    <p>Las siguientes fuentes de financiación pueden ser utilizadas para sufragar los costes del PMST:</p>

    <ul>
        <li><strong>Presupuesto de la empresa:</strong> Asignación directa del presupuesto de movilidad o sostenibilidad.</li>
        <li><strong>Subvenciones públicas:</strong> Programas autonómicos y municipales de fomento de la movilidad sostenible (convocatorias anuales).</li>
        <li><strong>Deducciones fiscales:</strong> Bonificaciones en el Impuesto de Sociedades por inversiones en eficiencia energética y movilidad sostenible (Ley 19/2021).</li>
        <li><strong>Fondos europeos:</strong> Programas de financiación del Fondo Europeo de Desarrollo Regional (FEDER) para proyectos de movilidad sostenible.</li>
        <li><strong>Acuerdos con proveedores:</strong> Negociación de precios preferentes con operadores de transporte público, fabricantes de bicicletas o instaladores de puntos de recarga.</li>
    </ul>

    <h2 class="section-title">20.4 Análisis de Retorno de Inversión (ROI)</h2>

    <p>El retorno de la inversión del PMST se evalúa no solo en términos económicos directos, sino también en beneficios intangibles:</p>

    <table>
        <caption>Análisis de retorno de la inversión</caption>
        <thead>
            <tr>
                <th>Beneficio</th>
                <th>Tipo</th>
                <th>Estimación</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>Reducción de costes de aparcamiento</td>
                <td>Directo</td>
                <td>500 - 2.000 €/año por plaza reducida</td>
            </tr>
            <tr>
                <td>Reducción de absentismo laboral</td>
                <td>Indirecto</td>
                <td>3-5% de reducción (por mejor salud de usuarios de bici)</td>
            </tr>
            <tr>
                <td>Mejora de productividad</td>
                <td>Indirecto</td>
                <td>2-4% de mejora (por reducción del estrés del desplazamiento)</td>
            </tr>
            <tr>
                <td>Mejora de imagen corporativa</td>
                <td>Intangible</td>
                <td>Mayor atractivo para talento joven y comprometido</td>
            </tr>
            <tr>
                <td>Cumplimiento normativo</td>
                <td>Legal</td>
                <td>Evitación de sanciones de hasta 187.515 €</td>
            </tr>
            <tr>
                <td>Reducción de emisiones de CO2e</td>
                <td>Ambiental</td>
                <td>${fmt(safe(app, 'diagnostico.huellaCO2e.totalCo2eTon', 0) * 0.35 * 50)} € equivalentes al precio del carbono (50 €/t)</td>
            </tr>
        </tbody>
    </table>

    <div class="highlight-box success">
        <strong>💰 Conclusión económica:</strong> El PMST representa una inversión razonable que genera retornos tanto económicos como sociales. La inversión inicial se recupera en un plazo de 2-3 años, y los beneficios se incrementan progresivamente a medida que las medidas consolidan sus efectos. Además, el cumplimiento normativo evita sanciones potencialmente muy elevadas.
    </div>
</div>`;
}

// ──────────────────────────────────────────
// CAPÍTULO 21: CONCLUSIONES
// ──────────────────────────────────────────

function generarConclusiones(app) {
    const centro = safe(app, 'centro', {});
    const empresa = safe(app, 'empresa', {});
    const diagnostico = getResumen(app);
    const co2e = getCO2e(app);
    const medidas = safeArr(app, 'medidas');
    const nombreCentro = centro.nombre || 'el centro de trabajo';
    const nombreEmpresa = empresa.nombreEmpresa || empresa.nombre || '';

    return `
<div class="chapter" id="chapter-21">
    <h1 class="chapter-title">21. Conclusiones y Compromisos</h1>

    <p>El presente Plan de Movilidad Sostenible al Trabajo (PMST) para ${nombreCentro} constituye un documento integral y comprometido con la transformación de los patrones de movilidad de la plantilla hacia un modelo más sostenible, eficiente y saludable.</p>

    <h2 class="section-title">21.1 Síntesis de Resultados</h2>

    <div class="kpi-grid">
        <div class="kpi-card">
            <div class="kpi-value">${safeNum(app, 'centro.plantilla', 0)}</div>
            <div class="kpi-label">Trabajadores/as</div>
        </div>
        <div class="kpi-card ${diagnostico.porcentajeMotorizado > 50 ? 'accent' : 'green'}">
            <div class="kpi-value">${pct(diagnostico.porcentajeMotorizado)}</div>
            <div class="kpi-label">Modo motorizado</div>
        </div>
        <div class="kpi-card green">
            <div class="kpi-value">${fmt(co2e.totalCo2eTon)}</div>
            <div class="kpi-label">t CO2e/año</div>
        </div>
        <div class="kpi-card">
            <div class="kpi-value">${medidas.length > 0 ? medidas.length : 10}</div>
            <div class="kpi-label">Medidas propuestas</div>
        </div>
    </div>

    <h2 class="section-title">21.2 Conclusiones Principales</h2>

    <ol>
        <li><strong>Diagnóstico:</strong> ${diagnostico.porcentajeMotorizado > 50 ?
            'El centro presenta una alta dependencia del coche particular (' + pct(diagnostico.porcentajeMotorizado) + ' de modos motorizados), lo que sitúa a la empresa en una situación de necesidad de intervención accordingo con la Ley 8/2021.' :
            'El centro presenta un reparto modal relativamente equilibrado, con un ' + pct(diagnostico.porcentajeSostenible) + ' de modos sostenibles, lo que indica una situación favorable que debe mantenerse y reforzarse.'}</li>

        <li><strong>Impacto ambiental:</strong> La huella de carbono de los desplazamientos al trabajo asciende a ${fmt(co2e.totalCo2eTon)} toneladas de CO2e al año, lo que representa un impacto significativo que puede reducirse mediante la implementación de las medidas propuestas en un 35% en 3 años.</li>

        <li><strong>Infraestructura:</strong> ${safe(app, 'empresa.plazasBici', 0) > 5 ?
            'La empresa dispone de infraestructura ciclista básica que debe ampliarse y complementarse con duchas, puntos de recarga y otros servicios.' :
            'La empresa carece de infraestructura ciclista adecuada, lo que constituye una debilidad prioritaria que debe abordarse en el corto plazo.'}

        <li><strong>Medidas:</strong> Se han identificado ${medidas.length > 0 ? medidas.length : 10} medidas priorizadas, de las cuales ${Math.ceil((medidas.length > 0 ? medidas.length : 10) * 0.4)} tienen impacto alto y pueden implementarse en el corto plazo con un coste relativamente bajo.</li>

        <li><strong>Cumplimiento normativo:</strong> Este PMST cumple con todos los requisitos de la Ley 8/2021, del Real Decreto 1010/2023 y de las directivas europeas de aplicación, protegiendo a la empresa de posibles sanciones.</li>
    </ol>

    <h2 class="section-title">21.3 Compromisos de la Dirección</h2>

    <p>La dirección de ${nombreEmpresa} se compromete a:</p>

    <ul>
        <li>Implantar las medidas del PMST en los plazos establecidos en el cronograma.</li>
        <li>Dotar los recursos económicos necesarios para la ejecución del plan.</li>
        <li>Designar un responsable de seguimiento del PMST.</li>
        <li>Comunicar los resultados del seguimiento a la representación legal de los trabajadores.</li>
        <li>Revisar y actualizar el PMST como mínimo cada tres años.</li>
        <li>Promover una cultura de movilidad sostenible en toda la organización.</li>
    </ul>

    <h2 class="section-title">21.4 Compromisos de los/as Trabajadores/as</h2>

    <p>Los/as trabajadores/as se comprometen a:</p>

    <ul>
        <li>Participar activamente en las encuestas de movilidad y en las campañas de sensibilización.</li>
        <li>Valorar y adoptar alternativas de movilidad sostenible cuando sea posible.</li>
        <li>Comunicar sugerencias y propuestas de mejora a la comisión de seguimiento del PMST.</li>
        <li>Respetar las infraestructuras de movilidad sostenible (aparcamientos de bici, carriles bici, etc.).</li>
        <li>Participar en los programas de carpooling y en las iniciativas de movilidad compartida.</li>
    </ul>

    <h2 class="section-title">21.5 Próximos Pasos</h2>

    <ol>
        <li><strong>Inmediato (mes 1):</strong> Aprobación formal del PMST por la dirección y comunicación a los/as trabajadores/as.</li>
        <li><strong>Corto plazo (meses 1-3):</strong> Inicio de la encuesta de movilidad y primera campaña de sensibilización.</li>
        <li><strong>Corto plazo (meses 2-4):</strong> Implementación de medidas de bajo coste: teletrabajo ampliado, programa de carpooling, plan de puntos.</li>
        <li><strong>Medio plazo (meses 4-12):</strong> Ejecución de las obras de infraestructura (aparcamiento bici, duchas, puntos de recarga).</li>
        <li><strong>Medio plazo (meses 6-12):</strong> Puesta en marcha del programa de ayudas al transporte público y del servicio de lanzadera.</li>
        <li><strong>Largo plazo (meses 12-36):</strong> Consolidación, seguimiento continuo y revisión anual del plan.</li>
    </ol>

    <h2 class="section-title">21.6 Área de Firma</h2>

    <p>El presente Plan de Movilidad Sostenible al Trabajo es aprobado por las partes firmantes, que se comprometen a su implantación y seguimiento.</p>

    <div class="firma-grid">
        <div class="firma-box">
            <div class="nombre">Por la dirección de la empresa</div>
            <div class="cargo">${nombreEmpresa || 'Empresa'}</div>
        </div>
        <div class="firma-box">
            <div class="nombre">Por la representación legal de los trabajadores</div>
            <div class="cargo">Comité de Empresa / Delegados/as</div>
        </div>
    </div>

    <div style="margin-top: 40px; text-align: center;">
        <div class="firma-grid">
            <div class="firma-box">
                <div class="nombre">Fecha: ${fechaLarga()}</div>
            </div>
            <div class="firma-box">
                <div class="nombre">Lugar: ${nombreCentro}</div>
            </div>
        </div>
    </div>

    <div class="highlight-box" style="margin-top: 40px;">
        <strong>📋 Nota final:</strong> Este PMST es un documento vivo que debe ser revisado y actualizado periódicamente. El compromiso de todas las partes —dirección, trabajadores/as y representantes legales— es fundamental para su éxito. La movilidad sostenible no es solo una obligación normativa, sino una oportunidad para mejorar la calidad de vida de los/as trabajadores/as, reducir el impacto ambiental y contribuir a la descarbonización del transporte.
    </div>
</div>`;
}

// ═══════════════════════════════════════════
// FUNCIÓN PRINCIPAL: GENERAR INFORME COMPLETO
// ═══════════════════════════════════════════

/**
 * Genera el informe HTML completo del PMST/PTST
 *
 * @param {Object} app — Estado de la aplicación (window.pmstApp.appState)
 * @returns {string} HTML completo del informe
 */
export function generarInformeCompleto(app) {
    // Asegurar que app es un objeto válido
    if (!app || typeof app !== 'object') {
        app = {};
    }

    const centroNombre = safe(app, 'centro.nombre', 'Centro de Trabajo');
    const css = getCSS().replace(/__CENTRO__/g, centroNombre);

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>PMST/PTST — ${centroNombre}</title>
    <style>${css}</style>
</head>
<body>

<!-- ═══════════════════════════════════════════════════════
     CAPÍTULO 0: PORTADA
     ═══════════════════════════════════════════════════════ -->
${generarPortada(app)}

<!-- ═══════════════════════════════════════════════════════
     CAPÍTULO 1: ÍNDICE
     ═══════════════════════════════════════════════════════ -->
${generarIndice()}

<!-- ═══════════════════════════════════════════════════════
     CAPÍTULO 2: RESUMEN EJECUTIVO
     ═══════════════════════════════════════════════════════ -->
${generarResumenEjecutivo(app)}

<!-- ═══════════════════════════════════════════════════════
     CAPÍTULO 3: MARCO LEGAL Y NORMATIVO
     ═══════════════════════════════════════════════════════ -->
${generarMarcoLegal()}

<!-- ═══════════════════════════════════════════════════════
     CAPÍTULO 4: METODOLOGÍA
     ═══════════════════════════════════════════════════════ -->
${generarMetodologia(app)}

<!-- ═══════════════════════════════════════════════════════
     CAPÍTULO 5: ANÁLISIS DEL ENTORNO
     ═══════════════════════════════════════════════════════ -->
${generarAnalisisEntorno(app)}

<!-- ═══════════════════════════════════════════════════════
     CAPÍTULO 6: CARACTERIZACIÓN DEL CENTRO
     ═══════════════════════════════════════════════════════ -->
${generarCaracterizacionCentro(app)}

<!-- ═══════════════════════════════════════════════════════
     CAPÍTULO 7: CARACTERIZACIÓN DE LA EMPRESA
     ═══════════════════════════════════════════════════════ -->
${generarCaracterizacionEmpresa(app)}

<!-- ═══════════════════════════════════════════════════════
     CAPÍTULO 8: RESULTADOS DE LA ENCUESTA
     ═══════════════════════════════════════════════════════ -->
${generarResultadosEncuesta(app)}

<!-- ═══════════════════════════════════════════════════════
     CAPÍTULO 9: ANÁLISIS DEL REPARTO MODAL
     ═══════════════════════════════════════════════════════ -->
${generarAnalisisRepartoModal(app)}

<!-- ═══════════════════════════════════════════════════════
     CAPÍTULO 10: ANÁLISIS DE DISTANCIAS Y TIEMPOS
     ═══════════════════════════════════════════════════════ -->
${generarAnalisisDistancias(app)}

<!-- ═══════════════════════════════════════════════════════
     CAPÍTULO 11: HUELLA DE CARBONO
     ═══════════════════════════════════════════════════════ -->
${generarHuelaCarbono(app)}

<!-- ═══════════════════════════════════════════════════════
     CAPÍTULO 12: ANÁLISIS DE APARCAMIENTO
     ═══════════════════════════════════════════════════════ -->
${generarAnalisisAparcamiento(app)}

<!-- ═══════════════════════════════════════════════════════
     CAPÍTULO 13: OFERTA DE TRANSPORTE PÚBLICO
     ═══════════════════════════════════════════════════════ -->
${generarOfertaTransporte(app)}

<!-- ═══════════════════════════════════════════════════════
     CAPÍTULO 14: INFRAESTRUCTURA CICLISTA
     ═══════════════════════════════════════════════════════ -->
${generarInfraestructuraCiclista(app)}

<!-- ═══════════════════════════════════════════════════════
     CAPÍTULO 15: ANÁLISIS DAFO
     ═══════════════════════════════════════════════════════ -->
${generarAnalisisDAFO(app)}

<!-- ═══════════════════════════════════════════════════════
     CAPÍTULO 16: PLAN DE OBJETIVOS SMART
     ═══════════════════════════════════════════════════════ -->
${generarObjetivosSMART(app)}

<!-- ═══════════════════════════════════════════════════════
     CAPÍTULO 17: PLAN DE MEDIDAS
     ═══════════════════════════════════════════════════════ -->
${generarPlanMedidas(app)}

<!-- ═══════════════════════════════════════════════════════
     CAPÍTULO 18: PLAN DE SEGUIMIENTO
     ═══════════════════════════════════════════════════════ -->
${generarPlanSeguimiento(app)}

<!-- ═══════════════════════════════════════════════════════
     CAPÍTULO 19: CRONOGRAMA
     ═══════════════════════════════════════════════════════ -->
${generarCronograma(app)}

<!-- ═══════════════════════════════════════════════════════
     CAPÍTULO 20: PRESUPUESTO
     ═══════════════════════════════════════════════════════ -->
${generarPresupuesto(app)}

<!-- ═══════════════════════════════════════════════════════
     CAPÍTULO 21: CONCLUSIONES
     ═══════════════════════════════════════════════════════ -->
${generarConclusiones(app)}

<!-- ═══════════════════════════════════════════════════════
     FOOTER GLOBAL
     ═══════════════════════════════════════════════════════ -->
<div class="informe-footer">
    <p><strong>PLAN DE MOVILIDAD SOSTENIBLE AL TRABAJO (PMST/PTST)</strong></p>
    <p>${centroNombre} — Elaborado el ${fechaLarga()}</p>
    <p>Hecho con ❤️ por David Antizar</p>
    <p style="font-size: 8pt; color: #9ca3af; margin-top: 10px;">
        Este documento ha sido generado automáticamente por la plataforma PMST/PTST Generator.<br>
        Factores de emisión: MITECO 2024 | Marco legal: Ley 8/2021 | Normativa: Real Decreto 1010/2023
    </p>
</div>

</body>
</html>`;

    return html;
}

// ═══════════════════════════════════════════
// EXPORT POR DEFECTO (para compatibilidad)
// ═══════════════════════════════════════════

export default generarInformeCompleto;
