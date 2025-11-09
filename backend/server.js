/**
 * BACKEND - Serveur Socket.IO pour LOCAL MEET
 */

const express = require('express');
const app = express();
const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const { Server } = require('socket.io');

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

// Configuration Socket.IO avec CORS pour Next.js
const io = new Server(server, {
    cors: {
        origin: [
            'http://localhost:3000',
            'https://localhost:3000'
        ],
        methods: ['GET', 'POST'],
        credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling']
});

// Middleware
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

const PORT = 3001;

// Route de santé
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date() });
});

// Obtenir l'IP locale
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

// Structure de données pour les salons
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

// Événements Socket.IO
io.on('connection', (socket) => {
    console.log('✅ Client connecté:', socket.id);
    
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

    // Vérifier si une réunion existe
    socket.on('checkRoom', ({ roomId }, callback) => {
        const exists = rooms.has(roomId);
        callback(exists);
    });

    // Créer une réunion
    socket.on('createRoom', (data) => {
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

    // Rejoindre une réunion
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
            socket.to(roomId).emit('user-connected', socket.id);
            
            const userInfo = room.users.find(user => user.id === socket.id);
            callback(true, { isCreator: userInfo && userInfo.isCreator === true });
            broadcastRoomsList();
        } else {
            callback(false, { message: 'Salon non trouvé' });
        }
    });

    // Quitter une réunion
    socket.on('leaveRoom', (data) => {
        const { roomId, userName } = data;
        const room = rooms.get(roomId);
        
        if (room) {
            const userIndex = room.users.findIndex(user => user.id === socket.id);
            if (userIndex !== -1) {
                room.users.splice(userIndex, 1);
                socket.leave(roomId);
                io.to(roomId).emit('userLeft', { userName });
                
                if (room.users.length === 0) {
                    rooms.delete(roomId);
                }
                
                io.to(roomId).emit('getUsers', room.users.filter(u => !u.disconnected));
                broadcastRoomsList();
            }
        }
    });

    // Terminer une réunion
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
                rooms.delete(roomId);
                broadcastRoomsList();
            }
        }
    });

    // WebRTC signaling
    socket.on('offer', ({ offer, to }) => {
        socket.to(to).emit('offer', { offer, userId: socket.id });
    });
    
    socket.on('answer', ({ answer, to }) => {
        socket.to(to).emit('answer', { answer, from: socket.id });
    });
    
    socket.on('ice-candidate', ({ candidate, to }) => {
        socket.to(to).emit('ice-candidate', { candidate, from: socket.id });
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

    // Obtenir la liste des utilisateurs
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
    socket.on('disconnect', () => {
        console.log('❌ Client déconnecté:', socket.id);
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
                    }
                }
                
                io.to(roomId).emit('user-disconnected', socket.id);
                broadcastRoomsList();
            }
        });
    });
});

// Démarrer le serveur
server.listen(PORT, () => {
    console.log(`🚀 Serveur Socket.IO démarré sur https://localhost:${PORT}`);
    console.log(`✅ Accepte les connexions de Next.js sur http://localhost:3000`);
});

server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
        console.error(`❌ Le port ${PORT} est déjà utilisé`);
    } else {
        console.error('❌ Erreur serveur:', e);
    }
    process.exit(1);
});