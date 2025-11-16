# 🎥 LOCAL MEET - Application de Visioconférence Locale

Solution de visioconférence **peer-to-peer sécurisée** fonctionnant en réseau local avec Next.js et Socket.IO.

---

## 📋 **Fonctionnalités**

- ✅ Vidéoconférence en temps réel (WebRTC)
- ✅ Chat textuel intégré
- ✅ Partage d'écran
- ✅ Gestion des participants
- ✅ Salles persistantes
- ✅ Connexion HTTPS sécurisée
- ✅ Interface moderne avec Tailwind CSS

---

## 🛠️ **Technologies Utilisées**

### Backend
- **Node.js** - Runtime JavaScript
- **Express** - Framework web
- **Socket.IO** - Communication temps réel
- **HTTPS** - Sécurisation SSL/TLS

### Frontend
- **Next.js 16** - Framework React
- **React 19** - Bibliothèque UI
- **TypeScript** - Typage statique
- **Tailwind CSS 4** - Framework CSS
- **Socket.IO Client** - Client WebSocket
- **WebRTC** - Communication vidéo P2P

---

## 📁 **Structure du Projet**
```
meetlocal/
├── backend/
│   ├── server.js          # Serveur Socket.IO
│   ├── ssl/               # Certificats SSL
│   │   ├── cert.pem
│   │   └── key.pem
│   └── package.json
│
└── frontend/
    ├── app/
    │   ├── page.tsx       # Page d'accueil
    │   └── room/
    │       └── page.tsx   # Page de salle
    ├── components/
    │   ├── Home/          # Composants page d'accueil
    │   └── Meeting/       # Composants salle de réunion
    ├── hooks/             # Hooks React personnalisés
    ├── types/             # Définitions TypeScript
    └── package.json
```

---

## 🚀 **Installation**

### Prérequis
- **Node.js** >= 18.x
- **npm** >= 9.x

### 1️⃣ Cloner le projet
```bash
git clone <votre-repo>
cd meetlocal
```

### 2️⃣ Installer les dépendances

Le script de démarrage `start-local-meet.sh` gère automatiquement l'installation des dépendances pour le backend et le frontend si elles ne sont pas déjà présentes.

Si vous préférez installer manuellement :

**Backend :**
```bash
cd backend
npm install
```

**Frontend :**
```bash
cd ../frontend
npm install
```

---

## ▶️ **Démarrage**

### 🚀 Démarrage Rapide (Recommandé)

Le script `start-local-meet.sh` automatise l'installation des dépendances, la configuration de l'adresse IP locale pour le frontend et le démarrage simultané du backend et du frontend.

```bash
./start-local-meet.sh
```

Le script affichera les adresses pour accéder à l'application sur votre machine et sur d'autres appareils du réseau.

**⚠️ IMPORTANT :**
1.  Lors du premier accès, votre navigateur affichera un avertissement de sécurité pour le certificat SSL auto-signé. Vous devez l'accepter pour que l'application fonctionne correctement.
2.  Il est recommandé d'accéder d'abord à l'URL du backend (ex: `https://<VOTRE_IP_LOCALE>:3001/health`) et d'accepter l'exception de sécurité avant d'ouvrir l'application frontend.

### 🔧 Mode Développement (Manuel)

Si vous préférez démarrer les services manuellement :

**Terminal 1 - Backend** :
```bash
cd backend
npm start
```
✅ Le serveur Socket.IO démarre sur `https://localhost:3001`

**Terminal 2 - Frontend** :
```bash
cd frontend
npm run dev
```
✅ Next.js démarre sur `http://localhost:3000`

### 📱 Accès à l'application (Manuel)

1. Ouvrez `http://localhost:3000` dans votre navigateur
2. **Acceptez l'avertissement de sécurité** (certificat auto-signé) en allant sur `https://localhost:3001/health` d'abord.
3. Vous devriez voir **🟢 Connecté** dans l'interface

---

## 🔐 **Certificats SSL**

Les certificats SSL auto-signés sont inclus dans `backend/ssl/`.

### Régénérer les certificats (optionnel)
```bash
cd backend/ssl
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes
```

