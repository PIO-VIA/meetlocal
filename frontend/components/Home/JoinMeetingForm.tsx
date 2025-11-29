'use client';

import { useState, FormEvent } from 'react';
import { Socket } from 'socket.io-client';
import { useRouter } from 'next/navigation';
import { DoorOpen, XCircle, Info, CheckCircle } from 'lucide-react';

interface JoinMeetingFormProps {
  socket: Socket | null;
}

export default function JoinMeetingForm({ socket }: JoinMeetingFormProps) {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!userName.trim()) {
      setError('Veuillez entrer votre nom');
      return;
    }

    if (!roomId.trim()) {
      setError('Veuillez entrer l\'ID de la réunion');
      return;
    }

    if (!socket) {
      setError('Connexion au serveur en cours...');
      return;
    }

    setLoading(true);

    // Sauvegarder le nom d'utilisateur
    localStorage.setItem('display_name', userName.trim());

    // Rejoindre une salle spécifique
    socket.emit('joinRoom',
      { roomId: roomId.trim(), userName: userName.trim() },
      (success: boolean, response: any) => {
        setLoading(false);

        if (!success) {
          if (response?.error === 'NAME_ALREADY_TAKEN') {
            setError(response.message || 'Ce nom est déjà utilisé dans cette réunion.');
          } else {
            setError("La réunion n'existe pas ou n'est plus disponible.");
          }
          return;
        }

        // Sauvegarder le statut
        localStorage.setItem('room_creator', response?.isCreator ? 'true' : 'false');

        // Rediriger
        router.push(`/room?room=${roomId.trim()}`);
      }
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 mb-6 animate-scale-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-lg">
          <DoorOpen size={24} className="text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800">
          Rejoindre une réunion
        </h2>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded animate-fade-in">
          <p className="font-medium flex items-center gap-2"><XCircle size={16} /> {error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="joinUserName" className="block text-sm font-medium text-gray-700 mb-2">
            Votre nom <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="joinUserName"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
            placeholder="Ex: Marie Martin"
            required
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="roomId" className="block text-sm font-medium text-gray-700 mb-2">
            ID de la réunion <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="roomId"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
            placeholder="Ex: reunion-123"
            required
            disabled={loading}
          />
          <p className="mt-2 text-sm text-gray-500 flex items-center gap-1">
            <Info size={16} /> Entrez l'ID de la réunion que vous souhaitez rejoindre
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || !socket}
          className={`w-full py-4 px-6 rounded-lg font-semibold text-white transition-all duration-200 transform ${
            loading || !socket
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 hover:shadow-2xl hover:scale-[1.02] active:scale-95'
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Connexion en cours...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <CheckCircle size={20} /> Rejoindre maintenant
            </span>
          )}
        </button>
      </form>
    </div>
  );
}