'use client';

import { useEffect, useState, useRef, FormEvent } from 'react';
import {  Socket } from 'socket.io-client';
import { MessageCircle, Send } from 'lucide-react';

interface Message {
  userName: string;
  message: string;
  timestamp: Date;
  isSystem?: boolean;
}

interface ChatBoxProps {
  socket: Socket | null;
  roomId: string;
  userName: string;
}

export default function ChatBox({ socket, roomId, userName }: ChatBoxProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (data: { userName: string; message: string }) => {
      setMessages(prev => [
        ...prev,
        {
          userName: data.userName,
          message: data.message,
          timestamp: new Date(),
          isSystem: false
        }
      ]);
    };

    const handleUserJoined = (data: { userName: string }) => {
      setMessages(prev => [
        ...prev,
        {
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
          userName: 'Système',
          message: `${data.userName} a quitté la réunion`,
          timestamp: new Date(),
          isSystem: true
        }
      ]);
    };

    socket.on('message', handleMessage);
    socket.on('userJoined', handleUserJoined);
    socket.on('userLeft', handleUserLeft);

    return () => {
      socket.off('message', handleMessage);
      socket.off('userJoined', handleUserJoined);
      socket.off('userLeft', handleUserLeft);
    };
  }, [socket]);

  useEffect(() => {
    // Scroll automatique vers le bas
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || !socket) return;

    socket.emit('message', {
      roomId,
      message: inputMessage.trim()
    });

    setInputMessage('');
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="h-full flex flex-col bg-gray-800 text-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <span><MessageCircle size={24} /></span>
          Chat
        </h3>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <p>Aucun message pour le moment</p>
            <p className="text-sm mt-2">Commencez la conversation !</p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              className={`${
                msg.isSystem
                  ? 'text-center text-gray-400 text-sm italic py-2'
                  : msg.userName === userName
                  ? 'flex justify-end'
                  : 'flex justify-start'
              }`}
            >
              {!msg.isSystem && (
                <div
                  className={`max-w-[75%] rounded-lg p-3 ${
                    msg.userName === userName
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-white'
                  }`}
                >
                  {msg.userName !== userName && (
                    <p className="text-xs font-semibold mb-1 text-gray-300">
                      {msg.userName}
                    </p>
                  )}
                  <p className="break-words">{msg.message}</p>
                  <p className="text-xs mt-1 opacity-70 text-right">
                    {formatTime(msg.timestamp)}
                  </p>
                </div>
              )}
              {msg.isSystem && <p>{msg.message}</p>}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-700">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Écrivez votre message..."
            className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            maxLength={500}
          />
          <button
            type="submit"
            disabled={!inputMessage.trim()}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              inputMessage.trim()
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Send size={24} />
          </button>
        </form>
      </div>
    </div>
  );
}