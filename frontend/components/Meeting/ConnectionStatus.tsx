'use client';

import { AlertCircle, CheckCircle, Loader, WifiOff, Zap, RefreshCw } from 'lucide-react';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'reconnecting';

interface ConnectionStatusProps {
  status: ConnectionStatus;
  error?: string | null;
  reconnectAttempts?: number;
  latency?: number;
  onReconnect?: () => void;
}

export default function ConnectionStatus({
  status,
  error,
  reconnectAttempts = 0,
  latency = 0,
  onReconnect
}: ConnectionStatusProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: CheckCircle,
          text: 'Connecté',
          bgColor: 'bg-green-100',
          textColor: 'text-green-800',
          borderColor: 'border-green-300',
          showLatency: true
        };
      case 'connecting':
        return {
          icon: Loader,
          text: 'Connexion en cours...',
          bgColor: 'bg-blue-100',
          textColor: 'text-blue-800',
          borderColor: 'border-blue-300',
          animate: true
        };
      case 'reconnecting':
        return {
          icon: RefreshCw,
          text: `Reconnexion... (${reconnectAttempts}/10)`,
          bgColor: 'bg-yellow-100',
          textColor: 'text-yellow-800',
          borderColor: 'border-yellow-300',
          animate: true,
          showRetry: true
        };
      case 'error':
        return {
          icon: AlertCircle,
          text: 'Erreur de connexion',
          bgColor: 'bg-red-100',
          textColor: 'text-red-800',
          borderColor: 'border-red-300',
          showRetry: true
        };
      case 'disconnected':
      default:
        return {
          icon: WifiOff,
          text: 'Déconnecté',
          bgColor: 'bg-gray-100',
          textColor: 'text-gray-800',
          borderColor: 'border-gray-300',
          showRetry: true
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const getLatencyColor = () => {
    if (latency < 50) return 'text-green-600';
    if (latency < 100) return 'text-yellow-600';
    if (latency < 200) return 'text-orange-600';
    return 'text-red-600';
  };

  const getLatencyQuality = () => {
    if (latency < 50) return 'Excellent';
    if (latency < 100) return 'Bon';
    if (latency < 200) return 'Moyen';
    return 'Faible';
  };

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className={`${config.bgColor} ${config.borderColor} border-2 rounded-lg shadow-lg p-4 transition-all duration-300`}>
        <div className="flex items-center gap-3">
          <Icon
            size={24}
            className={`${config.textColor} ${config.animate ? 'animate-spin' : ''}`}
          />

          <div className="flex-1">
            <p className={`${config.textColor} font-semibold text-sm`}>
              {config.text}
            </p>

            {error && (
              <p className="text-xs text-red-600 mt-1">
                {error}
              </p>
            )}

            {config.showLatency && latency > 0 && (
              <div className="flex items-center gap-2 mt-1">
                <Zap size={14} className={getLatencyColor()} />
                <p className={`text-xs ${getLatencyColor()} font-medium`}>
                  {latency}ms - {getLatencyQuality()}
                </p>
              </div>
            )}
          </div>

          {config.showRetry && onReconnect && (
            <button
              onClick={onReconnect}
              className="px-3 py-1 bg-white rounded text-xs font-semibold hover:bg-gray-50 transition-colors"
            >
              Reconnecter
            </button>
          )}
        </div>

        {/* Instructions si erreur de connexion */}
        {(status === 'error' || status === 'disconnected') && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-700 font-semibold mb-1">
              📋 Actions possibles:
            </p>
            <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
              <li>Vérifiez que le backend est démarré</li>
              <li>Vérifiez l'accès à {process.env.NEXT_PUBLIC_BACKEND_URL || '/api'}/health</li>
            </ol>
          </div>
        )}
      </div>

      {/* Barre de progression pour les reconnexions */}
      {status === 'reconnecting' && (
        <div className="mt-2 bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-yellow-500 transition-all duration-1000"
            style={{ width: `${(reconnectAttempts / 10) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}