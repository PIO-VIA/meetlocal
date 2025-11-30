'use client';

import { useState } from 'react';
import { useSocket } from '@/hooks/useSocket';
import CreateMeetingForm from '@/components/Home/CreateMeetingForm';
import JoinMeetingForm from '@/components/Home/JoinMeetingForm';
import ActiveRoomsList from '@/components/Home/ActiveRoomsList';
import ServerConnectionPopup from '@/components/Meeting/ServerConnectionPopup';
import { CircleDot, CircleOff, Shield, Zap, Video } from 'lucide-react';

export default function Home() {
  const { socket, isConnected, status, error } = useSocket();
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');

  return (
    <main className="min-h-screen bg-white relative overflow-hidden">
      {/* Popup de connexion au serveur */}
      <ServerConnectionPopup status={status} error={error} />

      {/* Background style Google Meet */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-50 via-white to-green-50 opacity-60"></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 relative z-10">
        {/* Header avec logo et statut - Responsive */}
        <div className="flex justify-between items-center mb-6 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white text-lg sm:text-xl font-bold">LM</span>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">LOCAL MEET</h1>
              <p className="text-xs sm:text-sm text-gray-600">Visioconférence sécurisée</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className={`inline-flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium animate-fade-in ${
              isConnected
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}>
              {isConnected ? (
                <>
                  <CircleDot size={10} className="sm:w-3 sm:h-3 animate-pulse" />
                  <span className="hidden xs:inline">Connecté</span>
                </>
              ) : (
                <>
                  <CircleOff size={10} className="sm:w-3 sm:h-3" />
                  <span className="hidden xs:inline">Déconnecté</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Hero section - Responsive */}
        <div className="text-center mb-8 sm:mb-12 py-6 sm:py-12 animate-scale-in">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 sm:mb-4 px-2">
            Réunions vidéo premium.<br className="hidden sm:block" />
            <span className="sm:hidden"> </span>Maintenant gratuites pour tous.
          </h2>
          <p className="text-sm sm:text-base lg:text-lg text-gray-600 mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
            Nous avons réinventé la vidéoconférence pour votre réseau local. Sécurisée, rapide et gratuite.
          </p>

          {/* Tabs style Google Meet - Responsive */}
          <div className="inline-flex bg-gray-100 rounded-lg p-1 mb-6 sm:mb-8 w-full max-w-md sm:w-auto">
            <button
              onClick={() => setActiveTab('create')}
              className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-2.5 rounded-md font-medium text-xs sm:text-sm transition-all ${
                activeTab === 'create'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              <span className="hidden sm:inline">Nouvelle réunion</span>
              <span className="sm:hidden">Créer</span>
            </button>
            <button
              onClick={() => setActiveTab('join')}
              className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-2.5 rounded-md font-medium text-xs sm:text-sm transition-all ${
                activeTab === 'join'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-700 hover:text-gray-900'
              }`}
            >
              <span className="hidden sm:inline">Rejoindre une réunion</span>
              <span className="sm:hidden">Rejoindre</span>
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

        {/* Features section style Google Meet - Responsive */}
        <div className="max-w-5xl mx-auto mt-12 sm:mt-16 lg:mt-20 mb-8 sm:mb-12 px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 sm:gap-8">
            <div className="text-center p-4 sm:p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Shield className="text-blue-600" size={24} />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1 sm:mb-2">Sécurisé par conception</h3>
              <p className="text-xs sm:text-sm text-gray-600">Vos réunions restent sur votre réseau local</p>
            </div>
            <div className="text-center p-4 sm:p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Zap className="text-green-600" size={24} />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1 sm:mb-2">Ultra-rapide</h3>
              <p className="text-xs sm:text-sm text-gray-600">Latence minimale sur votre réseau local</p>
            </div>
            <div className="text-center p-4 sm:p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow sm:col-span-2 md:col-span-1">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Video className="text-indigo-600" size={24} />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1 sm:mb-2">Qualité premium</h3>
              <p className="text-xs sm:text-sm text-gray-600">Partage d'écran et vidéo HD</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}