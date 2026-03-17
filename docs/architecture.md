# 🏗️ Architecture

LOCAL MEET utilise une architecture **SFU (Selective Forwarding Unit)** via Mediasoup, optimisant la bande passante et les performances.

## 📊 Diagramme d'architecture

```
┌─────────────┐         WebSocket (Socket.IO)         ┌─────────────┐
│             │◄────────── Signalisation ─────────────►│             │
│   CLIENT    │                                        │   SERVEUR   │
│  (Browser)  │         WebRTC (Mediasoup)             │ (Cluster Node.js) │
│             │◄────────── Flux Média ────────────────►│ (Multi-Worker) │
└─────────────┘                                        └─────────────┘
      │                                                      │
      │                                                      │
      ▼                                                      ▼
┌─────────────┐                                    ┌──────────────┐
│ Mediasoup   │                                    │  Mediasoup   │
│ Client Lib  │                                    │    Router    │
└─────────────┘                                    └──────────────┘
                                                           │
                                                           ▼
                                                   ┌──────────────┐
                                                   │  Transports  │
                                                   │   WebRTC     │
                                                   └──────────────┘
```

## 🔄 Flux de communication

### 1. **Connexion et Signalisation**

```mermaid
sequenceDiagram
    Client->>Serveur: WebSocket (Socket.IO)
    Serveur->>Client: Connexion établie
    Client->>Serveur: joinRoom({ roomId, userName })
    Serveur->>Client: roomJoined + routerRtpCapabilities
```

### 2. **Configuration WebRTC**

```mermaid
sequenceDiagram
    Client->>Serveur: createWebRtcTransport()
    Serveur->>Client: Transport params (send + receive)
    Client->>Client: Créer Device Mediasoup
    Client->>Serveur: connectTransport()
```

### 3. **Production de média**

```mermaid
sequenceDiagram
    Client->>Client: Capturer caméra/micro
    Client->>Serveur: produce({ kind, rtpParameters })
    Serveur->>Serveur: Créer Producer
    Serveur->>Autres Clients: newProducer (notification)
```

### 4. **Consommation de média**

```mermaid
sequenceDiagram
    Client B->>Serveur: consume({ producerId })
    Serveur->>Client B: Consumer params
    Client B->>Client B: Créer Consumer
    Client B->>Serveur: resumeConsumer()
    Serveur->>Client B: Flux média actif
```

## 🎯 Avantages de l'architecture SFU

| Architecture | Bande passante | CPU Client | Scalabilité | Qualité |
|--------------|----------------|------------|-------------|---------|
| **Mesh (P2P)** | Très haute | Très haute | ❌ Mauvaise (max 4-6) | Variable |
| **MCU** | Faible | Faible | ✅ Excellente | Uniforme |
| **SFU** | Moyenne | Moyenne | ✅ Excellente | ✅ Maximale |

**LOCAL MEET utilise SFU** : Le meilleur compromis entre performance, qualité et scalabilité.

---

## 🛠️ Stack Technique

### Frontend

| Technologie | Version | Description |
|-------------|---------|-------------|
| [Next.js](https://nextjs.org/) | 16.0.1 | Framework React avec SSR |
| [React](https://react.dev/) | 19.2.0 | Library UI |
| [TypeScript](https://www.typescriptlang.org/) | 5.x | Typage statique |
| [Tailwind CSS](https://tailwindcss.com/) | 4.1.17 | Framework CSS utilitaire |
| [Mediasoup Client](https://mediasoup.org/) | 3.18.0 | Client WebRTC SFU |
| [Socket.IO Client](https://socket.io/) | 4.8.1 | WebSocket client |
| [Lucide React](https://lucide.dev/) | 0.553.0 | Icônes modernes |
| [React Hook Form](https://react-hook-form.com/) | - | Gestion de formulaires |

### Backend

| Technologie | Version | Description |
|-------------|---------|-------------|
| [Node.js](https://nodejs.org/) | 20+ | Runtime JavaScript |
| [Express](https://expressjs.com/) | 4.x | Framework web |
| [Mediasoup](https://mediasoup.org/) | 3.x | SFU WebRTC serveur |
| [Socket.IO](https://socket.io/) | 4.x | WebSocket serveur |
| [Multer](https://github.com/expressjs/multer) | 1.x | Upload de fichiers |
| [HTTPS](https://nodejs.org/api/https.html) | Native | Serveur HTTPS |

### DevOps

- **SSL** : OpenSSL (certificats auto-signés)
- **Logs** : Winston (planifié)
- **Process Manager** : PM2 (recommandé)
- **Monitoring** : Prometheus (planifié)

---

## 🔒 Sécurité

### Chiffrement

- ✅ **HTTPS obligatoire** : Toutes les communications sont chiffrées
- ✅ **TLS 1.3** : Dernière version du protocole TLS
- ✅ **WebRTC DTLS** : Chiffrement end-to-end des flux média

### Certificats SSL

- Certificats auto-signés générés localement
- Clé privée 4096 bits RSA
- Validité : 365 jours
- SubjectAltName pour IP + localhost

### Données

- ❌ **Aucune donnée stockée** : Tout est en mémoire
- ❌ **Pas de tracking** : Aucun cookie, aucune analytics
- ✅ **Réseau local uniquement** : Pas d'accès externe

### Bonnes pratiques

1. **Régénérer les certificats régulièrement**
2. **Utiliser des codes de réunion complexes**
3. **Rôle admin pour contrôler les réunions**
4. **Fermer les ports sur le firewall** (sauf réseau local)

### Cluster & Multi-Core
- **Node.js Cluster** : Utilise tous les cœurs CPU du serveur. Chaque cœur gère sa propre instance de l'application.
- **Sticky Sessions** : Nginx assure qu'un client reste connecté au même worker via `ip_hash`.
- **Mediasoup Workers** : Les workers Mediasoup sont répartis intelligemment pour laisser de la puissance CPU au processus principal Node.js.

---

## ⚡ Performance

### Optimisations Haut Débit
- **Debounce Broadcasts** : Les listes d'utilisateurs et de salons sont émises avec un léger délai (100-200ms) pour éviter les tempêtes d'événements sous charge.
- **Limites de Sécurité** : Plafond à 50 utilisateurs par salon et 300 salons simultanés pour protéger la RAM.
- **WebSocket-only** : Désactivation du polling Socket.IO pour réduire la latence et l'usage mémoire.

### Benchmarks (Optimisé)

| Métrique | Valeur | Conditions |
|----------|--------|-----------|
| Latence vidéo | < 100ms | Réseau local gigabit |
| Connexions simultanées | ~2500 | Signalisation seule |
| Participants vidéo actifs | ~1000 | Répartis sur plusieurs salons |
| CPU serveur | ~25% | 50 participants vidéo actifs |
| RAM serveur | ~2-4 Go | 1000 utilisateurs connectés |

### Recommendations

**Serveur (machine hôte)** :
- CPU : 4 cores minimum
- RAM : 4 GB minimum
- Réseau : Ethernet gigabit recommandé

**Client** :
- Navigateur moderne (Chrome, Firefox, Safari, Edge)
- Connexion : 5 Mbps minimum
