/**
 * PLANDEMOVILIDAD — Servidor proxy para IA NaN
 * 
 * Proxy simple que reenvía requests a la API de NaN.builders
 * para evitar CORS y almacenar la API key de forma segura.
 * 
 * Autor: David Antizar
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

// ═══════════════════════════════════════════
// CONFIGURACIÓN
// ═══════════════════════════════════════════

const PORT = 3001;
const NAN_API = process.env.NAN_API || '';
const NAN_BASE = 'https://api.nan.builders/v1';

// ═══════════════════════════════════════════
// SERVIDOR HTTP
// ═══════════════════════════════════════════

const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }
    
    // Proxy de IA
    if (req.url === '/api/ai/generate' && req.method === 'POST') {
        handleAIRequest(req, res);
        return;
    }
    
    // Health check
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', port: PORT }));
        return;
    }
    
    // 404
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
});

/**
 * Manejar request de generación de IA
 */
async function handleAIRequest(req, res) {
    if (!NAN_API) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            error: 'NAN_API no configurada. Configura la variable de entorno NAN_API.',
            fallback: true,
        }));
        return;
    }
    
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
        try {
            const { prompt, system, model, temperature, maxTokens } = JSON.parse(body);
            
            // Llamar a la API de NaN
            const response = await fetch(`${NAN_BASE}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${NAN_API}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: model || 'qwen3.6',
                    messages: [
                        { role: 'system', content: system || 'Eres un experto en movilidad sostenible.' },
                        { role: 'user', content: prompt },
                    ],
                    temperature: temperature || 0.7,
                    max_tokens: maxTokens || 2000,
                }),
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Extraer el contenido del mensaje
            const content = data.choices?.[0]?.message?.content || '';
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ content }));
        } catch (err) {
            console.error('Error proxying IA:', err.message);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                error: err.message,
                fallback: true,
            }));
        }
    });
}

// ═══════════════════════════════════════════
// INICIO
// ═══════════════════════════════════════════

server.listen(PORT, () => {
    console.log(`🚀 Proxy IA NaN corriendo en http://localhost:${PORT}`);
    console.log(`📡 Endpoint: http://localhost:${PORT}/api/ai/generate`);
    console.log(`🏥 Health: http://localhost:${PORT}/health`);
    if (!NAN_API) {
        console.warn('⚠️ NAN_API no configurada — el proxy de IA usará fallback offline');
    } else {
        console.log('✅ NAN_API configurada — IA generativa activa');
    }
});
