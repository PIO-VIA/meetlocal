'use client';

import { useEffect, useState, useRef, FormEvent, ChangeEvent } from 'react';
import { Socket } from 'socket.io-client';
import { MessageCircle, Send, Loader2, Paperclip, X, FileIcon, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface FileData {
  filename: string;
  originalName: string;
  size: number;
  mimetype: string;
  url: string;
}

interface Message {
  id: string;
  userName: string;
  message: string;
  timestamp: Date;
  isSystem?: boolean;
  isSending?: boolean;
  file?: FileData;
}

interface ChatBoxProps {
  socket: Socket | null;
  roomId: string;
  userName: string;
  onNewMessage?: () => void;
}

export default function ChatBox({ socket, roomId, userName, onNewMessage }: ChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (data: { id?: string; userName: string; message: string; timestamp?: string; file?: FileData }) => {
      setMessages(prev => {
        const messageId = data.id || `${data.userName}-${data.message}-${Date.now()}`;

        // Vérifier si le message existe déjà (par ID ou par contenu + timestamp récent)
        const exists = prev.some(msg => {
          if (msg.id === messageId) return true;
          // Éviter les doublons basés sur le contenu dans les 2 dernières secondes
          const timeDiff = Math.abs(new Date().getTime() - msg.timestamp.getTime());
          return msg.userName === data.userName &&
            msg.message === data.message &&
            timeDiff < 2000;
        });

        if (exists) {
          return prev;
        }

        // Notifier qu'il y a un nouveau message
        if (data.userName !== userName && onNewMessage) {
          onNewMessage();
        }

        return [
          ...prev,
          {
            id: messageId,
            userName: data.userName,
            message: data.message,
            timestamp: data.timestamp ? new Date(data.timestamp) : new Date(),
            isSystem: false,
            file: data.file
          }
        ];
      });

      // Marquer comme reçu
      setIsSending(false);
    };

    const handleUserJoined = (data: { userName: string }) => {
      setMessages(prev => [
        ...prev,
        {
          id: `system-join-${data.userName}-${Date.now()}`,
          userName: 'Système',
          message: `${data.userName} ${t('chat_box.joined')}`,
          timestamp: new Date(),
          isSystem: true
        }
      ]);
    };

    const handleUserLeft = (data: { userName: string }) => {
      setMessages(prev => [
        ...prev,
        {
          id: `system-left-${data.userName}-${Date.now()}`,
          userName: 'Système',
          message: `${data.userName} ${t('chat_box.left')}`,
          timestamp: new Date(),
          isSystem: true
        }
      ]);
    };

    // Synchroniser les messages existants lors de la connexion
    const handleChatHistory = (history: any[]) => {
      setMessages(history.map((msg, idx) => ({
        id: msg.id || `${msg.userName}-${idx}`,
        userName: msg.userName,
        message: msg.message,
        timestamp: new Date(msg.timestamp),
        isSystem: msg.isSystem || false,
        file: msg.file
      })));
    };

    socket.on('message', handleMessage);
    socket.on('userJoined', handleUserJoined);
    socket.on('userLeft', handleUserLeft);
    socket.on('chatHistory', handleChatHistory);

    // Demander l'historique au chargement
    socket.emit('getChatHistory', { roomId });

    return () => {
      socket.off('message', handleMessage);
      socket.off('userJoined', handleUserJoined);
      socket.off('userLeft', handleUserLeft);
      socket.off('chatHistory', handleChatHistory);
    };
  }, [socket, roomId, t]);

  useEffect(() => {
    // Scroll automatique vers le bas
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Vérifier la taille du fichier (max 50 MB)
      if (file.size > 50 * 1024 * 1024) {
        alert(t('chat_box.file_too_large'));
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if ((!inputMessage.trim() && !selectedFile) || !socket || isSending) return;

    const messageText = inputMessage.trim() || (selectedFile ? `📎 ${selectedFile.name}` : '');

    setIsSending(true);
    setInputMessage('');

    let fileData: FileData | undefined;

    // Uploader le fichier vers le serveur si présent
    if (selectedFile) {
      try {
        const formData = new FormData();
        formData.append('file', selectedFile);

        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '/api';
        const response = await fetch(`${backendUrl}/upload-file`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Erreur lors de l\'upload du fichier');
        }

        const result = await response.json();

        if (result.success) {
          fileData = result.file;
        } else {
          throw new Error(result.error || 'Erreur inconnue');
        }
      } catch (error) {
        console.error('Erreur lors de l\'upload du fichier:', error);
        alert(t('chat_box.send_error'));
        setIsSending(false);
        setInputMessage(messageText);
        return;
      }
    }

    // Envoyer le message via Socket.IO
    socket.emit('message', {
      roomId,
      message: messageText,
      timestamp: new Date().toISOString(),
      file: fileData
    }, (response: { success: boolean; error?: string }) => {
      if (!response?.success) {
        setInputMessage(messageText);
      } else {
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
      setIsSending(false);
    });

    // Focus sur l'input après envoi
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleDownloadFile = (file: FileData) => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || '/api';
    const downloadUrl = `${backendUrl}${file.url}`;

    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = file.originalName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900 text-gray-900 dark:text-white max-h-screen md:max-h-none">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        <h3 className="text-sm sm:text-base font-semibold flex items-center gap-2 text-gray-800 dark:text-white">
          <MessageCircle size={18} className="sm:w-5 sm:h-5 text-gray-600 dark:text-gray-400" />
          {t('chat_box.title')}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {t(messages.length === 1 ? 'chat_box.messages_count_one' : 'chat_box.messages_count_other', { count: messages.length })}
        </p>
      </div>

      {/* Messages - Conteneur avec scroll indépendant */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 bg-gray-50 dark:bg-gray-950 min-h-0 overscroll-contain">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 dark:text-gray-500 py-8">
            <p className="text-sm">{t('chat_box.empty')}</p>
            <p className="text-xs mt-1 text-gray-400 dark:text-gray-500">{t('chat_box.start_conversation')}</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`${msg.isSystem
                ? 'text-center text-gray-500 dark:text-gray-400 text-xs italic py-1'
                : msg.userName === userName
                  ? 'flex justify-end'
                  : 'flex justify-start'
                } ${msg.isSending ? 'opacity-50' : 'opacity-100'} transition-opacity`}
            >
              {!msg.isSystem && (
                <div
                  className={`max-w-[75%] rounded-lg px-3 py-2 ${msg.userName === userName
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 shadow-sm'
                    }`}
                >
                  {msg.userName !== userName && (
                    <p className="text-xs font-semibold mb-0.5 text-blue-600 dark:text-blue-400">
                      {msg.userName}
                    </p>
                  )}
                  <p className="text-sm break-words">{msg.message}</p>

                  {/* Affichage du fichier si présent */}
                  {msg.file && (
                    <div className={`mt-2 p-2.5 rounded-lg border ${msg.userName === userName
                      ? 'bg-blue-500 bg-opacity-30 border-blue-300'
                      : 'bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-600'
                      }`}>
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded ${msg.userName === userName ? 'bg-white bg-opacity-20' : 'bg-blue-50 dark:bg-blue-900/30'
                          }`}>
                          <FileIcon size={18} className={msg.userName === userName ? 'text-white' : 'text-blue-600 dark:text-blue-400'} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{msg.file.originalName}</p>
                          <p className={`text-xs ${msg.userName === userName ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                            {formatFileSize(msg.file.size)}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDownloadFile(msg.file!)}
                          className={`p-2 rounded-lg font-medium transition-all shadow-sm flex items-center gap-1.5 ${msg.userName === userName
                            ? 'bg-white text-blue-600 hover:bg-blue-50'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                          title={t('chat_box.download')}
                        >
                          <Download size={16} />
                          <span className="text-xs hidden sm:inline">{t('chat_box.download')}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-1 mt-1">
                    <p className={`text-xs ${msg.userName === userName ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                      {formatTime(msg.timestamp)}
                    </p>
                    {msg.isSending && (
                      <Loader2 size={10} className="animate-spin" />
                    )}
                  </div>
                </div>
              )}
              {msg.isSystem && <p>{msg.message}</p>}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input - Optimisé pour mobile */}
      <div className="p-2 sm:p-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0 safe-area-bottom">
        {/* Prévisualisation du fichier sélectionné */}
        {selectedFile && (
          <div className="mb-2 p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2">
              <FileIcon size={16} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{selectedFile.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(selectedFile.size)}</p>
              </div>
              <button
                onClick={handleRemoveFile}
                className="p-1 hover:bg-blue-100 dark:hover:bg-blue-800 rounded transition-colors flex-shrink-0"
                title={t('chat_box.remove_file')}
              >
                <X size={16} className="text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-1.5 sm:gap-2 items-end">
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden"
            accept="*/*"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-2.5 sm:px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors flex items-center gap-2 flex-shrink-0"
            disabled={isSending}
            title={t('chat_box.attach_file')}
            aria-label={t('chat_box.attach_file')}
          >
            <Paperclip size={16} className="sm:w-[18px] sm:h-[18px]" />
          </button>
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={t('chat_box.placeholder')}
            className="flex-1 min-w-0 px-2.5 sm:px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg border border-gray-200 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white dark:focus:bg-gray-800 placeholder-gray-500 dark:placeholder-gray-400 text-sm resize-none"
            maxLength={500}
            disabled={isSending}
            autoComplete="off"
            enterKeyHint="send"
            aria-label={t('chat_box.message_label')}
          />
          <button
            type="submit"
            disabled={(!inputMessage.trim() && !selectedFile) || isSending}
            className={`px-3 sm:px-4 py-2 rounded-lg transition-colors flex items-center gap-2 flex-shrink-0 ${(inputMessage.trim() || selectedFile) && !isSending
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
              }`}
            aria-label={t('chat_box.send_label')}
          >
            {isSending ? (
              <Loader2 size={16} className="sm:w-[18px] sm:h-[18px] animate-spin" />
            ) : (
              <Send size={16} className="sm:w-[18px] sm:h-[18px]" />
            )}
          </button>
        </form>
        {inputMessage.length > 400 && (
          <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
            {t('chat_box.chars_limit', { length: inputMessage.length })}
          </p>
        )}
      </div>
    </div>
  );
}