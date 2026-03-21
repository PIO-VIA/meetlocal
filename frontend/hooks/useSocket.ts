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

// --- VARIABLES GLOBALES (Singleton pour persistance inter-pages) ---
let globalSocket: Socket | null = null;
let globalIsConnected = false;
let globalStatus: ConnectionStatus = 'disconnected';
let globalError: string | null = null;
let globalReconnectAttempts = 0;
let globalLatency = 0;
const subscribers = new Set<(updates: Partial<SocketState>) => void>();
let globalLatencyInterval: NodeJS.Timeout | undefined = undefined;
let globalRoomId: string | null = null; // Stocke le roomId de la connexion actuelle

const updateGlobalState = (updates: Partial<SocketState>) => {
  if (updates.socket !== undefined) globalSocket = updates.socket;
  if (updates.isConnected !== undefined) globalIsConnected = updates.isConnected;
  if (updates.status !== undefined) globalStatus = updates.status;
  if (updates.error !== undefined) globalError = updates.error;
  if (updates.reconnectAttempts !== undefined) globalReconnectAttempts = updates.reconnectAttempts;
  if (updates.latency !== undefined) globalLatency = updates.latency;

  subscribers.forEach(fn => fn(updates));
};

export const useSocket = () => {
  const [state, setState] = useState<SocketState>({
    socket: globalSocket,
    isConnected: globalIsConnected,
    status: globalStatus,
    error: globalError,
    reconnectAttempts: globalReconnectAttempts,
    latency: globalLatency
  });

  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Synchronisation de l'état inter-composants
  useEffect(() => {
    const handleUpdate = (updates: Partial<SocketState>) => {
      setState(prev => ({ ...prev, ...updates }));
    };
    subscribers.add(handleUpdate);
    return () => {
      subscribers.delete(handleUpdate);
    };
  }, []);

  // Mesurer la latence
  const measureLatency = useCallback(() => {
    if (!globalSocket?.connected) return;

    const start = Date.now();
    globalSocket.emit('ping', () => {
      updateGlobalState({ latency: Date.now() - start });
    });
  }, []);

  // Vérifier la connexion backend
  const checkConnection = useCallback(async () => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '/api';

    try {
      const response = await fetch(`${backendUrl}/health`, {
        method: 'GET',
      });

      if (!response.ok) {
        console.warn('⚠️ Backend accessible mais retourne une erreur');
      }

      return true;
    } catch (error) {
      console.error('❌ Impossible de contacter le backend:', error);
      updateGlobalState({
        status: 'error',
        error: 'Impossible de contacter le serveur via ' + backendUrl
      });
      return false;
    }
  }, []);

  // Initialiser Socket.IO
  const initSocket = useCallback(async () => {
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const urlRoomId = searchParams ? (searchParams.get('room') || searchParams.get('id') || searchParams.get('roomId')) : null;

    if (globalSocket?.connected) {
      // Si on est déjà connecté mais que le roomId a changé (ex: navigation Accueil -> Salon),
      // on doit forcer une reconnexion pour que le Gateway puisse router vers le bon worker.
      if (urlRoomId !== globalRoomId) {
        console.log(`🔄 RoomID changé (${globalRoomId} -> ${urlRoomId}). Reconnexion forcée...`);
        globalSocket.disconnect();
        globalSocket = null;
        globalIsConnected = false;
        globalStatus = 'disconnected';
      } else {
        console.log('✅ Socket Global déjà connecté au bon salon');
        return;
      }
    }

    // Prevent multiple parallel init
    if (globalStatus === 'connecting') return;

    updateGlobalState({ status: 'connecting' });

    // Vérifier la connexion d'abord
    const ok = await checkConnection();
    if (!ok) {
      return;
    }

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '/api';

    console.log('🔌 Tentative de connexion Socket.IO...');
    console.log('📡 URL:', backendUrl);

    try {
      // Injection de l'ID de salon pour le load balancer
      let query = {};
      try {
        const searchParams = new URLSearchParams(window.location.search);
        const roomId = searchParams.get('room') || searchParams.get('id') || searchParams.get('roomId');
        if (roomId) query = { roomId };
      } catch (e) { }

      const url = backendUrl.startsWith('http') ? backendUrl : undefined;
      const forceNew = urlRoomId !== globalRoomId && globalSocket !== null;
      const socket = io(url, {
        query,
        path: backendUrl === '/api' ? '/api/socket.io' : '/socket.io',
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        secure: false,
        autoConnect: true,
        forceNew,
        multiplex: true,
        upgrade: true,
        rememberUpgrade: true,
        perMessageDeflate: {
          threshold: 1024
        } as any
      });

      updateGlobalState({ socket });

      // ===== ÉVÉNEMENTS DE CONNEXION =====
      socket.on('connect', () => {
        console.log('✅ Socket connecté avec succès!');
        console.log('📡 Socket ID:', socket.id);
        console.log('🔗 Transport utilisé:', socket.io.engine.transport.name);

        // Mémoriser le roomId actuel
        const searchParams = new URLSearchParams(window.location.search);
        globalRoomId = searchParams.get('room') || searchParams.get('id') || searchParams.get('roomId');

        updateGlobalState({
          socket,
          isConnected: true,
          status: 'connected',
          error: null,
          reconnectAttempts: 0
        });

        // Démarrer la mesure de latence globale
        if (globalLatencyInterval) {
          clearInterval(globalLatencyInterval);
        }
        globalLatencyInterval = setInterval(measureLatency, 5000);
      });

      socket.on('disconnect', (reason) => {
        console.log('❌ Socket déconnecté:', reason);

        updateGlobalState({
          isConnected: false,
          status: reason === 'io client disconnect' ? 'disconnected' : 'reconnecting'
        });

        if (globalLatencyInterval) {
          clearInterval(globalLatencyInterval);
          globalLatencyInterval = undefined;
        }
      });

      socket.on('connect_error', (error) => {
        console.error('🔴 Erreur de connexion Socket.IO:', error.message);

        let errorMessage = 'Erreur de connexion au serveur';

        if (error.message.includes('xhr poll error')) {
          errorMessage = 'Problème réseau. Vérifiez votre connexion.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Timeout de connexion. Le serveur est-il démarré?';
        } else if (error.message.includes('certificate')) {
          errorMessage = 'Erreur SSL. Avez-vous accepté le certificat?';
        }

        updateGlobalState({
          status: 'error',
          error: errorMessage,
          reconnectAttempts: globalReconnectAttempts + 1
        });
      });

      socket.on('reconnect_attempt', (attempt) => {
        console.log(`🔄 Tentative de reconnexion #${attempt}...`);
        updateGlobalState({
          status: 'reconnecting',
          reconnectAttempts: attempt
        });
      });

      socket.on('reconnect', (attempt) => {
        console.log(`✅ Reconnecté après ${attempt} tentative(s)`);
        updateGlobalState({
          isConnected: true,
          status: 'connected',
          error: null,
          reconnectAttempts: 0
        });
      });

      socket.on('reconnect_failed', () => {
        console.error('❌ Échec de toutes les tentatives de reconnexion');
        updateGlobalState({
          status: 'error',
          error: 'Impossible de se reconnecter au serveur'
        });
      });

      // ===== ÉVÉNEMENTS DE TRANSPORT =====
      socket.io.engine.on('upgrade', (transport) => {
        console.log('⬆️ Transport amélioré vers:', transport.name);
      });

      socket.on('error', (error) => {
        console.error('❌ Erreur Socket.IO:', error);
      });

    } catch (error) {
      console.error("❌ Erreur lors de l'initialisation du socket:", error);
      updateGlobalState({
        status: 'error',
        error: "Erreur d'initialisation du socket"
      });
    }
  }, [checkConnection, measureLatency]);

  // Déconnecter proprement (Uniquement lors de destructions explicites, pas aux changements de vue Next)
  const disconnect = useCallback(() => {
    if (globalSocket) {
      console.log('🔌 Déconnexion du socket...');
      globalSocket.disconnect();
      globalSocket = null;

      updateGlobalState({
        socket: null,
        isConnected: false,
        status: 'disconnected',
        error: null,
        reconnectAttempts: 0,
        latency: 0
      });
    }

    if (globalLatencyInterval) {
      clearInterval(globalLatencyInterval);
      globalLatencyInterval = undefined;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
  }, []);

  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(initSocket, 1000);
  }, [disconnect, initSocket]);

  // Initialisation au montage
  useEffect(() => {
    initSocket();
    // 💡 IMPORTANT FIX : On NE DECONNECTE PAS le socket au démontage du composant.
    // Cela permet au singleton Socket.IO de persister lors des navigations "router.push()"
    // et de rester lié au MÊME worker du cluster Node.js.
  }, [initSocket]);

  return {
    socket: state.socket,
    isConnected: state.isConnected,
    status: state.status,
    error: state.error,
    reconnectAttempts: state.reconnectAttempts,
    latency: state.latency,
    reconnect,
    disconnect
  };
};