/**
 * PLANDEMOVILIDAD — Gestión multi-empresa
 * 
 * CRUD completo de empresas con UI integrada:
 * - Crear, editar, eliminar empresas
 * - Cambiar entre empresas
 * - Importar CSV de encuestas por empresa
 * - Resumen de datos por empresa
 * 
 * Autor: David Antizar
 * Hecho con ❤️ por David Antizar
 */

import { 
    crearEmpresa, listarEmpresas, cambiarEmpresa, 
    eliminarEmpresa, getEmpresaActiva, guardarEmpresaActiva,
    importarEncuesta, getEmpleados, getEncuesta, initState,
    exportToGlobal 
} from './state.js';
import { procesarCSV, generarPreview } from './csv-import.js';

// ═══════════════════════════════════════════
// ESTILOS CSS (inyectados)
// ═══════════════════════════════════════════

const ESTILOS_CSS = `
/* Modal de empresas */
.modal-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.5);
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
}
.modal-content {
    background: white;
    border-radius: 16px;
    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
    width: 100%;
    max-width: 800px;
    max-height: 90vh;
    overflow-y: auto;
}
.modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 20px 24px;
    border-bottom: 1px solid var(--gray-200);
}
.modal-header h2 { font-size: 1.2rem; margin: 0; }
.modal-close {
    background: none; border: none; font-size: 1.5rem;
    cursor: pointer; color: #9ca3af; padding: 4px 8px;
    border-radius: 6px;
}
.modal-close:hover { background: #f3f4f6; color: #374151; }
.modal-body { padding: 24px; }

/* Tabs de empresas */
.empresa-tabs {
    display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px;
}
.empresa-tab {
    padding: 10px 16px;
    border: 2px solid #e5e7eb;
    border-radius: 10px;
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 600;
    transition: all 0.15s;
    display: flex; align-items: center; gap: 8px;
}
.empresa-tab:hover { border-color: #2563eb; background: #dbeafe; }
.empresa-tab.active {
    border-color: #2563eb; background: #dbeafe; color: #2563eb;
}

/* Acciones */
.empresa-actions {
    display: flex; gap: 8px; margin: 16px 0; flex-wrap: wrap;
}

/* Cards */
.card {
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 20px;
    margin-top: 16px;
}
.card h3 { font-size: 1rem; margin: 0 0 12px 0; }

/* Dropzone */
.csv-dropzone {
    border: 2px dashed #d1d5db;
    border-radius: 12px;
    padding: 30px;
    text-align: center;
    cursor: pointer;
    transition: all 0.15s;
}
.csv-dropzone:hover {
    border-color: #2563eb;
    background: #dbeafe;
}

/* Preview CSV */
.csv-preview-header {
    display: flex; justify-content: space-between; align-items: center;
    margin: 12px 0; flex-wrap: wrap; gap: 8px;
}
.csv-preview-table {
    overflow-x: auto;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    font-size: 0.78rem;
}
.csv-preview-table table {
    width: 100%; border-collapse: collapse;
}
.csv-preview-table th {
    background: #2563eb; color: white;
    padding: 8px 10px; text-align: left; white-space: nowrap;
}
.csv-preview-table td {
    padding: 6px 10px; border-bottom: 1px solid #f3f4f6;
    white-space: nowrap;
}
.csv-preview-table tr:nth-child(even) { background: #f9fafb; }

/* Resumen grid */
.resumen-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 12px;
}
.resumen-card {
    text-align: center; padding: 14px;
    background: white; border-radius: 10px; border: 1px solid #e5e7eb;
}
.resumen-card .value {
    font-size: 1.6rem; font-weight: 800; color: #2563eb;
}
.resumen-card .label {
    font-size: 0.75rem; color: #6b7280; margin-top: 2px;
}

/* Botones auxiliares */
.btn-sm { padding: 6px 12px !important; font-size: 0.8rem !important; }
.btn-outline {
    background: white; border: 1.5px solid #d1d5db;
    color: #374151;
}
.btn-outline:hover { border-color: #2563eb; color: #2563eb; }
.btn-danger {
    background: #dc2626; color: white; border: none;
}
.btn-danger:hover { background: #b91c1c; }
`;

// ═══════════════════════════════════════════
// FUNCIONES UI
// ═══════════════════════════════════════════

let csvDataPendiente = null;

/**
 * Inicializar el módulo de empresas
 */
export async function initEmpresas() {
    // Inyectar estilos
    if (!document.getElementById('empresaStyles')) {
        const style = document.createElement('style');
        style.id = 'empresaStyles';
        style.textContent = ESTILOS_CSS;
        document.head.appendChild(style);
    }
    
    // Inicializar state
    await initState();
    exportToGlobal();
    
    // Actualizar selector en header
    actualizarSelectorHeader();
    
    console.log('✅ Gestión de empresas inicializada');
}

