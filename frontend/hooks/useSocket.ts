'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Initialiser Socket.IO une seule fois
    if (!socketRef.current) {
      // Utiliser la variable d'environnement ou localhost par défaut
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://localhost:3001';
      
      console.log('🔌 Tentative de connexion à Socket.IO...');
      console.log('📡 URL du backend:', backendUrl);
      
      socketRef.current = io( backendUrl, {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        timeout: 20000,
        secure: true,
        rejectUnauthorized: false, // Important pour certificats auto-signés
      });

      socketRef.current.on('connect', () => {
        console.log('✅ Socket connecté avec succès !');
        console.log('📡 Socket ID:', socketRef.current?.id);
        console.log('🌐 Connecté à:', backendUrl);
        setIsConnected(true);
      });

      socketRef.current.on('disconnect', (reason) => {
        console.log('❌ Socket déconnecté:', reason);
        setIsConnected(false);
      });

      socketRef.current.on('connect_error', (error) => {
        console.error('🔴 Erreur de connexion Socket.IO:', error.message);
        console.error('Type d\'erreur:', error);
        console.error('💡 Vérifications:');
        console.error('   1. Le backend est-il démarré ?');
        console.error('   2. Avez-vous accepté le certificat SSL ?');
        console.error('   3. URL correcte dans .env.local ?');
        setIsConnected(false);
      });

      socketRef.current.on('reconnect_attempt', (attempt) => {
        console.log(`🔄 Tentative de reconnexion #${attempt}...`);
      });

      socketRef.current.on('reconnect', (attempt) => {
        console.log(`✅ Reconnecté après ${attempt} tentatives`);
        setIsConnected(true);
      });
    }

    return () => {
      if (socketRef.current) {
        console.log('🔌 Déconnexion du socket...');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  return { socket: socketRef.current, isConnected };
};