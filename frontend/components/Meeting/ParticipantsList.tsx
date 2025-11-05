'use client';

import { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';

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

  useEffect(() => {
    if (!socket) return;

    const handleGetUsers = (users: Participant[]) => {
      // Filtrer les utilisateurs déconnectés
      const activeUsers = users.filter(u => !u.disconnected);
      setParticipants(activeUsers);
    };

    socket.on('getUsers', handleGetUsers);

    // Demander la liste des participants
    socket.emit('getUsers', { roomId });

    return () => {
      socket.off('getUsers', handleGetUsers);
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
    <div className="h-full flex flex-col bg-gray-800 text-white">
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <span>👥</span>
          Participants
          <span className="ml-auto bg-gray-700 px-2 py-1 rounded-full text-sm">
            {participants.length}
          </span>
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {participants.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <p>Aucun participant pour le moment</p>
          </div>
        ) : (
          participants.map((participant, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition"
            >
              {/* Avatar avec initiales */}
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center font-semibold text-sm flex-shrink-0">
                {getInitials(participant.name)}
              </div>

              {/* Informations du participant */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-white truncate">
                    {participant.name}
                  </p>
                  {participant.isCreator && (
                    <span className="text-yellow-400" title="Administrateur">
                      👑
                    </span>
                  )}
                </div>

                {/* Statuts */}
                <div className="flex items-center gap-2 mt-1">
                  {participant.isStreaming && (
                    <span className="text-xs text-green-400 flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                      Caméra
                    </span>
                  )}
                  {participant.isScreenSharing && (
                    <span className="text-xs text-purple-400 flex items-center gap-1">
                      <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></span>
                      Écran
                    </span>
                  )}
                  {!participant.isStreaming && !participant.isScreenSharing && (
                    <span className="text-xs text-gray-400">
                      Pas de vidéo
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