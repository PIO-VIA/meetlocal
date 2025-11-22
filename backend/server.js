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
            // Priorité : IPv4, non-interne, non-loopback
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '0.0.0.0'; // Fallback
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

// Configuration Mediasoup - CORRIGÉE POUR RÉSEAU LOCAL
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
    // CORRECTION CRITIQUE : IP annoncée doit être l'IP locale du serveur
    webRtcTransport: {
        listenIps: [
            {
                ip: '0.0.0.0', // Écouter sur toutes les interfaces
                announcedIp: SERVER_IP // Annoncer l'IP locale réelle
            }
        ],
        enableUdp: true,
        enableTcp: true,
        preferUdp: true,
        initialAvailableOutgoingBitrate: 1000000,
        minimumAvailableOutgoingBitrate: 600000,
        maxSctpMessageSize: 262144,
        maxIncomingBitrate: 1500000
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

        console.log('📡 Configuration réseau:');
        console.log('   - Listen IP: 0.0.0.0');
        console.log(`   - Announced IP: ${SERVER_IP}`);
        console.log(`   - RTC Ports: ${mediasoupConfig.worker.rtcMinPort}-${mediasoupConfig.worker.rtcMaxPort}`);

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
        mediasoup: worker ? 'running' : 'stopped',
        serverIp: SERVER_IP,
        announcedIp: mediasoupConfig.webRtcTransport.listenIps[0].announcedIp
    });
});

app.get('/get-connection-info', (req, res) => {
    res.json({
        ip: SERVER_IP,
        port: PORT,
        protocol: 'https',
        secure: true,
        mediasoup: {
            announcedIp: mediasoupConfig.webRtcTransport.listenIps[0].announcedIp,
            rtcMinPort: mediasoupConfig.worker.rtcMinPort,
            rtcMaxPort: mediasoupConfig.worker.rtcMaxPort
        }
    });
});

// ==================== ROOMS MANAGEMENT ====================

