'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Crown, User, Monitor, Maximize2, Minimize2, X, Hand } from 'lucide-react';
import { getParticipantColor, hexToRgb } from '@/lib/utils';
import { Socket } from 'socket.io-client';

interface Participant {
  id: string;
  name: string;
  isCreator?: boolean;
  isStreaming?: boolean;
  stream?: MediaStream;
  audioLevel?: number;
  isHandRaised?: boolean; // NOUVEAU
}

interface Reaction {
  emoji: string;
  id: string;
}

interface ParticipantGridProps {
  participants: Participant[];
  localStream?: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  screenStream?: MediaStream | null;
  remoteScreenStreams: Map<string, MediaStream>;
  currentUserId?: string;
  socket?: Socket | null; // Added socket prop to listen for events
}

export default function ParticipantGrid({
  participants,
  localStream,
  remoteStreams,
  screenStream,
  remoteScreenStreams,
  currentUserId,
  socket
}: ParticipantGridProps) {
  const [fullscreenVideo, setFullscreenVideo] = useState<{ stream: MediaStream; participant: Participant } | null>(null);
  const [participantReactions, setParticipantReactions] = useState<Map<string, Reaction[]>>(new Map());

  // Écouter les événements de réactions et lever de main
  useEffect(() => {
    if (!socket) return;

    const handleReaction = ({ roomId, emoji, senderId }: { roomId: string, emoji: string, senderId: string }) => {
      const newReaction = { emoji, id: Date.now().toString() };

      setParticipantReactions(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(senderId) || [];
        newMap.set(senderId, [...existing, newReaction]);
        return newMap;
      });

      // Supprimer la réaction après 3 secondes
      setTimeout(() => {
        setParticipantReactions(prev => {
          const newMap = new Map(prev);
          const current = newMap.get(senderId) || [];
          newMap.set(senderId, current.filter(r => r.id !== newReaction.id));
          return newMap;
        });
      }, 3000);
    };

    const handleHandRaised = ({ roomId, isRaised, senderId }: { roomId: string, isRaised: boolean, senderId: string }) => {
      if (isRaised) {
        playNotificationSound();
      }
    };

    socket.on('reaction', handleReaction);
    socket.on('handRaised', handleHandRaised);

    return () => {
      socket.off('reaction', handleReaction);
      socket.off('handRaised', handleHandRaised);
    };
  }, [socket]);

  const playNotificationSound = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;

      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);

      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
      console.error("Audio play failed", e);
    }
  };

  // Fusionner la réaction locale pour l'affichage ? 
  // Idéalement 'participants' contient déjà isHandRaised via la mise à jour globale

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
    // Mode partage d'écran avec grille réduite
    const hasMultipleScreens = allScreenStreams.length > 1;
    return (
      <div className="h-full w-full flex flex-col md:flex-row gap-2 md:gap-3 p-2 md:p-3 overflow-hidden">
        {/* Grille des partages d'écran - Scrollable */}
        <div className="flex-1 overflow-y-auto scrollbar-custom pr-1 pb-4">
          <div className={`grid gap-3 sm:gap-4 ${hasMultipleScreens
            ? 'grid-cols-1 lg:grid-cols-2 auto-rows-fr'
            : 'grid-cols-1 h-full'
            }`}>
            {allScreenStreams.map((screenData, index) => {
              const participant = participants.find(p => p.id === screenData.userId);
              return (
                <div
                  key={index}
                  className={`relative bg-gray-900 rounded-xl overflow-hidden shadow-2xl transition-all duration-300 hover:ring-2 hover:ring-blue-500/50 ${hasMultipleScreens
                    ? 'min-h-[300px] sm:min-h-[400px] aspect-video w-full'
                    : 'h-full w-full'
                    }`}
                >
                  <ScreenShareDisplay
                    stream={screenData.stream}
                    isLocal={screenData.isLocal}
                    userName={participant?.name || 'Utilisateur'}
                    screenNumber={hasMultipleScreens ? index + 1 : undefined}
                    totalScreens={hasMultipleScreens ? allScreenStreams.length : undefined}
                    onFullscreen={() => participant && setFullscreenVideo({ stream: screenData.stream, participant })}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Colonne latérale des participants */}
        <div className="w-full md:w-48 lg:w-64 flex md:flex-col gap-2 overflow-x-auto md:overflow-x-visible md:overflow-y-auto pb-2 md:pb-0">
          {localStream && (
            <div className="flex-shrink-0 w-32 h-24 md:w-full md:h-32 lg:h-36">
              <ParticipantCard
                participant={participants.find(p => p.id === currentUserId) || { id: currentUserId || '', name: 'Vous' }}
                stream={localStream}
                isLocal={true}
                isMiniature={true}
                onFullscreen={(stream, participant) => setFullscreenVideo({ stream, participant })}
                reactions={participantReactions.get(currentUserId || '') || []}
              />
            </div>
          )}

          {participants.filter(p => p.id !== currentUserId).map((participant) => {
            const stream = remoteStreams.get(participant.id);
            return (
              <div key={participant.id} className="flex-shrink-0 w-32 h-24 md:w-full md:h-32 lg:h-36">
                <ParticipantCard
                  participant={participant}
                  stream={stream}
                  isLocal={false}
                  isMiniature={true}
                  onFullscreen={(stream, participant) => setFullscreenVideo({ stream, participant })}
                  reactions={participantReactions.get(participant.id) || []}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Mode normal : grille de participants
  const isScrollable = participants.length > 4;

  return (
    <div className={`h-full w-full p-2 sm:p-3 md:p-4 ${isScrollable ? 'overflow-y-auto' : ''}`}>
      <div className={`grid gap-2 sm:gap-3 md:gap-4 ${isScrollable ? '' : 'h-full'} ${participants.length === 1 ? 'grid-cols-1' :
        participants.length === 2 ? 'grid-cols-1 sm:grid-cols-2' :
          'grid-cols-1 xs:grid-cols-2'
        }`}>
        {participants.map((participant) => {
          const stream = participant.id === currentUserId
            ? localStream
            : remoteStreams.get(participant.id);

          return (
            <div
              key={participant.id}
              className={isScrollable ? 'aspect-video w-full' : 'h-full w-full'}
            >
              <ParticipantCard
                participant={participant}
                stream={stream || undefined}
                isLocal={participant.id === currentUserId}
                isMiniature={false}
                onFullscreen={(stream, participant) => setFullscreenVideo({ stream, participant })}
                className="h-full"
                reactions={participantReactions.get(participant.id) || []}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ... FullscreenVideoDisplay & ScreenShareDisplay (unchanged) ...
// (Omitting for brevity, assume they are present same as before)
// IMPORTANT: Need to include them in the final file write, 
// so for this tool call I must include EVERYTHING or update selectively.
// Since write_to_file replaces content, I will paste the full file content including helper components.

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

interface ScreenShareDisplayProps {
  stream: MediaStream;
  isLocal: boolean;
  userName: string;
  screenNumber?: number;
  totalScreens?: number;
  onFullscreen?: () => void;
}

function ScreenShareDisplay({ stream, isLocal, userName, screenNumber, totalScreens, onFullscreen }: ScreenShareDisplayProps) {
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

      {/* Badge utilisateur avec animation */}
      <div className="absolute top-3 sm:top-4 left-3 sm:left-4 bg-gradient-to-r from-purple-600 to-blue-600 backdrop-blur-sm px-3 sm:px-4 py-2 sm:py-3 rounded-xl shadow-lg">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Monitor size={16} className="sm:w-5 sm:h-5 text-white" />
            </div>
            {/* Point d'animation "En direct" */}
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse">
              <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-75"></div>
            </div>
          </div>

          <div>
            <p className="text-white font-semibold text-xs sm:text-sm leading-tight">
              {isLocal ? 'Votre partage d\'écran' : `${userName}`}
            </p>
            <p className="text-white/80 text-[10px] sm:text-xs flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
              En direct
              {screenNumber && totalScreens && (
                <span className="ml-1">• Écran {screenNumber}/{totalScreens}</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Bouton fullscreen avec meilleur design */}
      {onFullscreen && (
        <div className="absolute top-3 sm:top-4 right-3 sm:right-4">
          <button
            onClick={onFullscreen}
            className="group w-9 h-9 sm:w-11 sm:h-11 bg-black/70 hover:bg-black/90 backdrop-blur-md rounded-xl flex items-center justify-center transition-all duration-200 hover:scale-110 shadow-lg border border-white/10"
            title="Plein écran"
          >
            <Maximize2 size={16} className="sm:w-5 sm:h-5 text-white group-hover:text-blue-400 transition-colors" />
          </button>
        </div>
      )}

      {/* Badge de numéro d'écran pour grille multiple (en bas à droite) */}
      {screenNumber && totalScreens && totalScreens > 1 && (
        <div className="absolute bottom-3 sm:bottom-4 right-3 sm:right-4">
          <div className="bg-black/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/20">
            <span className="text-white font-bold text-xs sm:text-sm">
              #{screenNumber}
            </span>
          </div>
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
  className?: string;
  reactions?: Reaction[];
}

function ParticipantCard({ participant, stream, isLocal, isMiniature = false, onFullscreen, className = '', reactions = [] }: ParticipantCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);

  const [audioLevel, setAudioLevel] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Générer la couleur unique pour ce participant
  const participantColor = getParticipantColor(participant.id);
  const rgbColor = hexToRgb(participantColor) || { r: 59, g: 130, b: 246 }; // Fallback to blue

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
    <div className={`relative bg-gray-900 rounded-xl overflow-hidden shadow-2xl group ${isMiniature ? 'h-full' : ''} ${className}`}>
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

      {/* Affichage des réactions flottantes */}
      <div className="absolute inset-x-0 bottom-16 z-40 flex flex-col items-center gap-2 pointer-events-none">
        {reactions.map((r) => (
          <div key={r.id} className="animate-float-up text-4xl drop-shadow-lg">
            {r.emoji}
          </div>
        ))}
      </div>

      {/* Indicateur de main levée en haut à droite avec animation */}
      {participant.isHandRaised && (
        <div className="absolute top-3 right-3 z-30 pointer-events-none">
          <div className="bg-yellow-100 text-yellow-600 rounded-full p-2 shadow-lg animate-bounce">
            <Hand size={20} className="fill-current" />
          </div>
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
                border: `${3 + i}px solid rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, ${0.6 - i * 0.15})`,
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
            ? `0 0 ${20 + audioLevel * 30}px rgba(${rgbColor.r}, ${rgbColor.g}, ${rgbColor.b}, ${0.4 + audioLevel * 0.4})`
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
          <div
            className="w-full h-full flex items-center justify-center"
            style={{ backgroundColor: participantColor }}
          >
            <div className={`${isMiniature ? 'text-4xl' : 'text-6xl'} font-bold text-white drop-shadow-md`}>
              {getInitials(participant.name)}
            </div>
          </div>
        )}
      </div>

      {/* Indicateur micro en haut à gauche - toujours visible */}
      {!isMiniature && (
        <div className="absolute top-3 left-3 z-30">
          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg shadow-lg transition-all ${hasAudio
            ? isSpeaking
              ? 'scale-110 ring-2 ring-white/50'
              : 'backdrop-blur-sm'
            : ''
            }`}
            style={{
              backgroundColor: hasAudio
                ? isSpeaking ? participantColor : 'rgba(55, 65, 81, 0.9)'
                : '#dc2626'
            }}
          >
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
            <div
              className={`${isMiniature ? 'w-6 h-6' : 'w-8 h-8'} rounded-full flex items-center justify-center text-white font-bold border border-white/20`}
              style={{ backgroundColor: participantColor }}
            >
              {hasVideo ? (
                <span className={isMiniature ? 'text-[10px]' : 'text-xs'}>
                  {getInitials(participant.name)}
                </span>
              ) : (
                <User size={isMiniature ? 12 : 16} className="text-white" />
              )}
            </div>
            <div>
              <p className={`text-white font-semibold ${isMiniature ? 'text-xs' : 'text-sm'} flex items-center gap-2 shadow-sm`}>
                {participant.name}
                {isLocal && <span className="text-xs text-gray-300">(Vous)</span>}
                {participant.isCreator && (
                  <Crown size={isMiniature ? 12 : 14} className="text-yellow-400" />
                )}
              </p>
            </div>
          </div>

          {/* Icones statuts pour miniature */}
          {isMiniature && (
            <div className="flex gap-1">
              {participant.isHandRaised && (
                <div className="bg-yellow-100 text-yellow-600 p-1 rounded-full">
                  <Hand size={12} className="fill-current" />
                </div>
              )}
              <div className={`flex items-center gap-1 px-2 py-1 rounded ${hasAudio
                ? isSpeaking
                  ? 'bg-opacity-80'
                  : 'bg-gray-700/80'
                : 'bg-red-500/80'
                }`}
                style={{ backgroundColor: hasAudio && isSpeaking ? participantColor : undefined }}
              >
                {hasAudio ? (
                  <Mic size={12} className="text-white" />
                ) : (
                  <MicOff size={12} className="text-white" />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Barre de niveau audio avec la couleur du participant */}
        {hasAudio && isSpeaking && !isMiniature && (
          <div className="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-100"
              style={{
                width: `${audioLevel * 100}%`,
                backgroundColor: participantColor
              }}
            />
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" width="100" height="100" />

      <style jsx global>{`
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
        
        @keyframes float-up {
          0% { transform: translateY(0) scale(0.5); opacity: 0; }
          20% { opacity: 1; transform: translateY(-20px) scale(1.1); }
          100% { transform: translateY(-80px) scale(1); opacity: 0; }
        }

        .animate-float-up {
          animation: float-up 2s ease-out forwards;
        }

        /* Style personnalisé pour scrollbar */
        .scrollbar-custom::-webkit-scrollbar {
          width: 8px;
        }

        .scrollbar-custom::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 10px;
        }

        .scrollbar-custom::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #3b82f6, #8b5cf6);
          border-radius: 10px;
          transition: background 0.3s ease;
        }

        .scrollbar-custom::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #2563eb, #7c3aed);
        }

        /* Pour Firefox */
        .scrollbar-custom {
          scrollbar-width: thin;
          scrollbar-color: #3b82f6 rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
}