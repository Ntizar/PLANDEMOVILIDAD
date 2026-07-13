/**
 * PLANDEMOVILIDAD — Orquestador principal (main.js)
 * 
 * Inicializa la aplicación, conecta módulos, maneja navegación
 * y coordina el flujo de datos entre secciones.
 * 
 * Autor: David Antizar
 */

import { CONFIG } from './config.js';
import { initMap, addMarker, setCenter } from './map.js';
import { initForms, loadSavedData } from './form.js';

// ═══════════════════════════════════════════
// ESTADO GLOBAL DE LA APLICACIÓN
// ═══════════════════════════════════════════

/**
 * Estado global compartido — única fuente de verdad
 * Cada módulo es responsable de su propia pieza de estado
 */
var charts = window.charts = {}; // Chart.js necesita registro global (var, NO const)

window.appState = {
    centro: null,       // { nombre, direccion, lat, lon, actividad, plantilla, ... }
    empresa: null,      // { teletrabajoPct, plazasCoche, plazasBici, ... }
    encuesta: {
        respuestas: [],
        agregados: {},
        stats: {},
    },
    diagnostico: null,  // { repartoModal, ocupacionMedia, co2eKg, ... }
    dafo: null,         // { fortalezas, debilidades, oportunidades, amenazas }
    medidas: [],        // [{ id, nombre, categoria, prioridad, ... }]
    objetivos: [],      // [{ id, descripcion, indicador, lineaBase, meta, plazo }]
    informe: {
        secciones: {},
        estado: 'pending', // 'pending' | 'generating' | 'partial' | 'complete'
    },
    mapa: null,         // Referencia a L.map instance
};

/**
 * Inicializar la aplicación
 */
export function initApp() {
    console.log('🚀 PLANDEMOVILIDAD — Inicializando...');
    
    // 1. Inicializar navegación de secciones
    initNavigation();
    
    // 2. Inicializar formularios
    initForms();
    
    // 3. Cargar datos guardados
    loadSavedData();
    
    // 4. Inicializar mapa (si hay datos guardados, se centra automáticamente)
    initMapaBase();
    
    // 5. Inicializar eventos de exportación
    initExportButtons();
    
    console.log('✅ PLANDEMOVILIDAD listo');
}

/**
 * Inicializar navegación entre secciones
 */
function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const sectionId = item.dataset.section;
            
            // Actualizar navegación activa
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');
            
            // Mostrar sección correspondiente
            document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
            const section = document.getElementById(`section-${sectionId}`);
            if (section) {
                section.classList.add('active');
            }
            
            // Inicializar mapa si es la sección centro (y no existe)
            if (sectionId === 'centro') {
                initMapaBase();
            }
        });
    });
}

/**
 * Inicializar mapa base (solo si no existe ya)
 */
function initMapaBase() {
    const mapContainer = document.getElementById('centro-map');
    if (!mapContainer) return;
    
    // Si ya hay un mapa inicializado (datos guardados), no hacer nada
    if (window.appState.mapa) return;
    
    // Si hay datos del centro guardados, usar sus coordenadas
    const centro = window.appState.centro;
    if (centro && centro.lat && centro.lon) {
        // El mapa ya se inicializó con loadSavedData
        return;
    }
    
    // Mapa por defecto: Madrid centro
    const map = initMap('centro-map', 40.4168, -3.7038, 16);
    window.appState.mapa = map;
    
    // Click en mapa para fijar ubicación
    mapContainer.addEventListener('click', (e) => {
        // Evitar si el click es en un control de Leaflet
        if (e.target.closest('.leaflet-control')) return;
        
        const latLng = map.getLatLng(e.originalEvent);
        const lat = latLng.lat;
        const lon = latLng.lng;
        
        // Rellenar campos
        const latInput = document.getElementById('centro-lat');
        const lonInput = document.getElementById('centro-lon');
        if (latInput) latInput.value = lat.toFixed(6);
        if (lonInput) lonInput.value = lon.toFixed(6);
        
        // Añadir marcador
        addMarker(lat, lon, {
            tooltip: 'Ubicación seleccionada',
            icon: 'red',
        });
    });
}

/**
 * Inicializar botones de exportación
 */