Lors de la génération, utilisez `localhost` comme **Common Name (CN)**.

---

## 🎮 **Utilisation**

### Créer une Réunion

1. Cliquez sur **"Créer une réunion"**
2. Entrez votre nom
3. Donnez un nom à la réunion
4. Cliquez sur **"Lancer la réunion"**
5. Partagez l'ID de la réunion

### Rejoindre une Réunion

**Option 1 - Via l'ID** :
1. Cliquez sur **"Rejoindre"**
2. Entrez votre nom
3. Entrez l'ID de la réunion
4. Cliquez sur **"Rejoindre maintenant"**

**Option 2 - Via la liste** :
1. Cliquez sur **"Rejoindre"**
2. Sélectionnez une réunion dans la liste
3. Cliquez sur **"Rejoindre"**

### Contrôles de la Réunion

- **🎤** Activer/Couper le microphone
- **📹** Démarrer/Arrêter la caméra
- **🖥️** Partager l'écran
- **👥** Afficher les participants
- **💬** Ouvrir le chat
- **📞** Quitter la réunion
- **🛑** Terminer la réunion (Admin uniquement)

---

## 🐛 **Résolution de Problèmes**

### Le frontend ne se connecte pas au backend

**Vérifications** :
```bash
# 1. Le backend est-il démarré ?
curl https://localhost:3001/health --insecure

# 2. Les certificats SSL sont-ils présents ?
ls backend/ssl/

# 3. Next.js utilise-t-il le bon port ?
# Devrait afficher: ready on http://localhost:3000
```

### Erreur "EADDRINUSE"

Le port est déjà utilisé :
```bash
# Trouver le processus
lsof -i :3001

# Tuer le processus
kill -9 <PID>
```

### Les styles Tailwind ne s'appliquent pas
```bash
cd frontend
# Vérifier tailwind.config.ts existe
ls tailwind.config.ts

# Supprimer .next et reconstruire
rm -rf .next
npm run dev
```

### Problème de certificat SSL

Allez d'abord sur `https://localhost:3001/health` et acceptez l'exception de sécurité avant d'utiliser l'application.

---

## 📦 **Build Production**

### Backend
```bash
cd backend
npm start
```

### Frontend
```bash
cd frontend
npm run build
npm start
```

---

## 🔧 **Configuration Avancée**

### Changer les ports

**Backend** (`backend/server.js`) :
```javascript
const PORT = 3002; // Modifier ici
```

**Frontend** (`frontend/hooks/useSocket.ts`) :
```typescript
io('https://localhost:3002', { // Modifier ici
  // ...
});
```

### Ajouter des serveurs TURN/STUN

**`frontend/hooks/useWebRTC.ts`** :
```typescript
const iceServers = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { 
      urls: 'turn:your-turn-server.com:3478',
      username: 'user',
      credential: 'pass'
    }
  ],
};
```

---

## 📊 **Performance**

### Optimisations Appliquées

- **WebRTC** : Connexion P2P directe
- **Socket.IO** : Transport WebSocket prioritaire
- **Compression vidéo** : 720p@30fps par défaut
- **Echo cancellation** : Réduction du bruit audio
- **Bundling** : Optimisation Next.js

### Limites Connues

- **Max 4 participants** recommandé (limitations P2P)
- **Réseau local** uniquement (pas de TURN server)
- **Certificat auto-signé** (avertissement navigateur)

---

## 🤝 **Contribution**

Les contributions sont les bienvenues !

1. Fork le projet
2. Créez une branche (`git checkout -b feature/ma-feature`)
3. Committez (`git commit -m 'Ajout feature'`)
4. Push (`git push origin feature/ma-feature`)
5. Ouvrez une Pull Request

---

## 📄 **Licence**

Ce projet est sous licence ISC.

---

## 👨‍💻 **Auteur**

Développé par **Pio**

---

## 📞 **Support**

En cas de problème :
1. Vérifiez les logs du backend et frontend
2. Consultez la section "Résolution de Problèmes"
3. Ouvrez une issue sur GitHub

---

**Bon développement ! 🚀**