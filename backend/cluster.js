'use strict';

const cluster = require('cluster');
const os = require('os');
const http = require('http');
const httpProxy = require('http-proxy');

if (cluster.isPrimary) {
    const numWorkers = Math.max(1, os.cpus().length - 1);
    console.log(`Master PID:${process.pid} — démarrage de ${numWorkers} workers Node.js (API Gateway)`);

    const workers = [];
    const basePort = 3010;
    const roomAssignments = new Map();
    const workerRooms = new Map(); // workerId -> rooms array

    const broadcastGlobalRooms = () => {
        let allRooms = [];
        for (const rooms of workerRooms.values()) {
            allRooms = [...allRooms, ...rooms];
        }
        // Dé-doublonner par ID au cas où (sécurité)
        const uniqueRooms = Array.from(new Map(allRooms.map(r => [r.id, r])).values());

        workers.forEach(w => {
            if (w?.worker?.id) {
                w.worker.send({ type: 'globalRoomsList', rooms: uniqueRooms });
            }
        });
    };

    const spawnWorker = (index, port) => {
        const worker = cluster.fork({ WORKER_PORT: port });
        workers[index] = { worker, port };

        worker.on('message', (msg) => {
            if (msg.type === 'roomCreated' && msg.roomId) {
                console.log(`[Gateway] Room ${msg.roomId} rattachée au port ${port}`);
                roomAssignments.set(msg.roomId, port);
            } else if (msg.type === 'roomClosed' && msg.roomId) {
                console.log(`[Gateway] Room ${msg.roomId} supprimée du port ${port}`);
                roomAssignments.delete(msg.roomId);
            } else if (msg.type === 'roomsListUpdate' && msg.rooms) {
                workerRooms.set(worker.id, msg.rooms);
                broadcastGlobalRooms();
            }
        });
    };

    for (let i = 0; i < numWorkers; i++) {
        spawnWorker(i, basePort + i);
    }

    cluster.on('exit', (worker, code, signal) => {
        const workerIndex = workers.findIndex(w => w?.worker?.id === worker.id);
        if (workerIndex !== -1) {
            const port = workers[workerIndex].port;
            console.warn(`Worker PID:${worker.process.pid} on port ${port} arrêté. Redémarrage...`);
            spawnWorker(workerIndex, port);
        }
    });

    const proxy = httpProxy.createProxyServer({
        ws: true,
        xfwd: true
    });

    proxy.on('error', (err, req, res) => {
        console.error('[Gateway] Proxy error:', err.message);
        if (res && res.writeHead) {
            res.writeHead(502);
            res.end("Bad Gateway");
        }
    });

    let currentWorkerIndex = 0;

    const getWorkerPort = (req) => {
        try {
            const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
            const roomId = url.searchParams.get('roomId') || url.searchParams.get('id') || url.searchParams.get('room');

            if (roomId) {
                if (roomAssignments.has(roomId)) {
                    const port = roomAssignments.get(roomId);
                    console.log(`[Gateway] Routing request for room ${roomId} to port ${port}`);
                    return port;
                } else {
                    console.log(`[Gateway] Room ${roomId} not found in assignments. Falling back to round-robin.`);
                }
            }
        } catch (e) {
            console.error('[Gateway] Error parsing URL:', e.message);
        }

        const port = workers[currentWorkerIndex].port;
        currentWorkerIndex = (currentWorkerIndex + 1) % workers.length;
        return port;
    };

    const server = http.createServer((req, res) => {
        const targetPort = getWorkerPort(req);
        proxy.web(req, res, { target: `http://127.0.0.1:${targetPort}` });
    });

    server.on('upgrade', (req, socket, head) => {
        const targetPort = getWorkerPort(req);
        proxy.ws(req, socket, head, { target: `http://127.0.0.1:${targetPort}` });
    });

    server.listen(3001, '0.0.0.0', () => {
        console.log(`🚀 Gateway Master écoute sur le port 3001.`);
    });
} else {
    require('./server.js');
}
