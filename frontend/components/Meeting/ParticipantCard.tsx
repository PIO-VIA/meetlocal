'use client';

import { useEffect, useRef, useState } from 'react';
import { User, Mic, MicOff } from 'lucide-react';

interface ParticipantCardProps {
  stream?: MediaStream | null;
  name: string;
  isLocal?: boolean;
  isMuted?: boolean;
  className?: string;
}

export default function ParticipantCard({
  stream,
  name,
  isLocal = false,
  isMuted = false,
  className = ''
}: ParticipantCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  // Détection de la parole via analyse audio
  useEffect(() => {
    if (!stream || isMuted) {
      setIsSpeaking(false);
      return;
    }

    const audioTracks = stream.getAudioTracks();
    if (audioTracks.length === 0) return;

    try {
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.8;
      microphone.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const detectSpeech = () => {
        if (!analyserRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArray);

        // Calculer le volume moyen
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;

        // Seuil de détection de parole
        const threshold = 30;
        setIsSpeaking(average > threshold);

        animationFrameRef.current = requestAnimationFrame(detectSpeech);
      };

      detectSpeech();

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
      };
    } catch (error) {
      console.error('Erreur détection audio:', error);
    }
  }, [stream, isMuted]);

  const hasVideo = stream?.getVideoTracks().some(track => track.enabled);

  return (
    <div className={`relative bg-gray-900 rounded-xl overflow-hidden shadow-lg ${className}`}>
      {/* Bordure animée quand la personne parle */}
      {isSpeaking && (
        <div className="absolute inset-0 z-10 pointer-events-none">
          <div className="absolute inset-0 rounded-xl border-4 border-green-400 animate-pulse-border"></div>
          <div className="absolute inset-0 rounded-xl ring-4 ring-green-400/30 animate-pulse"></div>
        </div>
      )}

      {/* Vidéo ou avatar */}
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-700 to-gray-800">
          <div className="w-20 h-20 rounded-full bg-blue-500 flex items-center justify-center">
            <User className="text-white" size={40} />
          </div>
        </div>
      )}

      {/* Overlay infos */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3">
        <div className="flex items-center justify-between">
          <span className="text-white text-sm font-medium flex items-center gap-2">
            <User size={14} />
            {name}
          </span>

          {/* Indicateur micro */}
          <div className={`p-1.5 rounded-full ${
            isMuted
              ? 'bg-red-500/90'
              : isSpeaking
                ? 'bg-green-500/90 animate-pulse'
                : 'bg-gray-600/90'
          }`}>
            {isMuted ? (
              <MicOff size={14} className="text-white" />
            ) : (
              <Mic size={14} className="text-white" />
            )}
          </div>
        </div>
      </div>

      {/* Badge "Vous" pour la vidéo locale */}
      {isLocal && (
        <div className="absolute top-3 right-3 bg-blue-500/90 px-3 py-1 rounded-full text-white text-xs font-medium">
          Vous
        </div>
      )}
    </div>
  );
}
