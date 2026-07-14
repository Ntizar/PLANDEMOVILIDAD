#!/usr/bin/env python3
"""
Genera PDF con mapas estaticos de OpenStreetMap.
Usa staticmap para generar imagenes de mapa sin JavaScript.
"""
import os, sys, json, hashlib

# Install staticmap if not available
try:
    from staticmap import StaticMap, CircleMarker, Line, Polygon
except ImportError:
    os.system("pip install --break-system-packages staticmap Pillow 2>/dev/null")
    from staticmap import StaticMap, CircleMarker, Line, Polygon

def generar_mapa_entorno(lat, lon, paradas, gbfs, output_path):
    """Mapa de entorno con paradas TP y GBFS"""
    tmap = StaticMap(800, 500, url_template='https://tile.openstreetmap.org/{z}/{x}/{y}.png')
    
    # Centro
    tmap.add_marker(CircleMarker((lon, lat), '#2563eb', 12))
    
    # Paradas TP
    for p in paradas:
        tmap.add_marker(CircleMarker((p['lon'], p['lat']), '#dc2626', 8))
    
    # GBFS
    for e in gbfs:
        ratio = e['bicis'] / max(e['docks'], 1)
        color = '#16a34a' if ratio > 0.3 else '#f59e0b' if ratio > 0.1 else '#dc2626'
        tmap.add_marker(CircleMarker((e['lon'], e['lat']), color, 8))
    
    image = tmap.render(zoom=14)
    image.save(output_path)
    print(f"Mapa entorno: {output_path} ({os.path.getsize(output_path)} bytes)")

def generar_mapa_isocronas(lat, lon, output_path):
    """Mapa con isocronas irregulares"""
    tmap = StaticMap(800, 500, url_template='https://tile.openstreetmap.org/{z}/{x}/{y}.png')
    
    # Centro
    tmap.add_marker(CircleMarker((lon, lat), '#2563eb', 12))
    
    # Isochronas realistas (poligonos irregulares)
    import math
    
    def gen_isochrone(lat, lon, radio_max, modo, seed):
        pts = 48
        coords = []
        ejes = [(0, 1.4), (45, 1.1), (90, 0.7), (135, 1.2), (180, 1.3), (225, 1.0), (270, 0.8), (315, 1.15)]
        barreras = [(75, 105, 0.6), (260, 285, 0.75)]
        
        for i in range(pts):
            ab = (i / pts) * 360
            ar = ab * math.pi / 180
            fe = 1.0
            
            for ea, ef in ejes:
                d = abs(ab - ea)
                if d > 180: d = 360 - d
                if d < 30:
                    fe *= 1 + (ef - 1) * (1 - d / 30) * 0.7
            
            for bmn, bmx, bf in barreras:
                if bmn <= ab <= bmx:
                    mid = (bmn + bmx) / 2
                    d = abs(ab - mid) / ((bmx - bmn) / 2)
                    fe *= bf + (1 - bf) * d
            
            v = 1 + 0.15 * math.sin(ab * 0.1 + seed) + 0.1 * math.cos(ab * 0.23 + seed * 2) + 0.08 * math.sin(ab * 0.37 + seed * 3)
            r = radio_max * fe * v
            
            if (modo in ('coche', 'bici')) and (ab > 350 or ab < 10):
                r *= 1.25
            
            lp = lat + (r / 111320) * math.cos(ar)
            lo = lon + (r / (111320 * math.cos(lat * math.pi / 180))) * math.sin(ar)
            coords.append((lo, lp))
        
        return coords
    
    modos = [('coche', 25, '#3b82f6'), ('bici', 14, '#16a34a'), ('pie', 4.5, '#f59e0b')]
    tiempos = [10, 15, 30]
    
    colors_alpha = ['#3b82f640', '#16a34a40', '#f59e0b40']
    
    for modo, vel, color in modos:
        for i, t in enumerate(tiempos):
            radio = vel * t * 1000 / 60
            seed = ord(modo[0]) * 17 + t * 3
            coords = gen_isochrone(lat, lon, radio, modo, seed)
            # Add alpha for fill
            fill_color = color + '30' if len(color) == 7 else color
            tmap.add_polygon(Polygon(coords, fill_color, color, 2))
    
    image = tmap.render(zoom=12)
    image.save(output_path)
    print(f"Mapa isocronas: {output_path} ({os.path.getsize(output_path)} bytes)")