/**
 * Actualizar selector de empresas en el header
 */
async function actualizarSelectorHeader() {
    const selector = document.getElementById('empresaSelector');
    if (!selector) return;
    
    const empresas = await listarEmpresas();
    const activa = getEmpresaActiva();
    
    selector.innerHTML = `
        <select onchange="pmstUI.cambiarAEmpresa(this.value)" style="
            padding: 6px 12px; border-radius: 8px; border: 1.5px solid #d1d5db;
            font-size: 0.85rem; font-weight: 600; background: white;
        ">
            ${empresas.map(e => `
                <option value="${e.id}" ${e.id === activa?.id ? 'selected' : ''}>
                    🏢 ${e.nombre}
                </option>
            `).join('')}
        </select>
        <button onclick="pmstUI.abrirModalEmpresas()" style="
            padding: 6px 12px; border-radius: 8px; border: 1.5px solid #d1d5db;
            font-size: 0.8rem; cursor: pointer; background: white;
        ">⚙️</button>
    `;
}

/**
 * Abrir modal de gestión de empresas
 */
export async function abrirModalEmpresas() {
    // Crear modal si no existe
    let modal = document.getElementById('modalEmpresas');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modalEmpresas';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>🏢 Gestión de Empresas</h2>
                    <button class="modal-close" onclick="pmstUI.cerrarModalEmpresas()">&times;</button>
                </div>
                <div class="modal-body" id="modalEmpresasBody"></div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    modal.style.display = 'flex';
    await renderContenidoModal();
}

/**
 * Cerrar modal
 */
export function cerrarModalEmpresas() {
    const modal = document.getElementById('modalEmpresas');
    if (modal) modal.style.display = 'none';
    csvDataPendiente = null;
}

/**
 * Renderizar contenido del modal
 */
async function renderContenidoModal() {
    const body = document.getElementById('modalEmpresasBody');
    if (!body) return;
    
    const empresas = await listarEmpresas();
    const activa = getEmpresaActiva();
    const encuesta = getEncuesta();
    const empleados = getEmpleados();
    
    body.innerHTML = `
        <!-- Tabs de empresas -->
        <div>
            <label style="font-size:0.85rem;font-weight:600;color:#374151">Empresa activa:</label>
            <div class="empresa-tabs">
                ${empresas.map(e => `
                    <div class="empresa-tab ${e.id === activa?.id ? 'active' : ''}" 
                         onclick="pmstUI.cambiarAEmpresa('${e.id}')">
                        🏢 ${e.nombre}
                    </div>
                `).join('')}
            </div>
        </div>
        
        <!-- Acciones -->
        <div class="empresa-actions">
            <button class="btn btn-primary" onclick="pmstUI.mostrarFormNuevaEmpresa()">
                ➕ Nueva empresa
            </button>
            <button class="btn btn-outline" onclick="pmstUI.mostrarZonaImportCSV()">
                📥 Importar CSV encuesta
            </button>
            <button class="btn btn-danger btn-sm" onclick="pmstUI.eliminarEmpresaActiva()" 
                    ${empresas.length <= 1 ? 'disabled' : ''}>
                🗑️ Eliminar
            </button>
        </div>
        
        <!-- Form nueva empresa -->
        <div id="formNuevaEmpresa" style="display:none">
            <div class="card">
                <h3>➕ Nueva empresa</h3>
                <div style="margin-bottom:12px">
                    <label style="font-size:0.85rem;font-weight:600;display:block;margin-bottom:4px">Nombre</label>
                    <input type="text" id="nombreNuevaEmpresa" placeholder="Ej: Ineco, S.A." 
                           style="width:100%;padding:8px 12px;border:1.5px solid #d1d5db;border-radius:8px;font-size:0.9rem"
                           onkeypress="if(event.key==='Enter')pmstUI.crearNuevaEmpresa()">
                </div>
                <div style="display:flex;gap:8px">
                    <button class="btn btn-primary btn-sm" onclick="pmstUI.crearNuevaEmpresa()">Crear</button>
                    <button class="btn btn-outline btn-sm" onclick="pmstUI.ocultarFormNuevaEmpresa()">Cancelar</button>
                </div>
            </div>
        </div>
        
        <!-- Zona importación CSV -->
        <div id="zonaImportCSV" style="display:none">
            <div class="card">
                <h3>📥 Importar encuesta CSV</h3>
                <p style="color:#6b7280;font-size:0.85rem;margin-bottom:12px">
                    Arrastra un CSV o haz clic para seleccionar. Formato compatible con encuesta.html.
                </p>
                <div class="csv-dropzone" id="csvDropzone">
                    <div style="font-size:2rem;margin-bottom:8px">📄</div>
                    <div style="font-weight:600">Arrastra CSV aquí</div>
                    <div style="font-size:0.8rem;color:#9ca3af">o haz clic para seleccionar</div>
                    <input type="file" id="csvFileInput" accept=".csv,.txt" style="display:none">
                </div>
                
                <div id="csvPreview" style="display:none">
                    <div class="csv-preview-header">
                        <span id="csvPreviewInfo" style="font-size:0.85rem;color:#374151"></span>
                        <div style="display:flex;gap:8px">
                            <button class="btn btn-primary btn-sm" onclick="pmstUI.confirmarImportCSV('reemplazar')">
                                ✅ Importar
                            </button>
                            <button class="btn btn-outline btn-sm" onclick="pmstUI.confirmarImportCSV('fusionar')">
                                ➕ Fusionar
                            </button>
                            <button class="btn btn-outline btn-sm" onclick="pmstUI.cancelarImportCSV()">
                                Cancelar
                            </button>
                        </div>
                    </div>
                    <div class="csv-preview-table" id="csvPreviewTable"></div>
                </div>
            </div>
        </div>
        
        <!-- Resumen empresa activa -->
        <div class="card">
            <h3>📊 Resumen — ${activa?.empresa?.nombre || activa?.centro?.nombre || 'Sin nombre'}</h3>
            <div class="resumen-grid">
                <div class="resumen-card">
                    <div class="value">${empleados.length}</div>
                    <div class="label">Empleados</div>
                </div>
                <div class="resumen-card">
                    <div class="value">${encuesta.totalEncuestados || 0}</div>
                    <div class="label">Encuestas</div>
                </div>
                <div class="resumen-card">
                    <div class="value">${activa?.flota?.length || 0}</div>
                    <div class="label">Vehículos</div>
                </div>
                <div class="resumen-card">
                    <div class="value">${activa?.kpiMatrix?.years?.length || 0}</div>
                    <div class="label">Años KPI</div>
                </div>
                <div class="resumen-card">
                    <div class="value">${activa?.transportePublico?.paradas?.length || 0}</div>
                    <div class="label">Paradas TP</div>
                </div>
                <div class="resumen-card">
                    <div class="value">${activa?.transportePublico?.gbfs?.length || 0}</div>
                    <div class="label">Estaciones Bici</div>
                </div>
            </div>
        </div>
    `;
    
    // Setup drag & drop y file input
    setupCSVImport();
}

