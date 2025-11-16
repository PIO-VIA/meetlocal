'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Crown, User } from 'lucide-react';

interface Participant {
  id: string;
  name: string;
  isCreator?: boolean;
  isStreaming?: boolean;
  stream?: MediaStream;
  audioLevel?: number;
}

interface ParticipantGridProps {
  participants: Participant[];
  localStream?: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  currentUserId?: string;
}

export default function ParticipantGrid({
  participants,
  localStream,
  remoteStreams,
  currentUserId
}: ParticipantGridProps) {
  return (
    <div className="h-full w-full p-4">
      <div className={`grid gap-4 h-full ${
        participants.length === 1 ? 'grid-cols-1' :
        participants.length === 2 ? 'grid-cols-2' :
        participants.length <= 4 ? 'grid-cols-2 grid-rows-2' :
        participants.length <= 6 ? 'grid-cols-3 grid-rows-2' :
        'grid-cols-4'
      }`}>
        {participants.map((participant) => {
          const stream = participant.id === currentUserId 
            ? localStream 
            : remoteStreams.get(participant.id);
          
          return (
            <ParticipantCard
              key={participant.id}
              participant={participant}
              stream={stream || undefined}
              isLocal={participant.id === currentUserId}
            />
          );
        })}
      </div>
    </div>
  );
}

interface ParticipantCardProps {
  participant: Participant;
  stream?: MediaStream;
  isLocal: boolean;
}

function ParticipantCard({ participant, stream, isLocal }: ParticipantCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();
  
  const [audioLevel, setAudioLevel] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Initialiser la vidéo
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Analyser l'audio pour détecter la parole
  useEffect(() => {
    if (!stream) return;

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) return;

    try {
      // Créer l'AudioContext
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioContext = audioContextRef.current;

      // Créer la source audio
      const source = audioContext.createMediaStreamSource(stream);
      
      // Créer l'analyseur
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;

      // Connecter source -> analyser
      source.connect(analyser);

      // Buffer pour les données audio
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      // Fonction d'analyse continue
      const detectAudio = () => {
        if (!analyserRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArray);

        // Calculer le niveau moyen
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        const normalizedLevel = Math.min(average / 128, 1);

        setAudioLevel(normalizedLevel);
        
        // Seuil de détection de parole (ajustable)
        const SPEECH_THRESHOLD = 0.15;
        setIsSpeaking(normalizedLevel > SPEECH_THRESHOLD);

        animationFrameRef.current = requestAnimationFrame(detectAudio);
      };

      detectAudio();

    } catch (error) {
      console.error('Erreur lors de l\'initialisation de l\'analyse audio:', error);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stream]);

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const hasAudio = stream?.getAudioTracks().some(track => track.enabled) ?? false;
  const hasVideo = stream?.getVideoTracks().some(track => track.enabled) ?? false;

  return (
    <div className="relative bg-gray-900 rounded-xl overflow-hidden shadow-2xl">
      {/* Effet d'onde audio - plusieurs cercles concentriques */}
      {isSpeaking && (
        <>
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="absolute inset-0 rounded-xl pointer-events-none z-10"
              style={{
                border: `${3 + i}px solid rgba(59, 130, 246, ${0.6 - i * 0.15})`,
                animation: `audioWave 1.5s ease-out infinite`,
                animationDelay: `${i * 0.2}s`,
                transform: `scale(${1 + audioLevel * 0.1})`
              }}
            />
          ))}
        </>
      )}

      {/* Indicateur de niveau audio (bordure pulsante) */}
      <div
        className="absolute inset-0 rounded-xl pointer-events-none z-20 transition-all duration-100"
        style={{
          boxShadow: isSpeaking 
            ? `0 0 ${20 + audioLevel * 30}px rgba(59, 130, 246, ${0.4 + audioLevel * 0.4})` 
            : 'none'
        }}
      />

      {/* Vidéo ou Avatar */}
      <div className="relative w-full h-full">
        {hasVideo ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isLocal}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-600 to-purple-600">
            <div className="text-6xl font-bold text-white">
              {getInitials(participant.name)}
            </div>
          </div>
        )}
      </div>

      {/* Overlay infos participant */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Icône utilisateur */}
            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
              <User size={16} className="text-white" />
            </div>
            
            {/* Nom */}
            <div>
              <p className="text-white font-semibold text-sm flex items-center gap-2">
                {participant.name}
                {isLocal && <span className="text-xs text-gray-300">(Vous)</span>}
                {participant.isCreator && (
                  <Crown size={14} className="text-yellow-400" title="Administrateur" />
                )}
              </p>
            </div>
          </div>

          {/* Indicateur micro */}
          <div className={`flex items-center gap-1 px-2 py-1 rounded ${
            hasAudio 
              ? isSpeaking 
                ? 'bg-green-500/80' 
                : 'bg-gray-700/80'
              : 'bg-red-500/80'
          }`}>
            {hasAudio ? (
              <>
                <Mic size={14} className="text-white" />
                {/* Barres de niveau audio */}
                {isSpeaking && (
                  <div className="flex items-end gap-0.5 h-4">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1 bg-white rounded-full transition-all duration-100"
                        style={{
                          height: `${Math.max(20, audioLevel * 100 * (1 - i * 0.2))}%`,
                        }}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <MicOff size={14} className="text-white" />
            )}
          </div>
        </div>

        {/* Barre de niveau audio en bas */}
        {hasAudio && isSpeaking && (
          <div className="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-100"
              style={{ width: `${audioLevel * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* Canvas pour visualisation audio avancée (optionnel) */}
      <canvas
        ref={canvasRef}
        className="hidden"
        width="100"
        height="100"
      />

      {/* Styles CSS pour l'animation d'onde */}
      <style jsx>{`
        @keyframes audioWave {
          0% {
            transform: scale(1);
            opacity: 0.6;
          }
          50% {
            opacity: 0.3;
          }
          100% {
            transform: scale(1.15);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}