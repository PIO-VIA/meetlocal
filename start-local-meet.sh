#!/bin/bash

# Script de démarrage LOCAL MEET avec HTTPS - Version optimisée
# Usage: ./start-local-meet.sh

echo "🚀 Démarrage de LOCAL MEET (HTTPS complet)"
echo "═══════════════════════════════════════"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Ports par défaut
DEFAULT_FRONTEND_PORT=3000
DEFAULT_BACKEND_PORT=3001

# Fonction pour vérifier si un port est disponible
is_port_available() {
    ! nc -z localhost $1 2>/dev/null
}

# Fonction pour trouver un port disponible
find_available_port() {
    local start_port=$1
    local max_port=$((start_port + 100))

    for port in $(seq $start_port $max_port); do
        if is_port_available $port; then
            echo $port
            return 0
        fi
    done

    echo ""
    return 1
}

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

# Fonction pour ouvrir le navigateur
open_browser() {
    local url=$1
    echo -e "${CYAN}🌐 Ouverture du navigateur...${NC}"

    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        open "$url" 2>/dev/null
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        if command -v xdg-open &> /dev/null; then
            xdg-open "$url" 2>/dev/null &
        elif command -v google-chrome &> /dev/null; then
            google-chrome "$url" 2>/dev/null &
        elif command -v firefox &> /dev/null; then
            firefox "$url" 2>/dev/null &
        fi
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        # Windows
        start "$url" 2>/dev/null
    fi
}

# Fonction pour vérifier les versions de Node et NPM
check_versions() {
    local min_node=20
    local min_npm=10

    echo -e "${BLUE}🔍 Vérification de l'environnement...${NC}"

    # Vérifier Node.js
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js n'est pas installé.${NC}"
        exit 1
    fi

    local node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$node_version" -lt "$min_node" ]; then
        echo -e "${RED}❌ Version de Node.js insuffisante : v$(node -v)${NC}"
        echo -e "${YELLOW}💡 Vous devez utiliser au moins Node.js v${min_node}.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Node.js v$(node -v) détecté${NC}"

    # Vérifier NPM
    if ! command -v npm &> /dev/null; then
        echo -e "${RED}❌ NPM n'est pas installé.${NC}"
        exit 1
    fi

    local npm_version=$(npm -v | cut -d'.' -f1)
    if [ "$npm_version" -lt "$min_npm" ]; then
        echo -e "${RED}❌ Version de NPM insuffisante : $(npm -v)${NC}"
        echo -e "${YELLOW}💡 Vous devez utiliser au moins NPM v${min_npm}.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ NPM v$(npm -v) détecté${NC}"
    echo ""
}

# Exécuter les vérifications
check_versions

# Obtenir l'IP
LOCAL_IP=$(get_local_ip)

if [ -z "$LOCAL_IP" ]; then
    echo -e "${RED}❌ Impossible de détecter l'adresse IP locale${NC}"
    echo -e "${YELLOW}💡 Veuillez entrer manuellement votre IP:${NC}"
    read -p "IP: " LOCAL_IP
fi

echo -e "${GREEN}📡 Adresse IP détectée: $LOCAL_IP${NC}"
echo ""

# Vérifier et trouver les ports disponibles
echo -e "${BLUE}🔍 Recherche de ports disponibles...${NC}"

# Trouver un port pour le frontend (commence à 3000)
FRONTEND_PORT=$(find_available_port $DEFAULT_FRONTEND_PORT)
if [ -z "$FRONTEND_PORT" ]; then
    echo -e "${RED}❌ Impossible de trouver un port disponible pour le frontend${NC}"
    exit 1
fi

# Trouver un port pour le backend (commence à 3001)
BACKEND_PORT=$(find_available_port $DEFAULT_BACKEND_PORT)
# S'assurer que le port backend n'est pas le même que le frontend
if [ "$BACKEND_PORT" == "$FRONTEND_PORT" ]; then
    BACKEND_PORT=$(find_available_port $((FRONTEND_PORT + 1)))
fi

if [ -z "$BACKEND_PORT" ]; then
    echo -e "${RED}❌ Impossible de trouver un port disponible pour le backend${NC}"
    exit 1
fi

if [ "$FRONTEND_PORT" != "$DEFAULT_FRONTEND_PORT" ]; then
    echo -e "${YELLOW}⚠️  Port frontend $DEFAULT_FRONTEND_PORT occupé, utilisation du port $FRONTEND_PORT${NC}"
fi

if [ "$BACKEND_PORT" != "$DEFAULT_BACKEND_PORT" ]; then
    echo -e "${YELLOW}⚠️  Port backend $DEFAULT_BACKEND_PORT occupé, utilisation du port $BACKEND_PORT${NC}"
fi

echo -e "${GREEN}✅ Ports sélectionnés: Frontend=$FRONTEND_PORT, Backend=$BACKEND_PORT${NC}"
echo ""

