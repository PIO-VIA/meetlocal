'use client';

import { useEffect, useRef } from 'react';

interface VideoContainerProps {
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
}

export default function VideoContainer({ localStream, remoteStreams }: VideoContainerProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

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
          <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-white text-sm">
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
      <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-white text-sm">
        Participant {userId.slice(0, 6)}
      </div>
    </div>
  );
}