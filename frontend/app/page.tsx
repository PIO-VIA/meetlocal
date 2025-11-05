'use client';

import { useState } from 'react';
import { useSocket } from '@/hooks/useSocket';
import CreateMeetingForm from '@/components/Home/CreateMeetingForm';
import JoinMeetingForm from '@/components/Home/JoinMeetingForm';
import ActiveRoomsList from '@/components/Home/ActiveRoomsList';

export default function Home() {
  const { socket, isConnected } = useSocket();
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-800 mb-4">
            LOCAL MEET
          </h1>
          <p className="text-xl text-gray-600">
            Solution de visioconférence sécurisée en local
          </p>
          <div className="mt-4">
            <span className={`px-3 py-1 rounded-full text-sm ${
              isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {isConnected ? '🟢 Connecté' : '🔴 Déconnecté'}
            </span>
          </div>
        </div>

        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => setActiveTab('create')}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              activeTab === 'create'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Créer une réunion
          </button>
          <button
            onClick={() => setActiveTab('join')}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              activeTab === 'join'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Rejoindre
          </button>
        </div>

        <div className="max-w-2xl mx-auto">
          {activeTab === 'create' ? (
            <CreateMeetingForm socket={socket} />
          ) : (
            <>
              <JoinMeetingForm socket={socket} />
              <ActiveRoomsList socket={socket} />
            </>
          )}
        </div>
      </div>
    </main>
  );
}