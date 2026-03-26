#!/bin/bash

# start-local-meet.sh - Lancement de LOCAL MEET
# Ce script ne fait que lancer les services (le setup doit avoir été fait)

echo "🚀 Démarrage de LOCAL MEET"
echo "═══════════════════════════════════════"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Vérification rapide si le setup a été fait (présence du build Next.js)
if [ ! -d "frontend/.next" ] || [ ! -d "backend/node_modules" ]; then
    echo -e "${RED}❌ Le projet ne semble pas configuré.${NC}"
    echo -e "Veuillez exécuter ${YELLOW}./setup.sh${NC} en premier."
    exit 1
fi

# Ports (devraient correspondre à ceux du setup.sh)
FRONTEND_PORT=3000
BACKEND_PORT=3001

# Détection de l'IP (pour affichage)
LOCAL_IP=$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="src") print $(i+1)}')
if [ -z "$LOCAL_IP" ]; then
    LOCAL_IP=$(hostname -I | awk '{print $1}')
fi

# Fonction pour ouvrir le navigateur
open_browser() {
    local url=$1
    echo -e "${CYAN}🌐 Ouverture du navigateur...${NC}"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        open "$url" 2>/dev/null
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        if command -v xdg-open &> /dev/null; then
            xdg-open "$url" 2>/dev/null &
        elif command -v google-chrome &> /dev/null; then
            google-chrome "$url" 2>/dev/null &
        elif command -v firefox &> /dev/null; then
            firefox "$url" 2>/dev/null &
        fi
    fi
}

echo -e "${BLUE}🚀 Démarrage du backend (sur le port $BACKEND_PORT)...${NC}"
PORT=$BACKEND_PORT \
NODE_ENV=production \
UV_THREADPOOL_SIZE=16 \
node --max-old-space-size=4096 \
     --max-semi-space-size=64 \
     backend/cluster.js > backend.log 2>&1 &
BACKEND_PID=$!

echo -e "${YELLOW}⏳ Attente du backend...${NC}"
sleep 3
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${RED}❌ Échec du démarrage du backend. Vérifiez backend.log${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Backend démarré${NC}"

echo -e "${BLUE}🚀 Démarrage du frontend (sur le port $FRONTEND_PORT)...${NC}"
cd frontend
NODE_ENV=production PORT=$FRONTEND_PORT HOST=127.0.0.1 npm start > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

echo -e "${YELLOW}⏳ Attente du frontend...${NC}"
sleep 3
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    echo -e "${RED}❌ Échec du démarrage du frontend. Vérifiez frontend.log${NC}"
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi
echo -e "${GREEN}✅ Frontend démarré en production${NC}"

FINAL_URL="https://$LOCAL_IP"

echo ""
echo "═══════════════════════════════════════"
echo -e "${GREEN}✅ LOCAL MEET est en ligne !${NC}"
echo "═══════════════════════════════════════"
echo -e "📡 URL d'accès : ${YELLOW}$FINAL_URL${NC}"
echo ""
echo -e "ℹ️  Processus :"
echo -e "  Backend PID:  $BACKEND_PID (port $BACKEND_PORT)"
echo -e "  Frontend PID: $FRONTEND_PID (port $FRONTEND_PORT)"
echo -e "  Logs: ./backend.log | ./frontend.log"
echo ""

# Fonction de nettoyage
cleanup() {
    echo -e "\n${YELLOW}🛑 Arrêt des serveurs...${NC}"
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    lsof -ti:$BACKEND_PORT | xargs kill -9 2>/dev/null
    lsof -ti:$FRONTEND_PORT | xargs kill -9 2>/dev/null
    echo -e "${GREEN}✅ Serveurs arrêtés${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

sleep 1
open_browser "$FINAL_URL"
echo -e "${BLUE}Appuyez sur Ctrl+C pour arrêter${NC}"

wait
