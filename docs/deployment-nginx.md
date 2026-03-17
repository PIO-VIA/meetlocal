# 🌐 Déploiement avec Nginx

Ce guide détaille comment configurer Nginx comme reverse proxy pour déployer **LOCAL MEET** de manière sécurisée et performante.

## 📋 Pourquoi utiliser Nginx ?

Nginx est recommandé pour une mise en production pour plusieurs raisons :
- **Gestion centralisée du SSL** (via Let's Encrypt).
- **Terminaison SSL** plus performante.
- **Sécurité accrue** (masquage des ports réels, filtrage IP).
- **Scalabilité** (possibilité de load balancing).

---

## 🛠️ ÉTAPE 1 — Installation de Nginx

Si Nginx n'est pas encore installé sur votre serveur (Ubuntu/Debian), exécutez les commandes suivantes :

```bash
sudo apt update
sudo apt install nginx -y
```

Vérifiez que le service est actif :
```bash
sudo systemctl status nginx
```

---

## 🏗️ ÉTAPE 2 — Création du fichier de configuration "visio"

Il existe deux méthodes pour configurer Nginx. La méthode **Automatique** est fortement recommandée car elle s'adapte aux changements de ports.

### Option A : Méthode Automatique (Recommandée)

Cette méthode lie directement la configuration Nginx au fichier généré dynamiquement par le script de lancement.

1.  **Générez la configuration** en lançant le projet au moins une fois :
    ```bash
    ./start-local-meet.sh
    ```
2.  **Créez un lien symbolique** vers le fichier généré :
    ```bash
    sudo ln -sf $(pwd)/nginx-meet.conf /etc/nginx/sites-available/visio
    ```

### Option B : Méthode Manuelle

Si vous préférez gérer le fichier manuellement, créez le fichier `/etc/nginx/sites-available/visio` :
```bash
sudo nano /etc/nginx/sites-available/visio
```

Collez-y ce modèle optimisé pour la haute charge :

```nginx
upstream backend_nodes {
    ip_hash;
    server 127.0.0.1:3001;
    keepalive 512;
}

upstream frontend_nodes {
    server 127.0.0.1:3000;
    keepalive 256;
}

server {
    listen 443 ssl;
    server_name localhost;

    ssl_certificate     /chemin/vers/votre/cert.pem;
    ssl_certificate_key /chemin/vers/votre/key.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:50m;
    ssl_session_timeout 1d;

    location / {
        proxy_pass http://frontend_nodes;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Pour le hot-reload Next.js en dev (WebSocket HMR)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location /api/ {
        proxy_pass http://backend_nodes/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # Timeouts longs pour les WebSocket
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
        proxy_connect_timeout 10s;

        # Désactiver le buffering pour les WebSocket
        proxy_buffering off;
    }
}
```

---

## 🚀 ÉTAPE 3 — Activation et Nettoyage

### 1. Activer le site "visio"
Créez un lien symbolique dans le dossier `sites-enabled` :
```bash
sudo ln -sf /etc/nginx/sites-available/visio /etc/nginx/sites-enabled/
```

### 2. Désactiver le site par défaut
Il est crucial de désactiver la configuration par défaut pour éviter les conflits :
```bash
sudo rm -f /etc/nginx/sites-enabled/default
```

### 3. Validation et Redémarrage
Testez toujours votre configuration avant de redémarrer :
```bash
sudo nginx -t
```
Si le test est réussi (`syntax is ok`), rechargez Nginx :
```bash
sudo systemctl reload nginx
```

---

## ⚠️ Important : Mediasoup & UDP

Nginx peut gérer l'HTTP et les WebSockets (signalisation), mais il **ne peut pas** faire proxy pour le trafic média (WebRTC/UDP).

- **Ouvrir le Firewall** : Vous devez ouvrir les plages de ports UDP configurées dans `backend/mediasoup/config.js` (par défaut `10000-10100`).
- **RTC_ANNOUNCED_IP** : Assurez-vous que l'IP publique de votre serveur est configurée.

---

## ❌ Dépannage : "Permission Denied"

Si `nginx -t` échoue avec une erreur de permission sur les certificats SSL situés dans votre dossier `/home` :

1. **Donnez l'accès au dossier** à Nginx (l'utilisateur `www-data`) :
   ```bash
   chmod +x /home/$(whoami)
   chmod +x /home/$(whoami)/Documents
   ```
2. **OU déplacez les certificats** dans `/etc/nginx/certs/`.

> [!TIP]
> Pour voir les erreurs exactes : `sudo journalctl -xeu nginx`
