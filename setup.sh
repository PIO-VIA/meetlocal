#!/bin/bash

# Script d'installation automatique pour LOCAL MEET
# Usage: ./setup.sh

echo "🚀 Installation et Configuration de LOCAL MEET"
echo "═══════════════════════════════════════"

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Check if apt is available, this assumes Debian/Ubuntu
if ! command -v apt-get &> /dev/null; then
    echo -e "${RED}❌ Ce script nécessite apt-get (Debian/Ubuntu).${NC}"
    exit 1
fi

echo -e "${YELLOW}⚠️ Ce script peut nécessiter votre mot de passe sudo pour installer des paquets.${NC}"
sudo -v

# 1. Vérification et installation de Nginx
echo -e "\n${BLUE}🔍 1. Vérification de Nginx...${NC}"
if ! command -v nginx &> /dev/null; then
    echo -e "${YELLOW}Nginx n'est pas installé. Installation en cours...${NC}"
    sudo apt-get update
    sudo apt-get install -y nginx
    echo -e "${GREEN}✅ Nginx installé avec succès.${NC}"
else
    echo -e "${GREEN}✅ Nginx est déjà installé.${NC}"
fi

# 2. Vérification et installation de Node.js et npm
echo -e "\n${BLUE}🔍 2. Vérification de Node.js et npm (v20+ requise)...${NC}"
MIN_NODE=20
NEEDS_NODE_INSTALL=false

if ! command -v node &> /dev/null; then
    NEEDS_NODE_INSTALL=true
else
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt "$MIN_NODE" ]; then
        echo -e "${YELLOW}Version de Node.js détectée ($NODE_VERSION) est inférieure à la v20.${NC}"
        NEEDS_NODE_INSTALL=true
    fi
fi

if [ "$NEEDS_NODE_INSTALL" = true ]; then
    echo -e "${YELLOW}Installation de Node.js v20 via NodeSource...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
    echo -e "${GREEN}✅ Node.js $(node -v) installé avec succès.${NC}"
else
    echo -e "${GREEN}✅ Node.js $(node -v) est déjà installé et valide.${NC}"
fi

# 3. Détection de l'IP Locale
echo -e "\n${BLUE}🔍 3. Détection de l'IP locale...${NC}"
LOCAL_IP=$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if($i=="src") print $(i+1)}')
if [ -z "$LOCAL_IP" ]; then
    LOCAL_IP=$(hostname -I | awk '{print $1}')
fi
if [ -z "$LOCAL_IP" ]; then
    echo -e "${YELLOW}⚠️ Impossible de détecter l'IP automatiquement.${NC}"
    read -p "Veuillez entrer votre IP locale manuellement : " LOCAL_IP
fi
echo -e "${GREEN}📡 IP locale définie sur : $LOCAL_IP${NC}"

# Ports pour l'application
FRONTEND_PORT=3000
BACKEND_PORT=3001

# 4. Génération des certificats SSL
echo -e "\n${BLUE}🔐 4. Configuration des certificats SSL...${NC}"
mkdir -p backend/ssl
if [ ! -f "backend/ssl/cert.pem" ] || [ ! -f "backend/ssl/key.pem" ]; then
    echo -e "${YELLOW}Génération des certificats auto-signés...${NC}"
    cd backend/ssl
    openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes \
        -subj "/C=FR/ST=Local/L=Local/O=LocalMeet/CN=$LOCAL_IP" \
        -addext "subjectAltName=IP:$LOCAL_IP,IP:127.0.0.1,DNS:localhost" 2>/dev/null
    cd ../..
    echo -e "${GREEN}✅ Certificats générés dans backend/ssl/${NC}"
else
    echo -e "${GREEN}✅ Certificats SSL déjà présents.${NC}"
fi

# 5. Configuration des fichiers .env
echo -e "\n${BLUE}📝 5. Génération des fichiers de configuration .env...${NC}"
cat > frontend/.env.local << EOF
NEXT_PUBLIC_BACKEND_URL=/api
PORT=$FRONTEND_PORT
EOF
echo -e "${GREEN}✅ frontend/.env.local créé${NC}"

cat > backend/.env << EOF
PORT=$BACKEND_PORT
NODE_ENV=development
EOF
echo -e "${GREEN}✅ backend/.env créé${NC}"

# 6. Installation des dépendances du projet
echo -e "\n${BLUE}📦 6. Installation des dépendances NPM...${NC}"
echo -e "${YELLOW}Installation frontend...${NC}"
(cd frontend && npm install)
echo -e "${YELLOW}Installation backend...${NC}"
(cd backend && npm install)
echo -e "${GREEN}✅ Dépendances installées.${NC}"

# 7. Build du Frontend
echo -e "\n${BLUE}🔨 7. Compilation du Frontend (Next.js)...${NC}"
(cd frontend && npm run build)
echo -e "${GREEN}✅ Build terminé.${NC}"

# 8. Configuration de Nginx
echo -e "\n${BLUE}⚙️  8. Configuration de Nginx...${NC}"
NGINX_CONF="/etc/nginx/sites-available/meetlocal"

cat > meetlocal_nginx.tmp << EOF
server {
    listen 443 ssl;
    server_name $LOCAL_IP;

    ssl_certificate     $(pwd)/backend/ssl/cert.pem;
    ssl_certificate_key $(pwd)/backend/ssl/key.pem;

    location / {
        proxy_pass http://127.0.0.1:$FRONTEND_PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
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

sudo mv meetlocal_nginx.tmp $NGINX_CONF

echo -e "${YELLOW}Activation de la configuration Nginx meetlocal...${NC}"
sudo ln -sf /etc/nginx/sites-available/meetlocal /etc/nginx/sites-enabled/
# Désactiver le site par défaut si présent
sudo rm -f /etc/nginx/sites-enabled/default

sudo nginx -t
if [ $? -eq 0 ]; then
    sudo systemctl restart nginx
    echo -e "${GREEN}✅ Nginx configuré et redémarré avec succès.${NC}"
else
    echo -e "${RED}❌ Problème dans la configuration Nginx. Vérifiez la syntaxe.${NC}"
fi

echo -e "\n═══════════════════════════════════════"
echo -e "${GREEN}🎉 INSTALLATION TERMINÉE !${NC}"
echo -e "Vous pouvez maintenant lancer l'application avec :"
echo -e "${CYAN}./start-local-meet.sh${NC}"
echo -e "L'application sera accessible sur : ${YELLOW}https://$LOCAL_IP${NC}"
echo -e "═══════════════════════════════════════\n"
