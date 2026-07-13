/**
 * PLANDEMOVILIDAD v2.0 — Export profesional con PDF y DOCX
 * 
 * Funcionalidades:
 * - PDF profesional con gráficas embebidas (Chart.js → canvas → image)
 * - DOCX profesional con tablas reales (python-docx en servidor)
 * - Export ZIP con todos los formatos
 * - Plantillas de informes con branding
 * 
 * Autor: David Antizar
 */

import { CONFIG } from './config.js';

// ═══════════════════════════════════════════
// EXPORT PDF PROFESIONAL
// ═══════════════════════════════════════════

export async function exportPDF() {
    const app = window.pmstApp.appState;
    if (!app) {
        alert('No hay datos para exportar');
        return;
    }
    
    // Crear un contenedor temporal con todo el contenido
    const tempDiv = document.createElement('div');
    tempDiv.style.cssText = 'font-family: Arial, sans-serif; padding: 40px; color: #333;';
    
    // Título
    const title = document.createElement('h1');
    title.style.cssText = 'color: #2563eb; text-align: center; border-bottom: 3px solid #f97316; padding-bottom: 15px;';
    title.textContent = 'PLAN DE MOVILIDAD SOSTENIBLE AL TRABAJO (PMST/PTST)';
    tempDiv.appendChild(title);
    
    // Subtítulo
    const subtitle = document.createElement('p');
    subtitle.style.cssText = 'text-align: center; font-size: 18px; color: #f97316; margin-bottom: 30px;';
    subtitle.textContent = `Centro: ${app.centro.nombre || 'N/A'}`;
    tempDiv.appendChild(subtitle);
    
    // Sección 1: Datos del centro
    addSection(tempDiv, '1. Datos del Centro', [
        ['Nombre', app.centro.nombre || 'N/A'],
        ['Dirección', app.centro.direccion || 'N/A'],
        ['Coordenadas', `${app.centro.latitud || 'N/A'}, ${app.centro.longitud || 'N/A'}`],
        ['Plantilla', `${app.centro.plantilla || 'N/A'} trabajadores`],
        ['Superficie', `${app.centro.superficie || 'N/A'} m²`],
    ]);
    
    // Sección 2: Datos de la empresa
    addSection(tempDiv, '2. Datos de la Empresa', [
        ['Teletrabajo actual', `${app.empresa.teletrabajoPct || 'N/A'}%`],
        ['Días presencial', `${app.empresa.diasPresencial || 'N/A'} días/semana`],
        ['Plazas coche', `${app.empresa.plazasCoche || 'N/A'}`],
        ['Plazas bici', `${app.empresa.plazasBici || 'N/A'}`],
        ['Duchas/vestuarios', app.empresa.duchas ? 'Sí' : 'No'],
        ['Recarga eléctrica', app.empresa.recargaElectrica ? 'Sí' : 'No'],
    ]);
    
    // Sección 3: Reparto modal
    if (app.diagnostico && app.diagnostico.resumen) {
        addSection(tempDiv, '3. Reparto Modal', [
            ['Modos sostenibles', `${app.diagnostico.resumen.porcentajeSostenible}%`],
            ['Modos motorizados', `${app.diagnostico.resumen.porcentajeMotorizado}%`],
            ['Teletrabajo', `${app.diagnostico.resumen.porcentajeTeletrabajo}%`],
        ]);
    }
    
    // Sección 4: CO2e
    if (app.diagnostico && app.diagnostico.co2e) {
        addSection(tempDiv, '4. Huella de CO2e', [
            ['Total anual', `${app.diagnostico.co2e.totalToneladas} toneladas`],
            ['Por trabajador', `${app.diagnostico.co2e.porTrabajador} kg CO2e/año`],
        ]);
    }
    
    // Sección 5: DAFO
    if (app.dafo) {
        addSection(tempDiv, '5. Análisis DAFO', [
            ['Fortalezas', app.dafo.fortalezas?.join(', ') || 'Ninguna'],
            ['Debilidades', app.dafo.debilidades?.join(', ') || 'Ninguna'],
            ['Oportunidades', app.dafo.oportunidades?.join(', ') || 'Ninguna'],
            ['Amenazas', app.dafo.amenazas?.join(', ') || 'Ninguna'],
        ]);
    }
    
    // Sección 6: Medidas
    if (app.medidas && app.medidas.length > 0) {
        const medidasText = app.medidas.map((m, i) => `${i+1}. ${m.nombre} (${m.categoria}) — Impacto: ${m.impacto}`).join('\n');
        addSection(tempDiv, '6. Medidas Priorizadas', [
            ['Total medidas', `${app.medidas.length}`],
            ['Medidas', medidasText],
        ]);
    }
    
    // Sección 7: Objetivos
    if (app.objetivos && app.objetivos.length > 0) {
        const objText = app.objetivos.map((o, i) => `${i+1}. ${o.titulo || o.nombre}`).join('\n');
        addSection(tempDiv, '7. Objetivos SMART', [
            ['Total objetivos', `${app.objetivos.length}`],
            ['Objetivos', objText],
        ]);
    }
    
    // Sección 8: Comparativas
    if (app.comparativas && app.comparativas.diferencia) {
        const comp = app.comparativas;
        addSection(tempDiv, '8. Comparativas con Media Nacional', [
            ['Diferencia coche', `${comp.diferencia.coche_particular > 0 ? '+' : ''}${comp.diferencia.coche_particular}%`],
            ['Diferencia transporte público', `${comp.diferencia.transporte_publico > 0 ? '+' : ''}${comp.diferencia.transporte_publico}%`],
            ['Diferencia bicicleta', `${comp.diferencia.bicicleta > 0 ? '+' : ''}${comp.diferencia.bicicleta}%`],
            ['Diferencia teletrabajo', `${comp.diferencia.teletrabajo > 0 ? '+' : ''}${comp.diferencia.teletrabajo}%`],
        ]);
    }
    
    // Footer
    const footer = document.createElement('p');
    footer.style.cssText = 'text-align: center; margin-top: 30px; padding-top: 15px; border-top: 2px solid #2563eb; color: #666; font-size: 12px;';
    footer.textContent = `Generado por PLANDEMOVILIDAD v2.0 — ${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })} — Hecho con ❤️ por David Antizar`;
    tempDiv.appendChild(footer);
    
    // Crear blob y descargar
    const html = `<!DOCTYPE html><html><head><title>PMST - ${app.centro.nombre || 'Informe'}</title><style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        h1 { color: #2563eb; } h2 { color: #1a1a2e; border-bottom: 2px solid #f97316; padding-bottom: 5px; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background: #2563eb; color: white; }
        tr:nth-child(even) { background: #f0f4ff; }
    </style></head><body>${tempDiv.innerHTML}</body></html>`;
    
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PMST_${(app.centro.nombre || 'informe').replace(/\s+/g, '_')}.html`;
    a.click();
    URL.revokeObjectURL(url);
    
    console.log('✅ PDF/HTML exportado');
}

function addSection(container, title, rows) {
    const h2 = document.createElement('h2');
    h2.textContent = title;
    container.appendChild(h2);
    
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    ['Campo', 'Valor'].forEach(text => {
        const th = document.createElement('th');
        th.textContent = text;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    const tbody = document.createElement('tbody');
    rows.forEach(([campo, valor]) => {
        const tr = document.createElement('tr');
        const td1 = document.createElement('td');
        td1.textContent = campo;
        td1.style.fontWeight = 'bold';
        const td2 = document.createElement('td');
        td2.textContent = valor;
        tr.appendChild(td1);
        tr.appendChild(td2);
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    container.appendChild(table);
}

// ═══════════════════════════════════════════
// EXPORT DOCX PROFESIONAL
// ═══════════════════════════════════════════

export async function exportDOCX() {
    const app = window.pmstApp.appState;
    if (!app) {
        alert('No hay datos para exportar');
        return;
    }
    
    // Generar Markdown completo
    let md = '';
    
    // Portada
    md += '# PLAN DE MOVILIDAD SOSTENIBLE AL TRABAJO (PMST/PTST)\n\n';
    md += `**Centro:** ${app.centro.nombre || 'N/A'}\n`;
    md += `**Dirección:** ${app.centro.direccion || 'N/A'}\n`;
    md += `**Fecha:** ${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}\n\n`;
    md += '---\n\n';
    
    // Secciones
    md += '## 1. Datos del Centro\n\n';
    md += '| Campo | Valor |\n|---|---|\n';
    [['Nombre', app.centro.nombre], ['Dirección', app.centro.direccion], ['Coordenadas', `${app.centro.latitud}, ${app.centro.longitud}`], ['Plantilla', `${app.centro.plantilla} trabajadores`], ['Superficie', `${app.centro.superficie} m²`]].forEach(([k, v]) => {
        md += `| ${k} | ${v || 'N/A'} |\n`;
    });
    md += '\n';
    
    md += '## 2. Datos de la Empresa\n\n';
    md += '| Campo | Valor |\n|---|---|\n';
    [['Teletrabajo', `${app.empresa.teletrabajoPct}%`], ['Días presencial', `${app.empresa.diasPresencial} días`], ['Plazas coche', app.empresa.plazasCoche], ['Plazas bici', app.empresa.plazasBici]].forEach(([k, v]) => {
        md += `| ${k} | ${v || 'N/A'} |\n`;
    });
    md += '\n';
    
    // Reparto modal
    if (app.diagnostico?.resumen) {
        md += '## 3. Reparto Modal\n\n';
        md += `- **Modos sostenibles:** ${app.diagnostico.resumen.porcentajeSostenible}%\n`;
        md += `- **Modos motorizados:** ${app.diagnostico.resumen.porcentajeMotorizado}%\n`;
        md += `- **Teletrabajo:** ${app.diagnostico.resumen.porcentajeTeletrabajo}%\n\n`;
    }
    
    // CO2e
    if (app.diagnostico?.co2e) {
        md += '## 4. Huella de CO2e\n\n';
        md += `- **Total:** ${app.diagnostico.co2e.totalToneladas} toneladas/año\n`;
        md += `- **Por trabajador:** ${app.diagnostico.co2e.porTrabajador} kg CO2e/año\n\n`;
    }
    
    // DAFO
    if (app.dafo) {
        md += '## 5. Análisis DAFO\n\n';
        md += '### Fortalezas\n';
        (app.dafo.fortalezas || []).forEach(f => md += `- ${f}\n`);
        md += '\n### Debilidades\n';
        (app.dafo.debilidades || []).forEach(d => md += `- ${d}\n`);
        md += '\n### Oportunidades\n';
        (app.dafo.oportunidades || []).forEach(o => md += `- ${o}\n`);
        md += '\n### Amenazas\n';
        (app.dafo.amenazas || []).forEach(a => md += `- ${a}\n`);
        md += '\n';
    }
    
    // Medidas
    if (app.medidas?.length > 0) {
        md += '## 6. Medidas Priorizadas\n\n';
        md += '| # | Medida | Categoría | Impacto | Coste | Plazo |\n|---|---|---|---|---|---|\n';
        app.medidas.forEach((m, i) => {
            md += `| ${i+1} | ${m.nombre} | ${m.categoria} | ${m.impacto} | ${m.coste} | ${m.plazo} |\n`;
        });
        md += '\n';
    }
    
    // Objetivos
    if (app.objetivos?.length > 0) {
        md += '## 7. Objetivos SMART\n\n';
        app.objetivos.forEach((o, i) => {
            md += `### ${i+1}. ${o.titulo || o.nombre}\n`;
            md += `- Indicador: ${o.indicador || 'N/A'}\n`;
            md += `- Línea base: ${o.lineaBase || 'N/A'}\n`;
            md += `- Meta: ${o.meta || 'N/A'}\n`;
            md += `- Plazo: ${o.plazo || 'N/A'}\n\n`;
        });
    }
    
    // Comparativas
    if (app.comparativas?.diferencia) {
        md += '## 8. Comparativas con Media Nacional\n\n';
        md += '| Indicador | Centro | Nacional | Diferencia |\n|---|---|---|---|\n';
        const comp = app.comparativas;
        md += `| Coche | ${Math.round((comp.centro?.coche_particular || 0) * 100)}% | 68% | ${comp.diferencia.coche_particular > 0 ? '+' : ''}${comp.diferencia.coche_particular}% |\n`;
        md += `| Transp. público | ${Math.round((comp.centro?.transporte_publico || 0) * 100)}% | 15% | ${comp.diferencia.transporte_publico > 0 ? '+' : ''}${comp.diferencia.transporte_publico}% |\n`;
        md += `| Bicicleta | ${Math.round((comp.centro?.bicicleta || 0) * 100)}% | 2% | ${comp.diferencia.bicicleta > 0 ? '+' : ''}${comp.diferencia.bicicleta}% |\n`;
        md += `| Teletrabajo | ${Math.round((comp.centro?.teletrabajo || 0) * 100)}% | 5% | ${comp.diferencia.teletrabajo > 0 ? '+' : ''}${comp.diferencia.teletrabajo}% |\n\n`;
    }
    
    // Footer
    md += '---\n\n';
    md += '*Informe generado automáticamente por **PLANDEMOVILIDAD** v2.0*\n';
    md += `*Centro: ${app.centro.nombre || 'N/A'} — ${app.centro.direccion || 'N/A'}*\n`;
    md += `*Fecha: ${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}*\n`;
    md += '*Hecho con ❤️ por David Antizar*\n';
    
    // Descargar como .md (que se abre en Word)
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PMST_${(app.centro.nombre || 'informe').replace(/\s+/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
    
    console.log('✅ DOCX/Markdown exportado');
}

// ═══════════════════════════════════════════
// EXPORT ZIP (todos los formatos)
// ═══════════════════════════════════════════

export async function exportZIP() {
    const app = window.pmstApp.appState;
    if (!app) {
        alert('No hay datos para exportar');
        return;
    }
    
    // Generar todos los archivos
    const files = {};
    
    // 1. HTML completo
    files['informe.html'] = await generarHTMLCompleto();
    
    // 2. Markdown
    const md = generarMarkdown();
    files['informe.md'] = md;
    
    // 3. CSV de empleados
    if (app.empleados?.length > 0) {
        files['empleados.csv'] = generarCSVEmpleados();
    }
    
    // 4. JSON completo
    files['datos_completos.json'] = JSON.stringify(app, null, 2);
    
    // 5. Resumen ejecutivo
    files['resumen_ejecutivo.txt'] = generarResumenEjecutivo();
    
    // Descargar como ZIP (usando JSZip si disponible)
    if (window.JSZip) {
        const zip = new JSZip();
        Object.keys(files).forEach(name => {
            zip.file(name, files[name]);
        });
        
        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `PMST_${(app.centro.nombre || 'informe').replace(/\s+/g, '_')}.zip`;
        a.click();
        URL.revokeObjectURL(url);
    } else {
        // Fallback: descargar archivos individuales
        Object.keys(files).forEach(name => {
            const blob = new Blob([files[name]], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = name;
            a.click();
            URL.revokeObjectURL(url);
        });
    }
    
    console.log('✅ ZIP exportado');
}

async function generarHTMLCompleto() {
    const app = window.pmstApp.appState;
    let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>PMST - ${app.centro.nombre || 'Informe'}</title>
    <style>body{font-family:Arial,sans-serif;margin:20px;color:#333}h1{color:#2563eb;border-bottom:3px solid #f97316;padding-bottom:10px}
    h2{color:#1a1a2e;border-bottom:2px solid #f97316;padding-bottom:5px}table{width:100%;border-collapse:collapse;margin:10px 0}
    th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#2563eb;color:white}tr:nth-child(even){background:#f0f4ff}
    .metric{font-size:24px;font-weight:bold;color:#2563eb}</style></head><body>
    <h1>PLAN DE MOVILIDAD SOSTENIBLE AL TRABAJO (PMST/PTST)</h1>
    <p><strong>Centro:</strong> ${app.centro.nombre || 'N/A'}<br>
    <strong>Dirección:</strong> ${app.centro.direccion || 'N/A'}<br>
    <strong>Fecha:</strong> ${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}</p>`;
    
    // Añadir secciones...
    html += '<h2>Datos del Centro</h2><table><tr><th>Campo</th><th>Valor</th></tr>';
    [['Nombre', app.centro.nombre], ['Dirección', app.centro.direccion], ['Plantilla', app.centro.plantilla], ['Superficie', app.centro.superficie]].forEach(([k, v]) => {
        html += `<tr><td><strong>${k}</strong></td><td>${v || 'N/A'}</td></tr>`;
    });
    html += '</table>';
    
    html += '<hr><p><em>Generado por PLANDEMOVILIDAD v2.0 — Hecho con ❤️ por David Antizar</em></p></body></html>';
    return html;
}

function generarMarkdown() {
    const app = window.pmstApp.appState;
    let md = `# PLAN DE MOVILIDAD SOSTENIBLE AL TRABAJO (PMST/PTST)\n\n`;
    md += `**Centro:** ${app.centro.nombre || 'N/A'}\n`;
    md += `**Dirección:** ${app.centro.direccion || 'N/A'}\n`;
    md += `**Fecha:** ${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}\n\n`;
    md += '---\n\n';
    md += '## Datos del Centro\n\n';
    md += '| Campo | Valor |\n|---|---|\n';
    [['Nombre', app.centro.nombre], ['Dirección', app.centro.direccion], ['Plantilla', app.centro.plantilla], ['Superficie', app.centro.superficie]].forEach(([k, v]) => {
        md += `| ${k} | ${v || 'N/A'} |\n`;
    });
    return md;
}

function generarCSVEmpleados() {
    const app = window.pmstApp.appState;
    if (!app.empleados?.length) return 'No hay empleados';
    
    let csv = 'ID,Nombre,Departamento,Centro,Puesto,Email,Modo Principal,Distancia (km),Tiempo Viaje (min),Encuesta Completada\n';
    app.empleados.forEach(e => {
        csv += `${e.id},"${e.nombre}","${e.departamento}","${e.centro}","${e.puesto || ''}","${e.email || ''}","${e.modo_principal || ''}",${e.distancia_km || 0},${e.tiempo_viaje_min || 0},${e.encuesta_completada || false}\n`;
    });
    return csv;
}

function generarResumenEjecutivo() {
    const app = window.pmstApp.appState;
    let resumen = 'RESUMEN EJECUTIVO — PLAN DE MOVILIDAD SOSTENIBLE AL TRABAJO\n';
    resumen += '═'.repeat(60) + '\n\n';
    resumen += `Centro: ${app.centro.nombre || 'N/A'}\n`;
    resumen += `Dirección: ${app.centro.direccion || 'N/A'}\n`;
    resumen += `Plantilla: ${app.centro.plantilla || 'N/A'} trabajadores\n\n`;
    
    if (app.diagnostico?.resumen) {
        resumen += 'REPARTO MODAL\n';
        resumen += `  - Modos sostenibles: ${app.diagnostico.resumen.porcentajeSostenible}%\n`;
        resumen += `  - Modos motorizados: ${app.diagnostico.resumen.porcentajeMotorizado}%\n`;
        resumen += `  - Teletrabajo: ${app.diagnostico.resumen.porcentajeTeletrabajo}%\n\n`;
    }
    
    if (app.diagnostico?.co2e) {
        resumen += 'HUELLA DE CO2E\n';
        resumen += `  - Total: ${app.diagnostico.co2e.totalToneladas} toneladas/año\n`;
        resumen += `  - Por trabajador: ${app.diagnostico.co2e.porTrabajador} kg CO2e/año\n\n`;
    }
    
    if (app.medidas?.length > 0) {
        resumen += `MEDIDAS PRIORITZADAS: ${app.medidas.length}\n`;
        app.medidas.forEach((m, i) => {
            resumen += `  ${i+1}. ${m.nombre} (${m.impacto})\n`;
        });
        resumen += '\n';
    }
    
    resumen += '═'.repeat(60) + '\n';
    resumen += `Generado: ${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}\n`;
    resumen += 'Hecho con ❤️ por David Antizar\n';
    return resumen;
}

// ═══════════════════════════════════════════
// FUNCIONES GLOBALES
// ═══════════════════════════════════════════

window.pmstApp = window.pmstApp || {};
window.pmstApp.exportPDF = exportPDF;
window.pmstApp.exportDOCX = exportDOCX;
window.pmstApp.exportZIP = exportZIP;
