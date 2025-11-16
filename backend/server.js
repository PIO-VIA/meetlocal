/**
 * BACKEND - Serveur Socket.IO + Mediasoup pour LOCAL MEET
 * Architecture SFU (Selective Forwarding Unit) pour meilleure scalabilité
 */

const express = require('express');
const app = express();
const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const { Server } = require('socket.io');
const mediasoup = require('mediasoup');

// Configuration SSL
const options = {
    key: fs.readFileSync(path.join(__dirname, 'ssl/key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'ssl/cert.pem')),
    minVersion: 'TLSv1.2',
    ciphers: [
        'ECDHE-ECDSA-AES128-GCM-SHA256',
        'ECDHE-RSA-AES128-GCM-SHA256',
    ].join(':'),
    honorCipherOrder: true
};

// Créer le serveur HTTPS
const server = https.createServer(options, app);

// Obtenir l'IP locale du serveur
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
console.log(`📡 Adresse IP du serveur: ${SERVER_IP}`);

// Configuration Socket.IO avec CORS pour réseau local
const io = new Server(server, {
    cors: {
        origin: function(origin, callback) {
            console.log('🔍 Origine de la requête:', origin);
            // Accepter toutes les origines du réseau local
            callback(null, true);
        },
        methods: ['GET', 'POST'],
        credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling'],
    allowEIO3: true
});

const PORT = 3001;

// ==================== MEDIASOUP CONFIGURATION ====================

let worker;
const routers = new Map();
const transports = new Map();
const producers = new Map();
const consumers = new Map();

// Configuration Mediasoup
const mediasoupConfig = {
    worker: {
        rtcMinPort: 10000,
        rtcMaxPort: 10100,
        logLevel: 'warn',
        logTags: ['info', 'ice', 'dtls', 'rtp', 'srtp', 'rtcp']
    },
    router: {
        mediaCodecs: [
            {
                kind: 'audio',
                mimeType: 'audio/opus',
                clockRate: 48000,
                channels: 2
            },
            {
                kind: 'video',
                mimeType: 'video/VP8',
                clockRate: 90000,
                parameters: {
                    'x-google-start-bitrate': 1000
                }
            },
            {
                kind: 'video',
                mimeType: 'video/H264',
                clockRate: 90000,
                parameters: {
                    'packetization-mode': 1,
                    'profile-level-id': '42e01f',
                    'level-asymmetry-allowed': 1
                }
            }
        ]
    },
    webRtcTransport: {
        listenIps: [
            {
                ip: '0.0.0.0',
                announcedIp: getLocalIP() // Utiliser l'IP locale du serveur
            }
        ],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
        initialAvailableOutgoingBitrate: 1000000
    }
};

// Initialiser Mediasoup Worker
async function initMediasoup() {
    try {
        worker = await mediasoup.createWorker({
            rtcMinPort: mediasoupConfig.worker.rtcMinPort,
            rtcMaxPort: mediasoupConfig.worker.rtcMaxPort,
            logLevel: mediasoupConfig.worker.logLevel,
            logTags: mediasoupConfig.worker.logTags
        });

        console.log('✅ Mediasoup Worker créé, PID:', worker.pid);

        worker.on('died', () => {
            console.error('❌ Mediasoup Worker mort, redémarrage en 2s...');
            setTimeout(() => process.exit(1), 2000);
        });

        // Afficher les capacités RTC
        const rtpCapabilities = mediasoupConfig.router.mediaCodecs;
        console.log('📡 RTP Capabilities:', JSON.stringify(rtpCapabilities, null, 2));

    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation de Mediasoup:', error);
        process.exit(1);
    }
}

// Créer un router pour une room
async function getOrCreateRouter(roomId) {
    if (routers.has(roomId)) {
        return routers.get(roomId);
    }

    const router = await worker.createRouter({
        mediaCodecs: mediasoupConfig.router.mediaCodecs
    });

    routers.set(roomId, router);
    console.log('✅ Router créé pour la room:', roomId);
    return router;
}

// ==================== EXPRESS ROUTES ====================

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date(),
        mediasoup: worker ? 'running' : 'stopped'
    });
});

