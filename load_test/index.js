/**
 * LOCALMEET - LOAD TEST SCRIPT
 * Simulation de montée en charge Socket.IO + Mediasoup (signalisation)
 */

import { io } from "socket.io-client";
import https from "https";

// ⚠️ METS ICI L'IP LOCALE DE TON SERVEUR
const SERVER_URL = "https://localhost:3001";

const ROOM_ID = "load-test-room";
const ROOM_NAME = "LocalMeet Load Test";

// CONFIG TEST
const TOTAL_USERS = 1000;     // nombre total simulé
const STEP_USERS = 50;        // utilisateurs ajoutés par vague
const STEP_DELAY = 5000;      // pause entre vagues (ms)

// SSL local (certificat auto-signé)
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

// STATS
let connected = 0;
let joined = 0;
let transports = 0;
let errors = 0;

function createClient(index) {
  const userName = `user_${index}`;

  const socket = io(SERVER_URL, {
    transports: ["websocket"],
    secure: true,
    reconnection: false,
    agent: httpsAgent
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
      socket.emit("joinRoom", { roomId: ROOM_ID, userName }, () => {
        joined++;
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
    setInterval(() => {
      socket.emit("ping", () => { });
    }, 10000);

    // Message chat
    setInterval(() => {
      socket.emit("message", {
        roomId: ROOM_ID,
        message: `hello from ${userName}`,
        timestamp: new Date().toISOString()
      });
    }, 20000);
  });

  socket.on("connect_error", (err) => {
    errors++;
    console.error("❌ Connexion error:", err.message);
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

    console.log(`
🚀 LOAD STEP
Clients créés     : ${created}
Connectés         : ${connected}
Rejoints room     : ${joined}
Transports WebRTC : ${transports}
Erreurs           : ${errors}
Mémoire testeur   : ${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB
    `);

    await new Promise(r => setTimeout(r, STEP_DELAY));
  }
}

startLoadTest();
