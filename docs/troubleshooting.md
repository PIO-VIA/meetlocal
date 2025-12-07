# 🔧 Dépannage

## Problème : Ports occupés

**Symptôme** : `Error: listen EADDRINUSE`

**Solution** : Le script trouve automatiquement des ports libres. Si manuel :

```bash
# Trouver ce qui utilise le port
lsof -i :3000
lsof -i :3001

# Tuer le processus
kill -9 [PID]
```

## Problème : Certificat SSL refusé

**Symptôme** : `NET::ERR_CERT_AUTHORITY_INVALID`

**Solution** :
1. Acceptez le certificat dans le navigateur
2. Ou régénérez les certificats :
```bash
rm -rf backend/ssl
./start-local-meet.sh
```

## Problème : Pas de vidéo/audio

**Symptôme** : Cadres vidéo noirs ou audio coupé

**Solutions** :
1. Autorisez l'accès caméra/micro dans le navigateur
2. Vérifiez que HTTPS est bien utilisé (HTTP non supporté)
3. Testez avec `chrome://webrtc-internals` (Chrome)

## Problème : Cannot find module

**Symptôme** : `Error: Cannot find module 'mediasoup-client'`

**Solution** :
```bash
# Supprimer et réinstaller
rm -rf backend/node_modules frontend/node_modules
npm install --prefix backend
npm install --prefix frontend
```

## Problème : Le navigateur ne s'ouvre pas

**Cause** : Système non reconnu ou pas de navigateur

**Solution** : Copiez l'URL affichée dans le terminal
