'use client';

import { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';

interface PeerConnection {
  [userId: string]: RTCPeerConnection;
}

export const useWebRTC = (socket: Socket | null, roomId: string) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const peerConnectionsRef = useRef<PeerConnection>({});

  const iceServers = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }, // STUN public
        { urls: 'stun:stun1.l.google.com:19302' },
        // Pour production, ajoutez votre propre serveur TURN
    ],
    iceCandidatePoolSize: 10,
    bundlePolicy: 'max-bundle' as RTCBundlePolicy,
    rtcpMuxPolicy: 'require' as RTCRtcpMuxPolicy,
    };

  // Fonction pour créer une peer connection
  const createPeerConnection = (userId: string) => {
    if (peerConnectionsRef.current[userId]) {
      return peerConnectionsRef.current[userId];
    }

    const peerConnection = new RTCPeerConnection(iceServers);
    peerConnectionsRef.current[userId] = peerConnection;

    // Gestion des candidats ICE
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('ice-candidate', {
          candidate: event.candidate,
          to: userId,
          roomId
        });
      }
    };

    // Gestion des tracks entrants
    peerConnection.ontrack = (event) => {
      const stream = event.streams[0];
      setRemoteStreams(prev => new Map(prev).set(userId, stream));
    };

    // Ajouter les tracks locaux
    if (localStream) {
      localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
      });
    }

    return peerConnection;
  };

  // Démarrer la caméra
    const startCamera = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
        video: {
        width: { ideal: 1280, max: 1920 },
        height: { ideal: 720, max: 1080 },
        frameRate: { ideal: 30, max: 60 },
        // Optimiser pour basse latence
        aspectRatio: 16/9,
        },
        audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000, // Haute qualité audio
        }
    });
    
    // Appliquer des contraintes de bande passante
    stream.getVideoTracks().forEach(track => {
        track.applyConstraints({
        width: 1280,
        height: 720,
        frameRate: 30
        });
    });
    
    return stream;
    };

  // Arrêter la caméra
  const stopCamera = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
  };

  useEffect(() => {
    if (!socket) return;

    // Écouter les événements WebRTC
    socket.on('offer', async ({ offer, userId }) => {
      const pc = createPeerConnection(userId);
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('answer', { answer, to: userId });
    });

    socket.on('answer', async ({ answer, from }) => {
      const pc = peerConnectionsRef.current[from];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    socket.on('ice-candidate', async ({ candidate, from }) => {
      const pc = peerConnectionsRef.current[from];
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
    });

    return () => {
      socket.off('offer');
      socket.off('answer');
      socket.off('ice-candidate');
    };
  }, [socket, localStream]);

  return {
    localStream,
    remoteStreams,
    startCamera,
    stopCamera,
    createPeerConnection
  };
};