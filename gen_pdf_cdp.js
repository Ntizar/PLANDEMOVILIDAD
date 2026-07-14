
const http = require('http');
const WebSocket = require('ws');

// Connect to browser CDP
async function main() {
    // Get browser debug endpoint
    const browserWsUrl = process.argv[2] || 'ws://127.0.0.1:9222';
    
    const resp = await fetch(browserWsUrl.replace('ws://', 'http://').replace('/devtools/browser', '/json'));
    const pages = await resp.json();
    
    // Find the informe page
    const page = pages.find(p => p.url.includes('informe_preview'));
    if (!page) {
        console.error('No informe page found. Pages:', pages.map(p => p.url));
        process.exit(1);
    }
    
    console.log('Connecting to:', page.webSocketDebuggerUrl);
    
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    let id = 1;
    
    function send(method, params = {}) {
        return new Promise((resolve, reject) => {
            const msgId = id++;
            ws.send(JSON.stringify({ id: msgId, method, params }));
            const handler = (data) => {
                const msg = JSON.parse(data.toString());
                if (msg.id === msgId) {
                    ws.off('message', handler);
                    if (msg.error) reject(new Error(msg.error.message));
                    else resolve(msg.result);
                }
            };
            ws.on('message', handler);
        });
    }
    
    ws.on('open', async () => {
        try {
            // Print to PDF
            const pdf = await send('Page.printToPDF', {
                landscape: false,
                printBackground: true,
                preferCSSPageSize: true,
                scale: 0.8,
                paperWidth: 8.27,  // A4
                paperHeight: 11.69
            });
            
            const fs = require('fs');
            const buffer = Buffer.from(pdf.data, 'base64');
            fs.writeFileSync('/root/workspace/PLANDEMOVILIDAD/PMST_Ineco_Paseo_Habana.pdf', buffer);
            console.log(`PDF saved: ${buffer.length} bytes (${(buffer.length/1024).toFixed(1)} KB)`);
            
            ws.close();
        } catch (e) {
            console.error('Error:', e.message);
            ws.close();
        }
    });
}

main().catch(console.error);
