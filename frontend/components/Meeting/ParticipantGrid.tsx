'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Crown, User, Monitor, Maximize2, Minimize2, X } from 'lucide-react';

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
  screenStream?: MediaStream | null;
  remoteScreenStreams: Map<string, MediaStream>;
  currentUserId?: string;
}

export default function ParticipantGrid({
  participants,
  localStream,
  remoteStreams,
  screenStream,
  remoteScreenStreams,
  currentUserId
}: ParticipantGridProps) {
  const [fullscreenVideo, setFullscreenVideo] = useState<{ stream: MediaStream; participant: Participant } | null>(null);

  // Vérifier s'il y a des partages d'écran actifs (support multiple)
  const allScreenStreams: Array<{ stream: MediaStream; userId: string | undefined; isLocal: boolean }> = [];

  if (screenStream) {
    allScreenStreams.push({ stream: screenStream, userId: currentUserId, isLocal: true });
  }

  remoteScreenStreams.forEach((stream, userId) => {
    allScreenStreams.push({ stream, userId, isLocal: false });
  });

  const hasScreenShare = allScreenStreams.length > 0;

  // Mode Fullscreen
  if (fullscreenVideo) {
    return (
      <div className="fixed inset-0 z-50 bg-black">
        <FullscreenVideoDisplay
          stream={fullscreenVideo.stream}
          participant={fullscreenVideo.participant}
          onClose={() => setFullscreenVideo(null)}
        />
      </div>
    );
  }

  if (hasScreenShare) {
    // Mode partage d'écran : affichage principal + participants visibles sur le côté
    return (
      <div className="h-full w-full flex gap-3 p-3">
        {/* Partage(s) d'écran principal */}
        <div className={`flex-1 grid gap-3 ${
          allScreenStreams.length === 1 ? 'grid-cols-1' :
          allScreenStreams.length === 2 ? 'grid-cols-2' :
          allScreenStreams.length <= 4 ? 'grid-cols-2 grid-rows-2' :
          'grid-cols-3'
        }`}>
          {allScreenStreams.map((screenData, index) => {
            const participant = participants.find(p => p.id === screenData.userId);
            return (
              <div key={index} className="relative bg-gray-900 rounded-lg overflow-hidden">
                <ScreenShareDisplay
                  stream={screenData.stream}
                  isLocal={screenData.isLocal}
                  userName={participant?.name || 'Utilisateur'}
                  onFullscreen={() => participant && setFullscreenVideo({ stream: screenData.stream, participant })}
                />
              </div>
            );
          })}
        </div>

        {/* Participants visibles sur le côté droit */}
        <div className="w-64 flex flex-col gap-2 overflow-y-auto">
          {/* Vidéo locale */}
          {localStream && (
            <div className="flex-shrink-0 h-36">
              <ParticipantCard
                participant={participants.find(p => p.id === currentUserId) || { id: currentUserId || '', name: 'Vous' }}
                stream={localStream}
                isLocal={true}
                isMiniature={true}
                onFullscreen={(stream, participant) => setFullscreenVideo({ stream, participant })}
              />
            </div>
          )}

          {/* Vidéos distantes */}
          {participants.filter(p => p.id !== currentUserId).map((participant) => {
            const stream = remoteStreams.get(participant.id);
            return (
              <div key={participant.id} className="flex-shrink-0 h-36">
                <ParticipantCard
                  participant={participant}
                  stream={stream}
                  isLocal={false}
                  isMiniature={true}
                  onFullscreen={(stream, participant) => setFullscreenVideo({ stream, participant })}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Mode normal : grille de participants
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
              isMiniature={false}
              onFullscreen={(stream, participant) => setFullscreenVideo({ stream, participant })}
            />
          );
        })}
      </div>
    </div>
  );
}

// Composant Fullscreen
interface FullscreenVideoDisplayProps {
  stream: MediaStream;
  participant: Participant;
  onClose: () => void;
}

function FullscreenVideoDisplay({ stream, participant, onClose }: FullscreenVideoDisplayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }

    // Gérer la touche Échap
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [stream, onClose]);

  return (
    <div className="relative w-full h-full bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-contain"
      />

      {/* Bouton fermer en haut à droite */}
      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={onClose}
          className="w-10 h-10 bg-gray-800/80 hover:bg-gray-700 rounded-full flex items-center justify-center transition backdrop-blur-sm"
          title="Quitter le plein écran (Échap)"
        >
          <X size={20} className="text-white" />
        </button>
      </div>

      {/* Info participant en bas */}
      <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm px-4 py-2 rounded-lg">
        <p className="text-white text-sm font-medium">{participant.name}</p>
      </div>
    </div>
  );
}

