const config = require('./config');
const workerManager = require('./WorkerManager');

class RoomManager {
    constructor() {
        this.rooms = new Map(); // roomId -> RoomObject

        // Lookup indices for fast access
        this.transportToRoom = new Map(); // transportId -> roomId
        this.producerToRoom = new Map();  // producerId -> roomId
        this.consumerToRoom = new Map();  // consumerId -> roomId
    }

    // Limites de sécurité
    static MAX_ROOMS = 300;
    static CHAT_HISTORY_LIMIT = 100; // réduit pour économiser la RAM

    async createRoom(roomId, roomName, creatorName, socketId) {
        if (this.rooms.has(roomId)) {
            throw new Error('ID_ALREADY_EXISTS');
        }

        // AJOUT : vérification du nombre maximum de rooms
        if (this.rooms.size >= RoomManager.MAX_ROOMS) {
            throw new Error('MAX_ROOMS_REACHED');
        }

        // 1. Get a worker
        const worker = workerManager.getWorker();

        console.log(`🏗️  Creating room ${roomId} on Worker [PID:${worker.pid}]`);

        // 2. Create Router
        const router = await worker.createRouter({
            mediaCodecs: config.router.mediaCodecs
        });

        // 3. Create Room Object
        const room = {
            id: roomId,
            name: roomName,
            workerId: worker.pid,
            router: router,
            persistent: true,
            createdAt: new Date().toISOString(),
            users: [{
                id: socketId,
                name: creatorName,
                isCreator: true,
                isStreaming: false,
                isScreenSharing: false,
                disconnected: false
            }],
            // Attached Mediasoup objects
            transports: new Map(),
            producers: new Map(),
            consumers: new Map(),
            // Chat history
            chatHistory: [],
            // AJOUT : nettoyage automatique de l'historique
            get chatHistoryLimited() {
                if (this.chatHistory.length > RoomManager.CHAT_HISTORY_LIMIT) {
                    this.chatHistory = this.chatHistory.slice(-RoomManager.CHAT_HISTORY_LIMIT);
                }
                return this.chatHistory;
            }
        };

        this.rooms.set(roomId, room);
        return room;
    }

    getRoom(roomId) {
        return this.rooms.get(roomId);
    }

    hasRoom(roomId) {
        return this.rooms.has(roomId);
    }

    // Helpers to resolve objects to rooms
    getRoomForTransport(transportId) {
        const roomId = this.transportToRoom.get(transportId);
        return roomId ? this.getRoom(roomId) : null;
    }

    getRoomForProducer(producerId) {
        const roomId = this.producerToRoom.get(producerId);
        return roomId ? this.getRoom(roomId) : null;
    }

    getRoomForConsumer(consumerId) {
        const roomId = this.consumerToRoom.get(consumerId);
        return roomId ? this.getRoom(roomId) : null;
    }

    // Registration helpers
    addTransport(roomId, transport) {
        const room = this.getRoom(roomId);
        if (room) {
            room.transports.set(transport.id, { transport, roomId });
            this.transportToRoom.set(transport.id, roomId);
        }
    }

    addProducer(roomId, producerData) {
        const room = this.getRoom(roomId);
        if (room) {
            room.producers.set(producerData.producer.id, producerData);
            this.producerToRoom.set(producerData.producer.id, roomId);
        }
    }

    addConsumer(roomId, consumerData) {
        const room = this.getRoom(roomId);
        if (room) {
            room.consumers.set(consumerData.consumer.id, consumerData);
            this.consumerToRoom.set(consumerData.consumer.id, roomId);
        }
    }

    // Removal helpers (individual objects)
    closeTransport(transportId) {
        const roomId = this.transportToRoom.get(transportId);
        if (roomId) {
            const room = this.getRoom(roomId);
            if (room && room.transports.has(transportId)) {
                const data = room.transports.get(transportId);
                data.transport.close();
                room.transports.delete(transportId);
                this.transportToRoom.delete(transportId);
                console.log(`🧹 Transport cleaned: ${transportId}`);
            }
        }
    }

    closeProducer(producerId) {
        const roomId = this.producerToRoom.get(producerId);
        if (roomId) {
            const room = this.getRoom(roomId);
            if (room && room.producers.has(producerId)) {
                const data = room.producers.get(producerId);
                data.producer.close();
                room.producers.delete(producerId);
                this.producerToRoom.delete(producerId);
                console.log(`🧹 Producer cleaned: ${producerId}`);
            }
        }
    }

    closeConsumer(consumerId) {
        const roomId = this.consumerToRoom.get(consumerId);
        if (roomId) {
            const room = this.getRoom(roomId);
            if (room && room.consumers.has(consumerId)) {
                const data = room.consumers.get(consumerId);
                data.consumer.close();
                room.consumers.delete(consumerId);
                this.consumerToRoom.delete(consumerId);
                console.log(`🧹 Consumer cleaned: ${consumerId}`);
            }
        }
    }

    removeRoom(roomId) {
        const room = this.rooms.get(roomId);
        if (room) {
            console.log(`🗑️  Closing Room ${roomId} (Worker [PID:${room.workerId}])`);

            // Close all contents
            room.consumers.forEach(c => {
                c.consumer.close();
                this.consumerToRoom.delete(c.consumer.id);
            });
            room.producers.forEach(p => {
                p.producer.close();
                this.producerToRoom.delete(p.producer.id);
            });
            room.transports.forEach(t => {
                t.transport.close();
                this.transportToRoom.delete(t.transport.id);
            });

            if (room.router && !room.router.closed) {
                room.router.close();
            }
            this.rooms.delete(roomId);
        }
    }

    getAllRooms() {
        return Array.from(this.rooms.values());
    }

    handleWorkerDeath(workerPid, io) {
        console.log(`☠️  Handling worker death [PID:${workerPid}]. Closing affected rooms...`);
        const roomsToClose = [];

        for (const [roomId, room] of this.rooms.entries()) {
            if (room.workerId === workerPid) {
                roomsToClose.push(room);
            }
        }

        for (const room of roomsToClose) {
            if (io) {
                io.to(room.id).emit('meetingEnded', {
                    message: 'La réunion a été interrompue suite à une erreur serveur interne (Worker Crash).'
                });
            }
            this.removeRoom(room.id);
        }
    }
}

module.exports = new RoomManager();
