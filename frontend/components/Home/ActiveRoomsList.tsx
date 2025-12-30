'use client';

import { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { useRouter } from 'next/navigation';
import { Mailbox, ClipboardList, Users, Video, ScreenShare, Crown } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { useTranslation } from 'react-i18next';

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
  const toast = useToast();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

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
      toast.warning(t('active_rooms.toast_name_required'));
      return;
    }

    if (!socket) return;

    socket.emit('checkRoom', { roomId }, (exists: boolean) => {
      if (exists) {
        router.push(`/room?room=${roomId}`);
      } else {
        toast.error(t('active_rooms.toast_not_exist'));
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
          <span className="ml-3 text-gray-600">{t('active_rooms.loading')}</span>
        </div>
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mailbox className="text-gray-400" size={40} />
          </div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            {t('active_rooms.empty')}
          </h3>
          <p className="text-gray-500">
            {t('active_rooms.start_new')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center">
          <ClipboardList className="text-indigo-600" size={24} />
        </div>
        <h2 className="text-2xl font-bold text-gray-800">
          {t('active_rooms.title')} ({rooms.length})
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
                      {t('active_rooms.persistent')}
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
                {t('active_rooms.join')}
              </button>
            </div>

            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1 text-gray-600">
                <Users size={16} />
                <span>
                  {room.users.length} {room.users.length > 1 ? t('active_rooms.participants_plural') : t('active_rooms.participants')}
                  {room.disconnectedUsers > 0 && (
                    <span className="text-gray-400">
                      {' '}+ {room.disconnectedUsers} {t('active_rooms.disconnected')}
                    </span>
                  )}
                </span>
              </div>

              {room.users.some(u => u.isStreaming) && (
                <div className="flex items-center gap-1 text-green-600">
                  <Video size={16} />
                  <span>{room.users.filter(u => u.isStreaming).length} {t('active_rooms.cameras')}</span>
                </div>
              )}

              {room.users.some(u => u.isScreenSharing) && (
                <div className="flex items-center gap-1 text-indigo-600">
                  <ScreenShare size={16} />
                  <span>{t('active_rooms.screen_share')}</span>
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
                      className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full flex items-center gap-1"
                    >
                      {user.isCreator && <Crown size={12} className="text-amber-600" />}
                      {user.name}
                    </span>
                  ))}
                  {room.users.length > 5 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
                      +{room.users.length - 5} {t('active_rooms.others')}
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