function initExportButtons() {
    // Botones de export en dropdown del header
    document.querySelectorAll('[data-format]').forEach(btn => {
        btn.addEventListener('click', () => {
            const format = btn.dataset.format;
            const contenido = window.appState.informe?.contenido || '';
            
            if (!contenido) {
                alert('⚠️ Primero genera el informe (sección Informe)');
                return;
            }
            
            switch (format) {
                case 'markdown':
                    exportMarkdown(contenido);
                    break;
                case 'pdf':
                    exportPDF(contenido);
                    break;
                case 'docx':
                    exportDOCX(contenido);
                    break;
            }
        });
    });
    
    // Botones de export en sección export
    const btnMd = document.getElementById('btn-export-md');
    const btnPdf = document.getElementById('btn-export-pdf');
    const btnDocx = document.getElementById('btn-export-docx');
    
    if (btnMd) {
        btnMd.addEventListener('click', () => {
            const contenido = window.appState.informe?.contenido || '';
            if (!contenido) {
                alert('⚠️ Primero genera el informe');
                return;
            }
            exportMarkdown(contenido);
        });
    }
    
    if (btnPdf) {
        btnPdf.addEventListener('click', () => {
            const contenido = window.appState.informe?.contenido || '';
            if (!contenido) {
                alert('⚠️ Primero genera el informe');
                return;
            }
            exportPDF(contenido);
        });
    }
    
    if (btnDocx) {
        btnDocx.addEventListener('click', () => {
            const contenido = window.appState.informe?.contenido || '';
            if (!contenido) {
                alert('⚠️ Primero genera el informe');
                return;
            }
            exportDOCX(contenido);
        });
    }
}

/**
 * Exportar como Markdown
 */
function exportMarkdown(content) {
    const centro = window.appState.centro;
    const filename = centro ? `PMST_${slugify(centro.nombre)}.md` : 'PMST.md';
    downloadFile(content, filename, 'text/markdown');
}

/**
 * Exportar como PDF usando jsPDF
 */
async function exportPDF(content) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    
    const centro = window.appState.centro;
    const lines = content.split('\n');
    let y = 20;
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = 170;
    
    let tableBuffer = [];
    
    function flushTable() {
        if (tableBuffer.length > 1) {
            const headers = tableBuffer[0].map(c => c);
            const data = tableBuffer.slice(1).map(r => r.map(c => c));
            doc.autoTable({
                head: [headers],
                body: data,
                startY: y,
                theme: 'grid',
                headStyles: {
                    fillColor: [37, 99, 235],
                    textColor: 255,
                    fontStyle: 'bold',
                    fontSize: 8,
                    halign: 'center',
                },
                bodyStyles: { fontSize: 8 },
                alternateRowStyles: { fillColor: [240, 244, 255] },
                margin: { left: margin, right: margin },
            });
            y = doc.lastAutoTable.finalY + 6;
            tableBuffer = [];
        }
    }
    
    for (const line of lines) {
        // Acumular filas de tabla
        if (line.startsWith('|') && line.endsWith('|')) {
            const cells = line.split('|').slice(1, -1).map(c => c.trim());
            // Saltar separadores
            if (cells.every(c => c.replace('-', '').replace(' ', '') === '')) {
                continue;
            }
            tableBuffer.push(cells);
            continue;
        }
        
        // Si encontramos una línea no-tabla, volcar la tabla acumulada
        flushTable();
        
        // Saltar líneas vacías y separadores
        if (line.startsWith('---') || line.trim() === '') {
            y += line.trim() === '' ? 4 : 2;
            continue;
        }
        
        // Headers
        if (line.startsWith('# ')) {
            doc.setFontSize(18);
            doc.setFont(undefined, 'bold');
            y += 8;
            if (y > pageHeight - 30) { doc.addPage(); y = 20; }
            doc.text(line.replace('# ', ''), margin, y);
            y += 4;
            // Línea decorativa
            doc.setDrawColor(249, 115, 22);
            doc.setLineWidth(1);
            doc.line(margin, y, margin + 80, y);
            y += 6;
        } else if (line.startsWith('## ')) {
            doc.setFontSize(14);
            doc.setFont(undefined, 'bold');
            y += 6;
            if (y > pageHeight - 20) { doc.addPage(); y = 20; }
            doc.text(line.replace('## ', ''), margin, y);
            y += 4;
        } else if (line.startsWith('### ')) {
            doc.setFontSize(12);
            doc.setFont(undefined, 'bold');
            y += 4;
            if (y > pageHeight - 20) { doc.addPage(); y = 20; }
            doc.text(line.replace('### ', ''), margin, y);
            y += 4;
        } else if (line.startsWith('**') && line.includes('**')) {
            doc.setFont(undefined, 'bold');
            if (y > pageHeight - 20) { doc.addPage(); y = 20; }
            doc.text(line.replace(/\*\*/g, ''), margin, y);
            y += 4;
        } else if (line.startsWith('- ')) {
            doc.setFont(undefined, 'normal');
            doc.setFontSize(10);
            if (y > pageHeight - 20) { doc.addPage(); y = 20; }
            doc.text('• ' + line.slice(2), margin, y);
            y += 4;
        } else {
            doc.setFontSize(10);
            doc.setFont(undefined, 'normal');
            if (y > pageHeight - 20) { doc.addPage(); y = 20; }
            // Word wrap
            const words = line.split(' ');
            let currentLine = '';
            for (const word of words) {
                const testLine = currentLine + (currentLine ? ' ' : '') + word;
                if (doc.getTextWidth(testLine) > maxWidth) {
                    doc.text(currentLine, margin, y);
                    y += 5;
                    currentLine = word;
                    if (y > pageHeight - 20) { doc.addPage(); y = 20; }
                } else {
                    currentLine = testLine;
                }
            }
            if (currentLine) {
                doc.text(currentLine, margin, y);
                y += 5;
            }
        }
    }
    
    // Flush final table
    flushTable();
    
    // Footer en todas las páginas
    const pageCount = doc.internal.pageSize.getPageCount();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(136, 136, 136);
        doc.text(`PLANDEMOVILIDAD — ${centro?.nombre || 'Plan de Movilidad'} — Página ${i} de ${pageCount}`, margin, pageHeight - 10);
        doc.text('Hecho con ❤️ por David Antizar', 190 - margin, pageHeight - 10, { align: 'right' });
    }
    
    const filename = centro ? `PMST_${slugify(centro.nombre)}.pdf` : 'PMST.pdf';
    doc.save(filename);
}

