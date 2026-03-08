<div align="center">

# 🎥 LOCAL MEET

### Plateforme de visioconférence sécurisée pour réseau local

[![Next.js](https://img.shields.io/badge/Next.js-16.0-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Mediasoup](https://img.shields.io/badge/Mediasoup-3.18-green)](https://mediasoup.org/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-black)](https://socket.io/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[Démo Live](#) • [Documentation](#-documentation) • [Installation](#-installation) • [Contribuer](#-contribuer)

*Visioconférence premium pour réseau local - Gratuite, sécurisée et rapide*

</div>

---

## 📖 À propos

**LOCAL MEET** est une solution de visioconférence professionnelle conçue pour fonctionner exclusivement sur votre réseau local. Contrairement aux solutions cloud (Zoom, Google Meet), vos données restent **100% privées** et ne quittent jamais votre réseau.

### 🎯 Pourquoi LOCAL MEET ?

- **🔒 Confidentialité totale** : Aucune donnée n'est envoyée vers des serveurs externes
- **⚡ Ultra-rapide** : Latence minimale grâce au réseau local
- **💰 Gratuit** : Pas d'abonnement, pas de limite de temps
- **🛡️ Sécurisé** : Chiffrement HTTPS + certificats SSL auto-générés
- **🌍 Multilingue** : Support Français / Anglais (détection automatique)
- **🎨 Interface moderne** : Design inspiré de Google Meet avec animations fluides
- **🚀 Onboarding Interactif** : Guide de démarrage pas-à-pas (Spotlight tour)
- **📝 Notes Personnelles** : Bloc-notes privé avec export `.txt`
- **💬 Chat Avancé** : Système de réponses aux messages (style WhatsApp)
- **📱 Multi-plateforme** : Fonctionne sur ordinateur, tablette et smartphone

---

## 📚 Documentation

La documentation complète est disponible dans le dossier `docs/` :

- [✨ Fonctionnalités](docs/features.md) : Liste détaillée des fonctionnalités.
- [🚀 Installation](docs/installation.md) : Guide d'installation rapide et détaillée.
- [💻 Utilisation](docs/usage.md) : Comment créer et rejoindre des réunions.
- [🏗️ Architecture](docs/architecture.md) : Fonctionnement technique (SFU, Mediasoup, WebRTC).
- [🔌 API & WebSockets](docs/api.md) : Documentation des événements Socket.IO.
- [🔧 Dépannage](docs/troubleshooting.md) : Solutions aux problèmes courants.
- [🌐 Déploiement Nginx](docs/deployment-nginx.md) : Guide pour configurer Nginx comme reverse proxy.
- [🤝 Contribuer](docs/contributing.md) : Guide pour les contributeurs.

---

## 🚀 Installation Rapide

Le script de démarrage inclus gère tout pour vous : détection de l'IP, génération des certificats SSL, et gestion des ports.

```bash
# 1. Cloner le repository
git clone https://github.com/PIO-VIA/meetlocal.git
cd meetlocal

# 2. Rendre les scripts exécutables
chmod +x setup.sh start-local-meet.sh

# 3. Lancer l'installation (à faire une seule fois)
./setup.sh

# 4. Lancer l'application
./start-local-meet.sh
```

Pour plus de détails, voir le [Guide d'installation](docs/installation.md).

---

## 🗺️ Roadmap

### Version 1.1 ✅ (Terminé)
- [x] Partage de fichiers
- [x] Historique de chat
- [x] Popup de connexion
- [x] Mode responsive complet
- [x] Indicateur de nouveaux messages
- [x] Mode plein écran
- [x] Nettoyage automatique
- [x] **Support Multilingue (i18n)**
- [x] **Script de démarrage automatisé (SSL/Ports)**

### Version 1.2 ✅ (Terminé)
- [x] **Onboarding Interactif** (Guided Tour)
- [x] **Notes Personnelles** (Export TXT)
- [x] **Réponses aux messages** (Chat Threading)
- [x] **Animations de panneaux** (Transition Participants/Chat/Notes)
- [x] **Reactions emoji** en temps réel
- [x] **Optimisation de la Grid** (Grid dynamique intelligente)

### Version 1.3 (En cours)
- [ ] Enregistrement des réunions
- [ ] Transcription automatique (Speech-to-Text)
- [ ] Fond virtuel (Background blur/replace)
- [ ] Tableau blanc collaboratif
- [ ] Mode grille personnalisable
- [ ] Statistiques de qualité réseau
- [ ] Logs serveur améliorés (Winston)
- [ ] Gestion des permissions (muet forcé, etc.)

### Version 2.0 (Vision)
- [ ] Application desktop (Electron)

---

## 📄 Licence

Distribué sous la licence MIT. Voir `LICENSE` pour plus d'informations.

## 🆘 Support

Si vous rencontrez des problèmes, consultez le [Guide de dépannage](docs/troubleshooting.md) ou ouvrez une issue sur GitHub.