/**
 * Setup drag & drop para CSV
 */
function setupCSVImport() {
    const dropzone = document.getElementById('csvDropzone');
    const fileInput = document.getElementById('csvFileInput');
    if (!dropzone || !fileInput) return;
    
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = '#2563eb';
        dropzone.style.background = '#dbeafe';
    });
    
    dropzone.addEventListener('dragleave', () => {
        dropzone.style.borderColor = '#d1d5db';
        dropzone.style.background = '';
    });
    
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = '#d1d5db';
        dropzone.style.background = '';
        
        const file = e.dataTransfer.files[0];
        if (file) processCSVFile(file);
    });
    
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) processCSVFile(file);
    });
}

/**
 * Procesar archivo CSV
 */
function processCSVFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const texto = e.target.result;
        const resultado = procesarCSV(texto);
        
        if (!resultado.ok) {
            alert(`❌ Error: ${resultado.error || resultado.validacion?.errores?.[0]?.mensaje}`);
            return;
        }
        
        csvDataPendiente = resultado;
        mostrarPreviewCSV(resultado);
    };
    reader.readAsText(file, 'UTF-8');
}

/**
 * Mostrar preview del CSV
 */
function mostrarPreviewCSV(resultado) {
    const preview = document.getElementById('csvPreview');
    const info = document.getElementById('csvPreviewInfo');
    const table = document.getElementById('csvPreviewTable');
    
    if (!preview || !info || !table) return;
    
    preview.style.display = 'block';
    
    // Info
    const advertencias = resultado.validacion.advertencias.length > 0 
        ? ` ⚠️ ${resultado.validacion.advertencias.join(', ')}` 
        : '';
    info.innerHTML = `
        <strong>${resultado.totalRows} respuestas</strong> detectadas 
        (${resultado.formato.tipoDetectado}) — 
        Cobertura columnas: ${resultado.formato.porcentajeCobertura}%
        ${advertencias}
    `;
    
    // Tabla preview
    const previewData = generarPreview(resultado.datos, 5);
    if (!previewData) return;
    
    table.innerHTML = `
        <table>
            <thead>
                <tr>${previewData.headers.slice(0, 8).map(h => `<th>${h}</th>`).join('')}
                    ${previewData.headers.length > 8 ? '<th>...</th>' : ''}
                </tr>
            </thead>
            <tbody>
                ${previewData.filas.map(row => `
                    <tr>${previewData.headers.slice(0, 8).map(h => `<td>${row[h] ?? ''}</td>`).join('')}
                        ${previewData.headers.length > 8 ? '<td>...</td>' : ''}
                    </tr>
                `).join('')}
            </tbody>
        </table>
        ${previewData.truncado ? `<div style="padding:8px;color:#6b7280;font-size:0.8rem">Mostrando 5 de ${previewData.totalFilas} filas</div>` : ''}
    `;
}