/**
 * Exportar como DOCX usando docx library
 * Genera DOCX real con tablas, encabezados y formato profesional
 */
async function exportDOCX(content) {
    const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, ShadingType } = window.docx;
    
    const centro = window.appState.centro;
    const lines = content.split('\n');
    const children = [];
    let tableRows = [];
    
    function flushTable() {
        if (tableRows.length > 1) {
            const headerRow = new TableRow({
                children: tableRows[0].map(cell => new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: cell, bold: true, size: 20 })] }), { spacing: { after: 40 } }],
                    shading: { type: ShadingType.CLEAR, fill: '2563EB', color: 'FFFFFF' },
                    width: { size: 100 / tableRows[0].length, type: WidthType.PERCENTAGE },
                })),
            });
            
            const bodyRows = tableRows.slice(1).map(row => new TableRow({
                children: row.map(cell => new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: cell, size: 20 })] }), { spacing: { after: 40 } }],
                    shading: { type: ShadingType.CLEAR, fill: (tableRows.indexOf(row) % 2 === 0) ? 'F0F4FF' : 'FFFFFF' },
                    width: { size: 100 / row.length, type: WidthType.PERCENTAGE },
                })),
            }));
            
            children.push(new Table({
                rows: [headerRow, ...bodyRows],
                width: { size: 100, type: WidthType.PERCENTAGE },
            }));
        }
        tableRows = [];
    }
    
    for (const line of lines) {
        if (line.startsWith('|') && line.endsWith('|')) {
            const cells = line.split('|').slice(1, -1).map(c => c.trim());
            if (cells.every(c => c.replace('-', '').replace(' ', '') === '')) continue;
            tableRows.push(cells);
            continue;
        }
        
        flushTable();
        
        if (line.startsWith('# ')) {
            children.push(new Paragraph({
                heading: HeadingLevel.HEADING_1,
                children: [new TextRun({ text: line.replace('# ', ''), bold: true, size: 44 })],
                spacing: { after: 200 },
            }));
        } else if (line.startsWith('## ')) {
            children.push(new Paragraph({
                heading: HeadingLevel.HEADING_2,
                children: [new TextRun({ text: line.replace('## ', ''), bold: true, size: 32 })],
                spacing: { after: 160 },
            }));
        } else if (line.startsWith('### ')) {
            children.push(new Paragraph({
                heading: HeadingLevel.HEADING_3,
                children: [new TextRun({ text: line.replace('### ', ''), bold: true, size: 26 })],
                spacing: { after: 120 },
            }));
        } else if (line.startsWith('**') && line.includes('**')) {
            children.push(new Paragraph({
                children: [new TextRun({ text: line.replace(/\*\*/g, ''), bold: true, size: 22 })],
                spacing: { after: 80 },
            }));
        } else if (line.startsWith('- ')) {
            children.push(new Paragraph({
                children: [new TextRun({ text: '• ' + line.slice(2), size: 22 })],
                spacing: { after: 60, before: 40 },
                indent: { left: 360 },
            }));
        } else if (line.startsWith('---') || line.trim() === '') {
            children.push(new Paragraph({ children: [], spacing: { after: 100 } }));
        } else if (line) {
            children.push(new Paragraph({
                children: [new TextRun({ text: line, size: 22 })],
                spacing: { after: 80 },
            }));
        }
    }
    
    flushTable();
    
    const doc = new Document({
        sections: [{
            properties: {},
            children,
        }],
    });
    
    const blob = await Packer.toBlob(doc);
    const filename = centro ? `PMST_${slugify(centro.nombre)}.docx` : 'PMST.docx';
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// NOTA: La inicialización automática se hace desde index.html
// que importa todos los módulos. No descomentar aquí.
// if (document.readyState === 'loading') {
//     document.addEventListener('DOMContentLoaded', initApp);
// } else {
//     initApp();
// }
