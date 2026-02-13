# 🌐 Déploiement avec Nginx

Ce guide détaille comment configurer Nginx comme reverse proxy pour déployer **LOCAL MEET** de manière sécurisée et performante.

## 📋 Pourquoi utiliser Nginx ?

Bien que le projet inclue un script de démarrage gérant le HTTPS, Nginx est recommandé pour une mise en production :
- **Gestion centralisée du SSL** (via Let's Encrypt).
- **Terminaison SSL** plus performante.
- **Sécurité accrue** (masquage des ports réels, filtrage IP).
- **Scalabilité** (possibilité de load balancing).

## 🛠️ Configuration de Nginx

Il existe deux méthodes pour configurer Nginx. La méthode **Recommandée** automatise la mise à jour des ports.

### Option 1 : Méthode Automatique (Recommandée)

Cette méthode lie directement la configuration Nginx au fichier généré par le script de lancement.

1.  **Générez la configuration** en lançant le projet au moins une fois :
    ```bash
    ./start-local-meet.sh
    ```
2.  **Créez un lien symbolique** (à faire une seule fois) :
    ```bash
    sudo ln -sf $(pwd)/nginx-meet.conf /etc/nginx/sites-available/visio
    ```
3.  **Activez le site** (voir section Activation plus bas).

> [!IMPORTANT]
> À chaque fois que vous relancez `./start-local-meet.sh`, si les ports changent, il vous suffit de recharger Nginx : `sudo systemctl reload nginx`.

### Option 2 : Méthode Manuelle

Si vous préférez gérer le fichier vous-même, copiez ce modèle dans `/etc/nginx/sites-available/visio` :

```nginx
server {
    listen 443 ssl;
    server_name localhost;

    ssl_certificate     /chemin/vers/votre/cert.pem;
    ssl_certificate_key /chemin/vers/votre/key.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $remote_addr;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
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
- **RTC_ANNOUNCED_IP** : Assurez-vous que l'IP publique de votre serveur est renseignée dans Mediasoup.

## 🚀 Activation

### 🧱 ÉTAPE 1 — Activer ton site visio
```bash
sudo ln -sf /etc/nginx/sites-available/visio /etc/nginx/sites-enabled/
```

### 🧱 ÉTAPE 2 — Désactiver le site par défaut
```bash
sudo rm -f /etc/nginx/sites-enabled/default
```

### 🧱 ÉTAPE 3 — Validation et Redémarrage
```bash
sudo nginx -t
sudo systemctl reload nginx
```

## ❌ Dépannage : "Permission Denied"

Si `nginx -t` échoue avec une erreur de permission sur les certificats SSL situés dans votre dossier `/home` :

1. **Donnez l'accès au dossier** à Nginx (l'utilisateur `www-data`) :
   ```bash
   # Autorise Nginx à traverser votre dossier home
   chmod +x /home/$(whoami)
   chmod +x /home/$(whoami)/Documents
   ```
2. **OU déplacez les certificats** dans un dossier standard comme `/etc/nginx/certs/` et mettez à jour la configuration.

---

> [!TIP]
> Pour voir les erreurs exactes de Nginx : `sudo journalctl -xeu nginx`
