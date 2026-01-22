# 🌐 Déploiement avec Nginx

Ce guide détaille comment configurer Nginx comme reverse proxy pour déployer **LOCAL MEET** de manière sécurisée et performante.

## 📋 Pourquoi utiliser Nginx ?

Bien que le projet inclue un script de démarrage gérant le HTTPS, Nginx est recommandé pour une mise en production :
- **Gestion centralisée du SSL** (via Let's Encrypt).
- **Terminaison SSL** plus performante.
- **Sécurité accrue** (masquage des ports réels, filtrage IP).
- **Scalabilité** (possibilité de load balancing).

## 🛠️ Configuration de Nginx

Voici un exemple de configuration pour un site utilisant un domaine (ex: `meet.local`) ou une IP.

### Fichier `/etc/nginx/sites-available/visio`

```nginx
server {
    listen 443 ssl;
    server_name localhost;

    ssl_certificate     /etc/nginx/certs/localhost+2.pem;
    ssl_certificate_key /etc/nginx/certs/localhost+2-key.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

## ⚠️ Important : Mediasoup & UDP

Nginx peut gérer l'HTTP et les WebSockets (signalisation), mais il **ne peut pas** faire proxy pour le trafic média (WebRTC/UDP) de Mediasoup.

- **Vérifiez votre Firewall** : Vous devez ouvrir les plages de ports UDP configurées dans `backend/mediasoup/config.js` (par défaut `10000-10100`).
- **RTC_ANNOUNCED_IP** : Assurez-vous que l'IP publique de votre serveur est correctement renseignée dans la configuration de Mediasoup pour que le WebRTC fonctionne au travers de Nginx.

## 🚀 Activation

### 🧱 ÉTAPE 1 — Activer ton site visio (OBLIGATOIRE)

```bash
sudo ln -s /etc/nginx/sites-available/visio /etc/nginx/sites-enabled/
```

Vérifie :

```bash
ls -l /etc/nginx/sites-enabled/
```

👉 Tu DOIS voir :

```text
visio -> /etc/nginx/sites-available/visio
default -> ...
```

### 🧱 ÉTAPE 2 — Désactiver le site par défaut (IMPORTANT)

Sinon Nginx reste sur le port 80 seulement.

```bash
sudo rm /etc/nginx/sites-enabled/default
```

### 🧱 ÉTAPE 3 — Validation et Redémarrage

```bash
# Tester la configuration
sudo nginx -t

# Recharger Nginx
sudo systemctl reload nginx
```

---

> [!TIP]
> Si vous utilisez des certificats SSL auto-signés générés par le projet, vous pouvez pointer Nginx vers eux dans `backend/ssl/`.
