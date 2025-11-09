'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Initialiser Socket.IO une seule fois
    if (!socketRef.current) {
      console.log('🔌 Tentative de connexion à Socket.IO...');
      
      socketRef.current = io('https://localhost:3001', {
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
        setIsConnected(true);
      });

      socketRef.current.on('disconnect', (reason) => {
        console.log('❌ Socket déconnecté:', reason);
        setIsConnected(false);
      });

      socketRef.current.on('connect_error', (error) => {
        console.error('🔴 Erreur de connexion Socket.IO:', error.message);
        console.error('Type d\'erreur:', error);
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