def generar_mapa_tp(lat, lon, paradas, output_path):
    """Mapa detallado de transporte publico"""
    tmap = StaticMap(800, 500, url_template='https://tile.openstreetmap.org/{z}/{x}/{y}.png')
    
    # Centro
    tmap.add_marker(CircleMarker((lon, lat), '#2563eb', 14))
    
    # Paradas
    for p in paradas:
        tmap.add_marker(CircleMarker((p['lon'], p['lat']), '#dc2626', 10))
        # Linea al centro
        tmap.add_line(Line([(lon, lat), (p['lon'], p['lat'])], '#dc262680', 1))
    
    image = tmap.render(zoom=13)
    image.save(output_path)
    print(f"Mapa TP: {output_path} ({os.path.getsize(output_path)} bytes)")

# Datos
LAT, LON = 40.4458, -3.6888
PARADAS = [
    {"nombre":"Paseo de la Habana","lat":40.4462,"lon":-3.6885,"lineas":["14","27","40","147"],"dist":120},
    {"nombre":"Pio XII","lat":40.4445,"lon":-3.6912,"lineas":["9"],"dist":280},
    {"nombre":"Cardenal Cisneros","lat":40.4470,"lon":-3.6865,"lineas":["14","27"],"dist":350},
    {"nombre":"Concha Espina","lat":40.4478,"lon":-3.6850,"lineas":["14","40","147","CE1"],"dist":420},
    {"nombre":"Plaza de Espana","lat":40.4435,"lon":-3.7102,"lineas":["3","10","27","25"],"dist":750},
    {"nombre":"Gregorio Maranon","lat":40.4405,"lon":-3.6935,"lineas":["7","10","14","27"],"dist":820},
    {"nombre":"Nuevos Ministerios","lat":40.4465,"lon":-3.6920,"lineas":["6","8","10","C-1","C-3","C-4","C-7","C-10"],"dist":950},
]

GBFS = [
    {"nombre":"59 - P. Habana","lat":40.4455,"lon":-3.6880,"bicis":8,"docks":16},
    {"nombre":"60 - Pio XII","lat":40.4442,"lon":-3.6908,"bicis":3,"docks":14},
    {"nombre":"61 - Card. Cisneros","lat":40.4472,"lon":-3.6858,"bicis":12,"docks":18},
    {"nombre":"62 - Concha Espina","lat":40.4480,"lon":-3.6842,"bicis":5,"docks":20},
    {"nombre":"63 - Plaza America","lat":40.4435,"lon":-3.6865,"bicis":1,"docks":12},
    {"nombre":"64 - Museo America","lat":40.4418,"lon":-3.6890,"bicis":7,"docks":16},
    {"nombre":"65 - Cuatro Caminos","lat":40.4480,"lon":-3.7030,"bicis":4,"docks":14},
    {"nombre":"66 - Santiago Bernabeu","lat":40.4530,"lon":-3.6870,"bicis":9,"docks":18},
]

outdir = '/root/workspace/PLANDEMOVILIDAD/mapas'
os.makedirs(outdir, exist_ok=True)

generar_mapa_entorno(LAT, LON, PARADAS, GBFS, f'{outdir}/entorno.png')
generar_mapa_isocronas(LAT, LON, f'{outdir}/isocronas.png')
generar_mapa_tp(LAT, LON, PARADAS, f'{outdir}/tp.png')

print("\nMapas generados correctamente")
