'use client';

import { useState } from 'react';
import { Socket } from 'socket.io-client';
import { useRouter } from 'next/navigation';
import { MicOff, Mic, ScreenShare, ScreenShareOff, Video, VideoOff, PhoneOff, XSquare } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';

interface ControlButtonsProps {
  localStream: MediaStream | null;
  audioStream?: MediaStream | null;
  screenStream?: MediaStream | null;
  onStartCamera: () => Promise<MediaStream>;
  onStopCamera: () => void;
  onStartAudioOnly?: () => Promise<MediaStream>;
  onStopAudioOnly?: () => void;
  onStartScreenShare?: () => Promise<MediaStream>;
  onStopScreenShare?: () => void;
  isAdmin: boolean;
  socket: Socket | null;
  roomId: string;
  userName: string;
}

export default function ControlButtons({
  localStream,
  audioStream,
  screenStream,
  onStartCamera,
  onStopCamera,
  onStartAudioOnly,
  onStopAudioOnly,
  onStartScreenShare,
  onStopScreenShare,
  isAdmin,
  socket,
  roomId,
  userName
}: ControlButtonsProps) {
  const router = useRouter();
  const toast = useToast();
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isAudioOnly, setIsAudioOnly] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const isScreenSharing = !!screenStream;

  // Toggle Audio uniquement
  const handleToggleAudioOnly = async () => {
    if (isAudioOnly) {
      // Arrêter l'audio
      if (onStopAudioOnly) {
        onStopAudioOnly();
      }
      setIsAudioOnly(false);
      socket?.emit('stopStream', { roomId });
    } else {
      // Démarrer l'audio seul
      if (onStartAudioOnly) {
        try {
          await onStartAudioOnly();
          setIsAudioOnly(true);
          socket?.emit('startStream', { roomId });
        } catch (error) {
          toast.error('Impossible d\'accéder au microphone');
        }
      }
    }
  };

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
        toast.error('Impossible d\'accéder à la caméra');
      }
    }
  };

  // Toggle Microphone (mute/unmute)
  const handleToggleMic = () => {
    const currentStream = localStream || audioStream;
    if (!currentStream) return;

    const audioTracks = currentStream.getAudioTracks();
    audioTracks.forEach(track => {
      track.enabled = isMicMuted;
    });
    setIsMicMuted(!isMicMuted);
  };

  // Toggle Screen Share
  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      if (onStopScreenShare) {
        onStopScreenShare();
      }
      socket?.emit('stopScreen', { roomId });
    } else {
      if (onStartScreenShare) {
        try {
          await onStartScreenShare();
          socket?.emit('startScreen', { roomId });
        } catch (error) {
          console.error('Erreur partage d\'écran:', error);
          toast.error('Impossible de partager l\'écran. Veuillez réessayer.');
        }
      }
    }
  };

  // Leave Meeting
  const handleLeaveMeeting = () => {
    const confirmLeave = confirm('Êtes-vous sûr de vouloir quitter cette réunion ?');
    if (!confirmLeave) return;

    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop());
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
      toast.warning('Seul l\'administrateur peut terminer la réunion');
      return;
    }

    const confirmEnd = confirm(
      'Êtes-vous sûr de vouloir arrêter définitivement cette réunion ? Tous les participants seront déconnectés.'
    );
    if (!confirmEnd) return;

    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop());
    }
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
    }

    socket?.emit('endMeeting', { roomId, userName });

    localStorage.removeItem('room_id');
    localStorage.removeItem('room_creator');
    localStorage.removeItem('active_room_name');
    localStorage.removeItem('room_created_time');

    router.push('/');
  };

  const hasAnyStream = localStream || audioStream;
  const isMicActive = hasAnyStream && !isMicMuted;

  // Nouveau handler pour le micro qui gère audio seul + vidéo
  const handleToggleMicrophone = async () => {
    if (hasAnyStream) {
      // Si on a déjà un stream, on toggle juste le mute
      handleToggleMic();
    } else {
      // Si pas de stream, on démarre l'audio seul
      if (onStartAudioOnly) {
        try {
          await onStartAudioOnly();
          setIsAudioOnly(true);
          socket?.emit('startStream', { roomId });
        } catch (error) {
          toast.error('Impossible d\'accéder au microphone');
        }
      }
    }
  };

  // Handler pour arrêter complètement le micro
  const handleStopMicrophone = () => {
    if (isAudioOnly && onStopAudioOnly) {
      onStopAudioOnly();
      setIsAudioOnly(false);
      socket?.emit('stopStream', { roomId });
    } else if (isCameraOn) {
      // Si caméra active, on mute juste
      handleToggleMic();
    }
  };

  return (
    // MODIFIÉ: Ajout de gap-2 sm:gap-3 pour responsive et flex-wrap pour empêcher débordement
    // ANCIEN: <div className="flex justify-center items-center gap-3">
    <div className="flex justify-center items-center gap-2 sm:gap-3 flex-wrap">
      {/* Microphone unifié - MODIFIÉ: Taille réduite sur mobile */}
      {/* ANCIEN: p-3.5, size={22} */}
      <button
        onClick={isMicActive ? handleStopMicrophone : handleToggleMicrophone}
        className={`p-2.5 sm:p-3.5 rounded-full transition-all text-white ${
          isMicActive
            ? 'bg-gray-600 hover:bg-gray-700'
            : 'bg-red-500 hover:bg-red-600'
        }`}
        title={isMicActive ? 'Désactiver le micro' : 'Activer le micro'}
      >
        {isMicActive ? <Mic size={18} className="sm:w-[22px] sm:h-[22px]" /> : <MicOff size={18} className="sm:w-[22px] sm:h-[22px]" />}
      </button>

      {/* Camera - MODIFIÉ: Taille réduite sur mobile */}
      {/* ANCIEN: p-3.5, size={22} */}
      <button
        onClick={handleToggleCamera}
        className={`p-2.5 sm:p-3.5 rounded-full transition-all text-white ${
          isCameraOn
            ? 'bg-blue-500 hover:bg-blue-600'
            : 'bg-gray-600 hover:bg-gray-700'
        }`}
        title={isCameraOn ? 'Arrêter la caméra' : 'Démarrer la caméra'}
      >
        {isCameraOn ? <Video size={18} className="sm:w-[22px] sm:h-[22px]" /> : <VideoOff size={18} className="sm:w-[22px] sm:h-[22px]" />}
      </button>

      {/* Screen Share - MODIFIÉ: Taille réduite sur mobile */}
      {/* ANCIEN: p-3.5, size={22} */}
      <button
        onClick={handleToggleScreenShare}
        className={`p-2.5 sm:p-3.5 rounded-full transition-all text-white ${
          isScreenSharing
            ? 'bg-indigo-500 hover:bg-indigo-600'
            : 'bg-gray-600 hover:bg-gray-700'
        }`}
        title={isScreenSharing ? 'Arrêter le partage' : 'Partager l\'écran'}
      >
        {isScreenSharing ? <ScreenShareOff size={18} className="sm:w-[22px] sm:h-[22px]" /> : <ScreenShare size={18} className="sm:w-[22px] sm:h-[22px]" />}
      </button>

      {/* Separator - MODIFIÉ: Caché sur mobile pour gagner de l'espace */}
      {/* ANCIEN: <div className="w-px h-10 bg-gray-300 mx-2"></div> */}
      <div className="hidden sm:block w-px h-10 bg-gray-300 mx-2"></div>

      {/* Leave Meeting - MODIFIÉ: Taille réduite sur mobile */}
      {/* ANCIEN: p-3.5, size={22} */}
      <button
        onClick={handleLeaveMeeting}
        className="p-2.5 sm:p-3.5 rounded-full bg-red-500 hover:bg-red-600 transition-all text-white"
        title="Quitter la réunion"
      >
        <PhoneOff size={18} className="sm:w-[22px] sm:h-[22px]" />
      </button>

      {/* End Meeting (Admin only) - MODIFIÉ: Padding et taille de texte responsive */}
      {/* ANCIEN: px-5 py-3, text-sm, size={20} */}
      {isAdmin && (
        <button
          onClick={handleEndMeeting}
          className="px-3 py-2 sm:px-5 sm:py-3 rounded-full bg-red-600 hover:bg-red-700 transition-all font-medium text-white text-xs sm:text-sm"
          title="Terminer la réunion (Admin)"
        >
          <span className="flex items-center gap-1.5 sm:gap-2">
            <XSquare size={16} className="sm:w-5 sm:h-5" />
            <span className="hidden xs:inline">Terminer</span>
          </span>
        </button>
      )}
    </div>
  );
}