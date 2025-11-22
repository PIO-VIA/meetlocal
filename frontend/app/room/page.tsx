'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSocket } from '@/hooks/useSocket';
import { useMediasoup } from '@/hooks/useMediasoup';
import ParticipantGrid from '@/components/Meeting/ParticipantGrid';
import ControlButtons from '@/components/Meeting/ControlButtons';
import ParticipantsList from '@/components/Meeting/ParticipantsList';
import ChatBox from '@/components/Meeting/ChatBox';
import { MessageCircle, Send } from 'lucide-react';


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
          alert(response?.message || 'Impossible de rejoindre la réunion');
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
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Header style Google Meet */}
      <header className="bg-gray-800 text-white px-4 py-3 flex justify-between items-center border-b border-gray-700">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-base font-medium text-gray-100">
              {roomId}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
              {isAdmin && (
                <span className="text-xs px-2 py-0.5 bg-yellow-600/20 text-yellow-400 rounded flex items-center gap-1">
                  👑 Admin
                </span>
              )}
              <span className="text-xs text-gray-400">
                {participants.length} participant{participants.length > 1 ? 's' : ''}
              </span>
              {(screenStream || remoteScreenStreams.size > 0) && (
                <span className="text-xs px-2 py-0.5 bg-blue-600/20 text-blue-400 rounded flex items-center gap-1">
                  🖥️ {screenStream && remoteScreenStreams.size > 0 ? `${remoteScreenStreams.size + 1} partages` : 'Partage actif'}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowParticipants(!showParticipants)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              showParticipants
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
            }`}
          >
            👥 Participants
          </button>
          <button
            onClick={() => setShowChat(!showChat)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              showChat
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
            }`}
          >
            <MessageCircle size={18} />
            Chat
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Grille vidéo avec participants */}
        <div className="flex-1">
          <ParticipantGrid
            participants={participants}
            localStream={localStream}
            remoteStreams={remoteStreams}
            screenStream={screenStream}
            remoteScreenStreams={remoteScreenStreams}
            currentUserId={currentUserId}
          />
        </div>

        {/* Sidebar */}
        {(showParticipants || showChat) && (
          <aside className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
            {showParticipants && (
              <div className={showChat ? 'flex-1 border-b border-gray-700' : 'h-full'}>
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

      {/* Controls */}
      <footer className="bg-gray-800 p-4 border-t border-gray-700">
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