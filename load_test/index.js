/**
 * LOCALMEET - LOAD TEST SCRIPT
 * Simulation de montée en charge Socket.IO + Mediasoup (signalisation)
 */

import { io } from "socket.io-client";

// CONFIGURATION VIA VARIABLES D'ENVIRONNEMENT OU DEFAUT
const SERVER_URL = process.env.SERVER_URL || "http://localhost:3001";
const ROOM_ID = process.env.ROOM_ID || "load-test-room";
const ROOM_NAME = process.env.ROOM_NAME || "LocalMeet Load Test";

// CONFIG TEST
const TOTAL_USERS = parseInt(process.env.TOTAL_USERS) || 20000;    // nombre total simulé
const STEP_USERS = parseInt(process.env.STEP_USERS) || 100;       // utilisateurs ajoutés par vague
const STEP_DELAY = parseInt(process.env.STEP_DELAY) || 2000;     // pause entre vagues (ms)

// STATS
let connected = 0;
let joined = 0;
let transports = 0;
let errors = 0;

console.log(`🚀 Démarrage du test de charge sur ${SERVER_URL}`);
console.log(`👥 Cible : ${TOTAL_USERS} utilisateurs (${STEP_USERS} par vague toutes les ${STEP_DELAY}ms)`);

function createClient(index) {
  const userName = `user_${index}`;

  const socket = io(SERVER_URL, {
    transports: ["websocket"],
    reconnection: false
  });

  socket.on("connect", () => {
    connected++;

    // Création de la room par le 1er utilisateur
    if (index === 0) {
      socket.emit("createRoom", {
        roomName: ROOM_NAME,
        userName,
        customRoomId: ROOM_ID
      });
    } else {
      socket.emit("joinRoom", { roomId: ROOM_ID, userName }, (success) => {
        if (success) joined++;
      });
    }

    // Signalisation mediasoup
    socket.emit("getRouterRtpCapabilities", { roomId: ROOM_ID }, () => { });

    socket.emit(
      "createWebRtcTransport",
      { roomId: ROOM_ID, sender: false },
      (res) => {
        if (res?.id) transports++;
      }
    );

    // Ping périodique
    const pingInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit("ping", () => { });
      } else {
        clearInterval(pingInterval);
      }
    }, 10000);

    // Message chat
    const msgInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit("message", {
          roomId: ROOM_ID,
          message: `hello from ${userName}`,
          timestamp: new Date().toISOString()
        });
      } else {
        clearInterval(msgInterval);
      }
    }, 20000);
  });

  socket.on("connect_error", (err) => {
    errors++;
    if (errors % 10 === 0) {
      console.error(`❌ Erreurs cumulées : ${errors}. Dernière erreur: ${err.message}`);
    }
  });

  socket.on("disconnect", () => {
    connected--;
  });
}

// MONTÉE EN CHARGE PROGRESSIVE
async function startLoadTest() {
  let created = 0;

  while (created < TOTAL_USERS) {
    const batch = Math.min(STEP_USERS, TOTAL_USERS - created);

    for (let i = 0; i < batch; i++) {
      createClient(created + i);
    }

    created += batch;

    process.stdout.write(`\r🚀 Créés: ${created} | Connectés: ${connected} | Rooms: ${joined} | WebRTC: ${transports} | Erreurs: ${errors} | Mémoire: ${(process.memoryUsage().rss / 1024 / 1024).toFixed(1)}MB`);

    if (created < TOTAL_USERS) {
      await new Promise(r => setTimeout(r, STEP_DELAY));
    }
  }
  console.log("\n✅ Tous les clients ont été lancés.");
}

startLoadTest().catch(console.error);
