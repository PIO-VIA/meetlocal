'use client';

import { useState } from 'react';
import { Socket } from 'socket.io-client';
import { useRouter } from 'next/navigation';
import { MicOff, Mic, ScreenShare, ScreenShareOff, Video, VideoOff, PhoneOff, XSquare } from 'lucide-react';

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
          alert('Impossible d\'accéder au microphone');
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
        alert('Impossible d\'accéder à la caméra');
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
          alert('Impossible de partager l\'écran. Veuillez réessayer.');
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
      alert('Seul l\'administrateur peut terminer la réunion');
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
        className={`p-4 rounded-full transition-all ${
          isMicMuted
            ? 'bg-red-600 hover:bg-red-700'
            : 'bg-gray-700 hover:bg-gray-600'
        } ${!hasAnyAudio && 'opacity-50 cursor-not-allowed'}`}
        title={isMicMuted ? 'Activer le micro' : 'Couper le micro'}
      >
        {isMicMuted ? <MicOff size={24} /> : <Mic size={24} />}
      </button>

      {/* Audio Only (nouveau) */}
      <button
        onClick={handleToggleAudioOnly}
        disabled={isCameraOn}
        className={`p-4 rounded-full transition-all ${
          isAudioOnly
            ? 'bg-green-600 hover:bg-green-700 animate-pulse'
            : 'bg-gray-700 hover:bg-gray-600'
        } ${isCameraOn && 'opacity-50 cursor-not-allowed'}`}
        title={isAudioOnly ? 'Arrêter le micro' : 'Activer uniquement le micro'}
      >
        <Mic size={24} className={isAudioOnly ? 'text-white' : ''} />
      </button>

      {/* Camera */}
      <button
        onClick={handleToggleCamera}
        disabled={isAudioOnly}
        className={`p-4 rounded-full transition-all ${
          isCameraOn
            ? 'bg-blue-600 hover:bg-blue-700'
            : 'bg-gray-700 hover:bg-gray-600'
        } ${isAudioOnly && 'opacity-50 cursor-not-allowed'}`}
        title={isCameraOn ? 'Arrêter la caméra' : 'Démarrer la caméra'}
      >
        {isCameraOn ? <Video size={24} /> : <VideoOff size={24} />}
      </button>

      {/* Screen Share */}
      <button
        onClick={handleToggleScreenShare}
        className={`p-4 rounded-full transition-all ${
          isScreenSharing
            ? 'bg-purple-600 hover:bg-purple-700 animate-pulse'
            : 'bg-gray-700 hover:bg-gray-600'
        }`}
        title={isScreenSharing ? 'Arrêter le partage' : 'Partager l\'écran'}
      >
        {isScreenSharing ? <ScreenShareOff size={24} /> : <ScreenShare size={24} />}
      </button>

      {/* Separator */}
      <div className="w-px h-12 bg-gray-600 mx-2"></div>

      {/* Leave Meeting */}
      <button
        onClick={handleLeaveMeeting}
        className="p-4 rounded-full bg-red-600 hover:bg-red-700 transition-all"
        title="Quitter la réunion"
      >
        <PhoneOff size={24} />
      </button>

      {/* End Meeting (Admin only) */}
      {isAdmin && (
        <button
          onClick={handleEndMeeting}
          className="px-6 py-3 rounded-full bg-red-800 hover:bg-red-900 transition-all font-semibold"
          title="Terminer la réunion (Admin)"
        >
          <span className="flex items-center gap-2">
            <XSquare size={24} />
            <span>Terminer la réunion</span>
          </span>
        </button>
      )}
    </div>
  );
}