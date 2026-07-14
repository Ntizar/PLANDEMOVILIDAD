// ENRIQUECER APP CON DATOS REALES DE APIs
// Llamar ANTES de generarInformeCompleto()

export async function enrichAppWithAPIs(app) {
    const centro = app?.centro;
    if (!centro?.latitud || !centro?.longitud) {
        console.warn('No hay coordenadas del centro para cargar APIs');
        return app;
    }

    const lat = parseFloat(centro.latitud);
    const lng = parseFloat(centro.longitud);

    // 1. GBFS
    try {
        const gbfs = window.pmstApp?.gbfs;
        if (gbfs) {
            const sistema = gbfs.detectarSistemaCercano(lat, lng);
            if (sistema) {
                const estaciones = await gbfs.estacionesCercanas(lat, lng, 1000);
                app.gbfs = { sistema: sistema.nombre, operador: sistema.operador, estaciones: estaciones.estaciones, total: estaciones.total };
                console.log('GBFS: ' + estaciones.total + ' estaciones de ' + sistema.nombre);
            } else {
                app.gbfs = { sistema: null, estaciones: [], total: 0 };
            }
        }
    } catch (e) { app.gbfs = { sistema: null, estaciones: [], total: 0 }; }

    // 2. Nominatim
    try {
        const nom = window.pmstApp?.nominatim;
        if (nom) {
            const info = await nom.geocodificarInversa(lat, lng);
            if (info) {
                app.centroInfo = { direccion: info.nombre, barrio: info.barrio, ciudad: info.ciudad, provincia: info.provincia, cp: info.cp };
            }
            const pois = await nom.buscarPOIs(lat, lng, 'all', 1000);
            app.pois = pois.slice(0, 20);
        }
    } catch (e) { app.centroInfo = {}; app.pois = []; }

    // 3. ORS
    try {
        const ors = window.pmstApp?.ors;
        if (ors) {
            const isocronas = [];
            for (const modo of ['coche', 'bici', 'pie']) {
                for (const min of [10, 15, 30]) {
                    const result = await ors.calcularIsocrona(lng, lat, modo, min);
                    isocronas.push({ modo, minutos: min, areaKm2: result.areaKm2, real: result.real });
                    if (result.real) await new Promise(r => setTimeout(r, 400));
                }
            }
            app.isocronas = isocronas;
        }
    } catch (e) { app.isocronas = []; }

    return app;
}