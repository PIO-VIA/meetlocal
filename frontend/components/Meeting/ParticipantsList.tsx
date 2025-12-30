'use client';

import { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { Users, Crown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getParticipantColor } from '@/lib/utils';


interface Participant {
  id?: string;
  name: string;
  isCreator?: boolean;
  isStreaming?: boolean;
  isScreenSharing?: boolean;
  disconnected?: boolean;
}

interface ParticipantsListProps {
  socket: Socket | null;
  roomId: string;
}

export default function ParticipantsList({ socket, roomId }: ParticipantsListProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const { t } = useTranslation();

  useEffect(() => {
    if (!socket) return;

    const handleGetUsers = (users: Participant[]) => {
      // Filtrer les utilisateurs déconnectés
      const activeUsers = users.filter(u => !u.disconnected);
      setParticipants(activeUsers);
    };

    const refreshUsersList = () => {
      socket.emit('getUsers', { roomId });
    };

    socket.on('getUsers', handleGetUsers);
    socket.on('userJoined', refreshUsersList);
    socket.on('userLeft', refreshUsersList);

    // Demander la liste des participants au chargement
    socket.emit('getUsers', { roomId });

    return () => {
      socket.off('getUsers', handleGetUsers);
      socket.off('userJoined', refreshUsersList);
      socket.off('userLeft', refreshUsersList);
    };
  }, [socket, roomId]);

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <span><Users size={24} /></span>
          {t('participants_list.title')}
          <span className="ml-auto bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full text-sm">
            {participants.length}
          </span>
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {participants.length === 0 ? (
          <div className="text-center text-gray-400 dark:text-gray-500 py-8">
            <p>{t('participants_list.empty')}</p>
          </div>
        ) : (
          participants.map((participant) => (
            <div
              key={participant.id || participant.name}
              className="flex items-center gap-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            >
              {/* Avatar avec initiales */}
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0 text-white shadow-sm"
                style={{ backgroundColor: getParticipantColor(participant.id || participant.name) }}
              >
                {getInitials(participant.name)}
              </div>

              {/* Informations du participant */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900 dark:text-white truncate">
                    {participant.name}
                  </p>
                  {participant.isCreator && (
                    <span className="text-yellow-500 dark:text-yellow-400" title={t('participants_list.admin')}>
                      <Crown size={16} />
                    </span>
                  )}
                </div>

                {/* Statuts */}
                <div className="flex items-center gap-2 mt-1">
                  {participant.isStreaming && (
                    <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-600 dark:bg-green-400 rounded-full animate-pulse"></span>
                      {t('participants_list.camera')}
                    </span>
                  )}
                  {participant.isScreenSharing && (
                    <span className="text-xs text-purple-600 dark:text-purple-400 flex items-center gap-1">
                      <span className="w-2 h-2 bg-purple-600 dark:bg-purple-400 rounded-full animate-pulse"></span>
                      {t('participants_list.screen')}
                    </span>
                  )}
                  {!participant.isStreaming && !participant.isScreenSharing && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {t('participants_list.no_video')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}