// Composant pour afficher le partage d'écran
interface ScreenShareDisplayProps {
  stream: MediaStream;
  isLocal: boolean;
  userName: string;
  onFullscreen?: () => void;
}

function ScreenShareDisplay({ stream, isLocal, userName, onFullscreen }: ScreenShareDisplayProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className="w-full h-full object-contain bg-black"
      />
      <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-sm px-4 py-3 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-600 rounded-full flex items-center justify-center animate-pulse">
            <Monitor size={20} className="text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm">
              {isLocal ? 'Votre partage d\'écran' : `Partage d'écran de ${userName}`}
            </p>
            <p className="text-gray-300 text-xs">En direct</p>
          </div>
        </div>
      </div>

      {/* Bouton fullscreen */}
      {onFullscreen && (
        <div className="absolute top-4 right-4">
          <button
            onClick={onFullscreen}
            className="w-10 h-10 bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-lg flex items-center justify-center transition"
            title="Plein écran"
          >
            <Maximize2 size={20} className="text-white" />
          </button>
        </div>
      )}
    </>
  );
}

interface ParticipantCardProps {
  participant: Participant;
  stream?: MediaStream;
  isLocal: boolean;
  isMiniature?: boolean;
  onFullscreen?: (stream: MediaStream, participant: Participant) => void;
}

function ParticipantCard({ participant, stream, isLocal, isMiniature = false, onFullscreen }: ParticipantCardProps) {
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
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const audioContext = audioContextRef.current;
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.8;
      analyserRef.current = analyser;
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const detectAudio = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        const normalizedLevel = Math.min(average / 128, 1);
        setAudioLevel(normalizedLevel);
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
    <div className={`relative bg-gray-900 rounded-xl overflow-hidden shadow-2xl group ${isMiniature ? 'h-full' : ''}`}>
      {/* Bouton fullscreen - apparaît au hover */}
      {!isMiniature && stream && onFullscreen && (
        <div className="absolute top-3 right-3 z-30 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onFullscreen(stream, participant)}
            className="w-10 h-10 bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-lg flex items-center justify-center transition"
            title="Plein écran"
          >
            <Maximize2 size={18} className="text-white" />
          </button>
        </div>
      )}

      {/* Effet d'onde audio */}
      {isSpeaking && !isMiniature && (
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

      {/* Indicateur de niveau audio */}
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
            <div className={`${isMiniature ? 'text-4xl' : 'text-6xl'} font-bold text-white`}>
              {getInitials(participant.name)}
            </div>
          </div>
        )}
      </div>

      {/* Indicateur micro en haut à gauche - toujours visible */}
      {!isMiniature && (
        <div className="absolute top-3 left-3 z-30">
          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg shadow-lg transition-all ${
            hasAudio
              ? isSpeaking
                ? 'bg-green-600 scale-110'
                : 'bg-gray-700/90 backdrop-blur-sm'
              : 'bg-red-600'
          }`}>
            {hasAudio ? (
              <>
                <Mic size={16} className="text-white" />
                {isSpeaking && (
                  <div className="flex items-end gap-0.5 h-3">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1 bg-white rounded-full transition-all duration-100"
                        style={{
                          height: `${Math.max(30, audioLevel * 100 * (1 - i * 0.2))}%`,
                        }}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <MicOff size={16} className="text-white" />
            )}
          </div>
        </div>
      )}

      {/* Overlay infos */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`${isMiniature ? 'w-6 h-6' : 'w-8 h-8'} rounded-full bg-gray-700 flex items-center justify-center`}>
              <User size={isMiniature ? 12 : 16} className="text-white" />
            </div>
            <div>
              <p className={`text-white font-semibold ${isMiniature ? 'text-xs' : 'text-sm'} flex items-center gap-2`}>
                {participant.name}
                {isLocal && <span className="text-xs text-gray-300">(Vous)</span>}
                {participant.isCreator && (
                  <Crown size={isMiniature ? 12 : 14} className="text-yellow-400" title="Administrateur" />
                )}
              </p>
            </div>
          </div>

          {/* Indicateur micro pour miniature */}
          {isMiniature && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded ${
              hasAudio
                ? isSpeaking
                  ? 'bg-green-500/80'
                  : 'bg-gray-700/80'
                : 'bg-red-500/80'
            }`}>
              {hasAudio ? (
                <Mic size={12} className="text-white" />
              ) : (
                <MicOff size={12} className="text-white" />
              )}
            </div>
          )}
        </div>

        {/* Barre de niveau audio */}
        {hasAudio && isSpeaking && !isMiniature && (
          <div className="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-100"
              style={{ width: `${audioLevel * 100}%` }}
            />
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" width="100" height="100" />

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