app.get('/get-connection-info', (req, res) => {
    const interfaces = os.networkInterfaces();
    let ip = 'localhost';
    
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                ip = iface.address;
                break;
            }
        }
    }
    
    res.json({
        ip: ip,
        port: PORT,
        protocol: 'https',
        secure: true
    });
});

// ==================== ROOMS MANAGEMENT ====================

const rooms = new Map();

function broadcastRoomsList() {
    const roomsList = Array.from(rooms.entries()).map(([id, room]) => {
        const activeUsers = room.users.filter(user => !user.disconnected);
        const disconnectedUsers = room.users.filter(user => user.disconnected).length;
        
        return {
            id,
            name: room.name,
            persistent: room.persistent === true,
            users: activeUsers.map(user => ({
                name: user.name,
                isCreator: user.isCreator,
                isStreaming: user.isStreaming,
                isScreenSharing: user.isScreenSharing
            })),
            disconnectedUsers: disconnectedUsers,
            totalUsers: room.users.length
        };
    });
    
    io.emit('roomsList', roomsList);
}

// ==================== SOCKET.IO EVENTS ====================

io.on('connection', (socket) => {
    console.log('✅ Client connecté:', socket.id);
    console.log('📡 Transport:', socket.conn.transport.name);
    console.log('🌐 Adresse IP:', socket.handshake.address);
    
    // Stocker le temps de connexion
    socket.data.connectedAt = Date.now();
    
    // Envoyer la liste des salons
    socket.emit('roomsList', Array.from(rooms.entries()).map(([id, room]) => {
        const activeUsers = room.users.filter(user => !user.disconnected);
        const disconnectedUsers = room.users.filter(user => user.disconnected).length;
        
        return {
            id,
            name: room.name,
            persistent: room.persistent === true,
            users: activeUsers.map(user => ({
                name: user.name,
                isCreator: user.isCreator,
                isStreaming: user.isStreaming,
                isScreenSharing: user.isScreenSharing
            })),
            disconnectedUsers: disconnectedUsers,
            totalUsers: room.users.length
        };
    }));

    socket.on('ping', (callback) => {
        if (typeof callback === 'function') {
            callback();
        }
    });

    // Obtenir des infos sur la connexion
    socket.on('getConnectionInfo', (callback) => {
        if (typeof callback === 'function') {
            callback({
                socketId: socket.id,
                transport: socket.conn.transport.name,
                address: socket.handshake.address,
                connected: socket.connected,
                rooms: Array.from(socket.rooms),
                serverTime: new Date().toISOString()
            });
        }
    });

    socket.on('error', (error) => {
        console.error('❌ Erreur socket pour', socket.id, ':', error);
        socket.emit('error', {
            message: 'Une erreur est survenue',
            code: 'SOCKET_ERROR',
            details: error.message
        });
    });

    // ==================== MEDIASOUP EVENTS ====================

    // Obtenir les RTP Capabilities du router
    socket.on('getRouterRtpCapabilities', async ({ roomId }, callback) => {
        try {
            const router = await getOrCreateRouter(roomId);
            callback({ rtpCapabilities: router.rtpCapabilities });
        } catch (error) {
            console.error('Erreur getRouterRtpCapabilities:', error);
            callback({ error: error.message });
        }
    });

    // Créer un WebRTC Transport (send ou recv)
    socket.on('createWebRtcTransport', async ({ roomId, sender }, callback) => {
        try {
            const router = await getOrCreateRouter(roomId);
            
            const transport = await router.createWebRtcTransport({
                listenIps: mediasoupConfig.webRtcTransport.listenIps,
                enableUdp: mediasoupConfig.webRtcTransport.enableUdp,
                enableTcp: mediasoupConfig.webRtcTransport.enableTcp,
                preferUdp: mediasoupConfig.webRtcTransport.preferUdp,
                initialAvailableOutgoingBitrate: mediasoupConfig.webRtcTransport.initialAvailableOutgoingBitrate
            });

            const transportId = transport.id;
            transports.set(transportId, { transport, roomId, sender });

            console.log(`✅ WebRTC Transport créé: ${transportId} (${sender ? 'send' : 'recv'})`);

            callback({
                id: transportId,
                iceParameters: transport.iceParameters,
                iceCandidates: transport.iceCandidates,
                dtlsParameters: transport.dtlsParameters
            });

        } catch (error) {
            console.error('Erreur createWebRtcTransport:', error);
            callback({ error: error.message });
        }
    });

    // Connecter le transport
    socket.on('connectTransport', async ({ transportId, dtlsParameters }, callback) => {
        try {
            const transportData = transports.get(transportId);
            if (!transportData) {
                throw new Error('Transport non trouvé');
            }

            await transportData.transport.connect({ dtlsParameters });
            console.log('✅ Transport connecté:', transportId);
            callback({ success: true });

        } catch (error) {
            console.error('Erreur connectTransport:', error);
            callback({ error: error.message });
        }
    });

    // Produire un média (audio/video)
    socket.on('produce', async ({ transportId, kind, rtpParameters }, callback) => {
        try {
            const transportData = transports.get(transportId);
            if (!transportData) {
                throw new Error('Transport non trouvé');
            }

            const producer = await transportData.transport.produce({
                kind,
                rtpParameters
            });

            const producerId = producer.id;
            producers.set(producerId, {
                producer,
                socketId: socket.id,
                roomId: transportData.roomId,
                kind
            });

            console.log(`✅ Producer créé: ${producerId} (${kind})`);

            // Notifier les autres participants
            socket.to(transportData.roomId).emit('newProducer', {
                producerId,
                userId: socket.id,
                kind
            });

            callback({ id: producerId });

        } catch (error) {
            console.error('Erreur produce:', error);
            callback({ error: error.message });
        }
    });

    // Consommer un média d'un autre participant
    socket.on('consume', async ({ transportId, producerId, rtpCapabilities }, callback) => {
        try {
            const transportData = transports.get(transportId);
            if (!transportData) {
                throw new Error('Transport non trouvé');
            }

            const producerData = producers.get(producerId);
            if (!producerData) {
                throw new Error('Producer non trouvé');
            }

            const router = await getOrCreateRouter(transportData.roomId);

            if (!router.canConsume({ producerId, rtpCapabilities })) {
                throw new Error('Cannot consume');
            }

            const consumer = await transportData.transport.consume({
                producerId,
                rtpCapabilities,
                paused: false
            });

            const consumerId = consumer.id;
            consumers.set(consumerId, {
                consumer,
                socketId: socket.id,
                roomId: transportData.roomId
            });

            console.log(`✅ Consumer créé: ${consumerId}`);

            callback({
                id: consumerId,
                producerId,
                kind: consumer.kind,
                rtpParameters: consumer.rtpParameters
            });

        } catch (error) {
            console.error('Erreur consume:', error);
            callback({ error: error.message });
        }
    });

    // Reprendre la consommation
    socket.on('resumeConsumer', async ({ consumerId }, callback) => {
        try {
            const consumerData = consumers.get(consumerId);
            if (!consumerData) {
                throw new Error('Consumer non trouvé');
            }

            await consumerData.consumer.resume();
            callback({ success: true });

        } catch (error) {
            console.error('Erreur resumeConsumer:', error);
            callback({ error: error.message });
        }
    });

    // Obtenir tous les producers d'une room
    socket.on('getProducers', ({ roomId }, callback) => {
        const roomProducers = [];
        
        for (const [producerId, data] of producers.entries()) {
            if (data.roomId === roomId && data.socketId !== socket.id) {
                roomProducers.push({
                    producerId,
                    userId: data.socketId,
                    kind: data.kind
                });
            }
        }

        callback({ producers: roomProducers });
    });

    // ==================== ROOM EVENTS ====================

    socket.on('checkRoom', ({ roomId }, callback) => {
        const exists = rooms.has(roomId);
        callback(exists);
    });

    socket.on('createRoom', async (data) => {
        const { roomName, userName, customRoomId } = data;
        const roomId = customRoomId || Math.random().toString(36).substring(7);
        
        if (rooms.has(roomId)) {
            socket.emit('roomError', { 
                error: 'ID_ALREADY_EXISTS', 
                message: 'Cet ID de réunion est déjà utilisé.' 
            });
            return;
        }
        
        const roomNameExists = Array.from(rooms.values()).some(room => room.name === roomName);
        if (roomNameExists) {
            socket.emit('roomError', { 
                error: 'NAME_ALREADY_EXISTS', 
                message: 'Ce nom de réunion est déjà utilisé.' 
            });
            return;
        }
        
        // Créer le router pour cette room
        await getOrCreateRouter(roomId);
        
        rooms.set(roomId, {
            name: roomName,
            persistent: true,
            createdAt: new Date().toISOString(),
            users: [{
                id: socket.id,
                name: userName,
                isCreator: true,
                isStreaming: false,
                isScreenSharing: false
            }]
        });

        socket.join(roomId);
        socket.emit('roomCreated', { roomId, roomName });
        broadcastRoomsList();
    });

    socket.on('joinRoom', (data, callback) => {
        const { roomId, userName } = data;
        const room = rooms.get(roomId);

        if (room) {
            const existingUserIndex = room.users.findIndex(user => 
                user.name === userName && user.disconnected === true);
            
            const nameIsTaken = room.users.some(user => 
                user.name === userName && user.disconnected !== true && 
                (existingUserIndex === -1 || user.id !== room.users[existingUserIndex].id));
            
            if (nameIsTaken) {
                callback(false, { 
                    error: 'NAME_ALREADY_TAKEN', 
                    message: 'Ce nom est déjà utilisé dans cette réunion.' 
                });
                return;
            }
            
            if (existingUserIndex !== -1) {
                room.users[existingUserIndex].id = socket.id;
                room.users[existingUserIndex].disconnected = false;
                socket.join(roomId);
                
                io.to(roomId).emit('userJoined', { 
                    userName, 
                    userId: socket.id,
                    isCreator: room.users[existingUserIndex].isCreator === true,
                    rejoining: true
                });
            } else {
                const isFirstUser = room.users.length === 0;
                room.users.push({
                    id: socket.id,
                    name: userName,
                    isCreator: isFirstUser,
                    isStreaming: false,
                    isScreenSharing: false
                });
                socket.join(roomId);
                
                io.to(roomId).emit('userJoined', { 
                    userName, 
                    userId: socket.id,
                    isCreator: isFirstUser
                });
            }
            
            io.to(roomId).emit('getUsers', room.users.filter(u => !u.disconnected));
            
            const userInfo = room.users.find(user => user.id === socket.id);
            callback(true, { isCreator: userInfo && userInfo.isCreator === true });
            broadcastRoomsList();
        } else {
            callback(false, { message: 'Salon non trouvé' });
        }
    });

    socket.on('leaveRoom', (data) => {
        const { roomId, userName } = data;
        cleanupUserResources(socket.id, roomId);
        
        const room = rooms.get(roomId);
        if (room) {
            const userIndex = room.users.findIndex(user => user.id === socket.id);
            if (userIndex !== -1) {
                room.users.splice(userIndex, 1);
                socket.leave(roomId);
                io.to(roomId).emit('userLeft', { userName });
                
                if (room.users.length === 0) {
                    rooms.delete(roomId);
                    // Nettoyer le router
                    const router = routers.get(roomId);
                    if (router) {
                        router.close();
                        routers.delete(roomId);
                    }
                }
                
                io.to(roomId).emit('getUsers', room.users.filter(u => !u.disconnected));
                broadcastRoomsList();
            }
        }
    });

    socket.on('endMeeting', (data) => {
        const { roomId, userName } = data;
        const room = rooms.get(roomId);
        
        if (room) {
            const user = room.users.find(u => u.id === socket.id);
            const isCreator = user && user.isCreator;
            
            if (isCreator) {
                io.to(roomId).emit('meetingEnded', { 
                    message: `La réunion a été arrêtée par ${userName}` 
                });
                
                // Nettoyer toutes les ressources de la room
                cleanupRoomResources(roomId);
                rooms.delete(roomId);
                
                // Nettoyer le router
                const router = routers.get(roomId);
                if (router) {
                    router.close();
                    routers.delete(roomId);
                }
                
                broadcastRoomsList();
            }
        }
    });

    // Chat
    socket.on('message', (data) => {
        const { roomId, message } = data;
        const room = rooms.get(roomId);
        if (room) {
            const user = room.users.find(u => u.id === socket.id);
            if (user) {
                io.to(roomId).emit('message', {
                    userName: user.name,
                    message
                });
            }
        }
    });

    socket.on('getUsers', (data, callback) => {
        const { roomId } = data;
        const room = rooms.get(roomId);
        if (typeof callback === 'function') {
            if (room) {
                callback(room.users.filter(u => !u.disconnected));
            } else {
                callback([]);
            }
        }
    });

    // Stream events
    socket.on('startStream', (data) => {
        const { roomId } = data;
        const room = rooms.get(roomId);
        if (room) {
            const user = room.users.find(u => u.id === socket.id);
            if (user) {
                user.isStreaming = true;
                io.to(roomId).emit('streamStarted', { userName: user.name, userId: user.id });
                broadcastRoomsList();
            }
        }
    });

    socket.on('stopStream', (data) => {
        const { roomId } = data;
        const room = rooms.get(roomId);
        if (room) {
            const user = room.users.find(u => u.id === socket.id);
            if (user) {
                user.isStreaming = false;
                io.to(roomId).emit('streamStopped', { userName: user.name });
                broadcastRoomsList();
            }
        }
    });

    socket.on('startScreen', (data) => {
        const { roomId } = data;
        const room = rooms.get(roomId);
        if (room) {
            const user = room.users.find(u => u.id === socket.id);
            if (user) {
                user.isScreenSharing = true;
                io.to(roomId).emit('screenStarted', { userName: user.name });
                broadcastRoomsList();
            }
        }
    });

    socket.on('stopScreen', (data) => {
        const { roomId } = data;
        const room = rooms.get(roomId);
        if (room) {
            const user = room.users.find(u => u.id === socket.id);
            if (user) {
                user.isScreenSharing = false;
                io.to(roomId).emit('screenStopped', { userName: user.name });
                broadcastRoomsList();
            }
        }
    });

    // Déconnexion
    socket.on('disconnect', (reason) => {
        console.log('❌ Client déconnecté:', socket.id);
        console.log('📊 Raison:', reason);
        
        // Calculer la durée de connexion de manière sûre
        const connectedAt = socket.data.connectedAt;
        if (connectedAt && !isNaN(connectedAt)) {
            const duration = Math.round((Date.now() - connectedAt) / 1000);
            console.log('⏱️ Durée de connexion:', duration, 's');
        }
        
        // Nettoyer les ressources Mediasoup
        cleanupUserResources(socket.id);
        
        rooms.forEach((room, roomId) => {
            const userIndex = room.users.findIndex(user => user.id === socket.id);
            if (userIndex !== -1) {
                const userName = room.users[userIndex].name;
                const isCreator = room.users[userIndex].isCreator === true;
                
                if (isCreator) {
                    room.users[userIndex].disconnected = true;
                    io.to(roomId).emit('adminDisconnected', { 
                        message: `L'administrateur ${userName} s'est déconnecté.` 
                    });
                } else {
                    room.users.splice(userIndex, 1);
                    io.to(roomId).emit('userLeft', { userName });
                    
                    if (room.users.length === 0) {
                        rooms.delete(roomId);
                        const router = routers.get(roomId);
                        if (router) {
                            router.close();
                            routers.delete(roomId);
                        }
                    }
                }
                
                broadcastRoomsList();
            }
        });
    });
});

