/**
 * PLANDEMOVILIDAD — Validador de datos
 * 
 * REGLA PRINCIPAL: Si el dato no es verificado, NO se muestra.
 * "N/D" es mejor que un dato inventado.
 * 
 * Autor: David Antizar
 */

import { DATA_STATUS } from './gtfs.js';

/**
 * Clase para gestionar la calidad de datos del informe
 */
export class DataValidator {
    constructor() {
        this.warnings = [];
        this.verified = [];
        this.unavailable = [];
    }

    /**
     * Registrar un dato verificado
     */
    addVerified(source, description, count = 1) {
        this.verified.push({ source, description, count });
    }

    /**
     * Registrar un dato no disponible
     */
    addUnavailable(source, description, reason = 'Sin datos de API') {
        this.unavailable.push({ source, description, reason });
        this.warnings.push(`⚠️ ${description}: ${reason}`);
    }

    /**
     * Obtener resumen de calidad de datos
     */
    getSummary() {
        return {
            verified: this.verified,
            unavailable: this.unavailable,
            warnings: this.warnings,
            totalVerified: this.verified.reduce((sum, v) => sum + v.count, 0),
            totalUnavailable: this.unavailable.length,
            qualityScore: this.verified.length / (this.verified.length + this.unavailable.length || 1)
        };
    }

    /**
     * Generar HTML del informe de calidad
     */
    toHTML() {
        const summary = this.getSummary();
        if (summary.totalUnavailable === 0) return '';

        return `
        <div style="background:#fffbeb;border:1px solid #fbbf24;border-radius:8px;padding:16px;margin:20px 0">
            <h4 style="color:#92400e;margin:0 0 8px 0">📋 Informe de Calidad de Datos</h4>
            <p style="font-size:13px;color:#78350f;margin:0 0 8px 0">
                Este informe contiene <strong>${summary.totalVerified} datos verificados</strong> de fuentes oficiales 
                y <strong>${summary.totalUnavailable} datos no disponibles</strong>.
            </p>
            <ul style="font-size:12px;color:#92400e;margin:0;padding-left:20px">
                ${summary.warnings.map(w => `<li>${w}</li>`).join('')}
            </ul>
            <p style="font-size:11px;color:#a16207;margin:8px 0 0 0">
                Los datos marcados como "N/D" no han podido verificarse con fuentes oficiales.
                Se recomienda consultar directamente con el operador de transporte correspondiente.
            </p>
        </div>`;
    }
}

/**
 * Formatear parada para el informe
 * REGLA: Si no hay datos verificados, mostrar "N/D"
 */
export function formatearParadaParaInforme(stop) {
    return {
        nombre: stop.nombre || 'N/D',
        tipo: stop.tipo || 'N/D',
        lineas: stop.lineas?.length > 0 ? stop.lineas.join(', ') : 'N/D',
        operador: stop.operador || 'N/D',
        distancia: stop.distancia_m ? `${stop.distancia_m}m` : 'N/D',
        accesible: stop.tags?.wheelchair === 'yes' ? '✅ Sí' : 
                   stop.tags?.wheelchair === 'no' ? '❌ No' : 'N/D',
        abrigo: stop.tags?.shelter === 'yes' ? '✅ Sí' : 
                stop.tags?.shelter === 'no' ? '❌ No' : 'N/D',
        status: stop.status,
        source: stop.source
    };
}

/**
 * Formatear estación bici para el informe
 */
export function formatearEstacionParaInforme(station) {
    return {
        nombre: station.nombre || 'N/D',
        bicis: station.bicis ?? 'N/D',
        docks: station.docks ?? 'N/D',
        disponibilidad: station.disponibilidad != null ? 
            `${Math.round(station.disponibilidad * 100)}%` : 'N/D',
        distancia: station.distancia_m ? `${station.distancia_m}m` : 'N/D',
        estado: station.disponibilidad > 0.5 ? '🟢 Alta' :
                station.disponibilidad > 0.2 ? '🟡 Media' : '🔴 Baja',
        status: station.status,
        source: station.source
    };
}

/**
 * Generar tabla de paradas para el informe
 * REGLA: Solo mostrar datos verificados, "N/D" para los no disponibles
 */
