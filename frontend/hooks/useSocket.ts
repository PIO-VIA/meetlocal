'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'reconnecting';

interface SocketState {
  socket: Socket | null;
  isConnected: boolean;
  status: ConnectionStatus;
  error: string | null;
  reconnectAttempts: number;
  latency: number;
}

export const useSocket = () => {
  const [state, setState] = useState<SocketState>({
    socket: null,
    isConnected: false,
    status: 'disconnected',
    error: null,
    reconnectAttempts: 0,
    latency: 0
  });

  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const latencyIntervalRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);

  // Mesurer la latence
  const measureLatency = useCallback(() => {
    if (!socketRef.current?.connected) return;

    const start = Date.now();
    socketRef.current.emit('ping', () => {
      const latency = Date.now() - start;
      setState(prev => ({ ...prev, latency }));
    });
  }, []);

  // Vérifier la connexion SSL
  const checkSSLConnection = useCallback(async () => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://localhost:3001';
    
    try {
      const response = await fetch(`${backendUrl}/health`, {
        method: 'GET',
        mode: 'cors',
      });
      
      if (!response.ok) {
        console.warn('⚠️ Backend accessible mais retourne une erreur');
      }
      
      return true;
    } catch (error) {
      console.error('❌ Impossible de contacter le backend:', error);
      setState(prev => ({
        ...prev,
        status: 'error',
        error: 'Impossible de contacter le serveur. Assurez-vous d\'avoir accepté le certificat SSL.'
      }));
      return false;
    }
  }, []);

  // Initialiser Socket.IO
  const initSocket = useCallback(async () => {
    if (socketRef.current?.connected) {
      console.log('✅ Socket déjà connecté');
      return;
    }

    setState(prev => ({ ...prev, status: 'connecting' }));

    // Vérifier la connexion SSL d'abord
    const sslOk = await checkSSLConnection();
    if (!sslOk) {
      return;
    }

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://localhost:3001';
    
    console.log('🔌 Tentative de connexion Socket.IO...');
    console.log('📡 URL:', backendUrl);

    try {
      const socket = io(backendUrl, {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        secure: true,
        rejectUnauthorized: false,
        autoConnect: true,
        forceNew: false,
        multiplex: true,
        // Options supplémentaires pour réseau local
        upgrade: true,
        rememberUpgrade: true,
        perMessageDeflate: false
      });

      socketRef.current = socket;

      // ===== ÉVÉNEMENTS DE CONNEXION =====
      socket.on('connect', () => {
        console.log('✅ Socket connecté avec succès!');
        console.log('📡 Socket ID:', socket.id);
        console.log('🔗 Transport utilisé:', socket.io.engine.transport.name);
        
        reconnectAttemptsRef.current = 0;
        
        setState(prev => ({
          ...prev,
          socket,
          isConnected: true,
          status: 'connected',
          error: null,
          reconnectAttempts: 0
        }));

        // Démarrer la mesure de latence
        if (latencyIntervalRef.current) {
          clearInterval(latencyIntervalRef.current);
        }
        latencyIntervalRef.current = setInterval(measureLatency, 5000);
      });

      socket.on('disconnect', (reason) => {
        console.log('❌ Socket déconnecté:', reason);
        
        setState(prev => ({
          ...prev,
          isConnected: false,
          status: reason === 'io client disconnect' ? 'disconnected' : 'reconnecting'
        }));

        if (latencyIntervalRef.current) {
          clearInterval(latencyIntervalRef.current);
        }
      });

      socket.on('connect_error', (error) => {
        console.error('🔴 Erreur de connexion Socket.IO:', error.message);
        
        reconnectAttemptsRef.current += 1;
        
        let errorMessage = 'Erreur de connexion au serveur';
        
        if (error.message.includes('xhr poll error')) {
          errorMessage = 'Problème réseau. Vérifiez votre connexion.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Timeout de connexion. Le serveur est-il démarré?';
        } else if (error.message.includes('certificate')) {
          errorMessage = 'Erreur SSL. Avez-vous accepté le certificat?';
        }

        setState(prev => ({
          ...prev,
          status: 'error',
          error: errorMessage,
          reconnectAttempts: reconnectAttemptsRef.current
        }));
      });

      socket.on('reconnect_attempt', (attempt) => {
        console.log(`🔄 Tentative de reconnexion #${attempt}...`);
        
        setState(prev => ({
          ...prev,
          status: 'reconnecting',
          reconnectAttempts: attempt
        }));
      });

      socket.on('reconnect', (attempt) => {
        console.log(`✅ Reconnecté après ${attempt} tentative(s)`);
        
        reconnectAttemptsRef.current = 0;
        
        setState(prev => ({
          ...prev,
          isConnected: true,
          status: 'connected',
          error: null,
          reconnectAttempts: 0
        }));
      });

      socket.on('reconnect_failed', () => {
        console.error('❌ Échec de toutes les tentatives de reconnexion');
        
        setState(prev => ({
          ...prev,
          status: 'error',
          error: 'Impossible de se reconnecter au serveur'
        }));
      });

      // ===== ÉVÉNEMENTS DE TRANSPORT =====
      socket.io.engine.on('upgrade', (transport) => {
        console.log('⬆️ Transport amélioré vers:', transport.name);
      });

      socket.io.engine.on('packet', ({ type, data }) => {
        if (type === 'pong') {
          // Latence mise à jour automatiquement par Socket.IO
        }
      });

      // ===== ÉVÉNEMENTS D'ERREUR GLOBAUX =====
      socket.on('error', (error) => {
        console.error('❌ Erreur Socket.IO:', error);
      });

    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation du socket:', error);
      setState(prev => ({
        ...prev,
        status: 'error',
        error: 'Erreur d\'initialisation du socket'
      }));
    }
  }, [checkSSLConnection, measureLatency]);

  // Déconnecter proprement
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      console.log('🔌 Déconnexion du socket...');
      socketRef.current.disconnect();
      socketRef.current = null;
      
      setState({
        socket: null,
        isConnected: false,
        status: 'disconnected',
        error: null,
        reconnectAttempts: 0,
        latency: 0
      });
    }
    
    if (latencyIntervalRef.current) {
      clearInterval(latencyIntervalRef.current);
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
  }, []);

  // Reconnecter manuellement
  const reconnect = useCallback(() => {
    disconnect();
    reconnectAttemptsRef.current = 0;
    setTimeout(initSocket, 1000);
  }, [disconnect, initSocket]);

  // Initialisation au montage
  useEffect(() => {
    initSocket();

    return () => {
      disconnect();
    };
  }, []);

  return {
    socket: socketRef.current,
    isConnected: state.isConnected,
    status: state.status,
    error: state.error,
    reconnectAttempts: state.reconnectAttempts,
    latency: state.latency,
    reconnect,
    disconnect
  };
};