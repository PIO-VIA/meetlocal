const { createServer } = require('https');
const { parse } = require('url');
const next = require('next');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3001;

// Initialiser Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Options SSL (garder vos certificats existants)
const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, 'ssl/key.pem')),
  cert: fs.readFileSync(path.join(__dirname, 'ssl/cert.pem')),
  minVersion: 'TLSv1.2',
  ciphers: [
    'ECDHE-ECDSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES128-GCM-SHA256',
  ].join(':'),
  honorCipherOrder: true
};

app.prepare().then(() => {
  const server = createServer(httpsOptions, async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      
      // Routes API personnalisées (si nécessaire)
      if (parsedUrl.pathname === '/api/get-connection-info') {
        // Gérer ici ou déléguer à Next.js API routes
        return handle(req, res, parsedUrl);
      }
      
      // Laisser Next.js gérer tout le reste
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Initialiser Socket.IO
  const io = new Server(server, {
    cors: {
      origin: dev ? '*' : 'https://votre-domaine.com',
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 30000,
    pingInterval: 25000
  });

  // REPRENDRE TOUTE LA LOGIQUE SOCKET.IO DE server.js
  const rooms = new Map();

  io.on('connection', (socket) => {
    console.log('Utilisateur connecté:', socket.id);
    
    // Copier tous vos événements socket.on() ici
    // createRoom, joinRoom, leaveRoom, etc.
    
    socket.on('disconnect', () => {
      console.log('Utilisateur déconnecté:', socket.id);
      // Logique de nettoyage
    });
  });

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Serveur prêt sur https://${hostname}:${port}`);
  });
});