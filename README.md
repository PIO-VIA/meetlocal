#   (MeetLocal)

MeetLocal est une application de visioconférence en temps réel conçue pour fonctionner sur un réseau local. Elle utilise WebRTC et Mediasoup pour des communications audio/vidéo efficaces et de haute qualité, le tout géré par un backend Node.js et un frontend moderne Next.js.

Ce projet est idéal pour des communications sécurisées et privées sans dépendre de services tiers.

## ✨ Fonctionnalités

-   **Visioconférence en temps réel** : Communications audio et vidéo à faible latence.
-   **Salles multiples** : Créez ou rejoignez des salles de réunion distinctes.
-   **Partage d'écran** : Partagez votre écran avec les autres participants.
-   **Chat textuel** : Échangez des messages textuels pendant la conférence.
-   **Gestion des participants** : Voyez qui est connecté dans la salle.
-   **Contrôles média** : Activez/désactivez votre caméra et votre microphone.

## 🛠️ Stack Technique

| Domaine              | Technologies                                                                                             |
| -------------------- | -------------------------------------------------------------------------------------------------------- |
| **Frontend**         | [Next.js](https://nextjs.org/), [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/) |
| **Styling**          | [Tailwind CSS](https://tailwindcss.com/)                                                                 |
| **Backend**          | [Node.js](https://nodejs.org/), [Express](https://expressjs.com/)                                        |
| **Communication TR** | [Socket.IO](https://socket.io/), [WebRTC](https://webrtc.org/)                                            |
| **SFU Média**        | [Mediasoup](https://mediasoup.org/)                                                                      |

## ⚙️ Principe de Fonctionnement

L'application s'appuie sur une architecture SFU (Selective Forwarding Unit) grâce à Mediasoup. Contrairement à une connexion pair-à-pair (mesh) où chaque participant envoie son flux à tous les autres, le client n'envoie son flux qu'une seule fois au serveur. Le serveur se charge ensuite de le distribuer aux autres participants.

Ce modèle réduit considérablement la charge de la bande passante montante pour chaque client et la charge CPU, permettant à un plus grand nombre de participants de se joindre à une session sans dégradation des performances.

Voici le flux de communication :

1.  **Signalisation (Signaling)** :
    -   Lorsqu'un utilisateur se connecte, le client Next.js établit une connexion WebSocket persistante avec le serveur Node.js via **Socket.IO**.
    -   Toutes les communications initiales pour négocier les connexions WebRTC (échange de métadonnées, capacités, etc.) passent par ce canal de signalisation.

2.  **Création de la salle et des transports** :
    -   L'utilisateur rejoint une salle. Le serveur crée un `Router` Mediasoup pour cette salle s'il n'existe pas.
    -   Le serveur crée un `Transport` WebRTC pour ce client. Un transport est un canal de communication qui reliera le client au SFU. Il en existe un pour l'envoi de média (producer) et un pour la réception (consumer).
    -   Les paramètres de ce transport sont envoyés au client via Socket.IO.

3.  **Production de Média** :
    -   Le client, en utilisant la librairie `mediasoup-client`, utilise les paramètres reçus pour établir la connexion WebRTC avec le serveur.
    -   Une fois la connexion établie, le client capture le flux de sa caméra/microphone et crée un **Producer**. Il envoie ce flux média au serveur Mediasoup.

4.  **Consommation de Média** :
    -   Lorsqu'un nouveau participant (Client A) rejoint la salle, le serveur informe les autres participants (Client B, C, etc.) de sa présence.
    -   Pour que le Client B puisse voir le Client A, le serveur crée un **Consumer** pour le Client B, lié au Producer du Client A.
    -   Les paramètres de ce Consumer sont envoyés au Client B (via Socket.IO), qui peut alors recevoir le flux média du Client A via sa connexion WebRTC existante.

Ce processus garantit que les flux médias sont gérés de manière centralisée et efficace, tandis que la signalisation reste légère et rapide.

## 📂 Structure du Projet

Le projet est organisé en deux parties principales :

```
/
├── backend/         # Serveur Node.js (Express, Socket.IO, Mediasoup)
│   ├── ssl/         # Certificats SSL auto-signés pour HTTPS
│   ├── server.js    # Point d'entrée du serveur
│   └── package.json
│
├── frontend/        # Application client Next.js
│   ├── app/         # Routage et pages de l'application
│   ├── components/  # Composants React réutilisables
│   ├── hooks/       # Hooks personnalisés (useSocket, useMediasoup, etc.)
│   ├── lib/         # Logique client (Socket, WebRTC)
│   └── package.json
│
└── start-local-meet.sh # Script de démarrage automatisé
```

## 🚀 Démarrage Rapide

Le moyen le plus simple de lancer l'application est d'utiliser le script fourni. Il configure et lance automatiquement le backend et le frontend.

### Prérequis

-   [Node.js](https://nodejs.org/en/download/) (v18 ou supérieur recommandé)
-   `npm` (généralement inclus avec Node.js)
-   `git`

### Instructions

1.  **Clonez le dépôt :**
    ```bash
    git clone https://github.com/PIO-VIA/meetlocal.git
    cd meetlocal
    ```

2.  **Rendez le script de démarrage exécutable :**
    ```bash
    chmod +x start-local-meet.sh
    ```

3.  **Lancez le script :**
    ```bash
    ./start-local-meet.sh
    ```

Le script va :
-   Détecter votre adresse IP locale.
-   Créer un fichier `.env.local` pour le frontend.
-   Installer les dépendances `npm` pour le backend et le frontend (si nécessaire).
-   Démarrer le serveur backend sur `https://<VOTRE_IP>:3001`.
-   Démarrer le serveur de développement frontend sur `http://<VOTRE_IP>:3000`.

### ⚠️ **Important : Accepter le certificat SSL**

Le serveur backend utilise un certificat SSL auto-signé pour permettre le fonctionnement de WebRTC. Votre navigateur affichera un avertissement de sécurité.

1.  Après avoir lancé le script, ouvrez votre navigateur et allez d'abord à l'adresse du backend :
    **`https://<VOTRE_IP_LOCALE>:3001/health`**

2.  Votre navigateur affichera une erreur de type "Votre connexion n'est pas privée".
    -   Cliquez sur "Avancé" ou "Paramètres avancés".
    -   Cliquez sur "Continuer vers (dangereux)" ou "Accepter le risque et continuer".

3.  Une fois que vous voyez `{"status":"ok"}`, le certificat est accepté par votre navigateur. Vous pouvez maintenant accéder à l'application frontend :
    **`http://<VOTRE_IP_LOCALE>:3000`**

Cette étape est **cruciale** et doit être effectuée sur chaque appareil qui se connecte à l'application.

## 🔧 Démarrage Manuel

Si vous préférez ne pas utiliser le script, vous pouvez lancer les services manuellement dans deux terminaux différents.

**Terminal 1 : Démarrer le Backend**
```bash
cd backend
npm install
npm start
```

**Terminal 2 : Démarrer le Frontend**
1.  Créez un fichier `.env.local` à la racine de `frontend/`.
2.  Ajoutez la ligne suivante en remplaçant `<VOTRE_IP_LOCALE>` par votre adresse IP sur le réseau local :
    ```
    NEXT_PUBLIC_BACKEND_URL=https://<VOTRE_IP_LOCALE>:3001
    ```
3.  Lancez le serveur de développement :
    ```bash
    cd frontend
    npm install
    npm run dev
    ```

N'oubliez pas d'accepter le certificat SSL comme expliqué ci-dessus.
