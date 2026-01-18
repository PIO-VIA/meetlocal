'use client';

import { AlertCircle, ExternalLink, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'reconnecting';

interface ServerConnectionPopupProps {
  status: ConnectionStatus;
  error?: string | null;
  onClose?: () => void;
}

export default function ServerConnectionPopup({
  status,
  error,
  onClose
}: ServerConnectionPopupProps) {
  const { t } = useTranslation();
  // Afficher le popup seulement si déconnecté ou erreur
  const shouldShow = status === 'disconnected' || status === 'error';

  if (!shouldShow) return null;

  const handleConnectToServer = () => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '/api';
    const healthUrl = `${backendUrl}/health`;

    // Ouvrir dans un nouvel onglet
    window.open(healthUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* En-tête avec fond rouge */}
        <div className="bg-gradient-to-r from-red-500 to-red-600 p-6">
          <div className="flex items-center gap-3 text-white">
            <AlertCircle size={32} className="flex-shrink-0" />
            <div>
              <h2 className="text-xl font-bold">{t('server_popup.title')}</h2>
              <p className="text-red-100 text-sm mt-1">
                {t('server_popup.subtitle')}
              </p>
            </div>
          </div>
        </div>

        {/* Contenu */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <h3 className="font-semibold text-gray-900">{t('server_popup.what_to_do')}</h3>
            <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
              <li>{t('server_popup.steps.1')}</li>
              <li>{t('server_popup.steps.2')}</li>
              <li>{t('server_popup.steps.3')}</li>
              <li>{t('server_popup.steps.4')}</li>
            </ol>
          </div>

          <div className="pt-2">
            <button
              onClick={handleConnectToServer}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
            >
              <ExternalLink size={20} />
              {t('server_popup.button')}
            </button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-700">
              <span className="font-semibold">{t('server_popup.url_label')}</span>
              <br />
              {process.env.NEXT_PUBLIC_BACKEND_URL || '/api'}/health
            </p>
          </div>
        </div>

        {/* Bouton fermer (optionnel) */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-6 right-6 text-white hover:bg-white/20 rounded-full p-1 transition-colors"
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
        )}
      </div>
    </div>
  );
}
