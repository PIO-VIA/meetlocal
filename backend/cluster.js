'use strict';

const cluster = require('cluster');
const os = require('os');

if (cluster.isPrimary) {
    // Laisser 1 cœur pour le système, utiliser les autres pour Node
    const numWorkers = Math.max(1, os.cpus().length - 1);

    console.log(`Master PID:${process.pid} — démarrage de ${numWorkers} workers Node.js`);

    for (let i = 0; i < numWorkers; i++) {
        cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
        console.warn(`Worker PID:${worker.process.pid} arrêté (code=${code}, signal=${signal}). Redémarrage...`);
        setTimeout(() => cluster.fork(), 1000);
    });

    cluster.on('online', (worker) => {
        console.log(`Worker PID:${worker.process.pid} en ligne`);
    });

} else {
    // Chaque worker exécute le serveur principal
    require('./server.js');
}
