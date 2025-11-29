'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import * as mediasoupClient from 'mediasoup-client';

export const useMediasoup = (socket: Socket | null, roomId: string) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [remoteScreenStreams, setRemoteScreenStreams] = useState<Map<string, MediaStream>>(new Map());
  
  const deviceRef = useRef<mediasoupClient.types.Device | null>(null);
  const sendTransportRef = useRef<mediasoupClient.types.Transport | null>(null);
  const recvTransportRef = useRef<mediasoupClient.types.Transport | null>(null);
  const audioTransportRef = useRef<mediasoupClient.types.Transport | null>(null);
  const screenTransportRef = useRef<mediasoupClient.types.Transport | null>(null);
  const producersRef = useRef<Map<string, mediasoupClient.types.Producer>>(new Map());
  const consumersRef = useRef<Map<string, mediasoupClient.types.Consumer>>(new Map());
  const audioProducersRef = useRef<Map<string, mediasoupClient.types.Producer>>(new Map());
  const screenProducersRef = useRef<Map<string, mediasoupClient.types.Producer>>(new Map());

  // Initialiser Mediasoup Device
  const initDevice = useCallback(async () => {
    if (!socket || deviceRef.current) return deviceRef.current;

    try {
      console.log('🔧 Initialisation de Mediasoup Device...');
      
      const device = new mediasoupClient.Device();
      
      const { rtpCapabilities } = await new Promise<{ rtpCapabilities: mediasoupClient.types.RtpCapabilities }>((resolve, reject) => {
        socket.emit('getRouterRtpCapabilities', { roomId }, (response: any) => {
          if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response);
          }
        });
      });

      await device.load({ routerRtpCapabilities: rtpCapabilities });
      deviceRef.current = device;
      
      console.log('✅ Device initialisé');
      return device;
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation du device:', error);
      throw error;
    }
  }, [socket, roomId]);

  // Créer un transport générique
  const createTransport = useCallback(async (sender: boolean) => {
    if (!socket || !deviceRef.current) {
      console.error('❌ Socket ou Device non disponible');
      return null;
    }

    try {
      console.log(`📤 Création du ${sender ? 'Send' : 'Recv'} Transport...`);

      const transportData = await new Promise<any>((resolve, reject) => {
        socket.emit('createWebRtcTransport', { roomId, sender }, (response: any) => {
          if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response);
          }
        });
      });

      const transport = sender
        ? deviceRef.current.createSendTransport({
            id: transportData.id,
            iceParameters: transportData.iceParameters,
            iceCandidates: transportData.iceCandidates,
            dtlsParameters: transportData.dtlsParameters
          })
        : deviceRef.current.createRecvTransport({
            id: transportData.id,
            iceParameters: transportData.iceParameters,
            iceCandidates: transportData.iceCandidates,
            dtlsParameters: transportData.dtlsParameters
          });

      transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
        try {
          await new Promise<void>((resolve, reject) => {
            socket.emit('connectTransport', {
              transportId: transport.id,
              dtlsParameters
            }, (response: any) => {
              if (response.error) {
                reject(new Error(response.error));
              } else {
                resolve();
              }
            });
          });
          callback();
        } catch (error) {
          errback(error as Error);
        }
      });

      if (sender) {
        transport.on('produce', async ({ kind, rtpParameters, appData }, callback, errback) => {
          try {
            const { id } = await new Promise<{ id: string }>((resolve, reject) => {
              socket.emit('produce', {
                transportId: transport.id,
                kind,
                rtpParameters,
                appData // Transmettre les métadonnées (ex: type de stream)
              }, (response: any) => {
                if (response.error) {
                  reject(new Error(response.error));
                } else {
                  resolve(response);
                }
              });
            });
            callback({ id });
          } catch (error) {
            errback(error as Error);
          }
        });
      }

      transport.on('connectionstatechange', (state) => {
        console.log(`${sender ? '📤' : '📥'} Transport state:`, state);
      });

      console.log(`✅ ${sender ? 'Send' : 'Recv'} Transport créé`);
      return transport;
    } catch (error) {
      console.error(`❌ Erreur création ${sender ? 'Send' : 'Recv'} Transport:`, error);
      throw error;
    }
  }, [socket, roomId]);

  // Créer un transport de réception
  const createRecvTransport = useCallback(async () => {
    if (recvTransportRef.current) return recvTransportRef.current;
    const transport = await createTransport(false);
    if (transport) recvTransportRef.current = transport;
    return transport;
  }, [createTransport]);

  // Produire un track avec métadonnées
  const produce = useCallback(async (
    track: MediaStreamTrack, 
    transportRef: React.MutableRefObject<mediasoupClient.types.Transport | null>,
    appData?: any
  ) => {
    try {
      if (!transportRef.current) {
        const transport = await createTransport(true);
        if (!transport) throw new Error('Transport non disponible');
        transportRef.current = transport;
      }

      const producer = await transportRef.current.produce({ 
        track,
        appData // Métadonnées pour identifier le type de stream
      });
      console.log(`✅ Producer créé: ${producer.id} (${producer.kind})`, appData);
      return producer;
    } catch (error) {
      console.error('❌ Erreur lors de la production:', error);
      throw error;
    }
  }, [createTransport]);

  // Consommer (recevoir) de la vidéo/audio
  const consume = useCallback(async (producerId: string, userId: string, appData?: any) => {
    if (!recvTransportRef.current) {
      await createRecvTransport();
    }

    if (!recvTransportRef.current || !deviceRef.current) {
      throw new Error('Recv Transport ou Device non disponible');
    }

    try {
      const consumerData = await new Promise<any>((resolve, reject) => {
        socket?.emit('consume', {
          transportId: recvTransportRef.current!.id,
          producerId,
          rtpCapabilities: deviceRef.current!.rtpCapabilities
        }, (response: any) => {
          if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response);
          }
        });
      });

      const consumer = await recvTransportRef.current.consume({
        id: consumerData.id,
        producerId: consumerData.producerId,
        kind: consumerData.kind,
        rtpParameters: consumerData.rtpParameters,
        appData: consumerData.appData
      });

      consumersRef.current.set(consumer.id, consumer);

      await new Promise<void>((resolve, reject) => {
        socket?.emit('resumeConsumer', { consumerId: consumer.id }, (response: any) => {
          if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve();
          }
        });
      });

      console.log(`✅ Consumer créé: ${consumer.id} (${consumer.kind})`, consumer.appData);

      // Déterminer si c'est un partage d'écran
      const isScreenShare = appData?.type === 'screen' || consumer.appData?.type === 'screen';

      if (isScreenShare) {
        // Ajouter au stream de partage d'écran
        setRemoteScreenStreams(prev => {
          const newMap = new Map(prev);
          let stream = newMap.get(userId);
          
          if (!stream) {
            stream = new MediaStream();
            newMap.set(userId, stream);
          }
          
          stream.addTrack(consumer.track);
          console.log(`🖥️ Partage d'écran ajouté pour ${userId}`);
          return newMap;
        });
      } else {
        // Ajouter au stream normal (caméra/audio)
        setRemoteStreams(prev => {
          const newMap = new Map(prev);
          let stream = newMap.get(userId);
          
          if (!stream) {
            stream = new MediaStream();
            newMap.set(userId, stream);
          }
          
          stream.addTrack(consumer.track);
          return newMap;
        });
      }

      return consumer;
    } catch (error) {
      console.error('❌ Erreur lors de la consommation:', error);
      throw error;
    }
  }, [socket, createRecvTransport]);

  // Démarrer SEULEMENT l'audio
  const startAudioOnly = useCallback(async () => {
    try {
      console.log('🎤 Démarrage du microphone seul...');

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      setAudioStream(stream);

      if (!deviceRef.current) {
        await initDevice();
      }

      if (!audioTransportRef.current) {
        const transport = await createTransport(true);
        if (transport) audioTransportRef.current = transport;
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      const audioTrack = stream.getAudioTracks()[0];
      const producer = await produce(audioTrack, audioTransportRef, { type: 'audio' });
      if (producer) {
        audioProducersRef.current.set(producer.id, producer);
      }

      console.log('✅ Microphone démarré');
      return stream;
    } catch (error) {
      console.error('❌ Erreur lors du démarrage du microphone:', error);
      throw error;
    }
  }, [initDevice, createTransport, produce]);

  // Arrêter l'audio
  const stopAudioOnly = useCallback(() => {
    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop());
      setAudioStream(null);
    }

    audioProducersRef.current.forEach(producer => {
      producer.close();
    });
    audioProducersRef.current.clear();

    console.log('🛑 Microphone arrêté');
  }, [audioStream]);

  // Démarrer la caméra (avec audio)
  const startCamera = useCallback(async () => {
    try {
      console.log('📹 Démarrage de la caméra...');

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      setLocalStream(stream);

      if (!deviceRef.current) {
        await initDevice();
      }

      if (!sendTransportRef.current) {
        const transport = await createTransport(true);
        if (transport) sendTransportRef.current = transport;
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      for (const track of stream.getTracks()) {
        const producer = await produce(track, sendTransportRef, { 
          type: track.kind === 'video' ? 'camera' : 'audio' 
        });
        if (producer) {
          producersRef.current.set(producer.id, producer);
        }
      }

      console.log('✅ Caméra démarrée');
      return stream;
    } catch (error) {
      console.error('❌ Erreur lors du démarrage de la caméra:', error);
      throw error;
    }
  }, [initDevice, createTransport, produce]);

  // Arrêter la caméra
  const stopCamera = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }

    producersRef.current.forEach(producer => {
      producer.close();
    });
    producersRef.current.clear();

    console.log('🛑 Caméra arrêtée');
  }, [localStream]);

  // Démarrer le partage d'écran (CORRIGÉ)
  const startScreenShare = useCallback(async () => {
    try {
      console.log('🖥️ Démarrage du partage d\'écran...');

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: { ideal: 30, max: 60 },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: true
      });

      setScreenStream(stream);

      if (!deviceRef.current) {
        await initDevice();
      }

      // Créer un nouveau transport dédié au partage d'écran
      console.log('📤 Création du transport de partage d\'écran...');
      const transport = await createTransport(true);
      if (!transport) throw new Error('Impossible de créer le transport');
      
      screenTransportRef.current = transport;

      await new Promise(resolve => setTimeout(resolve, 500));

      // Produire tous les tracks du partage d'écran avec métadonnées
      for (const track of stream.getTracks()) {
        const producer = await produce(track, screenTransportRef, { 
          type: 'screen', // IMPORTANT: Marquer comme partage d'écran
          kind: track.kind
        });
        if (producer) {
          screenProducersRef.current.set(producer.id, producer);
          console.log(`✅ Producer partage d'écran créé: ${producer.kind}`);
        }
      }

      // Détecter l'arrêt manuel
      stream.getVideoTracks()[0].onended = () => {
        console.log('🛑 Partage d\'écran arrêté par l\'utilisateur');
        stopScreenShare();
      };

      console.log('✅ Partage d\'écran démarré avec succès');
      return stream;
    } catch (error) {
      console.error('❌ Erreur lors du partage d\'écran:', error);
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
        setScreenStream(null);
      }
      throw error;
    }
  }, [initDevice, createTransport, produce, screenStream]);

  // Arrêter le partage d'écran
  const stopScreenShare = useCallback(() => {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
    }

    screenProducersRef.current.forEach(producer => {
      producer.close();
    });
    screenProducersRef.current.clear();

    if (screenTransportRef.current) {
      screenTransportRef.current.close();
      screenTransportRef.current = null;
    }

    console.log('🛑 Partage d\'écran arrêté');
  }, [screenStream]);

  // Écouter les nouveaux producers (CORRIGÉ)
  useEffect(() => {
    if (!socket) return;

    const handleNewProducer = async ({ producerId, userId, kind, appData }: any) => {
      console.log(`🆕 Nouveau producer détecté: ${producerId} (${kind})`, appData);

      try {
        await consume(producerId, userId, appData);
      } catch (error) {
        console.error('Erreur lors de la consommation du nouveau producer:', error);
      }
    };

    const handleProducerClosed = ({ producerId, userId, appData }: any) => {
      console.log(`🔴 Producer fermé: ${producerId}`, appData);

      const isScreenShare = appData?.type === 'screen';

      if (isScreenShare) {
        // Supprimer le stream de partage d'écran
        setRemoteScreenStreams(prev => {
          const newMap = new Map(prev);
          const stream = newMap.get(userId);

          if (stream) {
            // Arrêter tous les tracks du stream
            stream.getTracks().forEach(track => {
              track.stop();
              stream.removeTrack(track);
            });
            newMap.delete(userId);
            console.log(`🖥️ Partage d'écran supprimé pour ${userId}`);
          }

          return newMap;
        });
      } else {
        // Supprimer le stream normal (caméra/audio)
        setRemoteStreams(prev => {
          const newMap = new Map(prev);
          const stream = newMap.get(userId);

          if (stream) {
            // Trouver et supprimer les tracks correspondants
            const kind = appData?.kind || appData?.type;
            stream.getTracks().forEach(track => {
              if (!kind || track.kind === kind ||
                  (kind === 'camera' && track.kind === 'video') ||
                  (kind === 'audio' && track.kind === 'audio')) {
                track.stop();
                stream.removeTrack(track);
              }
            });

            // Si le stream n'a plus de tracks, le supprimer complètement
            if (stream.getTracks().length === 0) {
              newMap.delete(userId);
              console.log(`📹 Stream supprimé pour ${userId}`);
            }
          }

          return newMap;
        });
      }

      // Fermer les consumers associés
      consumersRef.current.forEach((consumer, consumerId) => {
        if (consumer.producerId === producerId) {
          consumer.close();
          consumersRef.current.delete(consumerId);
          console.log(`🧹 Consumer fermé: ${consumerId}`);
        }
      });
    };

    // Gérer la déconnexion d'un utilisateur (nettoyer TOUS ses streams)
    const handleUserLeft = ({ userId }: any) => {
      console.log(`👋 Utilisateur quitté: ${userId}`);

      // Nettoyer le partage d'écran si existant
      setRemoteScreenStreams(prev => {
        const newMap = new Map(prev);
        const stream = newMap.get(userId);

        if (stream) {
          stream.getTracks().forEach(track => {
            track.stop();
            stream.removeTrack(track);
          });
          newMap.delete(userId);
          console.log(`🖥️ Partage d'écran nettoyé pour ${userId}`);
        }

        return newMap;
      });

      // Nettoyer les streams normaux
      setRemoteStreams(prev => {
        const newMap = new Map(prev);
        const stream = newMap.get(userId);

        if (stream) {
          stream.getTracks().forEach(track => {
            track.stop();
            stream.removeTrack(track);
          });
          newMap.delete(userId);
          console.log(`📹 Stream normal nettoyé pour ${userId}`);
        }

        return newMap;
      });

      // Fermer tous les consumers associés à cet utilisateur
      consumersRef.current.forEach((consumer, consumerId) => {
        // Note: Il faudrait stocker l'userId avec chaque consumer pour un meilleur nettoyage
        // Pour l'instant, on se fie au producerClosed pour nettoyer
      });
    };

    // Gérer l'arrêt de partage d'écran
    const handleScreenStopped = ({ userId }: any) => {
      console.log(`🛑 Partage d'écran arrêté pour: ${userId}`);

      setRemoteScreenStreams(prev => {
        const newMap = new Map(prev);
        const stream = newMap.get(userId);

        if (stream) {
          stream.getTracks().forEach(track => {
            track.stop();
            stream.removeTrack(track);
          });
          newMap.delete(userId);
          console.log(`🖥️ Partage d'écran supprimé pour ${userId}`);
        }

        return newMap;
      });
    };

    socket.on('newProducer', handleNewProducer);
    socket.on('producerClosed', handleProducerClosed);
    socket.on('userLeft', handleUserLeft);
    socket.on('screenStopped', handleScreenStopped);

    return () => {
      socket.off('newProducer', handleNewProducer);
      socket.off('producerClosed', handleProducerClosed);
      socket.off('userLeft', handleUserLeft);
      socket.off('screenStopped', handleScreenStopped);
    };
  }, [socket, consume]);

  // Obtenir les producers existants
  useEffect(() => {
    if (!socket || !roomId) return;

    const getExistingProducers = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));

        const { producers } = await new Promise<{ producers: any[] }>((resolve, reject) => {
          socket.emit('getProducers', { roomId }, (response: any) => {
            if (response.error) {
              reject(new Error(response.error));
            } else {
              resolve(response);
            }
          });
        });

        console.log(`📋 ${producers.length} producer(s) existant(s)`);

        if (!deviceRef.current) {
          await initDevice();
        }

        for (const { producerId, userId, kind, appData } of producers) {
          try {
            await consume(producerId, userId, appData);
          } catch (error) {
            console.error(`Erreur consommation producer ${producerId}:`, error);
          }
        }
      } catch (error) {
        console.error('Erreur récupération producers:', error);
      }
    };

    getExistingProducers();
  }, [socket, roomId, initDevice, consume]);

  // Nettoyage
  useEffect(() => {
    return () => {
      producersRef.current.forEach(producer => producer.close());
      producersRef.current.clear();
      
      audioProducersRef.current.forEach(producer => producer.close());
      audioProducersRef.current.clear();
      
      screenProducersRef.current.forEach(producer => producer.close());
      screenProducersRef.current.clear();

      consumersRef.current.forEach(consumer => consumer.close());
      consumersRef.current.clear();

      sendTransportRef.current?.close();
      recvTransportRef.current?.close();
      audioTransportRef.current?.close();
      screenTransportRef.current?.close();

      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
      }
      if (screenStream) {
        screenStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return {
    localStream,
    audioStream,
    remoteStreams,
    screenStream,
    remoteScreenStreams, 
    startCamera,
    stopCamera,
    startAudioOnly,
    stopAudioOnly,
    startScreenShare,
    stopScreenShare,
    device: deviceRef.current
  };
};