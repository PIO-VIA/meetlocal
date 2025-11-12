'use client';

import { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { useRouter } from 'next/navigation';
import { Mailbox, ClipboardList, Users, Video, ScreenShare, Crown } from 'lucide-react';

interface Room {
  id: string;
  name: string;
  persistent: boolean;
  users: Array<{
    name: string;
    isCreator: boolean;
    isStreaming: boolean;
    isScreenSharing: boolean;
  }>;
  disconnectedUsers: number;
  totalUsers: number;
}

interface ActiveRoomsListProps {
  socket: Socket | null;
}

export default function ActiveRoomsList({ socket }: ActiveRoomsListProps) {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!socket) return;

    const handleRoomsList = (roomsList: Room[]) => {
      setRooms(roomsList);
      setLoading(false);
    };

    socket.on('roomsList', handleRoomsList);

    // Demander la liste au chargement
    socket.emit('getRoomsList');

    // Rafraîchir toutes les 3 secondes
    const interval = setInterval(() => {
      socket.emit('getRoomsList');
    }, 3000);

    return () => {
      socket.off('roomsList', handleRoomsList);
      clearInterval(interval);
    };
  }, [socket]);

  const handleJoinRoom = (roomId: string) => {
    const userName = localStorage.getItem('display_name');
    
    if (!userName) {
      alert('Veuillez d\'abord entrer votre nom dans le formulaire ci-dessus');
      return;
    }

    if (!socket) return;

    socket.emit('checkRoom', { roomId }, (exists: boolean) => {
      if (exists) {
        router.push(`/room?room=${roomId}`);
      } else {
        alert('Cette réunion n\'existe plus');
        socket.emit('getRoomsList');
      }
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="flex items-center justify-center py-8">
          <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="ml-3 text-gray-600">Chargement des réunions...</span>
        </div>
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl"><Mailbox size={48} /></span>
          </div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            Aucune réunion active
          </h3>
          <p className="text-gray-500">
            Créez une nouvelle réunion pour commencer
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
          <span className="text-2xl"><ClipboardList size={32} /></span>
        </div>
        <h2 className="text-2xl font-bold text-gray-800">
          Réunions actives ({rooms.length})
        </h2>
      </div>

      <div className="space-y-4">
        {rooms.map((room) => (
          <div
            key={room.id}
            className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all"
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-semibold text-gray-800">
                    {room.name}
                  </h3>
                  {room.persistent && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                      Permanente
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  ID: <code className="bg-gray-100 px-2 py-1 rounded">{room.id}</code>
                </p>
              </div>
              <button
                onClick={() => handleJoinRoom(room.id)}
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-105 font-medium"
              >
                Rejoindre
              </button>
            </div>

            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1 text-gray-600">
                <span><Users size={16} /></span>
                <span>
                  {room.users.length} participant{room.users.length > 1 ? 's' : ''}
                  {room.disconnectedUsers > 0 && (
                    <span className="text-gray-400">
                      {' '}+ {room.disconnectedUsers} déconnecté{room.disconnectedUsers > 1 ? 's' : ''}
                    </span>
                  )}
                </span>
              </div>

              {room.users.some(u => u.isStreaming) && (
                <div className="flex items-center gap-1 text-green-600">
                  <span><Video size={16} /></span>
                  <span>{room.users.filter(u => u.isStreaming).length} caméra(s)</span>
                </div>
              )}

              {room.users.some(u => u.isScreenSharing) && (
                <div className="flex items-center gap-1 text-purple-600">
                  <span><ScreenShare size={16} /></span>
                  <span>Partage d'écran actif</span>
                </div>
              )}
            </div>

            {room.users.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-2">Participants:</p>
                <div className="flex flex-wrap gap-2">
                  {room.users.slice(0, 5).map((user, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                    >
                      {user.isCreator && <Crown size={12} />}
                      {user.name}
                    </span>
                  ))}
                  {room.users.length > 5 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
                      +{room.users.length - 5} autres
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}