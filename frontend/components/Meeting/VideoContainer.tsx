'use client';

import { useEffect, useRef } from 'react';
import { Monitor, User } from 'lucide-react';

interface VideoContainerProps {
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  screenStream?: MediaStream | null;
}

export default function VideoContainer({ 
  localStream, 
  remoteStreams,
  screenStream 
}: VideoContainerProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (screenVideoRef.current && screenStream) {
      screenVideoRef.current.srcObject = screenStream;
    }
  }, [screenStream]);

  // Si le partage d'écran est actif, l'afficher en grand
  if (screenStream) {
    return (
      <div className="h-full flex flex-col gap-4">
        {/* Partage d'écran principal */}
        <div className="flex-1 relative bg-gray-800 rounded-lg overflow-hidden">
          <video
            ref={screenVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-contain"
          />
          <div className="absolute top-2 left-2 bg-black/70 px-3 py-2 rounded-lg text-white text-sm font-medium flex items-center gap-2">
            <Monitor size={18} />
            <span>Votre partage d'écran</span>
          </div>
        </div>

        {/* Miniatures des participants en bas */}
        <div className="flex gap-2 h-32 overflow-x-auto">
          {/* Vidéo locale */}
          {localStream && (
            <div className="relative bg-gray-800 rounded-lg overflow-hidden flex-shrink-0 w-48">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-1 left-1 bg-black/60 px-2 py-1 rounded text-white text-xs flex items-center gap-1">
                <User size={12} />
                Vous
              </div>
            </div>
          )}

          {/* Vidéos distantes */}
          {Array.from(remoteStreams.entries()).map(([userId, stream]) => (
            <RemoteVideoMiniature key={userId} userId={userId} stream={stream} />
          ))}
        </div>
      </div>
    );
  }

  // Affichage normal en grille quand pas de partage d'écran
  return (
    <div className="grid grid-cols-2 gap-4 h-full">
      {/* Vidéo locale */}
      {localStream && (
        <div className="relative bg-gray-800 rounded-lg overflow-hidden">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-2 left-2 bg-black/50 px-3 py-1 rounded text-white text-sm flex items-center gap-1">
            <User size={14} />
            Vous
          </div>
        </div>
      )}

      {/* Vidéos distantes */}
      {Array.from(remoteStreams.entries()).map(([userId, stream]) => (
        <RemoteVideo key={userId} userId={userId} stream={stream} />
      ))}
    </div>
  );
}

function RemoteVideo({ userId, stream }: { userId: string; stream: MediaStream }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative bg-gray-800 rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />
      <div className="absolute bottom-2 left-2 bg-black/50 px-3 py-1 rounded text-white text-sm flex items-center gap-1">
        <User size={14} />
        Participant {userId.slice(0, 6)}
      </div>
    </div>
  );
}

function RemoteVideoMiniature({ userId, stream }: { userId: string; stream: MediaStream }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  return (
    <div className="relative bg-gray-800 rounded-lg overflow-hidden flex-shrink-0 w-48">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="w-full h-full object-cover"
      />
      <div className="absolute bottom-1 left-1 bg-black/60 px-2 py-1 rounded text-white text-xs flex items-center gap-1">
        <User size={12} />
        {userId.slice(0, 6)}
      </div>
    </div>
  );
}