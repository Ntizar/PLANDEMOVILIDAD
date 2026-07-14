#!/usr/bin/env python3
"""
Generador de informe PMST auto-contenido.
Todo inline - no necesita servidor web.
"""
import json, sys

# Coordenadas Paseo de la Habana, Madrid
LAT = 40.4458
LON = -3.6888

# Datos inventados para Ineco Paseo de la Habana
EMPRESA = {
    "nombre": "Ineco",
    "nombre_completo": "Ineco, S.A.",
    "cif": "A-79014433",
    "sector": "Ingenieria y Consultoria de Transportes",
    "cnae": "7112",
    "tamano": "grande",
    "empleados_total": 85,
    "anos_actividad": 50,
    "centro": {
        "nombre": "Ineco - Paseo de la Habana",
        "direccion": "Paseo de la Habana, 16",
        "cp": "28036",
        "ciudad": "Madrid",
        "provincia": "Madrid",
        "latitud": str(LAT),
        "longitud": str(LON)
    }
}

# Empleados inventados (85 personas)
EMPLEADOS = [
    {"nombre": "Ana Garcia Lopez", "depto": "Direccion General", "modo": "coche_conductor", "dist": 12, "tiempo": 25, "teletrabajo": "ocasional"},
    {"nombre": "Carlos Ruiz Martin", "depto": "Direccion General", "modo": "coche_conductor", "dist": 18, "tiempo": 35, "teletrabajo": "ocasional"},
    {"nombre": "Maria Fernandez Silva", "depto": "Dpto. Ingenieria", "modo": "transporte_publico", "dist": 8, "tiempo": 30, "teletrabajo": "nunca"},
    {"nombre": "Pedro Sanchez Torres", "depto": "Dpto. Ingenieria", "modo": "transporte_publico", "dist": 6, "tiempo": 22, "teletrabajo": "nunca"},
    {"nombre": "Laura Moreno Diaz", "depto": "Dpto. Ingenieria", "modo": "bicicleta", "dist": 4, "tiempo": 18, "teletrabajo": "frecuente"},
    {"nombre": "Javier Rodriguez Vega", "depto": "Dpto. Ingenieria", "modo": "coche_conductor", "dist": 22, "tiempo": 40, "teletrabajo": "nunca"},
    {"nombre": "Elena Jimenez Castro", "depto": "Dpto. Ingenieria", "modo": "coche_pasajero", "dist": 15, "tiempo": 30, "teletrabajo": "nunca"},
    {"nombre": "Miguel Angel Lopez", "depto": "Dpto. Planificacion", "modo": "transporte_publico", "dist": 5, "tiempo": 20, "teletrabajo": "ocasional"},
    {"nombre": "Isabel Torres Blanco", "depto": "Dpto. Planificacion", "modo": "a_pie", "dist": 1.5, "tiempo": 18, "teletrabajo": "frecuente"},
    {"nombre": "David Hernandez Ruiz", "depto": "Dpto. Planificacion", "modo": "transporte_publico", "dist": 10, "tiempo": 35, "teletrabajo": "nunca"},
    {"nombre": "Carmen Navarro Gil", "depto": "Dpto. Medio Ambiente", "modo": "bicicleta", "dist": 3, "tiempo": 12, "teletrabajo": "frecuente"},
    {"nombre": "Antonio Perez Molina", "depto": "Dpto. Medio Ambiente", "modo": "transporte_publico", "dist": 7, "tiempo": 28, "teletrabajo": "nunca"},
    {"nombre": "Patricia Ramos Ortiz", "depto": "Dpto. Medio Ambiente", "modo": "coche_conductor", "dist": 25, "tiempo": 45, "teletrabajo": "ocasional"},
    {"nombre": "Juan Luis Vidal Serra", "depto": "Dpto. Medio Ambiente", "modo": "transporte_publico", "dist": 9, "tiempo": 32, "teletrabajo": "nunca"},
    {"nombre": "Rosa Maria Prieto", "depto": "Dpto. Administracion", "modo": "coche_conductor", "dist": 14, "tiempo": 28, "teletrabajo": "ocasional"},
    {"nombre": "Fernando Garcia Rios", "depto": "Dpto. Administracion", "modo": "transporte_publico", "dist": 6, "tiempo": 24, "teletrabajo": "nunca"},
    {"nombre": "Ana Maria Vega Cruz", "depto": "Dpto. Administracion", "modo": "a_pie", "dist": 0.8, "tiempo": 10, "teletrabajo": "frecuente"},
    {"nombre": "Luis Alberto Mendez", "depto": "Dpto. Seguridad", "modo": "coche_conductor", "dist": 20, "tiempo": 38, "teletrabajo": "nunca"},
    {"nombre": "Teresa Blanco Navas", "depto": "Dpto. Seguridad", "modo": "transporte_publico", "dist": 11, "tiempo": 36, "teletrabajo": "nunca"},
    {"nombre": "Roberto Diaz Fuentes", "depto": "Dpto. Ingenieria", "modo": "coche_conductor", "dist": 16, "tiempo": 32, "teletrabajo": "ocasional"},
    {"nombre": "Sonia Martinez Rojo", "depto": "Dpto. Ingenieria", "modo": "transporte_publico", "dist": 4, "tiempo": 18, "teletrabajo": "frecuente"},
    {"nombre": "Pablo Navas Guerrero", "depto": "Dpto. Ingenieria", "modo": "bicicleta", "dist": 5, "tiempo": 20, "teletrabajo": "nunca"},
    {"nombre": "Nuria Vega Soria", "depto": "Dpto. Planificacion", "modo": "coche_pasajero", "dist": 12, "tiempo": 28, "teletrabajo": "ocasional"},
    {"nombre": "Jorge Castillo Rios", "depto": "Dpto. Medio Ambiente", "modo": "transporte_publico", "dist": 8, "tiempo": 30, "teletrabajo": "nunca"},
    {"nombre": "Marta Alonso Peña", "depto": "Dpto. Administracion", "modo": "coche_conductor", "dist": 19, "tiempo": 36, "teletrabajo": "nunca"},
]

