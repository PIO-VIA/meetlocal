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

### Fichier `/etc/nginx/sites-available/meetlocal`

```nginx
server {
    listen 80;
    server_name meet.local; # Remplacez par votre domaine ou IP
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name meet.local;

    # Configuration SSL (Let's Encrypt recommandé)
    ssl_certificate /etc/letsencrypt/live/meet.local/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/meet.local/privkey.pem;
    
    # Optimisation SSL
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;

    # 1. Frontend (Next.js)
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # 2. Backend API & Socket.IO
    location /socket.io/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket timeouts
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }

    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## ⚠️ Important : Mediasoup & UDP

Nginx peut gérer l'HTTP et les WebSockets (signalisation), mais il **ne peut pas** faire proxy pour le trafic média (WebRTC/UDP) de Mediasoup.

- **Vérifiez votre Firewall** : Vous devez ouvrir les plages de ports UDP configurées dans `backend/mediasoup/config.js` (par défaut `10000-10100`).
- **RTC_ANNOUNCED_IP** : Assurez-vous que l'IP publique de votre serveur est correctement renseignée dans la configuration de Mediasoup pour que le WebRTC fonctionne au travers de Nginx.

## 🚀 Activation

```bash
# Activer le site
sudo ln -s /etc/nginx/sites-available/meetlocal /etc/nginx/sites-enabled/

# Tester la configuration
sudo nginx -t

# Recharger Nginx
sudo systemctl reload nginx
```

---

> [!TIP]
> Si vous utilisez des certificats SSL auto-signés générés par le projet, vous pouvez pointer Nginx vers eux dans `backend/ssl/`.
