# 🔌 API & WebSockets

## Socket.IO Events

### Client → Serveur

| Event | Payload | Description |
|-------|---------|-------------|
| `createRoom` | `{ userName, roomName, customRoomId? }` | Créer une nouvelle réunion |
| `joinRoom` | `{ roomId, userName }` | Rejoindre une réunion |
| `leaveRoom` | `{ roomId, userName }` | Quitter une réunion |
| `endMeeting` | `{ roomId, userName }` | Terminer une réunion (admin) |
| `getRoomsList` | - | Obtenir la liste des réunions |
| `getUsers` | `{ roomId }` | Obtenir les participants |
| `message` | `{ roomId, message, timestamp, file? }` | Envoyer un message chat |
| `getChatHistory` | `{ roomId }` | Récupérer l'historique du chat |
| `startStream` | `{ roomId }` | Notifier démarrage vidéo |
| `stopStream` | `{ roomId }` | Notifier arrêt vidéo |
| `startScreen` | `{ roomId }` | Notifier démarrage partage |
| `stopScreen` | `{ roomId }` | Notifier arrêt partage |

### Serveur → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `roomCreated` | `{ roomId, roomName }` | Réunion créée avec succès |
| `roomError` | `{ error, message }` | Erreur lors de création |
| `roomsList` | `Room[]` | Liste des réunions actives |
| `getUsers` | `User[]` | Liste des participants |
| `userJoined` | `{ userId, userName }` | Nouveau participant |
| `userLeft` | `{ userId, userName }` | Participant parti |
| `message` | `{ id, userName, message, timestamp, file? }` | Nouveau message chat |
| `chatHistory` | `Message[]` | Historique des messages |
| `screenStopped` | `{ userId }` | Partage d'écran arrêté |
| `meetingEnded` | - | Réunion terminée par admin |

## HTTP Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Vérifier l'état du serveur |
| GET | `/get-connection-info` | Obtenir les infos de connexion Mediasoup |
| POST | `/upload-file` | Uploader un fichier (max 50 MB) |
| GET | `/download-file/:filename` | Télécharger un fichier |
