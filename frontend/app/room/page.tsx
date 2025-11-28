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
      <header className="bg-white text-gray-900 px-6 py-3 flex justify-between items-center border-b border-gray-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-white text-sm font-bold">LM</span>
            </div>
            <div>
              <h2 className="text-sm font-medium text-gray-900">
                {roomId}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                {isAdmin && (
                  <span className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full flex items-center gap-1 border border-amber-200">
                    <Crown size={12} /> Admin
                  </span>
                )}
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Users size={12} />
                  {participants.length} participant{participants.length > 1 ? 's' : ''}
                </span>
                {(screenStream || remoteScreenStreams.size > 0) && (
                  <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full flex items-center gap-1 border border-blue-200">
                    <Monitor size={12} /> {screenStream && remoteScreenStreams.size > 0 ? `${remoteScreenStreams.size + 1} partages` : 'Partage actif'}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowParticipants(!showParticipants)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              showParticipants
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
            }`}
          >
            <Users size={16} />
            Participants
          </button>
          <button
            onClick={() => setShowChat(!showChat)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              showChat
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
            }`}
          >
            <MessageCircle size={16} />
            Chat
          </button>
        </div>
      </header>

      {/* Main content avec couleurs douces */}
      <div className="flex-1 flex overflow-hidden bg-gray-100">
        {/* Grille vidéo avec participants */}
        <div className="flex-1 p-4">
          <ParticipantGrid
            participants={participants}
            localStream={localStream}
            remoteStreams={remoteStreams}
            screenStream={screenStream}
            remoteScreenStreams={remoteScreenStreams}
            currentUserId={currentUserId}
          />
        </div>

        {/* Sidebar avec couleurs douces */}
        {(showParticipants || showChat) && (
          <aside className="w-80 bg-white border-l border-gray-200 flex flex-col shadow-lg animate-slide-in-right">
            {showParticipants && (
              <div className={showChat ? 'flex-1 border-b border-gray-200' : 'h-full'}>
                <ParticipantsList socket={socket} roomId={roomId} />
              </div>
            )}
            {showChat && (
              <div className={showParticipants ? 'flex-1' : 'h-full'}>
                <ChatBox socket={socket} roomId={roomId} userName={userName || ''} />
              </div>
            )}
          </aside>
        )}
      </div>

      {/* Controls avec design plus doux */}
      <footer className="bg-white p-4 border-t border-gray-200 shadow-sm">
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