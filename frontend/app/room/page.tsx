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
import { MessageCircle, Users, Crown, Monitor } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';


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
          toast.error(response?.message || 'Impossible de rejoindre la réunion');
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
  }, [socket, isConnected, roomId, userName, router]);

  if (!roomId) {
    return <div className="h-screen flex items-center justify-center">Chargement...</div>;
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Popup de connexion au serveur */}
      <ServerConnectionPopup status={status} error={error} />

      {/* Header plus doux avec couleurs subtiles */}
      <header className="bg-white text-gray-900 px-3 sm:px-6 py-3 flex justify-between items-center border-b border-gray-200 shadow-sm">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
              <span className="text-white text-xs sm:text-sm font-bold">LM</span>
            </div>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                {roomId}
              </h2>
              <div className="flex items-center gap-1 sm:gap-2 mt-0.5 flex-wrap">
                {isAdmin && (
                  <span className="text-xs px-1.5 sm:px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full flex items-center gap-1 border border-amber-200">
                    <Crown size={10} className="sm:w-3 sm:h-3" /> <span className="hidden sm:inline">Admin</span>
                  </span>
                )}
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Users size={10} className="sm:w-3 sm:h-3" />
                  <span className="hidden xs:inline">{participants.length}</span>
                  <span className="hidden sm:inline">participant{participants.length > 1 ? 's' : ''}</span>
                </span>
                {(screenStream || remoteScreenStreams.size > 0) && (
                  <span className="text-xs px-1.5 sm:px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full flex items-center gap-1 border border-blue-200">
                    <Monitor size={10} className="sm:w-3 sm:h-3" /> <span className="hidden sm:inline">{screenStream && remoteScreenStreams.size > 0 ? `${remoteScreenStreams.size + 1} partages` : 'Partage actif'}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-1 sm:gap-2 flex-shrink-0">
          <button
            onClick={() => setShowParticipants(!showParticipants)}
            className={`px-2 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1 sm:gap-2 ${
              showParticipants
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
            }`}
          >
            <Users size={14} className="sm:w-4 sm:h-4" />
            <span className="hidden md:inline">Participants</span>
          </button>
          <button
            onClick={() => {
              setShowChat(!showChat);
              if (!showChat) {
                setHasNewMessages(false);
              }
            }}
            className={`px-2 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all flex items-center gap-1 sm:gap-2 relative ${
              showChat
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
            }`}
          >
            <MessageCircle size={14} className="sm:w-4 sm:h-4" />
            <span className="hidden md:inline">Chat</span>
            {hasNewMessages && !showChat && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-500 rounded-full border-2 border-white animate-pulse"></span>
            )}
          </button>
        </div>
      </header>

      {/* Main content avec couleurs douces */}
      <div className="flex-1 flex overflow-hidden bg-gray-100">
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
          <aside className="fixed md:relative inset-0 md:inset-auto z-40 md:z-auto w-full md:w-80 lg:w-96 bg-white md:border-l border-gray-200 flex flex-col shadow-lg md:animate-slide-in-right max-h-screen md:max-h-none">
            {/* Bouton fermer sur mobile */}
            <div className="md:hidden flex justify-end p-2 border-b border-gray-200 flex-shrink-0">
              <button
                onClick={() => {
                  setShowChat(false);
                  setShowParticipants(false);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {showParticipants && (
              <div className={showChat ? 'flex-1 border-b border-gray-200 overflow-hidden' : 'flex-1 overflow-hidden'}>
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
      <footer className="bg-white p-3 pb-4 sm:p-4 sm:pb-4 border-t border-gray-200 shadow-sm">
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