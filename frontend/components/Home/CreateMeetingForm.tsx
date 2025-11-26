'use client';

import { useState, FormEvent } from 'react';
import { Socket } from 'socket.io-client';
import { useRouter } from 'next/navigation';
import { Video, XCircle, Info, Rocket, Key, Shuffle, Copy, Check } from 'lucide-react';

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
      setError('Veuillez entrer votre nom');
      return;
    }

    if (!roomName.trim()) {
      setError('Veuillez donner un nom à votre réunion');
      return;
    }

    if (useCustomCode && !customCode.trim()) {
      setError('Veuillez entrer un code ou générez-en un automatiquement');
      return;
    }

    if (!socket) {
      setError('Connexion au serveur en cours...');
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
        setError('Ce nom de réunion est déjà utilisé. Veuillez en choisir un autre.');
      } else if (data.error === 'ID_ALREADY_EXISTS') {
        setError('Cet ID de réunion est déjà utilisé. Veuillez réessayer.');
      } else {
        setError(data.message || 'Une erreur est survenue lors de la création de la réunion.');
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
    <div className="bg-white rounded-2xl shadow-xl p-8 animate-scale-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
          <Video size={24} className="text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800">
          Créer une nouvelle réunion
        </h2>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded animate-fade-in">
          <p className="font-medium flex items-center gap-2"><XCircle size={16} /> {error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="userName" className="block text-sm font-medium text-gray-700 mb-2">
            Votre nom <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="userName"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            placeholder="Ex: Jean Dupont"
            required
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="roomName" className="block text-sm font-medium text-gray-700 mb-2">
            Nom de la réunion <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="roomName"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            placeholder="Ex: Réunion d'équipe"
            required
            disabled={loading}
          />
        </div>

        {/* Option pour code personnalisé */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-3">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <Key size={18} className="text-blue-600" />
              Code de réunion personnalisé
            </label>
            <button
              type="button"
              onClick={() => {
                setUseCustomCode(!useCustomCode);
                if (useCustomCode) setCustomCode('');
              }}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                useCustomCode
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {useCustomCode ? 'Activé' : 'Désactivé'}
            </button>
          </div>

          {useCustomCode && (
            <div className="space-y-3 bg-blue-50 p-4 rounded-lg border border-blue-200">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                  className="flex-1 px-4 py-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition font-mono text-lg"
                  placeholder="Entrez un code (ex: ABC123)"
                  disabled={loading}
                  maxLength={20}
                />
                <button
                  type="button"
                  onClick={handleGenerateCode}
                  className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center gap-2"
                  disabled={loading}
                  title="Générer un code aléatoire"
                >
                  <Shuffle size={20} />
                </button>
                {customCode && (
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center gap-2"
                    disabled={loading}
                    title="Copier le code"
                  >
                    {copied ? <Check size={20} /> : <Copy size={20} />}
                  </button>
                )}
              </div>
              <p className="text-xs text-blue-700 flex items-center gap-1">
                <Info size={14} />
                {customCode
                  ? 'Les participants pourront rejoindre avec ce code'
                  : 'Créez un code personnalisé ou générez-en un automatiquement'}
              </p>
            </div>
          )}

          {!useCustomCode && (
            <p className="mt-2 text-sm text-gray-500 flex items-center gap-1">
              <Info size={16} />
              Un identifiant unique sera généré automatiquement
            </p>
          )}
        </div>

          <button
          type="submit"
          disabled={loading || !socket}
          className={`w-full py-5 px-8 rounded-2xl font-bold text-lg text-white transition-all duration-300 transform shadow-lg flex items-center justify-center gap-3
            ${
              loading || !socket
                ? 'bg-gray-300 cursor-not-allowed opacity-70'
                : 'bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 hover:shadow-2xl hover:scale-[1.02] active:scale-95 ring-4 ring-sky-300/50'
            }`}
        >
          {loading ? (
            <span className="flex items-center gap-3">
              <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Création en cours...
            </span>
          ) : (
            <span className="flex items-center gap-3">
              <Rocket size={24} />
              Lancer la réunion
            </span>
          )}
        </button> 
      </form>
    </div>
  );
}