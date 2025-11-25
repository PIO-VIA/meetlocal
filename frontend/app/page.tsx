'use client';

import { useState } from 'react';
import { useSocket } from '@/hooks/useSocket';
import CreateMeetingForm from '@/components/Home/CreateMeetingForm';
import JoinMeetingForm from '@/components/Home/JoinMeetingForm';
import ActiveRoomsList from '@/components/Home/ActiveRoomsList';
import { CircleDot, CircleOff, Shield, Zap, Video } from 'lucide-react';

export default function Home() {
  const { socket, isConnected } = useSocket();
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');

  return (
    <main className="min-h-screen bg-white relative overflow-hidden">
      {/* Background style Google Meet */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-50 via-white to-green-50 opacity-60"></div>
      </div>

      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Header avec logo et statut */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white text-xl font-bold">LM</span>
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">LOCAL MEET</h1>
              <p className="text-sm text-gray-600">Visioconférence sécurisée</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium animate-fade-in ${
              isConnected
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}>
              {isConnected ? (
                <>
                  <CircleDot size={12} className="animate-pulse" />
                  Connecté
                </>
              ) : (
                <>
                  <CircleOff size={12} />
                  Déconnecté
                </>
              )}
            </span>
          </div>
        </div>

        {/* Hero section */}
        <div className="text-center mb-12 py-12 animate-scale-in">
          <h2 className="text-5xl font-bold text-gray-900 mb-4">
            Réunions vidéo premium.<br />Maintenant gratuites pour tous.
          </h2>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            Nous avons réinventé la vidéoconférence pour votre réseau local. Sécurisée, rapide et gratuite.
          </p>

          {/* Tabs style Google Meet */}
          <div className="inline-flex bg-gray-100 rounded-lg p-1 mb-8">
            <button
              onClick={() => setActiveTab('create')}
              className={`px-6 py-2.5 rounded-md font-medium text-sm transition-all ${
                activeTab === 'create'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              Nouvelle réunion
            </button>
            <button
              onClick={() => setActiveTab('join')}
              className={`px-6 py-2.5 rounded-md font-medium text-sm transition-all ${
                activeTab === 'join'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              Rejoindre une réunion
            </button>
          </div>

          {/* Forms container */}
          <div className="max-w-2xl mx-auto">
            <div className="animate-fade-in">
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
        </div>

        {/* Features section style Google Meet */}
        <div className="max-w-5xl mx-auto mt-20 mb-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="text-blue-600" size={32} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Sécurisé par conception</h3>
              <p className="text-sm text-gray-600">Vos réunions restent sur votre réseau local</p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="text-green-600" size={32} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Ultra-rapide</h3>
              <p className="text-sm text-gray-600">Latence minimale sur votre réseau local</p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Video className="text-indigo-600" size={32} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Qualité premium</h3>
              <p className="text-sm text-gray-600">Partage d'écran et vidéo HD</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}