// ==================== CLEANUP FUNCTIONS ====================

function cleanupUserResources(socketId, roomId = null) {
    // Nettoyer les producers
    for (const [producerId, data] of producers.entries()) {
        if (data.socketId === socketId && (!roomId || data.roomId === roomId)) {
            data.producer.close();
            producers.delete(producerId);
            console.log(`🧹 Producer nettoyé: ${producerId}`);
        }
    }

    // Nettoyer les consumers
    for (const [consumerId, data] of consumers.entries()) {
        if (data.socketId === socketId && (!roomId || data.roomId === roomId)) {
            data.consumer.close();
            consumers.delete(consumerId);
            console.log(`🧹 Consumer nettoyé: ${consumerId}`);
        }
    }

    // Nettoyer les transports
    for (const [transportId, data] of transports.entries()) {
        if (data.transport && (!roomId || data.roomId === roomId)) {
            // Vérifier si le transport appartient à cet utilisateur
            let belongsToUser = false;
            
            for (const [_, producerData] of producers.entries()) {
                if (producerData.socketId === socketId) {
                    belongsToUser = true;
                    break;
                }
            }
            
            if (!belongsToUser) {
                for (const [_, consumerData] of consumers.entries()) {
                    if (consumerData.socketId === socketId) {
                        belongsToUser = true;
                        break;
                    }
                }
            }
            
            if (belongsToUser) {
                data.transport.close();
                transports.delete(transportId);
                console.log(`🧹 Transport nettoyé: ${transportId}`);
            }
        }
    }
}

