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

  const hasAnyAudio = localStream || audioStream;

  return (
    <div className="flex justify-center items-center gap-3">
      {/* Microphone Mute/Unmute */}
      <button
        onClick={handleToggleMic}
        disabled={!hasAnyAudio}
        className={`p-3.5 rounded-full transition-all text-white ${
          isMicMuted
            ? 'bg-red-500 hover:bg-red-600'
            : 'bg-gray-600 hover:bg-gray-700'
        } ${!hasAnyAudio && 'opacity-50 cursor-not-allowed'}`}
        title={isMicMuted ? 'Activer le micro' : 'Couper le micro'}
      >
        {isMicMuted ? <MicOff size={22} /> : <Mic size={22} />}
      </button>

      {/* Audio Only */}
      <button
        onClick={handleToggleAudioOnly}
        disabled={isCameraOn}
        className={`p-3.5 rounded-full transition-all text-white ${
          isAudioOnly
            ? 'bg-green-500 hover:bg-green-600'
            : 'bg-gray-600 hover:bg-gray-700'
        } ${isCameraOn && 'opacity-50 cursor-not-allowed'}`}
        title={isAudioOnly ? 'Arrêter le micro' : 'Activer uniquement le micro'}
      >
        <Mic size={22} />
      </button>

      {/* Camera */}
      <button
        onClick={handleToggleCamera}
        disabled={isAudioOnly}
        className={`p-3.5 rounded-full transition-all text-white ${
          isCameraOn
            ? 'bg-blue-500 hover:bg-blue-600'
            : 'bg-gray-600 hover:bg-gray-700'
        } ${isAudioOnly && 'opacity-50 cursor-not-allowed'}`}
        title={isCameraOn ? 'Arrêter la caméra' : 'Démarrer la caméra'}
      >
        {isCameraOn ? <Video size={22} /> : <VideoOff size={22} />}
      </button>

      {/* Screen Share */}
      <button
        onClick={handleToggleScreenShare}
        className={`p-3.5 rounded-full transition-all text-white ${
          isScreenSharing
            ? 'bg-indigo-500 hover:bg-indigo-600'
            : 'bg-gray-600 hover:bg-gray-700'
        }`}
        title={isScreenSharing ? 'Arrêter le partage' : 'Partager l\'écran'}
      >
        {isScreenSharing ? <ScreenShareOff size={22} /> : <ScreenShare size={22} />}
      </button>

      {/* Separator */}
      <div className="w-px h-10 bg-gray-300 mx-2"></div>

      {/* Leave Meeting */}
      <button
        onClick={handleLeaveMeeting}
        className="p-3.5 rounded-full bg-red-500 hover:bg-red-600 transition-all text-white"
        title="Quitter la réunion"
      >
        <PhoneOff size={22} />
      </button>

      {/* End Meeting (Admin only) */}
      {isAdmin && (
        <button
          onClick={handleEndMeeting}
          className="px-5 py-3 rounded-full bg-red-600 hover:bg-red-700 transition-all font-medium text-white text-sm"
          title="Terminer la réunion (Admin)"
        >
          <span className="flex items-center gap-2">
            <XSquare size={20} />
            <span>Terminer</span>
          </span>
        </button>
      )}
    </div>
  );
}