#!/bin/bash

# Script de démarrage LOCAL MEET avec configuration réseau automatique
# Usage: ./start-local-meet.sh

echo "🚀 Démarrage de LOCAL MEET"
echo "═══════════════════════════════════════"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour obtenir l'IP locale
get_local_ip() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        hostname -I | awk '{print $1}'
    else
        # Windows (Git Bash)
        ipconfig | grep "IPv4" | awk '{print $NF}' | head -n 1
    fi
}

# Obtenir l'IP
LOCAL_IP=$(get_local_ip)

if [ -z "$LOCAL_IP" ]; then
    echo -e "${RED}❌ Impossible de détecter l'adresse IP locale${NC}"
    echo -e "${YELLOW}💡 Veuillez entrer manuellement votre IP:${NC}"
    read -p "IP: " LOCAL_IP
fi

echo -e "${GREEN}📡 Adresse IP détectée: $LOCAL_IP${NC}"
echo ""

# Créer le fichier .env.local pour le frontend
echo -e "${BLUE}📝 Configuration du frontend...${NC}"
ENV_FILE="frontend/.env.local"
echo "NEXT_PUBLIC_BACKEND_URL=https://$LOCAL_IP:3001" > $ENV_FILE
echo -e "${GREEN}✅ Fichier $ENV_FILE créé${NC}"
echo ""

# Vérifier si les dépendances sont installées
echo -e "${BLUE}🔍 Vérification des dépendances...${NC}"

if [ ! -d "backend/node_modules" ]; then
    echo -e "${YELLOW}⚠️  Installation des dépendances backend...${NC}"
    cd backend
    npm install
    cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}⚠️  Installation des dépendances frontend...${NC}"
    cd frontend
    npm install
    cd ..
fi

echo -e "${GREEN}✅ Dépendances vérifiées${NC}"
echo ""

# Démarrer le backend
echo -e "${BLUE}🚀 Démarrage du backend...${NC}"
cd backend
npm start &
BACKEND_PID=$!
cd ..

# Attendre que le backend soit prêt
echo -e "${YELLOW}⏳ Attente du démarrage du backend...${NC}"
sleep 10

# Démarrer le frontend
echo -e "${BLUE}🚀 Démarrage du frontend...${NC}"
cd frontend
npm run dev -- --hostname 0.0.0.0 &
FRONTEND_PID=$!
cd ..

# Attendre que le frontend soit prêt
sleep 10

echo ""
echo "═══════════════════════════════════════"
echo -e "${GREEN}✅ LOCAL MEET démarré avec succès !${NC}"
echo "═══════════════════════════════════════"
echo ""
echo -e "${BLUE}📡 Informations de connexion :${NC}"
echo ""
echo -e "  ${GREEN}Sur cet appareil :${NC}"
echo -e "    Frontend: ${YELLOW}http://localhost:3000${NC}"
echo -e "    Backend:  ${YELLOW}https://localhost:3001${NC}"
echo ""
echo -e "  ${GREEN}Sur d'autres appareils du réseau :${NC}"
echo -e "    Frontend: ${YELLOW}http://$LOCAL_IP:3000${NC}"
echo -e "    Backend:  ${YELLOW}https://$LOCAL_IP:3001${NC}"
echo ""
echo -e "${RED}⚠️  IMPORTANT :${NC}"
echo -e "  1. Acceptez le certificat SSL sur chaque appareil"
echo -e "  2. Allez d'abord sur: ${YELLOW}https://$LOCAL_IP:3001/health${NC}"
echo -e "  3. Acceptez l'avertissement de sécurité"
echo -e "  4. Puis allez sur: ${YELLOW}http://$LOCAL_IP:3000${NC}"
echo ""
echo "═══════════════════════════════════════"
echo ""
echo -e "${BLUE}ℹ️  Processus en cours :${NC}"
echo -e "  Backend PID:  $BACKEND_PID"
echo -e "  Frontend PID: $FRONTEND_PID"
echo ""
echo -e "${YELLOW}Pour arrêter les serveurs :${NC}"
echo -e "  1. Appuyez sur Ctrl+C"
echo -e "  2. Ou exécutez: ${YELLOW}kill $BACKEND_PID $FRONTEND_PID${NC}"
echo ""

# Fonction de nettoyage lors de Ctrl+C
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Arrêt des serveurs...${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo -e "${GREEN}✅ Serveurs arrêtés${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Attendre que l'utilisateur arrête le script
echo -e "${BLUE}Appuyez sur Ctrl+C pour arrêter les serveurs${NC}"
wait