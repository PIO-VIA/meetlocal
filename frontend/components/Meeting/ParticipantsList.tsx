'use client';

import { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { Users, Crown, VideoOff, MicOff, ScreenShareOff, Download, Edit2, Check, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/contexts/ToastContext';
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
  const toast = useToast();
  const [userToKick, setUserToKick] = useState<Participant | null>(null);

  // Pour l'édition du nom
  const [isEditingName, setIsEditingName] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");

  const handleAdminDisableMedia = (targetUserId: string, mediaType: 'video' | 'audio' | 'screen') => {
    if (socket) {
      socket.emit('adminDisableMedia', { roomId, targetUserId, mediaType });
      // Only generic toast, relying on specific ones might be overkill.
      toast.success(t(`participants_list.disable_success`, 'Action requested.'));
    }
  };

  const handleStartEditName = (currentName: string) => {
    setEditNameValue(currentName);
    setIsEditingName(true);
  };

  const handleSaveName = () => {
    const newName = editNameValue.trim();
    if (newName && socket) {
      socket.emit('changeName', { roomId, newName });
      localStorage.setItem('display_name', newName);
      toast.success(t('participants_list.name_changed', 'Nom mis à jour.'));
    }
    setIsEditingName(false);
  };

  const handleCancelEdit = () => {
    setIsEditingName(false);
  };

  const downloadParticipantsList = () => {
    if (participants.length === 0) return;
    const date = new Date().toLocaleString();
    let txtContent = `Liste des participants - ${date}\n`;
    txtContent += `========================================\n\n`;

    participants.forEach(p => {
      const role = p.isCreator ? "Administrateur" : "Participant";
      const status = [];
      if (p.isStreaming) status.push("Caméra");
      else status.push("Sans vidéo");
      if (p.isScreenSharing) status.push("Partage d'écran");

      txtContent += `- ${p.name} (${role}) [${status.join(', ')}]\n`;
    });

    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `participants-${roomId}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

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
          <button
            onClick={downloadParticipantsList}
            className="ml-2 p-1.5 text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            title={t('participants_list.download', 'Télécharger CSV')}
          >
            <Download size={18} />
          </button>
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
                    {isEditingName && participant.id === currentUserId ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={editNameValue}
                          onChange={(e) => setEditNameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveName();
                            else if (e.key === 'Escape') handleCancelEdit();
                          }}
                          className="w-32 sm:w-40 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm text-gray-900 dark:text-white"
                          autoFocus
                          maxLength={30}
                        />
                        <button onClick={handleSaveName} className="p-1 text-green-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"><Check size={16} /></button>
                        <button onClick={handleCancelEdit} className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"><X size={16} /></button>
                      </div>
                    ) : (
                      <p className="font-medium text-gray-900 dark:text-white truncate flex items-center gap-2">
                        {participant.name}
                        {participant.id === currentUserId && (
                          <>
                            <span className="text-sm font-normal text-gray-500 dark:text-gray-400">({t('participants_list.you', 'You')})</span>
                            <button onClick={() => handleStartEditName(participant.name)} className="text-gray-400 hover:text-blue-500 transition-colors" title={t('participants_list.edit_name', 'Modifier mon nom')}>
                              <Edit2 size={14} />
                            </button>
                          </>
                        )}
                      </p>
                    )}
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
                  <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                    <button
                      onClick={() => handleAdminDisableMedia(participant.id!, 'audio')}
                      className="p-1.5 text-gray-500 hover:text-orange-500 dark:text-gray-400 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                      title={t('participants_list.disable_audio', 'Désactiver le micro')}
                    >
                      <MicOff size={16} />
                    </button>
                    <button
                      onClick={() => handleAdminDisableMedia(participant.id!, 'video')}
                      className="p-1.5 text-gray-500 hover:text-orange-500 dark:text-gray-400 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                      title={t('participants_list.disable_video', 'Désactiver la caméra')}
                    >
                      <VideoOff size={16} />
                    </button>
                    <button
                      onClick={() => handleAdminDisableMedia(participant.id!, 'screen')}
                      className="p-1.5 text-gray-500 hover:text-orange-500 dark:text-gray-400 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                      title={t('participants_list.disable_screen', "Désactiver le partage d'écran")}
                    >
                      <ScreenShareOff size={16} />
                    </button>
                    <button
                      onClick={() => setUserToKick(participant)}
                      className="p-1.5 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors ml-1"
                      title={t('participants_list.kick', 'Eject participant')}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5c-1.1 0-2 .9-2 2v2"></path>
                        <circle cx="8.5" cy="7" r="4"></circle>
                        <line x1="23" y1="11" x2="17" y2="11"></line>
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de confirmation d'éjection */}
      {
        userToKick && (
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
        )
      }
    </div >
  );
}