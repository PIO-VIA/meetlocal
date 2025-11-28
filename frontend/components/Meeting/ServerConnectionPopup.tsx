'use client';

import { AlertCircle, ExternalLink, X } from 'lucide-react';

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
  // Afficher le popup seulement si déconnecté ou erreur
  const shouldShow = status === 'disconnected' || status === 'error';

  if (!shouldShow) return null;

  const handleConnectToServer = () => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://localhost:3001';
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
              <h2 className="text-xl font-bold">Connexion au serveur perdue</h2>
              <p className="text-red-100 text-sm mt-1">
                Impossible de communiquer avec le serveur
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
            <h3 className="font-semibold text-gray-900">Que faire ?</h3>
            <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
              <li>Vérifiez que le serveur backend est démarré</li>
              <li>Cliquez sur le bouton ci-dessous pour vous connecter au serveur</li>
              <li>Acceptez le certificat SSL si demandé</li>
              <li>Revenez sur cette page pour continuer</li>
            </ol>
          </div>

          <div className="pt-2">
            <button
              onClick={handleConnectToServer}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
            >
              <ExternalLink size={20} />
              Se connecter au serveur
            </button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-700">
              <span className="font-semibold">URL du serveur:</span>
              <br />
              {process.env.NEXT_PUBLIC_BACKEND_URL || 'https://localhost:3001'}/health
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