export function generarTablaParadas(paradas, validator) {
    if (!paradas || paradas.length === 0) {
        validator?.addUnavailable('overpass', 'Paradas de transporte público', 'No se encontraron paradas en el radio');
        return `
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:12px 0">
            <p style="color:#991b1b;margin:0">⚠️ <strong>No se han encontrado paradas de transporte público</strong> en el radio especificado.</p>
            <p style="font-size:12px;color:#b91c1c;margin:4px 0 0 0">
                Esto puede deberse a: cobertura de OpenStreetMap limitada en la zona, o que el radio de búsqueda es demasiado pequeño.
                Se recomienda ampliar el radio o consultar directamente con el operador de transporte.
            </p>
        </div>`;
    }

    const verificadas = paradas.filter(p => p.status === DATA_STATUS.VERIFIED);
    if (verificadas.length > 0) {
        validator?.addVerified('overpass', 'Paradas de transporte público', verificadas.length);
    }

    return `
    <table class="data-table">
        <thead>
            <tr>
                <th>Parada</th>
                <th>Tipo</th>
                <th>Líneas</th>
                <th>Operador</th>
                <th>Distancia</th>
                <th>Accesible</th>
            </tr>
        </thead>
        <tbody>
            ${verificadas.map(p => {
                const f = formatearParadaParaInforme(p);
                return `
                <tr>
                    <td><strong>${f.nombre}</strong></td>
                    <td>${f.tipo}</td>
                    <td>${f.lineas}</td>
                    <td>${f.operador}</td>
                    <td>${f.distancia}</td>
                    <td>${f.accesible}</td>
                </tr>`;
            }).join('')}
        </tbody>
    </table>
    ${paradas.length > verificadas.length ? `
    <p style="font-size:11px;color:#6b7280;margin:8px 0 0 0">
        ℹ️ ${paradas.length - verificadas.length} paradas adicionales sin verificar (nombres genéricos o duplicados).
    </p>` : ''}`;
}

/**
 * Generar tabla de estaciones bici para el informe
 */
export function generarTablaEstaciones(estaciones, validator) {
    if (!estaciones || estaciones.length === 0) {
        validator?.addUnavailable('gbfs', 'Estaciones de bicicleta compartida', 'No se encontraron estaciones GBFS');
        return `
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:12px 0">
            <p style="color:#991b1b;margin:0">⚠️ <strong>No se han encontrado estaciones de bicicleta compartida</strong> en el radio.</p>
            <p style="font-size:12px;color:#b91c1c;margin:4px 0 0 0">
                Esto puede deberse a que la ciudad no tiene sistema de bicicleta compartida o el feed GBFS no está disponible.
            </p>
        </div>`;
    }

    const verificadas = estaciones.filter(e => e.status === DATA_STATUS.VERIFIED);
    if (verificadas.length > 0) {
        validator?.addVerified('gbfs', 'Estaciones de bicicleta compartida', verificadas.length);
    }

    return `
    <table class="data-table">
        <thead>
            <tr>
                <th>Estación</th>
                <th>Bicicletas</th>
                <th>Docks</th>
                <th>Disponibilidad</th>
                <th>Distancia</th>
                <th>Estado</th>
            </tr>
        </thead>
        <tbody>
            ${verificadas.map(e => {
                const f = formatearEstacionParaInforme(e);
                return `
                <tr>
                    <td><strong>${f.nombre}</strong></td>
                    <td>${f.bicis}</td>
                    <td>${f.docks}</td>
                    <td>${f.disponibilidad}</td>
                    <td>${f.distancia}</td>
                    <td>${f.estado}</td>
                </tr>`;
            }).join('')}
        </tbody>
    </table>`;
}

/**
 * Generar resumen de cobertura TP
 */
export function generarResumenCobertura(paradas, estaciones, validator) {
    const paradasVerificadas = paradas?.filter(p => p.status === DATA_STATUS.VERIFIED) || [];
    const estacionesVerificadas = estaciones?.filter(e => e.status === DATA_STATUS.VERIFIED) || [];
    
    const paradasEn500m = paradasVerificadas.filter(p => p.distancia_m <= 500);
    const paradasEn800m = paradasVerificadas.filter(p => p.distancia_m <= 800);
    
    let calificacion = 'No disponible';
    let color = '#6b7280';
    
    if (paradasEn500m.length >= 5) {
        calificacion = 'Excelente';
        color = '#16a34a';
    } else if (paradasEn500m.length >= 3) {
        calificacion = 'Buena';
        color = '#2563eb';
    } else if (paradasEn800m.length >= 2) {
        calificacion = 'Adecuada';
        color = '#f59e0b';
    } else if (paradasEn800m.length >= 1) {
        calificacion = 'Limitada';
        color = '#ea580c';
    } else if (paradasVerificadas.length > 0) {
        calificacion = 'Deficiente';
        color = '#dc2626';
    }
    
    if (paradasVerificadas.length > 0) {
        validator?.addVerified('overpass', 'Cobertura TP calculada');
    }
    
    return {
        paradasEn500m: paradasEn500m.length,
        paradasEn800m: paradasEn800m.length,
        estacionesBici: estacionesVerificadas.length,
        calificacion,
        color,
        fuentes: {
            paradas: paradasVerificadas.length > 0 ? 'Overpass API (OSM)' : 'No disponible',
            bici: estacionesVerificadas.length > 0 ? 'GBFS' : 'No disponible'
        }
    };
}
