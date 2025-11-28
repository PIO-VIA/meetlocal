#!/bin/bash

echo "🔐 Configuration de certificats SSL de confiance avec mkcert"
echo "═══════════════════════════════════════════════════════"

# Vérifier si mkcert est installé
if ! command -v mkcert &> /dev/null; then
    echo "❌ mkcert n'est pas installé"
    echo ""
    echo "Installation :"
    echo "  - macOS: brew install mkcert"
    echo "  - Linux: Voir https://github.com/FiloSottile/mkcert#linux"
    echo "  - Windows: choco install mkcert"
    exit 1
fi

# Obtenir l'IP locale
get_local_ip() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        hostname -I | awk '{print $1}'
    else
        ipconfig | grep "IPv4" | awk '{print $NF}' | head -n 1 | tr -d '\r'
    fi
}

LOCAL_IP=$(get_local_ip)
echo "📡 Adresse IP locale: $LOCAL_IP"
echo ""

# Installer l'autorité de certification locale
echo "📝 Installation de l'autorité de certification (CA) locale..."
mkcert -install

# Créer le dossier SSL
mkdir -p backend/ssl

# Générer les certificats pour localhost ET l'IP locale
echo "🔑 Génération des certificats SSL de confiance..."
cd backend/ssl

mkcert \
  localhost \
  127.0.0.1 \
  $LOCAL_IP \
  "*.local" \
  ::1

# Renommer les fichiers pour correspondre à la configuration existante
mv localhost+4.pem cert.pem
mv localhost+4-key.pem key.pem

cd ../..

echo ""
echo "✅ Certificats SSL de confiance générés avec succès !"
echo ""
echo "📂 Emplacement: backend/ssl/"
echo "   - cert.pem"
echo "   - key.pem"
echo ""
echo "🎉 Vos navigateurs font maintenant confiance à ces certificats !"
echo ""
echo "🚀 Vous pouvez maintenant lancer: ./start-local-meet.sh"
