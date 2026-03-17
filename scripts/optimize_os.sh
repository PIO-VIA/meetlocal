#!/bin/bash

# Local Meet - Script d'optimisation du système (OS)
# Optimise les limites de fichiers et les paramètres réseau pour HP ProBook 470 G3

if [[ $EUID -ne 0 ]]; then
   echo "Ce script doit être exécuté en tant que root (sudo ./optimize_os.sh)"
   exit 1
fi

echo "🚀 Application des optimisations système pour Local Meet..."

# 1. Configurer sysctl.conf
SYSCTL_CONF="/etc/sysctl.conf"
cat >> $SYSCTL_CONF << EOF

# Optimisations Local Meet
fs.file-max = 2097152
net.core.somaxconn = 65535
net.core.netdev_max_backlog = 65535
net.ipv4.tcp_max_syn_backlog = 65535
net.ipv4.tcp_tw_reuse = 1
net.ipv4.tcp_fin_timeout = 15
net.ipv4.ip_local_port_range = 1024 65535
net.ipv4.tcp_keepalive_time = 300
net.ipv4.tcp_keepalive_intvl = 30
net.ipv4.tcp_keepalive_probes = 5
EOF

sysctl -p

# 2. Configurer limits.conf
LIMITS_CONF="/etc/security/limits.conf"
cat >> $LIMITS_CONF << EOF

* soft nofile 1048576
* hard nofile 1048576
root soft nofile 1048576
root hard nofile 1048576
EOF

# 3. Configurer common-session (PAM)
PAM_FILE="/etc/pam.d/common-session"
if ! grep -q "pam_limits.so" "$PAM_FILE"; then
    echo "session required pam_limits.so" >> "$PAM_FILE"
fi

# 4. Configurer systemd
SYSTEMD_CONF="/etc/systemd/system.conf"
sed -i 's/#DefaultLimitNOFILE=/DefaultLimitNOFILE=1048576/' $SYSTEMD_CONF
systemctl daemon-reload

echo "✅ Optimisations appliquées avec succès."
echo "⚠️  Il est recommandé de redémarrer le système pour que tous les changements (PAM/limits) soient effectifs."
