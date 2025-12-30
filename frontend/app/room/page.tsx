'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSocket } from '@/hooks/useSocket';
import { useMediasoup } from '@/hooks/useMediasoup';
import ParticipantGrid from '@/components/Meeting/ParticipantGrid';
import ControlButtons from '@/components/Meeting/ControlButtons';
import ParticipantsList from '@/components/Meeting/ParticipantsList';
import ChatBox from '@/components/Meeting/ChatBox';
import ServerConnectionPopup from '@/components/Meeting/ServerConnectionPopup';
import ThemeToggle from '@/components/shared/ThemeToggle';
import Tooltip from '@/components/shared/Tooltip';
import LanguageSwitcher from '@/components/shared/LanguageSwitcher';
import { MessageCircle, Users, Crown, Monitor } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import '@/lib/i18n'; // Initialize i18n
import { useTranslation } from 'react-i18next';


interface Participant {
  id: string;
  name: string;
  isCreator?: boolean;
  isStreaming?: boolean;
  isScreenSharing?: boolean;
  disconnected?: boolean;
}

export default function RoomPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const roomId = searchParams.get('room');
  const userName = typeof window !== 'undefined'
    ? localStorage.getItem('display_name')
    : null;
  const { t } = useTranslation();

  const {
    socket,
    isConnected,
    status,
    error,
    reconnectAttempts,
    latency,
    reconnect
  } = useSocket();

  const {
    localStream,
    audioStream,
    remoteStreams,
    screenStream,
    remoteScreenStreams, // NOUVEAU
    startCamera,
    stopCamera,
    startAudioOnly,
    stopAudioOnly,
    startScreenShare,
    stopScreenShare
  } = useMediasoup(socket, roomId || '');

  const [isAdmin, setIsAdmin] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [hasNewMessages, setHasNewMessages] = useState(false);

  useEffect(() => {
    if (!roomId || !userName) {
      router.push('/');
      return;
    }

    if (socket && isConnected) {
      socket.emit('joinRoom', { roomId, userName }, (success: boolean, response: any) => {
        if (!success) {
          toast.error(response?.message || t('room.toast_error_join'));
          router.push('/');
          return;
        }
        setIsAdmin(response?.isCreator || false);
        setCurrentUserId(socket.id || '');
      });

      socket.on('getUsers', (users: Participant[]) => {
        setParticipants(users.filter(u => !u.disconnected));
      });

      socket.on('userJoined', () => {
        socket.emit('getUsers', { roomId });
      });

      socket.on('userLeft', () => {
        socket.emit('getUsers', { roomId });
      });

      socket.emit('getUsers', { roomId });
    }

    return () => {
      if (socket) {
        socket.off('getUsers');
        socket.off('userJoined');
        socket.off('userLeft');
        socket.emit('leaveRoom', { roomId, userName });
      }
    };
  }, [socket, isConnected, roomId, userName, router, t]);

  if (!roomId) {
    return <div className="h-screen flex items-center justify-center">{t('room.loading')}</div>;
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Popup de connexion au serveur */}
      <ServerConnectionPopup status={status} error={error} />

      {/* Header plus doux avec couleurs subtiles */}
      <header className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 sm:px-6 py-3 flex justify-between items-center border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
              <span className="text-white text-xs sm:text-sm font-bold">LM</span>
            </div>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate">
                {roomId}
              </h2>
              <div className="flex items-center gap-1 sm:gap-2 mt-0.5 flex-wrap">
                {isAdmin && (
                  <span className="text-xs px-1.5 sm:px-2 py-0.5 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full flex items-center gap-1 border border-amber-200 dark:border-amber-800">
                    <Crown size={10} className="sm:w-3 sm:h-3" /> <span className="hidden sm:inline">{t('room.admin')}</span>
                  </span>
                )}
                <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Users size={10} className="sm:w-3 sm:h-3" />
                  <span className="hidden xs:inline">{participants.length}</span>
                  <span className="hidden sm:inline">{t('room.participants')}</span>
                </span>
                {(screenStream || remoteScreenStreams.size > 0) && (
                  <span className="text-xs px-1.5 sm:px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full flex items-center gap-1 border border-blue-200 dark:border-blue-800">
                    <Monitor size={10} className="sm:w-3 sm:h-3" /> <span className="hidden sm:inline">{screenStream && remoteScreenStreams.size > 0 ? `${remoteScreenStreams.size + 1} ${t('room.shares')}` : t('room.active_share')}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-1 sm:gap-2 flex-shrink-0">
          <LanguageSwitcher />
          <ThemeToggle />
          <Tooltip content={showParticipants ? t('room.tooltips.hide_participants') : t('room.tooltips.show_participants')} position="bottom">
            <button
              onClick={() => setShowParticipants(!showParticipants)}
              className={`px-2 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1 sm:gap-2 ${showParticipants
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              aria-label="Afficher/Masquer les participants"
            >
              <Users size={14} className="sm:w-4 sm:h-4" />
              <span className="hidden md:inline">Participants</span>
            </button>
          </Tooltip>
          <Tooltip content={showChat ? t('room.tooltips.hide_chat') : t('room.tooltips.show_chat')} position="bottom">
            <button
              onClick={() => {
                setShowChat(!showChat);
                if (!showChat) {
                  setHasNewMessages(false);
                }
              }}
              className={`px-2 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1 sm:gap-2 relative ${showChat
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              aria-label="Afficher/Masquer le chat"
            >
              <MessageCircle size={14} className="sm:w-4 sm:h-4" />
              <span className="hidden md:inline">{t('room.chat')}</span>
              {hasNewMessages && !showChat && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800 animate-pulse"></span>
              )}
            </button>
          </Tooltip>
        </div>
      </header>

      {/* Main content avec couleurs douces */}
      <div className="flex-1 flex overflow-hidden bg-gray-100 dark:bg-gray-950">
        {/* Grille vidéo avec participants */}
        <div className="flex-1 p-2 sm:p-4">
          <ParticipantGrid
            participants={participants}
            localStream={localStream}
            remoteStreams={remoteStreams}
            screenStream={screenStream}
            remoteScreenStreams={remoteScreenStreams}
            currentUserId={currentUserId}
          />
        </div>

        {/* Sidebar avec couleurs douces - Responsive */}
        {(showParticipants || showChat) && (
          <aside className="fixed md:relative inset-0 md:inset-auto z-40 md:z-auto w-full md:w-80 lg:w-96 bg-white dark:bg-gray-800 md:border-l border-gray-200 dark:border-gray-700 flex flex-col shadow-lg md:animate-slide-in-right max-h-screen md:max-h-none">
            {/* Bouton fermer sur mobile */}
            <div className="md:hidden flex justify-end p-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <button
                onClick={() => {
                  setShowChat(false);
                  setShowParticipants(false);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-900 dark:text-white"
                aria-label={t('room.tooltips.close_sidebar')}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {showParticipants && (
              <div className={showChat ? 'flex-1 border-b border-gray-200 dark:border-gray-700 overflow-hidden' : 'flex-1 overflow-hidden'}>
                <ParticipantsList socket={socket} roomId={roomId} />
              </div>
            )}
            {showChat && (
              <div className={showParticipants ? 'flex-1 overflow-hidden min-h-0' : 'flex-1 overflow-hidden min-h-0'}>
                <ChatBox
                  socket={socket}
                  roomId={roomId}
                  userName={userName || ''}
                  onNewMessage={() => !showChat && setHasNewMessages(true)}
                />
              </div>
            )}
          </aside>
        )}
      </div>

      {/* Controls avec design plus doux - MODIFIÉ pour responsive */}
      {/* ANCIEN: <footer className="bg-white p-4 border-t border-gray-200 shadow-sm"> */}
      <footer className="bg-white dark:bg-gray-800 p-3 pb-4 sm:p-4 sm:pb-4 border-t border-gray-200 dark:border-gray-700 shadow-sm">
        <ControlButtons
          localStream={localStream}
          audioStream={audioStream}
          screenStream={screenStream}
          onStartCamera={startCamera}
          onStopCamera={stopCamera}
          onStartAudioOnly={startAudioOnly}
          onStopAudioOnly={stopAudioOnly}
          onStartScreenShare={startScreenShare}
          onStopScreenShare={stopScreenShare}
          isAdmin={isAdmin}
          socket={socket}
          roomId={roomId}
          userName={userName || ''}
        />
      </footer>
    </div>
  );
}