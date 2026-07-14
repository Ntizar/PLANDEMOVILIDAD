#!/usr/bin/env python3
"""Generate PDF with static map images embedded"""
import os, re, base64

BASE = '/root/workspace/PLANDEMOVILIDAD'
MAPAS = f'{BASE}/mapas'

def img_to_b64(path):
    with open(path, 'rb') as f:
        data = base64.b64encode(f.read()).decode()
    return f'data:image/jpeg;base64,{data}'

def main():
    html_path = f'{BASE}/informe_preview.html'
    pdf_path = f'{BASE}/PMST_Ineco_Paseo_Habana.pdf'
    
    with open(html_path, 'r', encoding='utf-8') as f:
        html = f.read()
    
    maps = [
        ('map-entorno', 'entorno.jpg', 'Mapa del entorno: paradas de transporte publico y estaciones BiciMAD en 800m'),
        ('map-isocronas', 'isocronas.jpg', 'Isochronas de accesibilidad: coche/bici/pie a 10/15/30 min. Poligonos con barreras urbanas.'),
        ('map-tp', 'tp.jpg', 'Red de transporte publico: autobus EMT, Metro L9 y Cercanias.'),
    ]
    
    for map_id, img_file, caption in maps:
        b64 = img_to_b64(f'{MAPAS}/{img_file}')
        img_html = f'<div style="text-align:center;margin:16px 0"><img src="{b64}" style="width:100%;max-width:800px;height:auto;border-radius:8px;border:1px solid #e5e7eb" alt="{caption}" /><p style="font-size:10pt;color:#6b7280;margin-top:6px;font-style:italic">{caption}</p></div>'
        
        # Try multiple patterns
        patterns = [
            rf'<div[^>]*id="{map_id}"[^>]*>.*?</div>\s*(?:<div class="map-legend"[^>]*>.*?</div>)?',
            rf'<div[^>]*data-report-map="[^"]*"[^>]*>.*?</div>\s*(?:<div class="map-legend"[^>]*>.*?</div>)?',
        ]
        
        for pat in patterns:
            new_html = re.sub(pat, img_html, html, flags=re.DOTALL | re.IGNORECASE)
            if new_html != html:
                html = new_html
                print(f"  Replaced {map_id}")
                break
        else:
            print(f"  WARNING: {map_id} not found")
    
    # Remove Leaflet
    html = re.sub(r'<link[^>]*leaflet[^>]*>', '', html)
    html = re.sub(r'<script[^>]*leaflet[^>]*>.*?</script>', '', html, flags=re.DOTALL)
    html = re.sub(r'<script>\s*const MAP_CENTER.*?</script>', '', html, flags=re.DOTALL)
    
    static_html = f'{BASE}/informe_estatico.html'
    with open(static_html, 'w', encoding='utf-8') as f:
        f.write(html)
    print(f"Static HTML: {os.path.getsize(static_html)} bytes")
    
    from weasyprint import HTML
    print("Generating PDF...")
    HTML(filename=static_html).write_pdf(pdf_path)
    
    size = os.path.getsize(pdf_path)
    from PyPDF2 import PdfReader
    pages = len(PdfReader(pdf_path).pages)
    print(f"PDF: {pdf_path} ({size/1024:.1f} KB, {pages} pages)")

if __name__ == '__main__':
    main()
