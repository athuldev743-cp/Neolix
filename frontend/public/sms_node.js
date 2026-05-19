const http = require('http');
const { exec } = require('child_process');

const server = http.createServer((req, res) => {
    // Enable clean incoming tracking parameters
    if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => {
            try {
                const payload = JSON.parse(body);
                const { phone, message } = payload;
                
                if (!phone || !message) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    return res.end(JSON.stringify({ error: 'Missing phone or message fields.' }));
                }

                // Execute native Android hardware SIM transmission call via Termux binary utilities
                const command = `termux-sms-send -n ${phone} "${message.replace(/"/g, '\\"')}"`;
                
                exec(command, (err, stdout, stderr) => {
                    if (err) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        return res.end(JSON.stringify({ error: 'SIM Dispatch Failed', details: stderr }));
                    }
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                });
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Malformed JSON schema body payload.' }));
            }
        });
    } else {
        res.writeHead(405, { 'Content-Type': 'text/plain' });
        res.end('Method Not Allowed');
    }
});

// Run server on default local port parameters
server.listen(8080, '127.0.0.1', () => {
    console.log('Neolix Android SIM Bridge Module Active on Port 8080...');
});