# Générer la configuration Nginx dynamique
echo -e "${BLUE}⚙️  Génération de la configuration Nginx dynamique...${NC}"
NGINX_CONF="nginx-meet.conf"
cat > $NGINX_CONF << EOF
server {
    listen 443 ssl;
    server_name localhost;

    ssl_certificate     $(pwd)/backend/ssl/cert.pem;
    ssl_certificate_key $(pwd)/backend/ssl/key.pem;

    location / {
        proxy_pass http://127.0.0.1:$FRONTEND_PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Forwarded-For \$remote_addr;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    location /api/ {
        proxy_pass http://127.0.0.1:$BACKEND_PORT/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
    }
}
EOF
echo -e "${GREEN}✅ Fichier $NGINX_CONF généré avec succès${NC}"
echo -e "${YELLOW}💡 Note: Utilisez ce fichier pour votre configuration Nginx locale${NC}"
echo ""

# Créer le fichier .env.local pour le frontend
echo -e "${BLUE}📝 Configuration du frontend...${NC}"
ENV_FILE="frontend/.env.local"
cat > $ENV_FILE << EOF
NEXT_PUBLIC_BACKEND_URL=/api
PORT=$FRONTEND_PORT
EOF
echo -e "${GREEN}✅ Fichier $ENV_FILE créé${NC}"
echo ""

# Créer le fichier .env pour le backend
echo -e "${BLUE}📝 Configuration du backend...${NC}"
BACKEND_ENV="backend/.env"
cat > $BACKEND_ENV << EOF
PORT=$BACKEND_PORT
NODE_ENV=development
EOF
echo -e "${GREEN}✅ Fichier $BACKEND_ENV créé${NC}"
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
        -addext "subjectAltName=IP:$LOCAL_IP,IP:127.0.0.1,DNS:localhost" 2>/dev/null

    cd ../..
    echo -e "${GREEN}✅ Certificats générés${NC}"
else
    echo -e "${GREEN}✅ Certificats SSL présents${NC}"
fi
echo ""

# Démarrer le backend
echo -e "${BLUE}🚀 Démarrage du backend sur le port $BACKEND_PORT...${NC}"
cd backend
PORT=$BACKEND_PORT npm start > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# Attendre que le backend soit prêt
echo -e "${YELLOW}⏳ Attente du démarrage du backend...${NC}"
sleep 5

# Vérifier si le backend a démarré
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo -e "${RED}❌ Échec du démarrage du backend${NC}"
    echo -e "${YELLOW}Logs:${NC}"
    tail -n 20 backend.log
    exit 1
fi

echo -e "${GREEN}✅ Backend démarré${NC}"

# Démarrer le frontend en production
echo -e "${BLUE}🔨 Construction du frontend en production...${NC}"
cd frontend
npm run build
echo -e "${GREEN}✅ Build terminé${NC}"

echo -e "${BLUE}🚀 Démarrage du frontend en production sur le port $FRONTEND_PORT...${NC}"
NODE_ENV=production PORT=$FRONTEND_PORT HOST=0.0.0.0 npm start > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..


# Attendre que le frontend soit prêt
echo -e "${YELLOW}⏳ Attente du démarrage du frontend...${NC}"
sleep 5

# Vérifier si le frontend a démarré
if ! kill -0 $FRONTEND_PID 2>/dev/null; then
    echo -e "${RED}❌ Échec du démarrage du frontend${NC}"
    echo -e "${YELLOW}Logs:${NC}"
    tail -n 20 frontend.log
    kill $BACKEND_PID 2>/dev/null
    exit 1
fi

echo -e "${GREEN}✅ Frontend démarré en mode PRODUCTION${NC}"
echo ""

# URLs (Via Nginx Proxy)
FINAL_URL="https://$LOCAL_IP"

echo ""
echo "═══════════════════════════════════════"
echo -e "${GREEN}✅ LOCAL MEET démarré avec succès !${NC}"
echo "═══════════════════════════════════════"
echo ""
echo -e "${BLUE}📡 Accès à l'application :${NC}"
echo ""
echo -e "  ${GREEN}URL Unique :${NC} ${YELLOW}$FINAL_URL${NC}"
echo ""
echo -e "${RED}⚠️  NOTE :${NC}"
echo ""
echo -e "  L'application est maintenant accessible via Nginx."
echo -e "  Le frontend (port $FRONTEND_PORT) et le backend (port $BACKEND_PORT) sont internes."
echo ""
echo "═══════════════════════════════════════"
echo ""
echo -e "${BLUE}ℹ️  Processus en cours :${NC}"
echo -e "  Backend PID:  $BACKEND_PID (port $BACKEND_PORT)"
echo -e "  Frontend PID: $FRONTEND_PID (port $FRONTEND_PORT)"
echo ""
echo -e "${CYAN}📂 Logs disponibles :${NC}"
echo -e "  Backend:  ./backend.log"
echo -e "  Frontend: ./frontend.log"
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

    # Tuer tous les processus Node.js liés aux ports
    lsof -ti:$BACKEND_PORT | xargs kill -9 2>/dev/null
    lsof -ti:$FRONTEND_PORT | xargs kill -9 2>/dev/null

    echo -e "${GREEN}✅ Serveurs arrêtés${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Attendre un peu puis ouvrir le navigateur
sleep 2
echo -e "${CYAN}🌐 Ouverture automatique du navigateur...${NC}"
open_browser "$FINAL_URL"

echo ""
echo -e "${GREEN}✨ Votre navigateur s'est ouvert automatiquement !${NC}"
echo -e "${YELLOW}   Acceptez le certificat auto-signé pour continuer${NC}"
echo ""
echo -e "${BLUE}Appuyez sur Ctrl+C pour arrêter${NC}"

# Attendre
wait
