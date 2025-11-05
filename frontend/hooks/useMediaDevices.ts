'use client';

import { useState, useCallback } from 'react';

export const useMediaDevices = () => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [selectedMicrophone, setSelectedMicrophone] = useState<string>('');

  // Récupérer la liste des périphériques
  const getDevices = useCallback(async () => {
    try {
      const deviceList = await navigator.mediaDevices.enumerateDevices();
      setDevices(deviceList);

      // Sélectionner les premiers par défaut
      const cameras = deviceList.filter(d => d.kind === 'videoinput');
      const microphones = deviceList.filter(d => d.kind === 'audioinput');

      if (cameras.length > 0 && !selectedCamera) {
        setSelectedCamera(cameras[0].deviceId);
      }
      if (microphones.length > 0 && !selectedMicrophone) {
        setSelectedMicrophone(microphones[0].deviceId);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des périphériques:', error);
    }
  }, [selectedCamera, selectedMicrophone]);

  // Démarrer la caméra avec le périphérique sélectionné
  const startCamera = useCallback(async (
    cameraId?: string,
    micId?: string
  ) => {
    try {
      const constraints: MediaStreamConstraints = {
        video: cameraId 
          ? { deviceId: { exact: cameraId } }
          : { width: 1280, height: 720, frameRate: 30 },
        audio: micId
          ? { deviceId: { exact: micId } }
          : { echoCancellation: true, noiseSuppression: true }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      setLocalStream(stream);
      return stream;
    } catch (error) {
      console.error('Erreur lors du démarrage de la caméra:', error);
      throw error;
    }
  }, []);

  // Arrêter la caméra
  const stopCamera = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
  }, [localStream]);

  // Changer de caméra
  const switchCamera = useCallback(async (deviceId: string) => {
    stopCamera();
    setSelectedCamera(deviceId);
    return await startCamera(deviceId, selectedMicrophone);
  }, [startCamera, stopCamera, selectedMicrophone]);

  // Changer de microphone
  const switchMicrophone = useCallback(async (deviceId: string) => {
    stopCamera();
    setSelectedMicrophone(deviceId);
    return await startCamera(selectedCamera, deviceId);
  }, [startCamera, stopCamera, selectedCamera]);

  // Toggle audio
  const toggleAudio = useCallback((enabled: boolean) => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }, [localStream]);

  // Toggle video
  const toggleVideo = useCallback((enabled: boolean) => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }, [localStream]);

  return {
    localStream,
    devices,
    selectedCamera,
    selectedMicrophone,
    getDevices,
    startCamera,
    stopCamera,
    switchCamera,
    switchMicrophone,
    toggleAudio,
    toggleVideo
  };
};