const rooms = new Map();
const chatHistory = new Map(); // Stocker l'historique des messages par room

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

    socket.on('getConnectionInfo', (callback) => {
        if (typeof callback === 'function') {
            callback({
                socketId: socket.id,
                transport: socket.conn.transport.name,
                address: socket.handshake.address,
                connected: socket.connected,
                rooms: Array.from(socket.rooms),
                serverTime: new Date().toISOString(),
                serverIp: SERVER_IP,
                announcedIp: mediasoupConfig.webRtcTransport.listenIps[0].announcedIp
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

    socket.on('getRouterRtpCapabilities', async ({ roomId }, callback) => {
        try {
            const router = await getOrCreateRouter(roomId);
            callback({ rtpCapabilities: router.rtpCapabilities });
        } catch (error) {
            console.error('Erreur getRouterRtpCapabilities:', error);
            callback({ error: error.message });
        }
    });

    socket.on('createWebRtcTransport', async ({ roomId, sender }, callback) => {
        try {
            const router = await getOrCreateRouter(roomId);
            
            console.log(`📤 Création WebRTC Transport pour ${socket.id} (${sender ? 'send' : 'recv'})`);
            console.log(`   IP annoncée: ${mediasoupConfig.webRtcTransport.listenIps[0].announcedIp}`);
            
            const transport = await router.createWebRtcTransport({
                listenIps: mediasoupConfig.webRtcTransport.listenIps,
                enableUdp: mediasoupConfig.webRtcTransport.enableUdp,
                enableTcp: mediasoupConfig.webRtcTransport.enableTcp,
                preferUdp: mediasoupConfig.webRtcTransport.preferUdp,
                initialAvailableOutgoingBitrate: mediasoupConfig.webRtcTransport.initialAvailableOutgoingBitrate
            });

            const transportId = transport.id;
            transports.set(transportId, { transport, roomId, sender, socketId: socket.id });

            console.log(`✅ WebRTC Transport créé: ${transportId}`);
            console.log(`   ICE Candidates:`, transport.iceCandidates.length);

            callback({
                id: transportId,
                iceParameters: transport.iceParameters,
                iceCandidates: transport.iceCandidates,
                dtlsParameters: transport.dtlsParameters
            });

        } catch (error) {
            console.error('❌ Erreur createWebRtcTransport:', error);
            callback({ error: error.message });
        }
    });

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
            console.error('❌ Erreur connectTransport:', error);
            callback({ error: error.message });
        }
    });

    socket.on('produce', async ({ transportId, kind, rtpParameters, appData }, callback) => {
        try {
            const transportData = transports.get(transportId);
            if (!transportData) {
                throw new Error('Transport non trouvé');
            }

            const producer = await transportData.transport.produce({
                kind,
                rtpParameters,
                appData
            });

            const producerId = producer.id;
            producers.set(producerId, {
                producer,
                socketId: socket.id,
                roomId: transportData.roomId,
                kind,
                appData
            });

            console.log(`✅ Producer créé: ${producerId} (${kind})`, appData);

            socket.to(transportData.roomId).emit('newProducer', {
                producerId,
                userId: socket.id,
                kind,
                appData
            });

            callback({ id: producerId });

        } catch (error) {
            console.error('❌ Erreur produce:', error);
            callback({ error: error.message });
        }
    });

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
                paused: false,
                appData: producerData.appData
            });

            const consumerId = consumer.id;
            consumers.set(consumerId, {
                consumer,
                socketId: socket.id,
                roomId: transportData.roomId
            });

            console.log(`✅ Consumer créé: ${consumerId}`, producerData.appData);

            callback({
                id: consumerId,
                producerId,
                kind: consumer.kind,
                rtpParameters: consumer.rtpParameters,
                appData: producerData.appData
            });

        } catch (error) {
            console.error('❌ Erreur consume:', error);
            callback({ error: error.message });
        }
    });

    socket.on('resumeConsumer', async ({ consumerId }, callback) => {
        try {
            const consumerData = consumers.get(consumerId);
            if (!consumerData) {
                throw new Error('Consumer non trouvé');
            }

            await consumerData.consumer.resume();
            callback({ success: true });

        } catch (error) {
            console.error('❌ Erreur resumeConsumer:', error);
            callback({ error: error.message });
        }
    });

    socket.on('getProducers', ({ roomId }, callback) => {
        const roomProducers = [];
        
        for (const [producerId, data] of producers.entries()) {
            if (data.roomId === roomId && data.socketId !== socket.id) {
                roomProducers.push({
                    producerId,
                    userId: data.socketId,
                    kind: data.kind,
                    appData: data.appData
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

        const room = rooms.get(roomId);
        if (room) {
            const userIndex = room.users.findIndex(user => user.id === socket.id);
            if (userIndex !== -1) {
                // Nettoyer les ressources AVANT de retirer l'utilisateur
                cleanupUserResources(socket.id, roomId);

                // Notifier les autres que cet utilisateur a arrêté son partage d'écran s'il était actif
                const user = room.users[userIndex];
                if (user.isScreenSharing) {
                    io.to(roomId).emit('screenStopped', { userName: user.name, userId: socket.id });
                }

                room.users.splice(userIndex, 1);
                socket.leave(roomId);
                io.to(roomId).emit('userLeft', { userName, userId: socket.id });

                if (room.users.length === 0) {
                    rooms.delete(roomId);
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
                
                cleanupRoomResources(roomId);
                rooms.delete(roomId);
                
                const router = routers.get(roomId);
                if (router) {
                    router.close();
                    routers.delete(roomId);
                }
                
                broadcastRoomsList();
            }
        }
    });

    socket.on('message', (data, callback) => {
        const { roomId, message, timestamp } = data;
        const room = rooms.get(roomId);
        if (room) {
            const user = room.users.find(u => u.id === socket.id);
            if (user) {
                const messageData = {
                    id: `${socket.id}-${Date.now()}`,
                    userName: user.name,
                    message,
                    timestamp: timestamp || new Date().toISOString()
                };

                // Sauvegarder dans l'historique
                if (!chatHistory.has(roomId)) {
                    chatHistory.set(roomId, []);
                }
                chatHistory.get(roomId).push(messageData);

                // Limiter l'historique à 200 messages
                if (chatHistory.get(roomId).length > 200) {
                    chatHistory.get(roomId).shift();
                }

                // Diffuser le message à tous les participants
                io.to(roomId).emit('message', messageData);

                // Confirmer la réception
                if (typeof callback === 'function') {
                    callback({ success: true });
                }
            }
        } else {
            if (typeof callback === 'function') {
                callback({ success: false, error: 'Room not found' });
            }
        }
    });

    socket.on('getChatHistory', ({ roomId }) => {
        const history = chatHistory.get(roomId) || [];
        socket.emit('chatHistory', history);
    });

    socket.on('getUsers', (data, callback) => {
        const { roomId } = data;
        const room = rooms.get(roomId);
        const activeUsers = room ? room.users.filter(u => !u.disconnected) : [];

        // Envoyer via callback si fourni
        if (typeof callback === 'function') {
            callback(activeUsers);
        }

        // Émettre aussi l'événement pour les composants qui écoutent
        socket.emit('getUsers', activeUsers);
    });

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

    socket.on('disconnect', (reason) => {
        console.log('❌ Client déconnecté:', socket.id);
        console.log('📊 Raison:', reason);

        const connectedAt = socket.data.connectedAt;
        if (connectedAt && !isNaN(connectedAt)) {
            const duration = Math.round((Date.now() - connectedAt) / 1000);
            console.log('⏱️ Durée de connexion:', duration, 's');
        }

        rooms.forEach((room, roomId) => {
            const userIndex = room.users.findIndex(user => user.id === socket.id);
            if (userIndex !== -1) {
                const userName = room.users[userIndex].name;
                const isCreator = room.users[userIndex].isCreator === true;
                const wasScreenSharing = room.users[userIndex].isScreenSharing === true;

                // Nettoyer les ressources média de cet utilisateur
                cleanupUserResources(socket.id);

                // Notifier que le partage d'écran s'arrête si actif
                if (wasScreenSharing) {
                    io.to(roomId).emit('screenStopped', { userName, userId: socket.id });
                }

                if (isCreator) {
                    room.users[userIndex].disconnected = true;
                    io.to(roomId).emit('adminDisconnected', {
                        message: `L'administrateur ${userName} s'est déconnecté.`
                    });
                } else {
                    room.users.splice(userIndex, 1);
                    io.to(roomId).emit('userLeft', { userName, userId: socket.id });

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
    for (const [producerId, data] of producers.entries()) {
        if (data.socketId === socketId && (!roomId || data.roomId === roomId)) {
            data.producer.close();
            producers.delete(producerId);
            console.log(`🧹 Producer nettoyé: ${producerId}`);
        }
    }

    for (const [consumerId, data] of consumers.entries()) {
        if (data.socketId === socketId && (!roomId || data.roomId === roomId)) {
            data.consumer.close();
            consumers.delete(consumerId);
            console.log(`🧹 Consumer nettoyé: ${consumerId}`);
        }
    }

    for (const [transportId, data] of transports.entries()) {
        if (data.socketId === socketId && (!roomId || data.roomId === roomId)) {
            data.transport.close();
            transports.delete(transportId);
            console.log(`🧹 Transport nettoyé: ${transportId}`);
        }
    }
}

function cleanupRoomResources(roomId) {
    for (const [producerId, data] of producers.entries()) {
        if (data.roomId === roomId) {
            data.producer.close();
            producers.delete(producerId);
        }
    }

    for (const [consumerId, data] of consumers.entries()) {
        if (data.roomId === roomId) {
            data.consumer.close();
            consumers.delete(consumerId);
        }
    }

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
        console.log(`\n💡 Configuration réseau pour les clients:`);
        console.log(`   Backend URL: https://${SERVER_IP}:${PORT}`);
        console.log(`   IP annoncée: ${SERVER_IP}`);
        console.log(`   Ports RTC: ${mediasoupConfig.worker.rtcMinPort}-${mediasoupConfig.worker.rtcMaxPort}`);
        console.log(`\n⚠️  IMPORTANT:`);
        console.log(`   1. Acceptez le certificat SSL sur: https://${SERVER_IP}:${PORT}/health`);
        console.log(`   2. Le pare-feu doit autoriser les ports ${mediasoupConfig.worker.rtcMinPort}-${mediasoupConfig.worker.rtcMaxPort}`);
        console.log(`   3. Assurez-vous que tous les appareils sont sur le même réseau local\n`);
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