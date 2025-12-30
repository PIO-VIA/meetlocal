/**
 * BACKEND - Serveur Socket.IO + Mediasoup pour LOCAL MEET
 * Architecture SFU (Selective Forwarding Unit) Multi-Worker
 */

const express = require('express');
const app = express();
const fs = require('fs');
const path = require('path');
const https = require('https');
const { Server } = require('socket.io');
const multer = require('multer');

// Modules Mediasoup
const config = require('./mediasoup/config');
const workerManager = require('./mediasoup/WorkerManager');
const roomManager = require('./mediasoup/RoomManager');

// Configuration de Multer pour l'upload de fichiers
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // Limite à 50 MB
    }
});

// Configuration SSL
const sslOptions = {
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
const server = https.createServer(sslOptions, app);

const SERVER_IP = config.serverIp;
console.log(`📡 Adresse IP du serveur: ${SERVER_IP}`);

// Configuration Socket.IO
const io = new Server(server, {
    cors: {
        origin: function (origin, callback) {
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
console.log("IO CREATED");

const PORT = 3001;

// Écouter les crashs de workers pour nettoyer les rooms
workerManager.on('workerDied', (pid) => {
    roomManager.handleWorkerDeath(pid, io);
});

// ==================== EXPRESS ROUTES ====================

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

app.use(express.json());

app.get('/health', (req, res) => {
    const totalWorkers = workerManager.workers.length;
    res.json({
        status: 'OK',
        timestamp: new Date(),
        workers: totalWorkers,
        serverIp: SERVER_IP,
        announcedIp: config.webRtcTransport.listenIps[0].announcedIp
    });
});

app.get('/get-connection-info', (req, res) => {
    res.json({
        ip: SERVER_IP,
        port: PORT,
        protocol: 'https',
        secure: true,
        mediasoup: {
            announcedIp: config.webRtcTransport.listenIps[0].announcedIp,
            rtcMinPort: config.worker.rtcMinPort,
            rtcMaxPort: config.worker.rtcMaxPort
        }
    });
});

app.post('/upload-file', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'Aucun fichier fourni' });
        }
        const fileInfo = {
            filename: req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype,
            url: `/download-file/${req.file.filename}`
        };
        console.log('📎 Fichier uploadé:', fileInfo.originalName);
        res.json({ success: true, file: fileInfo });
    } catch (error) {
        console.error('❌ Erreur upload fichier:', error);
        res.status(500).json({ error: 'Erreur lors de l\'upload' });
    }
});

app.get('/download-file/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(uploadDir, filename);
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Fichier non trouvé' });
    }
    const originalName = filename.split('-').slice(2).join('-');
    res.download(filePath, originalName);
});

// ==================== HELPER ====================

function broadcastRoomsList() {
    const roomsList = roomManager.getAllRooms().map((room) => {
        const activeUsers = room.users.filter(user => !user.disconnected);
        const disconnectedUsers = room.users.filter(user => user.disconnected).length;

        return {
            id: room.id,
            name: room.name,
            persistent: room.persistent === true,
            users: activeUsers.map(user => ({
                name: user.name,
                isCreator: user.isCreator,
                isStreaming: user.isStreaming,
                isScreenSharing: user.isScreenSharing,
                isHandRaised: user.isHandRaised || false
            })),
            disconnectedUsers: disconnectedUsers,
            totalUsers: room.users.length
        };
    });

    io.emit('roomsList', roomsList);
}

// ==================== SOCKET.IO EVENTS ====================

