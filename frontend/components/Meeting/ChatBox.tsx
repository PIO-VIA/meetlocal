'use client';

import { useEffect, useState, useRef, FormEvent, ChangeEvent } from 'react';
import {  Socket } from 'socket.io-client';
import { MessageCircle, Send, Loader2, Paperclip, X, FileIcon, Download } from 'lucide-react';

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
          message: `${data.userName} a rejoint la réunion`,
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
          message: `${data.userName} a quitté la réunion`,
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
  }, [socket, roomId]);

  useEffect(() => {
    // Scroll automatique vers le bas
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Vérifier la taille du fichier (max 50 MB)
      if (file.size > 50 * 1024 * 1024) {
        alert('Le fichier est trop volumineux. Taille maximale : 50 MB');
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

        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://localhost:3001';
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
        alert('Erreur lors de l\'envoi du fichier. Veuillez réessayer.');
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
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://localhost:3001';
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
    <div className="h-full flex flex-col bg-white text-gray-900">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex-shrink-0">
        <h3 className="text-base font-semibold flex items-center gap-2 text-gray-800">
          <MessageCircle size={20} className="text-gray-600" />
          Chat de la réunion
        </h3>
        <p className="text-xs text-gray-500 mt-1">{messages.length} message{messages.length > 1 ? 's' : ''}</p>
      </div>

      {/* Messages - Conteneur avec scroll indépendant */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50 min-h-0">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <p className="text-sm">Aucun message pour le moment</p>
            <p className="text-xs mt-1 text-gray-400">Commencez la conversation !</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`${
                msg.isSystem
                  ? 'text-center text-gray-500 text-xs italic py-1'
                  : msg.userName === userName
                  ? 'flex justify-end'
                  : 'flex justify-start'
              } ${msg.isSending ? 'opacity-50' : 'opacity-100'} transition-opacity`}
            >
              {!msg.isSystem && (
                <div
                  className={`max-w-[75%] rounded-lg px-3 py-2 ${
                    msg.userName === userName
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-900 border border-gray-200 shadow-sm'
                  }`}
                >
                  {msg.userName !== userName && (
                    <p className="text-xs font-semibold mb-0.5 text-blue-600">
                      {msg.userName}
                    </p>
                  )}
                  <p className="text-sm break-words">{msg.message}</p>

                  {/* Affichage du fichier si présent */}
                  {msg.file && (
                    <div className={`mt-2 p-2.5 rounded-lg border ${
                      msg.userName === userName
                        ? 'bg-blue-500 bg-opacity-30 border-blue-300'
                        : 'bg-gray-50 border-gray-300'
                    }`}>
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded ${
                          msg.userName === userName ? 'bg-white bg-opacity-20' : 'bg-blue-50'
                        }`}>
                          <FileIcon size={18} className={msg.userName === userName ? 'text-white' : 'text-blue-600'} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{msg.file.originalName}</p>
                          <p className={`text-xs ${msg.userName === userName ? 'text-blue-100' : 'text-gray-500'}`}>
                            {formatFileSize(msg.file.size)}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDownloadFile(msg.file!)}
                          className={`p-2 rounded-lg font-medium transition-all shadow-sm flex items-center gap-1.5 ${
                            msg.userName === userName
                              ? 'bg-white text-blue-600 hover:bg-blue-50'
                              : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                          title="Télécharger"
                        >
                          <Download size={16} />
                          <span className="text-xs hidden sm:inline">Télécharger</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-1 mt-1">
                    <p className={`text-xs ${msg.userName === userName ? 'text-blue-100' : 'text-gray-500'}`}>
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

      {/* Input */}
      <div className="p-3 border-t border-gray-200 bg-white flex-shrink-0">
        {/* Prévisualisation du fichier sélectionné */}
        {selectedFile && (
          <div className="mb-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2">
              <FileIcon size={16} className="text-blue-600" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-900 truncate">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
              </div>
              <button
                onClick={handleRemoveFile}
                className="p-1 hover:bg-blue-100 rounded transition-colors"
                title="Retirer le fichier"
              >
                <X size={16} className="text-gray-600" />
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex gap-2">
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
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors flex items-center gap-2"
            disabled={isSending}
            title="Joindre un fichier"
          >
            <Paperclip size={18} />
          </button>
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Envoyer un message..."
            className="flex-1 px-3 py-2 bg-gray-100 text-gray-900 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white placeholder-gray-500 text-sm transition"
            maxLength={500}
            disabled={isSending}
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={(!inputMessage.trim() && !selectedFile) || isSending}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              (inputMessage.trim() || selectedFile) && !isSending
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isSending ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
          </button>
        </form>
        {inputMessage.length > 400 && (
          <p className="text-xs text-amber-600 mt-1">
            {inputMessage.length}/500 caractères
          </p>
        )}
      </div>
    </div>
  );
}