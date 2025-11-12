'use client';

import { useState } from 'react';
import { Socket } from 'socket.io-client';
import { useRouter } from 'next/navigation';
import { MicOff, Mic, ScreenShare, Video, VideoOff, PhoneOff, XSquare} from 'lucide-react';

interface ControlButtonsProps {
  localStream: MediaStream | null;
  onStartCamera: () => Promise<MediaStream>;
  onStopCamera: () => void;
  isAdmin: boolean;
  socket: Socket | null;
  roomId: string;
  userName: string;
}

export default function ControlButtons({
  localStream,
  onStartCamera,
  onStopCamera,
  isAdmin,
  socket,
  roomId,
  userName
}: ControlButtonsProps) {
  const router = useRouter();
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);

  // Toggle Camera
  const handleToggleCamera = async () => {
    if (isCameraOn) {
      onStopCamera();
      setIsCameraOn(false);
      socket?.emit('stopStream', { roomId });
    } else {
      try {
        await onStartCamera();
        setIsCameraOn(true);
        socket?.emit('startStream', { roomId });
      } catch (error) {
        alert('Impossible d\'accéder à la caméra');
      }
    }
  };

  // Toggle Microphone
  const handleToggleMic = () => {
    if (!localStream) return;

    const audioTracks = localStream.getAudioTracks();
    audioTracks.forEach(track => {
      track.enabled = isMicMuted;
    });
    setIsMicMuted(!isMicMuted);
  };

  // Toggle Screen Share
  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      // Arrêter le partage
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
        setScreenStream(null);
      }
      setIsScreenSharing(false);
      socket?.emit('stopScreen', { roomId });
    } else {
      // Démarrer le partage
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            // cursor: 'always', // Removed as it is not part of MediaTrackConstraints
            displaySurface: 'monitor' as any,
            frameRate: { ideal: 30, max: 60 }
          },
          audio: true
        });

        setScreenStream(stream);
        setIsScreenSharing(true);
        socket?.emit('startScreen', { roomId });

        // Détecter l'arrêt manuel
        stream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          setScreenStream(null);
          socket?.emit('stopScreen', { roomId });
        };
      } catch (error) {
        console.error('Erreur partage d\'écran:', error);
      }
    }
  };

  // Leave Meeting
  const handleLeaveMeeting = () => {
    const confirmLeave = confirm('Êtes-vous sûr de vouloir quitter cette réunion ?');
    if (!confirmLeave) return;

    // Arrêter tous les flux
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
    }

    socket?.emit('leaveRoom', { roomId, userName });
    router.push('/');
  };

  // End Meeting (Admin only)
  const handleEndMeeting = () => {
    if (!isAdmin) {
      alert('Seul l\'administrateur peut terminer la réunion');
      return;
    }

    const confirmEnd = confirm(
      'Êtes-vous sûr de vouloir arrêter définitivement cette réunion ? Tous les participants seront déconnectés.'
    );
    if (!confirmEnd) return;

    // Arrêter tous les flux
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
    }

    socket?.emit('endMeeting', { roomId, userName });

    // Nettoyer le localStorage
    localStorage.removeItem('room_id');
    localStorage.removeItem('room_creator');
    localStorage.removeItem('active_room_name');
    localStorage.removeItem('room_created_time');

    router.push('/');
  };

  return (
    <div className="flex justify-center items-center gap-3">
      {/* Microphone */}
      <button
        onClick={handleToggleMic}
        disabled={!localStream}
        className={`p-4 rounded-full transition-all ${
          isMicMuted
            ? 'bg-red-600 hover:bg-red-700'
            : 'bg-gray-700 hover:bg-gray-600'
        } ${!localStream && 'opacity-50 cursor-not-allowed'}`}
        title={isMicMuted ? 'Activer le micro' : 'Couper le micro'}
      >
        <span className="text-2xl">{isMicMuted ? <MicOff size={24} /> : <Mic size={24} />}</span>
      </button>

      {/* Camera */}
      <button
        onClick={handleToggleCamera}
        className={`p-4 rounded-full transition-all ${
          isCameraOn
            ? 'bg-blue-600 hover:bg-blue-700'
            : 'bg-gray-700 hover:bg-gray-600'
        }`}
        title={isCameraOn ? 'Arrêter la caméra' : 'Démarrer la caméra'}
      >
        <span className="text-2xl">{isCameraOn ? <Video size={24} /> : <VideoOff size={24} />}</span>
      </button>

      {/* Screen Share */}
      <button
        onClick={handleToggleScreenShare}
        className={`p-4 rounded-full transition-all ${
          isScreenSharing
            ? 'bg-green-600 hover:bg-green-700'
            : 'bg-gray-700 hover:bg-gray-600'
        }`}
        title={isScreenSharing ? 'Arrêter le partage' : 'Partager l\'écran'}
      >
        <span className="text-2xl"><ScreenShare size={24} /></span>
      </button>

      {/* Separator */}
      <div className="w-px h-12 bg-gray-600 mx-2"></div>

      {/* Leave Meeting */}
      <button
        onClick={handleLeaveMeeting}
        className="p-4 rounded-full bg-red-600 hover:bg-red-700 transition-all"
        title="Quitter la réunion"
      >
        <span className="text-2xl"><PhoneOff size={24} /></span>
      </button>

      {/* End Meeting (Admin only) */}
      {isAdmin && (
        <button
          onClick={handleEndMeeting}
          className="px-6 py-3 rounded-full bg-red-800 hover:bg-red-900 transition-all font-semibold"
          title="Terminer la réunion (Admin)"
        >
          <span className="flex items-center gap-2">
            <span><XSquare size={24} /></span>
            <span>Terminer la réunion</span>
          </span>
        </button>
      )}
    </div>
  );
}