function cleanupRoomResources(roomId) {
    // Nettoyer tous les producers de la room
    for (const [producerId, data] of producers.entries()) {
        if (data.roomId === roomId) {
            data.producer.close();
            producers.delete(producerId);
        }
    }

    // Nettoyer tous les consumers de la room
    for (const [consumerId, data] of consumers.entries()) {
        if (data.roomId === roomId) {
            data.consumer.close();
            consumers.delete(consumerId);
        }
    }

    // Nettoyer tous les transports de la room
    for (const [transportId, data] of transports.entries()) {
        if (data.roomId === roomId) {
            data.transport.close();
            transports.delete(transportId);
        }
    }
}

// ==================== SERVER START ====================

(async () => {
    await initMediasoup();
    
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Serveur Socket.IO + Mediasoup démarré sur https://0.0.0.0:${PORT}`);
        console.log(`📡 Accessible via: https://${SERVER_IP}:${PORT}`);
        console.log(`✅ Accepte les connexions depuis tout le réseau local`);
        console.log(`📊 Architecture: SFU (Selective Forwarding Unit)`);
        console.log(`🎯 Capacité: Jusqu'à 50+ participants simultanés`);
        console.log(`\n💡 Pour se connecter depuis d'autres appareils:`);
        console.log(`   1. Sur le frontend, utilisez: https://${SERVER_IP}:3001`);
        console.log(`   2. Acceptez le certificat SSL sur chaque appareil`);
        console.log(`   3. L'application frontend doit être sur: http://${SERVER_IP}:3000\n`);
    });

    server.on('error', (e) => {
        if (e.code === 'EADDRINUSE') {
            console.error(`❌ Le port ${PORT} est déjà utilisé`);
        } else {
            console.error('❌ Erreur serveur:', e);
        }
        process.exit(1);
    });
})();