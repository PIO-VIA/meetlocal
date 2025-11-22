'use client';

import { useState } from 'react';
import { useSocket } from '@/hooks/useSocket';
import CreateMeetingForm from '@/components/Home/CreateMeetingForm';
import JoinMeetingForm from '@/components/Home/JoinMeetingForm';
import ActiveRoomsList from '@/components/Home/ActiveRoomsList';
import { CircleDot, CircleOff } from 'lucide-react';

export default function Home() {
  const { socket, isConnected } = useSocket();
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 relative overflow-hidden">
      {/* Éléments de décoration subtils */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-200/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-100/20 rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        <div className="text-center mb-12 pt-8">
          <div className="inline-block mb-6">
            <h1 className="text-6xl font-bold text-gray-800 mb-2 tracking-tight">
              LOCAL MEET
            </h1>
          </div>
          <p className="text-xl text-gray-600 mb-6 font-normal">
            Visioconférence sécurisée sur réseau local
          </p>
          <div className="flex items-center justify-center gap-4">
            <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${
              isConnected
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {isConnected ? (
                <>
                  <CircleDot size={16} className="animate-pulse" />
                  Connecté au serveur
                </>
              ) : (
                <>
                  <CircleOff size={16} />
                  Déconnecté
                </>
              )}
            </span>
          </div>
        </div>

        <div className="flex justify-center gap-3 mb-8">
          <button
            onClick={() => setActiveTab('create')}
            className={`px-8 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'create'
                ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 shadow-sm'
            }`}
          >
            Créer une réunion
          </button>
          <button
            onClick={() => setActiveTab('join')}
            className={`px-8 py-3 rounded-lg font-medium transition-all ${
              activeTab === 'join'
                ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 shadow-sm'
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