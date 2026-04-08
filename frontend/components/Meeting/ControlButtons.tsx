'use client';

import { useState, useRef, useEffect } from 'react';
import { Socket } from 'socket.io-client';
import { useRouter } from 'next/navigation';
import { MicOff, Mic, ScreenShare, ScreenShareOff, Video, VideoOff, PhoneOff, XSquare, MoreVertical, Hand, MessageCircle } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { useTranslation } from 'react-i18next';
import Tooltip from '@/components/shared/Tooltip';
import Reactions from './Reactions';
import ConfirmationModal from './ConfirmationModal';

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
  isChatOpen: boolean;
  onToggleChat: () => void;
  unreadCount: number;
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
  userName,
  isChatOpen,
  onToggleChat,
  unreadCount
}: ControlButtonsProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const toast = useToast();
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isAudioOnly, setIsAudioOnly] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const isScreenSharing = !!screenStream;

  // États pour les fonctionnalités "More Options"
  const [isHandRaised, setIsHandRaised] = useState(false);

  // État pour les modaux de confirmation
  const [modalType, setModalType] = useState<'leave' | 'end' | null>(null);

  // Écoute des évènements d'administration ("forceDisableMedia")
  useEffect(() => {
    if (!socket) return;
    const handleForceDisable = ({ mediaType }: { mediaType: 'video' | 'audio' | 'screen' }) => {
      if (mediaType === 'video') {
        onStopCamera();
        setIsCameraOn(false);
        socket.emit('stopStream', { roomId });
        toast.info(t('controls.disabled_by_admin.video', "L'administrateur a désactivé votre caméra."));
      } else if (mediaType === 'audio') {
        if (isAudioOnly && onStopAudioOnly) {
          onStopAudioOnly();
          setIsAudioOnly(false);
          socket.emit('stopStream', { roomId });
        }
        const currentStream = localStream || audioStream;
        if (currentStream) {
          const audioTracks = currentStream.getAudioTracks();
          audioTracks.forEach(track => {
            track.enabled = false;
          });
          setIsMicMuted(true);
        }
        toast.info(t('controls.disabled_by_admin.audio', "L'administrateur a désactivé votre microphone."));
      } else if (mediaType === 'screen') {
        if (onStopScreenShare) {
          onStopScreenShare();
        }
        socket.emit('stopScreen', { roomId });
        toast.info(t('controls.disabled_by_admin.screen', "L'administrateur a arrêté votre partage d'écran."));
      }
    };

    socket.on('forceDisableMedia', handleForceDisable);
    return () => {
      socket.off('forceDisableMedia', handleForceDisable);
    };
  }, [socket, roomId, isAudioOnly, localStream, audioStream, onStopCamera, onStopAudioOnly, onStopScreenShare, t, toast]);

  // Toggle Audio uniquement
  const handleToggleAudioOnly = async () => {
    if (isAudioOnly) {
      if (onStopAudioOnly) {
        onStopAudioOnly();
      }
      setIsAudioOnly(false);
      socket?.emit('stopStream', { roomId });
    } else {
      if (onStartAudioOnly) {
        try {
          await onStartAudioOnly();
          setIsAudioOnly(true);
          socket?.emit('startStream', { roomId });
        } catch (error) {
          toast.error(t('controls.errors.mic'));
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
        toast.error(t('controls.errors.camera'));
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
          toast.error(t('controls.errors.share'));
        }
      }
    }
  };

  // Leave Meeting
  const handleLeaveMeeting = () => {
    setModalType('leave');
  };

  const confirmLeaveMeeting = () => {
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
    setModalType(null);
  };

  // End Meeting (Admin only)
  const handleEndMeeting = () => {
    if (!isAdmin) {
      toast.warning(t('controls.errors.admin_only'));
      return;
    }
    setModalType('end');
  };

  const confirmEndMeeting = () => {
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
    setModalType(null);
  };

  const hasAnyStream = localStream || audioStream;
  const isMicActive = hasAnyStream && !isMicMuted;

  const handleToggleMicrophone = async () => {
    if (hasAnyStream) {
      handleToggleMic();
    } else {
      if (onStartAudioOnly) {
        try {
          await onStartAudioOnly();
          setIsAudioOnly(true);
          socket?.emit('startStream', { roomId });
        } catch (error) {
          toast.error(t('controls.errors.mic'));
        }
      }
    }
  };

  const handleStopMicrophone = () => {
    if (isAudioOnly && onStopAudioOnly) {
      onStopAudioOnly();
      setIsAudioOnly(false);
      socket?.emit('stopStream', { roomId });
    } else if (isCameraOn) {
      handleToggleMic();
    }
  };

  // ---- Nouvelles fonctionnalités : Réactions & Lever la main ----

  const handleReaction = (emoji: string) => {
    socket?.emit('reaction', { roomId, emoji });
    // Afficher l'émoji localement aussi (optionnel, géré par le retour serveur normalement mais pour l'instant simple)
  };

  const handleRaiseHand = () => {
    const newState = !isHandRaised;
    setIsHandRaised(newState);
    socket?.emit('raiseHand', { roomId, isRaised: newState });
  };

  return (
    <div className="flex justify-center items-center gap-2 sm:gap-3 flex-wrap relative">
      {/* Microphone */}
      <Tooltip content={isMicActive ? t('controls.mic_off') : t('controls.mic_on')} position="top">
        <button
          onClick={isMicActive ? handleStopMicrophone : handleToggleMicrophone}
          className={`p-2.5 sm:p-3.5 rounded-full transition-all text-white ${isMicActive
            ? 'bg-gray-600 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600'
            : 'bg-red-500 hover:bg-red-600'
            }`}
        >
          {isMicActive ? <Mic size={18} className="sm:w-[22px] sm:h-[22px]" /> : <MicOff size={18} className="sm:w-[22px] sm:h-[22px]" />}
        </button>
      </Tooltip>

      {/* Camera */}
      <Tooltip content={isCameraOn ? t('controls.camera_off') : t('controls.camera_on')} position="top">
        <button
          onClick={handleToggleCamera}
          className={`p-2.5 sm:p-3.5 rounded-full transition-all text-white ${isCameraOn
            ? 'bg-blue-500 hover:bg-blue-600'
            : 'bg-gray-600 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600'
            }`}
        >
          {isCameraOn ? <Video size={18} className="sm:w-[22px] sm:h-[22px]" /> : <VideoOff size={18} className="sm:w-[22px] sm:h-[22px]" />}
        </button>
      </Tooltip>

      {/* Réactions & Emoji */}
      <Reactions
        onReaction={handleReaction}
        onRaiseHand={handleRaiseHand}
        isHandRaised={isHandRaised}
      />

      {/* Screen Share */}
      <Tooltip content={isScreenSharing ? t('controls.share_off') : t('controls.share_on')} position="top">
        <button
          onClick={handleToggleScreenShare}
          className={`p-2.5 sm:p-3.5 rounded-full transition-all text-white ${isScreenSharing
            ? 'bg-indigo-500 hover:bg-indigo-600'
            : 'bg-gray-600 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600'
            }`}
        >
          {isScreenSharing ? <ScreenShareOff size={18} className="sm:w-[22px] sm:h-[22px]" /> : <ScreenShare size={18} className="sm:w-[22px] sm:h-[22px]" />}
        </button>
      </Tooltip>

      {/* Chat */}
      <Tooltip content={isChatOpen ? t('room.tooltips.hide_chat') : t('room.tooltips.show_chat')} position="top">
        <button
          onClick={onToggleChat}
          className={`p-2.5 sm:p-3.5 rounded-full transition-all text-white relative ${isChatOpen
            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
            : 'bg-gray-600 hover:bg-gray-700 dark:bg-gray-700 dark:hover:bg-gray-600'
            }`}
        >
          <MessageCircle size={18} className="sm:w-[22px] sm:h-[22px]" />
          {unreadCount > 0 && !isChatOpen && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center animate-bounce shadow-sm">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </Tooltip>

      {/* Actions supplémentaires (More Options) pourrait être ici si besoin d'un menu déroulant plus complexe */}

      {/* Separator */}
      <div className="hidden sm:block w-px h-10 bg-gray-300 dark:bg-gray-600 mx-2"></div>

      {/* Leave Meeting */}
      <Tooltip content={t('controls.leave')} position="top">
        <button
          onClick={handleLeaveMeeting}
          className="p-2.5 sm:p-3.5 rounded-full bg-red-500 hover:bg-red-600 transition-all text-white"
        >
          <PhoneOff size={18} className="sm:w-[22px] sm:h-[22px]" />
        </button>
      </Tooltip>

      {/* End Meeting (Admin only) */}
      {isAdmin && (
        <Tooltip content={t('controls.end_all')} position="top">
          <button
            onClick={handleEndMeeting}
            className="px-3 py-2 sm:px-5 sm:py-3 rounded-full bg-red-600 hover:bg-red-700 transition-all font-medium text-white text-xs sm:text-sm"
          >
            <span className="flex items-center gap-1.5 sm:gap-2">
              <XSquare size={16} className="sm:w-5 sm:h-5" />
              <span className="hidden xs:inline">{t('controls.end')}</span>
            </span>
          </button>
        </Tooltip>
      )}

      {/* Modal de confirmation pour quitter */}
      <ConfirmationModal
        isOpen={modalType === 'leave'}
        onClose={() => setModalType(null)}
        onConfirm={confirmLeaveMeeting}
        title={t('controls.modal.leave_title')}
        message={t('controls.modal.leave_desc')}
        confirmLabel={t('controls.modal.leave_confirm')}
        cancelLabel={t('controls.modal.cancel')}
        isDestructive={true}
      />

      {/* Modal de confirmation pour terminer (Admin) */}
      <ConfirmationModal
        isOpen={modalType === 'end'}
        onClose={() => setModalType(null)}
        onConfirm={confirmEndMeeting}
        title={t('controls.modal.end_title')}
        message={t('controls.modal.end_desc')}
        confirmLabel={t('controls.modal.end_confirm')}
        cancelLabel={t('controls.modal.cancel')}
        isDestructive={true}
      />
    </div>
  );
}