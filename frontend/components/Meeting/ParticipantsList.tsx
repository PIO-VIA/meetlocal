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
  isAdmin: boolean;
  currentUserId: string;
}

export default function ParticipantsList({ socket, roomId, isAdmin, currentUserId }: ParticipantsListProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const { t } = useTranslation();
  const [userToKick, setUserToKick] = useState<Participant | null>(null);

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

  const handleConfirmKick = () => {
    if (userToKick && socket) {
      socket.emit('kickUser', { roomId, targetUserId: userToKick.id });
      setUserToKick(null);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900 text-gray-900 dark:text-white relative">
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

              {/* Informations du participant et actions */}
              <div className="flex-1 min-w-0 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {participant.name} {participant.id === currentUserId && <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({t('participants_list.you', 'You')})</span>}
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

                {/* Actions de l'admin */}
                {isAdmin && participant.id !== currentUserId && (
                  <button
                    onClick={() => setUserToKick(participant)}
                    className="p-2 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors ml-2 flex-shrink-0"
                    title={t('participants_list.kick', 'Eject participant')}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H5c-1.1 0-2 .9-2 2v2"></path>
                      <circle cx="8.5" cy="7" r="4"></circle>
                      <line x1="23" y1="11" x2="17" y2="11"></line>
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de confirmation d'éjection */}
      {userToKick && (
        <div className="absolute inset-0 z-10 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-xl max-w-sm w-full">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {t('participants_list.kick_confirm_title', 'Eject Participant')}
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-5">
              {t('participants_list.kick_confirm_desc', 'Are you sure you want to remove {{name}} from the meeting?', { name: userToKick.name })}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setUserToKick(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                onClick={handleConfirmKick}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                {t('participants_list.kick_confirm_btn', 'Eject')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}