/**
 * Serveur HTTPS personnalisé pour Next.js
 * Permet d'accéder aux API WebRTC (caméra, micro, partage d'écran)
 */

const { createServer } = require('https');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');
const os = require('os');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = 3000;

// Obtenir l'IP locale
function getLocalIP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
}

const SERVER_IP = getLocalIP();

// Charger les certificats SSL
const httpsOptions = {
    key: fs.readFileSync(path.join(__dirname, '../backend/ssl/key.pem')),
    cert: fs.readFileSync(path.join(__dirname, '../backend/ssl/cert.pem')),
};

// Préparer l'app Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
    createServer(httpsOptions, async (req, res) => {
        try {
            const parsedUrl = parse(req.url, true);
            await handle(req, res, parsedUrl);
        } catch (err) {
            console.error('Error occurred handling', req.url, err);
            res.statusCode = 500;
            res.end('internal server error');
        }
    })
    .once('error', (err) => {
        console.error(err);
        process.exit(1);
    })
    .listen(port, hostname, () => {
        console.log('🚀 Next.js Frontend démarré en HTTPS');
        console.log('═══════════════════════════════════════');
        console.log(`📡 IP du serveur: ${SERVER_IP}`);
        console.log(`🔒 HTTPS: https://${SERVER_IP}:${port}`);
        console.log(`🏠 Local: https://localhost:${port}`);
        console.log('═══════════════════════════════════════');
        console.log('');
        console.log('⚠️  IMPORTANT:');
        console.log('   1. Acceptez le certificat SSL sur chaque appareil');
        console.log(`   2. Allez sur: https://${SERVER_IP}:${port}`);
        console.log('   3. Les API caméra/micro/partage fonctionneront correctement');
        console.log('');
    });
});