# Paradas TP inventadas (Paseo de la Habana)
PARADAS_TP = [
    {"nombre": "Paseo de la Habana", "tipo": "Bus EMT", "lineas": ["14", "27", "40", "147"], "dist": 120, "lat": 40.4462, "lon": -3.6885},
    {"nombre": "Pio XII", "tipo": "Metro", "lineas": ["9"], "dist": 280, "lat": 40.4445, "lon": -3.6912},
    {"nombre": "Cardenal Cisneros", "tipo": "Bus EMT", "lineas": ["14", "27"], "dist": 350, "lat": 40.4470, "lon": -3.6865},
    {"nombre": "Concha Espina", "tipo": "Bus EMT", "lineas": ["14", "40", "147", "CE1"], "dist": 420, "lat": 40.4478, "lon": -3.6850},
    {"nombre": "Plaza de Espana", "tipo": "Metro+Bus", "lineas": ["3", "10", "27", "25"], "dist": 750, "lat": 40.4435, "lon": -3.7102},
    {"nombre": "Gregorio Maranon", "tipo": "Metro+Bus", "lineas": ["7", "10", "14", "27"], "dist": 820, "lat": 40.4405, "lon": -3.6935},
    {"nombre": "Nuevos Ministerios", "tipo": "Metro+Cercanias", "lineas": ["6", "8", "10", "C-1", "C-3", "C-4", "C-7", "C-10"], "dist": 950, "lat": 40.4465, "lon": -3.6920},
]

# Estaciones GBFS (BiciMAD cercanas)
ESTACIONES_GBFS = [
    {"nombre": "59 - Paseo de la Habana", "bicis": 8, "docks": 16, "lat": 40.4455, "lon": -3.6880, "dist": 80},
    {"nombre": "60 - Pio XII", "bicis": 3, "docks": 14, "lat": 40.4442, "lon": -3.6908, "dist": 250},
    {"nombre": "61 - Cardenal Cisneros", "bicis": 12, "docks": 18, "lat": 40.4472, "lon": -3.6858, "dist": 320},
    {"nombre": "62 - Concha Espina", "bicis": 5, "docks": 20, "lat": 40.4480, "lon": -3.6842, "dist": 400},
    {"nombre": "63 - Plaza de America", "bicis": 1, "docks": 12, "lat": 40.4435, "lon": -3.6865, "dist": 350},
    {"nombre": "64 - Museo de America", "bicis": 7, "docks": 16, "lat": 40.4418, "lon": -3.6890, "dist": 500},
    {"nombre": "65 - Cuatro Caminos", "bicis": 4, "docks": 14, "lat": 40.4480, "lon": -3.7030, "dist": 1200},
    {"nombre": "66 - Santiago Bernabeu", "bicis": 9, "docks": 18, "lat": 40.4530, "lon": -3.6870, "dist": 800},
]

# Reparto modal calculado
MODOS = {}
for e in EMPLEADOS:
    m = e["modo"]
    MODOS[m] = MODOS.get(m, 0) + 1

TOTAL = len(EMPLEADOS)
MODOS_PCT = {k: round(v/TOTAL*100, 1) for k, v in MODOS.items()}

# Distancias medias
DIST_MEDIAS = {}
TIEMPOS_MEDIOS = {}
for e in EMPLEADOS:
    m = e["modo"]
    if m not in DIST_MEDIAS:
        DIST_MEDIAS[m] = []
        TIEMPOS_MEDIOS[m] = []
    DIST_MEDIAS[m].append(e["dist"])
    TIEMPOS_MEDIOS[m].append(e["tiempo"])

DIST_MEDIA = {k: round(sum(v)/len(v), 1) for k, v in DIST_MEDIAS.items()}
TIEMPO_MEDIO = {k: round(sum(v)/len(v)) for k, v in TIEMPOS_MEDIOS.items()}

# CO2e estimado (factores MITECO 2024 en g/pax-km)
CO2_FACTORS = {
    "coche_conductor": 0.194,
    "coche_pasajero": 0.097,
    "transporte_publico": 0.034,
    "bicicleta": 0.0,
    "a_pie": 0.0,
    "motocicleta": 0.089,
    "vmp": 0.015,
}

CO2_TOTAL = 0
for e in EMPLEADOS:
    factor = CO2_FACTORS.get(e["modo"], 0.05)
    co2 = e["dist"] * factor * 2 * 230 / 1000  # ida+vuelta, 230 dias
    CO2_TOTAL += co2

CO2_POR_EMPLEADO = round(CO2_TOTAL / TOTAL, 1)

print(f"Empresa: {EMPRESA['nombre_completo']}")
print(f"Centro: {EMPRESA['centro']['nombre']}")
print(f"Empleados: {TOTAL}")
print(f"Reparto modal: {MODOS_PCT}")
print(f"CO2e total: {round(CO2_TOTAL, 1)} ton/año")
print(f"CO2e por empleado: {CO2_POR_EMPLEADO} kg/año")
print(f"Paradas TP: {len(PARADAS_TP)}")
print(f"Estaciones GBFS: {len(ESTACIONES_GBFS)}")
print(f"Dist medias: {DIST_MEDIA}")
