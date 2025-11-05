'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSocket } from '@/hooks/useSocket';
import { useWebRTC } from '@/hooks/useWebRTC';
import VideoContainer from '@/components/Meeting/VideoContainer';
import ControlButtons from '@/components/Meeting/ControlButtons';
import ParticipantsList from '@/components/Meeting/ParticipantsList';
import ChatBox from '@/components/Meeting/ChatBox';

export default function RoomPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomId = searchParams.get('room');
  const userName = typeof window !== 'undefined' 
    ? localStorage.getItem('display_name') 
    : null;

  const { socket, isConnected } = useSocket();
  const { localStream, remoteStreams, startCamera, stopCamera } = useWebRTC(
    socket,
    roomId || ''
  );

  const [isAdmin, setIsAdmin] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showChat, setShowChat] = useState(false);

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
      });
    }

    return () => {
      if (socket) {
        socket.emit('leaveRoom', { roomId, userName });
      }
    };
  }, [socket, isConnected, roomId, userName, router]);

  if (!roomId) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <header className="bg-gray-800 text-white p-4 flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Réunion: {roomId}</h2>
          {isAdmin && (
            <span className="text-sm text-yellow-400">👑 Administrateur</span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowParticipants(!showParticipants)}
            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
          >
            👥 Participants
          </button>
          <button
            onClick={() => setShowChat(!showChat)}
            className="px-4 py-2 bg-green-600 rounded hover:bg-green-700"
          >
            💬 Chat
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video grid */}
        <div className="flex-1 p-4">
          <VideoContainer
            localStream={localStream}
            remoteStreams={remoteStreams}
          />
        </div>

        {/* Sidebar */}
        {(showParticipants || showChat) && (
          <aside className="w-80 bg-gray-800 border-l border-gray-700">
            {showParticipants && (
              <ParticipantsList socket={socket} roomId={roomId} />
            )}
            {showChat && (
              <ChatBox socket={socket} roomId={roomId} userName={userName || ''} />
            )}
          </aside>
        )}
      </div>

      {/* Controls */}
      <footer className="bg-gray-800 p-4">
        <ControlButtons
          localStream={localStream}
          onStartCamera={startCamera}
          onStopCamera={stopCamera}
          isAdmin={isAdmin}
          socket={socket}
          roomId={roomId}
          userName={userName || ''}
        />
      </footer>
    </div>
  );
}