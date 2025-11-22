#!/bin/bash

# Script de démarrage LOCAL MEET avec HTTPS complet
# Usage: ./start-local-meet.sh

echo "🚀 Démarrage de LOCAL MEET (HTTPS complet)"
echo "═══════════════════════════════════════"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Fonction pour obtenir l'IP locale
get_local_ip() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        hostname -I | awk '{print $1}'
    else
        ipconfig | grep "IPv4" | awk '{print $NF}' | head -n 1 | tr -d '\r'
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

# Vérifier les certificats SSL
echo -e "${BLUE}🔐 Vérification des certificats SSL...${NC}"
if [ ! -f "backend/ssl/cert.pem" ] || [ ! -f "backend/ssl/key.pem" ]; then
    echo -e "${RED}❌ Certificats SSL manquants${NC}"
    echo -e "${YELLOW}Génération automatique...${NC}"
    
    mkdir -p backend/ssl
    cd backend/ssl
    
    # Générer les certificats
    openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes \
        -subj "/C=CM/ST=Centre/L=Yaounde/O=LocalMeet/CN=$LOCAL_IP" \
        -addext "subjectAltName=IP:$LOCAL_IP,IP:127.0.0.1,DNS:localhost"
    
    cd ../..
    echo -e "${GREEN}✅ Certificats générés${NC}"
else
    echo -e "${GREEN}✅ Certificats SSL présents${NC}"
fi
echo ""

# Démarrer le backend
echo -e "${BLUE}🚀 Démarrage du backend...${NC}"
cd backend
npm start &
BACKEND_PID=$!
cd ..

# Attendre que le backend soit prêt
echo -e "${YELLOW}⏳ Attente du démarrage du backend...${NC}"
sleep 8

# Démarrer le frontend avec HTTPS
echo -e "${BLUE}🚀 Démarrage du frontend (HTTPS)...${NC}"
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

# Attendre que le frontend soit prêt
sleep 8

echo ""
echo "═══════════════════════════════════════"
echo -e "${GREEN}✅ LOCAL MEET démarré avec succès !${NC}"
echo "═══════════════════════════════════════"
echo ""
echo -e "${BLUE}📡 Informations de connexion :${NC}"
echo ""
echo -e "  ${GREEN}Sur cet appareil :${NC}"
echo -e "    Frontend: ${YELLOW}https://localhost:3000${NC}"
echo -e "    Backend:  ${YELLOW}https://localhost:3001${NC}"
echo ""
echo -e "  ${GREEN}Sur d'autres appareils du réseau :${NC}"
echo -e "    Frontend: ${YELLOW}https://$LOCAL_IP:3000${NC}"
echo -e "    Backend:  ${YELLOW}https://$LOCAL_IP:3001${NC}"
echo ""
echo -e "${RED}⚠️  IMPORTANT - ACCEPTER LES CERTIFICATS SSL :${NC}"
echo ""
echo -e "  ${YELLOW}Étape 1: Backend${NC}"
echo -e "    Allez sur: ${BLUE}https://$LOCAL_IP:3001/health${NC}"
echo -e "    Cliquez: Avancé > Continuer vers le site"
echo ""
echo -e "  ${YELLOW}Étape 2: Frontend${NC}"
echo -e "    Allez sur: ${BLUE}https://$LOCAL_IP:3000${NC}"
echo -e "    Cliquez: Avancé > Continuer vers le site"
echo ""
echo -e "  ${GREEN}✅ Répétez sur CHAQUE appareil${NC}"
echo ""
echo "═══════════════════════════════════════"
echo ""
echo -e "${BLUE}ℹ️  Processus en cours :${NC}"
echo -e "  Backend PID:  $BACKEND_PID"
echo -e "  Frontend PID: $FRONTEND_PID"
echo ""
echo -e "${YELLOW}💡 Pourquoi HTTPS ?${NC}"
echo -e "  Les API caméra, micro et partage d'écran"
echo -e "  nécessitent HTTPS pour des raisons de sécurité."
echo ""
echo -e "${YELLOW}Pour arrêter les serveurs :${NC}"
echo -e "  Appuyez sur ${RED}Ctrl+C${NC}"
echo ""

# Fonction de nettoyage
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Arrêt des serveurs...${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    echo -e "${GREEN}✅ Serveurs arrêtés${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Attendre
echo -e "${BLUE}Appuyez sur Ctrl+C pour arrêter${NC}"
wait1