io.on('connection', (socket) => {
    console.log("SOCKET CONNECTED", socket.id);
    console.log('🔌 NEW SOCKET CONNECTED:', socket.id);
    console.log('✅ Client connecté logic start:', socket.id);
    socket.data.connectedAt = Date.now();

    // Initial Rooms List
    const roomsList = roomManager.getAllRooms().map((room) => {
        const activeUsers = room.users.filter(user => !user.disconnected);
        return {
            id: room.id,
            name: room.name,
            persistent: room.persistent,
            users: activeUsers.map(user => ({ name: user.name })), // lite version
            totalUsers: room.users.length
        };
    });
    socket.emit('roomsList', roomsList);

    // --- Socket Core Events ---

    socket.on('getConnectionInfo', (callback) => {
        if (typeof callback === 'function') {
            callback({
                socketId: socket.id,
                serverIp: SERVER_IP,
                announcedIp: config.webRtcTransport.listenIps[0].announcedIp
            });
        }
    });

    // --- Mediasoup Events ---

    socket.on('getRouterRtpCapabilities', ({ roomId }, callback) => {
        try {
            const room = roomManager.getRoom(roomId);
            if (!room) {
                callback({ error: 'Room not found' });
                return;
            }
            callback({ rtpCapabilities: room.router.rtpCapabilities });
        } catch (error) {
            console.error('Erreur getRouterRtpCapabilities:', error);
            callback({ error: error.message });
        }
    });

    socket.on('createWebRtcTransport', async ({ roomId, sender }, callback) => {
        try {
            const room = roomManager.getRoom(roomId);
            if (!room) {
                throw new Error('Room not found');
            }

            console.log(`📤 Création WebRTC Transport pour ${socket.id} (Room ${roomId})`);

            const transport = await room.router.createWebRtcTransport({
                listenIps: config.webRtcTransport.listenIps,
                enableUdp: config.webRtcTransport.enableUdp,
                enableTcp: config.webRtcTransport.enableTcp,
                preferUdp: config.webRtcTransport.preferUdp,
                initialAvailableOutgoingBitrate: config.webRtcTransport.initialAvailableOutgoingBitrate
            });

            roomManager.addTransport(roomId, transport);

            callback({
                id: transport.id,
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
            const room = roomManager.getRoomForTransport(transportId);
            if (!room) throw new Error('Transport/Room not found');

            const transportData = room.transports.get(transportId);
            await transportData.transport.connect({ dtlsParameters });
            callback({ success: true });
        } catch (error) {
            console.error('❌ Erreur connectTransport:', error);
            callback({ error: error.message });
        }
    });

    socket.on('produce', async ({ transportId, kind, rtpParameters, appData }, callback) => {
        try {
            const room = roomManager.getRoomForTransport(transportId);
            if (!room) throw new Error('Transport/Room not found');

            const transportData = room.transports.get(transportId);
            const producer = await transportData.transport.produce({
                kind,
                rtpParameters,
                appData
            });

            const producerId = producer.id;
            const producerData = {
                producer,
                socketId: socket.id,
                roomId: room.id,
                kind,
                appData
            };

            roomManager.addProducer(room.id, producerData);

            console.log(`✅ Producer créé: ${producerId} (${kind})`);

            producer.on('transportclose', () => {
                roomManager.closeProducer(producerId);
            });

            socket.to(room.id).emit('newProducer', {
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
            const room = roomManager.getRoomForTransport(transportId);
            if (!room) throw new Error('Transport/Room not found');

            const producerRoom = roomManager.getRoomForProducer(producerId);
            if (!producerRoom) throw new Error('Producer not found');

            // Verification: Consumer/Producer must be on same room (implicitly handled by architecture usually, but explicit check good)
            if (room.id !== producerRoom.id) throw new Error('Cross-room consumption not supported');

            const producerData = producerRoom.producers.get(producerId);

            if (!room.router.canConsume({ producerId, rtpCapabilities })) {
                throw new Error('Cannot consume');
            }

            const transportData = room.transports.get(transportId);
            const consumer = await transportData.transport.consume({
                producerId,
                rtpCapabilities,
                paused: false,
                appData: producerData.appData
            });

            const consumerId = consumer.id;
            roomManager.addConsumer(room.id, {
                consumer,
                socketId: socket.id,
                roomId: room.id
            });

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
            const room = roomManager.getRoomForConsumer(consumerId);
            if (!room) throw new Error('Consumer not found');
            const data = room.consumers.get(consumerId);
            await data.consumer.resume();
            callback({ success: true });
        } catch (error) {
            callback({ error: error.message });
        }
    });

    socket.on('getProducers', ({ roomId }, callback) => {
        const room = roomManager.getRoom(roomId);
        const roomProducers = [];
        if (room) {
            for (const [producerId, data] of room.producers.entries()) {
                if (data.socketId !== socket.id) {
                    roomProducers.push({
                        producerId,
                        userId: data.socketId,
                        kind: data.kind,
                        appData: data.appData
                    });
                }
            }
        }
        callback({ producers: roomProducers });
    });

    // --- Room Logic Events ---

    socket.on('checkRoom', ({ roomId }, callback) => {
        callback(roomManager.hasRoom(roomId));
    });

    socket.on('createRoom', async (data) => {
        const { roomName, userName, customRoomId } = data;
        const roomId = customRoomId || Math.random().toString(36).substring(7);

        if (roomManager.hasRoom(roomId)) {
            socket.emit('roomError', { error: 'ID_ALREADY_EXISTS', message: 'ID déjà utilisé.' });
            return;
        }

        try {
            const room = await roomManager.createRoom(roomId, roomName, userName, socket.id);
            socket.join(roomId);
            socket.emit('roomCreated', { roomId, roomName });
            broadcastRoomsList();
        } catch (e) {
            console.error('Error creating room:', e);
            socket.emit('roomError', { error: 'CREATE_FAILED', message: 'Erreur création salon' });
        }
    });

    socket.on('joinRoom', (data, callback) => {
        const { roomId, userName } = data;
        const room = roomManager.getRoom(roomId);

        if (room) {
            const existingUserIndex = room.users.findIndex(user => user.name === userName && user.disconnected);
            const nameIsTaken = room.users.some(user => user.name === userName && !user.disconnected &&
                (existingUserIndex === -1 || user.id !== room.users[existingUserIndex].id));

            if (nameIsTaken) {
                callback(false, { error: 'NAME_ALREADY_TAKEN' });
                return;
            }

            if (existingUserIndex !== -1) {
                // Rejoin
                room.users[existingUserIndex].id = socket.id;
                room.users[existingUserIndex].disconnected = false;
                socket.join(roomId);
                io.to(roomId).emit('userJoined', {
                    userName, userId: socket.id, isCreator: room.users[existingUserIndex].isCreator, rejoining: true
                });
            } else {
                // New Join
                room.users.push({
                    id: socket.id,
                    name: userName,
                    isCreator: false,
                    isStreaming: false,
                    isScreenSharing: false
                });
                socket.join(roomId);
                io.to(roomId).emit('userJoined', { userName, userId: socket.id, isCreator: false });
            }

            callback(true, { isCreator: room.users.find(u => u.id === socket.id)?.isCreator });
            broadcastRoomsList();
        } else {
            callback(false, { message: 'Salon non trouvé' });
        }
    });

    socket.on('leaveRoom', ({ roomId, userName }) => {
        const room = roomManager.getRoom(roomId);
        if (room) {
            const userIndex = room.users.findIndex(u => u.id === socket.id);
            if (userIndex !== -1) {
                // Cleanup Media for User
                cleanupUserMedia(socket.id, room);

                const user = room.users[userIndex];
                if (user.isScreenSharing) {
                    io.to(roomId).emit('screenStopped', { userName, userId: socket.id });
                }

                room.users.splice(userIndex, 1);
                socket.leave(roomId);
                io.to(roomId).emit('userLeft', { userName, userId: socket.id });

                if (room.users.length === 0) {
                    roomManager.removeRoom(roomId);
                }

                broadcastRoomsList();
            }
        }
    });

    socket.on('endMeeting', ({ roomId, userName }) => {
        const room = roomManager.getRoom(roomId);
        if (room) {
            const user = room.users.find(u => u.id === socket.id);
            if (user && user.isCreator) {
                io.to(roomId).emit('meetingEnded', { message: `La réunion a été arrêtée par ${userName}` });
                roomManager.removeRoom(roomId);
                broadcastRoomsList();
            }
        }
    });

    socket.on('message', ({ roomId, message, timestamp, file }, callback) => {
        const room = roomManager.getRoom(roomId);
        if (room) {
            const user = room.users.find(u => u.id === socket.id);
            if (user) {
                const msgData = {
                    id: `${socket.id}-${Date.now()}`,
                    userName: user.name,
                    message,
                    timestamp: timestamp || new Date().toISOString(),
                    file: file || null
                };

                room.chatHistory = room.chatHistory || [];
                room.chatHistory.push(msgData);
                if (room.chatHistory.length > 200) room.chatHistory.shift();

                io.to(roomId).emit('message', msgData);
                if (callback) callback({ success: true });
            }
        }
    });

    socket.on('getChatHistory', ({ roomId }) => {
        const room = roomManager.getRoom(roomId);
        if (room) {
            socket.emit('chatHistory', room.chatHistory || []);
        }
    });

    socket.on('getUsers', ({ roomId }, callback) => {
        const room = roomManager.getRoom(roomId);
        const activeUsers = room ? room.users.filter(u => !u.disconnected) : [];

        // Envoyer via callback si fourni
        if (typeof callback === 'function') {
            callback(activeUsers);
        }

        // Émettre aussi l'événement pour les composants qui écoutent
        socket.emit('getUsers', activeUsers);
    });

    socket.on('startStream', ({ roomId }) => {
        const room = roomManager.getRoom(roomId);
        if (room) {
            const user = room.users.find(u => u.id === socket.id);
            if (user) {
                user.isStreaming = true;
                io.to(roomId).emit('streamStarted', { userName: user.name, userId: user.id });
                broadcastRoomsList();
            }
        }
    });

    socket.on('stopStream', ({ roomId }) => {
        const room = roomManager.getRoom(roomId);
        if (room) {
            const user = room.users.find(u => u.id === socket.id);
            if (user) {
                user.isStreaming = false;
                io.to(roomId).emit('streamStopped', { userName: user.name, userId: socket.id });

                // Stop VIDEO Producers only (not Screen)
                for (const [pid, data] of room.producers.entries()) {
                    if (data.socketId === socket.id && data.appData?.type !== 'screen') {
                        roomManager.closeProducer(pid);
                        io.to(roomId).emit('producerClosed', { producerId: pid, userId: socket.id, appData: data.appData });
                    }
                }
                broadcastRoomsList();
            }
        }
    });

    socket.on('startScreen', ({ roomId }) => {
        const room = roomManager.getRoom(roomId);
        if (room) {
            const user = room.users.find(u => u.id === socket.id);
            if (user) {
                user.isScreenSharing = true;
                io.to(roomId).emit('screenStarted', { userName: user.name, userId: socket.id });
                broadcastRoomsList();
            }
        }
    });


    socket.on('stopScreen', ({ roomId }) => {
        const room = roomManager.getRoom(roomId);
        if (room) {
            const user = room.users.find(u => u.id === socket.id);
            if (user) {
                user.isScreenSharing = false;
                io.to(roomId).emit('screenStopped', { userName: user.name, userId: socket.id });

                for (const [pid, data] of room.producers.entries()) {
                    if (data.socketId === socket.id && data.appData?.type === 'screen') {
                        roomManager.closeProducer(pid);
                        io.to(roomId).emit('producerClosed', { producerId: pid, userId: socket.id, appData: data.appData });
                    }
                }
                broadcastRoomsList();
            }
        }
    });

    socket.on('reaction', ({ roomId, emoji }) => {
        const room = roomManager.getRoom(roomId);
        if (room) {
            // Broadcast reaction to all users in the room
            io.to(roomId).emit('reaction', { roomId, emoji, senderId: socket.id });
        }
    });

    socket.on('raiseHand', ({ roomId, isRaised }) => {
        const room = roomManager.getRoom(roomId);
        if (room) {
            const user = room.users.find(u => u.id === socket.id);
            if (user) {
                user.isHandRaised = isRaised;
                io.to(roomId).emit('handRaised', { roomId, isRaised, senderId: socket.id });
                // Also broadcast updated user list so UI reflects the hand status properly
                broadcastRoomsList();
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('❌ Client déconnecté:', socket.id);

        // Find which room user was in
        const rooms = roomManager.getAllRooms();
        rooms.forEach(room => {
            const userIndex = room.users.findIndex(u => u.id === socket.id);
            if (userIndex !== -1) {
                const user = room.users[userIndex];

                cleanupUserMedia(socket.id, room);

                if (user.isScreenSharing) {
                    io.to(room.id).emit('screenStopped', { userName: user.name, userId: socket.id });
                }

                if (user.isCreator) {
                    user.disconnected = true;
                    io.to(room.id).emit('adminDisconnected', { message: `L'administrateur ${user.name} s'est déconnecté.` });
                } else {
                    room.users.splice(userIndex, 1);
                    io.to(room.id).emit('userLeft', { userName: user.name, userId: socket.id });

                    if (room.users.length === 0) {
                        roomManager.removeRoom(room.id);
                    }
                }
                broadcastRoomsList();
            }
        });
    });
});

function cleanupUserMedia(socketId, room) {
    // Producers
    for (const [pid, data] of room.producers.entries()) {
        if (data.socketId === socketId) {
            roomManager.closeProducer(pid);
        }
    }
    // Consumers
    for (const [cid, data] of room.consumers.entries()) {
        if (data.socketId === socketId) {
            roomManager.closeConsumer(cid);
        }
    }
    // Transports
    for (const [tid, data] of room.transports.entries()) {
        if (data.socketId === socketId) {
            roomManager.closeTransport(tid);
        }
    }
}

// ==================== ERROR HANDLING ====================

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
});

// ==================== INIT ====================

(async () => {
    try {
        console.log('🚀 Starting initialization sequence...');
        await workerManager.init();
        console.log('✅ WorkerManager initialized');

        console.log("IO CREATED");

        server.listen(PORT, '0.0.0.0', () => {
            console.log(`🚀 Serveur Socket.IO + Mediasoup (Multi-Worker) démarré`);
            console.log(`📡 URL: https://${SERVER_IP}:${PORT}`);
        });

    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
})();