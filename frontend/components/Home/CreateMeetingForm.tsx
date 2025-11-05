'use client';

import { useState, FormEvent } from 'react';
import { Socket } from 'socket.io-client';
import { useRouter } from 'next/navigation';

interface CreateMeetingFormProps {
  socket: Socket | null;
}

export default function CreateMeetingForm({ socket }: CreateMeetingFormProps) {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [roomName, setRoomName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      customRoomId: '' // Laisser vide pour génération automatique
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
          <span className="text-2xl">🎥</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-800">
          Créer une nouvelle réunion
        </h2>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded">
          <p className="font-medium">❌ {error}</p>
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
          <p className="mt-2 text-sm text-gray-500">
            ℹ️ Un identifiant unique sera généré automatiquement
          </p>
        </div>

        <button
          type="submit"
          disabled={loading || !socket}
          className={`w-full py-4 px-6 rounded-lg font-semibold text-white transition-all transform ${
            loading || !socket
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg hover:scale-105'
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Création en cours...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              🚀 Lancer la réunion
            </span>
          )}
        </button>
      </form>
    </div>
  );
}