// ═══════════════════════════════════════════
// ACCIONES
// ═══════════════════════════════════════════

/**
 * Mostrar form nueva empresa
 */
export function mostrarFormNuevaEmpresa() {
    document.getElementById('formNuevaEmpresa').style.display = 'block';
    document.getElementById('zonaImportCSV').style.display = 'none';
    document.getElementById('nombreNuevaEmpresa').focus();
}

export function ocultarFormNuevaEmpresa() {
    document.getElementById('formNuevaEmpresa').style.display = 'none';
}

export function mostrarZonaImportCSV() {
    document.getElementById('zonaImportCSV').style.display = 'block';
    document.getElementById('formNuevaEmpresa').style.display = 'none';
    document.getElementById('csvPreview').style.display = 'none';
}

/**
 * Crear nueva empresa
 */
export async function crearNuevaEmpresa() {
    const nombre = document.getElementById('nombreNuevaEmpresa')?.value?.trim();
    if (!nombre) {
        alert('Escribe un nombre para la empresa');
        return;
    }
    
    await crearEmpresa(nombre);
    await renderContenidoModal();
    await actualizarSelectorHeader();
    
    // Auto-seleccionar la nueva empresa
    const empresas = await listarEmpresas();
    const nueva = empresas.find(e => e.nombre === nombre);
    if (nueva) {
        await cambiarEmpresa(nueva.id);
        await renderContenidoModal();
        await actualizarSelectorHeader();
    }
    
    ocultarFormNuevaEmpresa();
}

/**
 * Cambiar de empresa
 */
export async function cambiarAEmpresa(empresaId) {
    await cambiarEmpresa(empresaId);
    await renderContenidoModal();
    await actualizarSelectorHeader();
    
    // Disparar evento para que otros módulos se actualicen
    window.dispatchEvent(new CustomEvent('empresaCambiada', { 
        detail: { empresa: getEmpresaActiva() } 
    }));
}

/**
 * Eliminar empresa activa
 */
export async function eliminarEmpresaActiva() {
    const activa = getEmpresaActiva();
    if (!activa) return;
    
    const empresas = await listarEmpresas();
    if (empresas.length <= 1) {
        alert('No puedes eliminar la última empresa');
        return;
    }
    
    if (!confirm(`¿Eliminar "${activa.empresa?.nombre || activa.centro?.nombre}"? Esta acción no se puede deshacer.`)) {
        return;
    }
    
    await eliminarEmpresa(activa.id);
    await renderContenidoModal();
    await actualizarSelectorHeader();
}

/**
 * Confirmar importación CSV
 */
export async function confirmarImportCSV(modo) {
    if (!csvDataPendiente || !csvDataPendiente.datos) {
        alert('No hay datos CSV pendientes de importar');
        return;
    }
    
    const resultado = importarEncuesta(csvDataPendiente.datos, modo);
    
    alert(`✅ ${resultado.totalEncuestados} respuestas importadas (${modo})`);
    
    csvDataPendiente = null;
    await renderContenidoModal();
    await actualizarSelectorHeader();
    
    // Disparar evento
    window.dispatchEvent(new CustomEvent('encuestaImportada', { 
        detail: { encuesta: resultado } 
    }));
}

/**
 * Cancelar importación CSV
 */
export function cancelarImportCSV() {
    csvDataPendiente = null;
    document.getElementById('csvPreview').style.display = 'none';
}

// ═══════════════════════════════════════════
// EXPORTAR AL GLOBAL
// ═══════════════════════════════════════════

if (typeof window !== 'undefined') {
    window.pmstUI = window.pmstUI || {};
    Object.assign(window.pmstUI, {
        initEmpresas,
        abrirModalEmpresas,
        cerrarModalEmpresas,
        mostrarFormNuevaEmpresa,
        ocultarFormNuevaEmpresa,
        mostrarZonaImportCSV,
        crearNuevaEmpresa,
        cambiarAEmpresa,
        eliminarEmpresaActiva,
        confirmarImportCSV,
        cancelarImportCSV,
    });
}
