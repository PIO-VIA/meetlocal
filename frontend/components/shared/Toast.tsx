'use client';

import { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  onClose: (id: string) => void;
}

const toastStyles = {
  success: {
    bg: 'bg-white',
    border: 'border-green-500',
    icon: CheckCircle,
    iconColor: 'text-green-500',
    progressBar: 'bg-green-500'
  },
  error: {
    bg: 'bg-white',
    border: 'border-red-500',
    icon: AlertCircle,
    iconColor: 'text-red-500',
    progressBar: 'bg-red-500'
  },
  warning: {
    bg: 'bg-white',
    border: 'border-yellow-500',
    icon: AlertTriangle,
    iconColor: 'text-yellow-500',
    progressBar: 'bg-yellow-500'
  },
  info: {
    bg: 'bg-white',
    border: 'border-blue-500',
    icon: Info,
    iconColor: 'text-blue-500',
    progressBar: 'bg-blue-500'
  }
};

export default function Toast({ id, message, type, duration = 5000, onClose }: ToastProps) {
  const style = toastStyles[type];
  const Icon = style.icon;

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(id);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [id, duration, onClose]);

  return (
    <div
      className={`${style.bg} ${style.border} border-l-4 rounded-lg shadow-lg p-4 mb-3 min-w-[320px] max-w-md animate-slide-in-right`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <Icon className={`${style.iconColor} flex-shrink-0 mt-0.5`} size={20} />
        <p className="flex-1 text-gray-800 text-sm font-medium">{message}</p>
        <button
          onClick={() => onClose(id)}
          className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
          aria-label="Fermer"
        >
          <X size={18} />
        </button>
      </div>
      {duration > 0 && (
        <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${style.progressBar} animate-progress`}
            style={{ animationDuration: `${duration}ms` }}
          />
        </div>
      )}
    </div>
  );
}
