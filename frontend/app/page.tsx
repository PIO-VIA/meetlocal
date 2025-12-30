'use client';

import { useState } from 'react';
import { useSocket } from '@/hooks/useSocket';
import CreateMeetingForm from '@/components/Home/CreateMeetingForm';
import JoinMeetingForm from '@/components/Home/JoinMeetingForm';
import ActiveRoomsList from '@/components/Home/ActiveRoomsList';
import ServerConnectionPopup from '@/components/Meeting/ServerConnectionPopup';
import ThemeToggle from '@/components/shared/ThemeToggle';
import LanguageSwitcher from '@/components/shared/LanguageSwitcher';
import Footer from '@/components/shared/Footer';
import { CircleDot, CircleOff, Shield, Zap, Video } from 'lucide-react';
import '@/lib/i18n'; // Initialize i18n
import { useTranslation } from 'react-i18next';

export default function Home() {
  const { socket, isConnected, status, error } = useSocket();
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const { t } = useTranslation();

  return (
    <main className="min-h-screen bg-white dark:bg-gray-900 relative overflow-hidden transition-colors">
      {/* Popup de connexion au serveur */}
      <ServerConnectionPopup status={status} error={error} />

      {/* Background style Google Meet */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-gray-800 dark:via-gray-900 dark:to-blue-950 opacity-60"></div>
      </div>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 relative z-10">
        {/* Header avec logo et statut - Responsive */}
        <div className="flex justify-between items-center mb-6 sm:mb-8">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white text-lg sm:text-xl font-bold">LM</span>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">{t('app.title')}</h1>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{t('app.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
            <ThemeToggle />
            <span className={`inline-flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium animate-fade-in ${isConnected
              ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
              : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
              }`}>
              {isConnected ? (
                <>
                  <CircleDot size={10} className="sm:w-3 sm:h-3 animate-pulse" />
                  <span className="hidden xs:inline">{t('app.status.connected')}</span>
                </>
              ) : (
                <>
                  <CircleOff size={10} className="sm:w-3 sm:h-3" />
                  <span className="hidden xs:inline">{t('app.status.disconnected')}</span>
                </>
              )}
            </span>
          </div>
        </div>

        {/* Hero section - Responsive */}
        <div className="text-center mb-8 sm:mb-12 py-6 sm:py-12 animate-scale-in">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 px-2">
            {t('app.hero.title_line1')}<br className="hidden sm:block" />
            <span className="sm:hidden"> </span>{t('app.hero.title_line2')}
          </h2>
          <p className="text-sm sm:text-base lg:text-lg text-gray-600 dark:text-gray-400 mb-6 sm:mb-8 max-w-2xl mx-auto px-4">
            {t('app.hero.description')}
          </p>

          {/* Tabs style Google Meet - Responsive */}
          <div className="inline-flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1 mb-6 sm:mb-8 w-full max-w-md sm:w-auto">
            <button
              onClick={() => setActiveTab('create')}
              className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-2.5 rounded-md font-medium text-xs sm:text-sm transition-all ${activeTab === 'create'
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              aria-label={t('app.tabs.new_meeting')}
              aria-selected={activeTab === 'create'}
              role="tab"
            >
              <span className="hidden sm:inline">{t('app.tabs.new_meeting')}</span>
              <span className="sm:hidden">{t('app.tabs.create')}</span>
            </button>
            <button
              onClick={() => setActiveTab('join')}
              className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 sm:py-2.5 rounded-md font-medium text-xs sm:text-sm transition-all ${activeTab === 'join'
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                }`}
              aria-label={t('app.tabs.join_meeting')}
              aria-selected={activeTab === 'join'}
              role="tab"
            >
              <span className="hidden sm:inline">{t('app.tabs.join_meeting')}</span>
              <span className="sm:hidden">{t('app.tabs.join')}</span>
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
            <div className="text-center p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Shield className="text-blue-600 dark:text-blue-400" size={24} />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-1 sm:mb-2">{t('app.features.secure.title')}</h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{t('app.features.secure.description')}</p>
            </div>
            <div className="text-center p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-50 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Zap className="text-green-600 dark:text-green-400" size={24} />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-1 sm:mb-2">{t('app.features.fast.title')}</h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{t('app.features.fast.description')}</p>
            </div>
            <div className="text-center p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow sm:col-span-2 md:col-span-1">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <Video className="text-indigo-600 dark:text-indigo-400" size={24} />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-1 sm:mb-2">{t('app.features.premium.title')}</h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{t('app.features.premium.description')}</p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </main >
  );
}