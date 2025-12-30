//correction de la largeur fixe pour le responsive design

'use client';


import { useState, FormEvent } from 'react';
import { Socket } from 'socket.io-client';
import { useRouter } from 'next/navigation';
import { Video, XCircle, Info, Rocket, Key, Shuffle, Copy, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface CreateMeetingFormProps {
  socket: Socket | null;
}

export default function CreateMeetingForm({ socket }: CreateMeetingFormProps) {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [useCustomCode, setUseCustomCode] = useState(false);
  const [customCode, setCustomCode] = useState('');
  const [copied, setCopied] = useState(false);
  const { t } = useTranslation();

  const generateRandomCode = () => {
    // Générer un code de 6 caractères alphanumériques
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Sans O, 0, I, 1 pour éviter confusion
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleGenerateCode = () => {
    const newCode = generateRandomCode();
    setCustomCode(newCode);
    setUseCustomCode(true);
  };

  const handleCopyCode = () => {
    if (customCode) {
      navigator.clipboard.writeText(customCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!userName.trim()) {
      setError(t('create_meeting.errors.enter_name'));
      return;
    }

    if (!roomName.trim()) {
      setError(t('create_meeting.errors.enter_meeting_name'));
      return;
    }

    if (useCustomCode && !customCode.trim()) {
      setError(t('create_meeting.errors.enter_code'));
      return;
    }

    if (!socket) {
      setError(t('create_meeting.errors.connecting'));
      return;
    }

    setLoading(true);

    // Sauvegarder le nom d'utilisateur
    localStorage.setItem('display_name', userName);

    // Écouter la réponse du serveur
    socket.once('roomCreated', ({ roomId, roomName: createdRoomName }) => {
      localStorage.setItem('room_id', roomId);
      localStorage.setItem('room_creator', 'true');
      localStorage.setItem('active_room_name', createdRoomName);
      localStorage.setItem('room_created_time', new Date().toISOString());

      // Rediriger vers la salle
      router.push(`/room?room=${roomId}`);
    });

    socket.once('roomError', (data) => {
      setLoading(false);
      if (data.error === 'NAME_ALREADY_EXISTS') {
        setError(t('create_meeting.errors.name_taken'));
      } else if (data.error === 'ID_ALREADY_EXISTS') {
        setError(t('create_meeting.errors.id_taken'));
      } else {
        setError(data.message || t('create_meeting.errors.generic'));
      }
    });

    // Créer la réunion
    socket.emit('createRoom', {
      userName: userName.trim(),
      roomName: roomName.trim(),
      customRoomId: useCustomCode ? customCode.trim() : ''
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 sm:p-6 md:p-8 mb-6 animate-scale-in">
      <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
          <Video size={20} className="sm:w-6 sm:h-6 text-white" />
        </div>
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 dark:text-white">
          {t('create_meeting.title')}
        </h2>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 text-red-700 dark:text-red-400 rounded animate-fade-in">
          <p className="font-medium flex items-center gap-2"><XCircle size={16} /> {error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
        <div>
          <label htmlFor="userName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('create_meeting.labels.your_name')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="userName"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-base placeholder-gray-500 dark:placeholder-gray-400"
            placeholder={t('create_meeting.placeholders.name_example')}
            required
            disabled={loading}
            aria-label={t('create_meeting.labels.your_name')}
            aria-required="true"
          />
        </div>

        <div>
          <label htmlFor="roomName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('create_meeting.labels.meeting_name')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="roomName"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition text-base placeholder-gray-500 dark:placeholder-gray-400"
            placeholder={t('create_meeting.placeholders.meeting_example')}
            required
            disabled={loading}
            aria-label={t('create_meeting.labels.meeting_name')}
            aria-required="true"
          />
        </div>

        {/* Option pour code personnalisé */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="flex items-center justify-between mb-3">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
              <Key size={18} className="text-blue-600 dark:text-blue-400" />
              {t('create_meeting.labels.custom_code')}
            </label>
            <button
              type="button"
              onClick={() => {
                setUseCustomCode(!useCustomCode);
                if (useCustomCode) setCustomCode('');
              }}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${useCustomCode
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            >
              {useCustomCode ? t('create_meeting.labels.activated') : t('create_meeting.labels.deactivated')}
            </button>
          </div>

          {useCustomCode && (
            <div className="space-y-3 bg-blue-50 dark:bg-blue-900/30 p-3 sm:p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex gap-1.5 sm:gap-2">
                <input
                  type="text"
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                  className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 border border-blue-300 dark:border-blue-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition font-mono text-base sm:text-lg placeholder-gray-500 dark:placeholder-gray-400"
                  placeholder={t('create_meeting.placeholders.code_enter')}
                  disabled={loading}
                  maxLength={20}
                  aria-label={t('create_meeting.labels.custom_code')}
                />
                <button
                  type="button"
                  onClick={handleGenerateCode}
                  className="px-3 sm:px-4 py-2.5 sm:py-3 bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-600 text-white rounded-lg transition flex items-center gap-2 flex-shrink-0"
                  disabled={loading}
                  aria-label={t('create_meeting.buttons.generate_random')}
                  title={t('create_meeting.buttons.generate_random')}
                >
                  <Shuffle size={18} className="sm:w-5 sm:h-5" />
                </button>
                {customCode && (
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="px-3 sm:px-4 py-2.5 sm:py-3 bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-600 text-white rounded-lg transition flex items-center gap-2 flex-shrink-0"
                    disabled={loading}
                    aria-label={copied ? t('create_meeting.buttons.copied') : t('create_meeting.buttons.copy_code')}
                    title={copied ? t('create_meeting.buttons.copied') : t('create_meeting.buttons.copy_code')}
                  >
                    {copied ? <Check size={18} className="sm:w-5 sm:h-5" /> : <Copy size={18} className="sm:w-5 sm:h-5" />}
                  </button>
                )}
              </div>
              <p className="text-xs text-blue-700 dark:text-blue-300 flex items-center gap-1">
                <Info size={14} />
                {customCode
                  ? t('create_meeting.info.code_participants')
                  : t('create_meeting.info.create_or_generate')}
              </p>
            </div>
          )}

          {!useCustomCode && (
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Info size={16} />
              {t('create_meeting.info.auto_id')}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading || !socket}
          className={`w-full py-3 sm:py-4 px-4 sm:px-6 rounded-lg font-semibold text-white transition-all duration-200 transform text-sm sm:text-base ${loading || !socket
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:shadow-2xl hover:scale-[1.02] active:scale-95'
            }`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {t('create_meeting.buttons.creating')}
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Rocket size={20} /> {t('create_meeting.buttons.launch')}
            </span>
          )}
        </button>
      </form>
    </div>
  );
}