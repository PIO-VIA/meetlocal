# 🚀 Installation

## Prérequis

- **Node.js** 20+ ([Télécharger](https://nodejs.org/))
- **npm** 9+ (inclus avec Node.js)
- **OpenSSL** (pour certificats SSL)
- **Git** ([Télécharger](https://git-scm.com/))

## Installation Rapide (Script Automatique)

### Installation en 3 étapes

```bash
# 1. Cloner le repository
git clone https://github.com/PIO-VIA/meetlocal.git
cd meetlocal

# 2. Rendre le script exécutable
chmod +x start-local-meet.sh

# 3. Lancer l'application
./start-local-meet.sh
```

✅ **C'est tout !** Le script :
- Détecte votre IP locale
- Trouve des ports disponibles
- Génère les certificats SSL
- Installe les dépendances
- Démarre backend + frontend
- **Ouvre automatiquement votre navigateur**

### 🌐 Accès à l'application

Après le lancement :

```
✅ LOCAL MEET démarré avec succès !

📡 Sur cet appareil :
   Frontend: https://localhost:3000
   Backend:  https://localhost:3001

📡 Sur d'autres appareils :
   Frontend: https://192.168.1.X:3000
   Backend:  https://192.168.1.X:3001
```

### ⚠️ Accepter le certificat SSL (une seule fois)

1. Le navigateur s'ouvre automatiquement
2. Vous voyez : **"Votre connexion n'est pas privée"**
3. Cliquez sur **"Avancé"** puis **"Continuer vers le site"**
4. ✅ C'est fait !

---

## 📦 Installation Détaillée (Manuelle)

### Backend

```bash
cd backend

# Installer les dépendances
npm install

# Créer le dossier SSL
mkdir -p ssl
cd ssl

# Générer les certificats SSL
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes \
  -subj "/C=CM/ST=Centre/L=Yaounde/O=LocalMeet/CN=localhost" \
  -addext "subjectAltName=IP:127.0.0.1,DNS:localhost"

cd ..

# Démarrer le backend
npm start
```

### Frontend

```bash
# Dans un autre terminal
cd frontend

# Installer les dépendances
npm install

# Créer le fichier .env.local
echo "NEXT_PUBLIC_BACKEND_URL=https://192.168.1.X:3001" > .env.local
echo "PORT=3000" >> .env.local

# Démarrer le frontend
npm run dev
```

---

## ⚙️ Configuration

### Variables d'environnement

#### Frontend (`frontend/.env.local`)

```bash
# URL du backend (OBLIGATOIRE)
NEXT_PUBLIC_BACKEND_URL=https://192.168.1.X:3001

# Port du serveur frontend (optionnel)
PORT=3000
```

#### Backend (`backend/.env`)

```bash
# Port du serveur backend (optionnel)
PORT=3001

# Environnement
NODE_ENV=development

# Niveau de logs (optionnel)
LOG_LEVEL=info
```

### Ports utilisés

| Service | Port par défaut | Configurable |
|---------|----------------|--------------|
| Frontend HTTPS | 3000 | ✅ Oui |
| Backend HTTPS | 3001 | ✅ Oui |
| Socket.IO | 3001 | Suit le backend |
| WebRTC | Dynamique | Géré par Mediasoup |

### Certificats SSL

Les certificats sont générés automatiquement dans `backend/ssl/` :

- `cert.pem` : Certificat SSL
- `key.pem` : Clé privée

**Durée de validité** : 365 jours

Pour régénérer :
```bash
rm -rf backend/ssl
./start-local-meet.sh
```
