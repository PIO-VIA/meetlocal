'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Socket } from 'socket.io-client';
import * as mediasoupClient from 'mediasoup-client';

interface RemoteStream {
  userId: string;
  stream: MediaStream;
  userName?: string;
}

export const useMediasoup = (socket: Socket | null, roomId: string) => {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  
  const deviceRef = useRef<mediasoupClient.types.Device | null>(null);
  const sendTransportRef = useRef<mediasoupClient.types.Transport | null>(null);
  const recvTransportRef = useRef<mediasoupClient.types.Transport | null>(null);
  const screenTransportRef = useRef<mediasoupClient.types.Transport | null>(null);
  const producersRef = useRef<Map<string, mediasoupClient.types.Producer>>(new Map());
  const consumersRef = useRef<Map<string, mediasoupClient.types.Consumer>>(new Map());
  const screenProducersRef = useRef<Map<string, mediasoupClient.types.Producer>>(new Map());

  // Initialiser Mediasoup Device
  const initDevice = useCallback(async () => {
    if (!socket || deviceRef.current) return;

    try {
      console.log('🔧 Initialisation de Mediasoup Device...');
      
      const device = new mediasoupClient.Device();
      
      // Obtenir les RTP Capabilities du serveur
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
      
      console.log('✅ Device initialisé:', {
        canProduce: device.canProduce('video') && device.canProduce('audio'),
        rtpCapabilities: device.rtpCapabilities
      });

      return device;
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation du device:', error);
      throw error;
    }
  }, [socket, roomId]);

  // Créer un transport d'envoi
  const createSendTransport = useCallback(async () => {
    if (!socket || !deviceRef.current || sendTransportRef.current) return sendTransportRef.current;

    try {
      console.log('📤 Création du Send Transport...');

      const transportData = await new Promise<any>((resolve, reject) => {
        socket.emit('createWebRtcTransport', { roomId, sender: true }, (response: any) => {
          if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response);
          }
        });
      });

      const transport = deviceRef.current.createSendTransport({
        id: transportData.id,
        iceParameters: transportData.iceParameters,
        iceCandidates: transportData.iceCandidates,
        dtlsParameters: transportData.dtlsParameters
      });

      // Événement de connexion
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

      // Événement de production
      transport.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
        try {
          const { id } = await new Promise<{ id: string }>((resolve, reject) => {
            socket.emit('produce', {
              transportId: transport.id,
              kind,
              rtpParameters
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

      transport.on('connectionstatechange', (state) => {
        console.log('📤 Send Transport state:', state);
        if (state === 'failed' || state === 'closed') {
          console.error('Send Transport failed/closed');
        }
      });

      sendTransportRef.current = transport;
      console.log('✅ Send Transport créé');
      return transport;
    } catch (error) {
      console.error('❌ Erreur création Send Transport:', error);
      throw error;
    }
  }, [socket, roomId]);

  // Créer un transport de réception
  const createRecvTransport = useCallback(async () => {
    if (!socket || !deviceRef.current || recvTransportRef.current) return recvTransportRef.current;

    try {
      console.log('📥 Création du Recv Transport...');

      const transportData = await new Promise<any>((resolve, reject) => {
        socket.emit('createWebRtcTransport', { roomId, sender: false }, (response: any) => {
          if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response);
          }
        });
      });

      const transport = deviceRef.current.createRecvTransport({
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

      transport.on('connectionstatechange', (state) => {
        console.log('📥 Recv Transport state:', state);
        if (state === 'failed' || state === 'closed') {
          console.error('Recv Transport failed/closed');
        }
      });

      recvTransportRef.current = transport;
      console.log('✅ Recv Transport créé');
      return transport;
    } catch (error) {
      console.error('❌ Erreur création Recv Transport:', error);
      throw error;
    }
  }, [socket, roomId]);

  // Produire (envoyer) de la vidéo/audio
  const produce = useCallback(async (track: MediaStreamTrack) => {
    if (!sendTransportRef.current) {
      await createSendTransport();
    }

    if (!sendTransportRef.current) {
      throw new Error('Send Transport non disponible');
    }

    try {
      const producer = await sendTransportRef.current.produce({ track });
      producersRef.current.set(producer.id, producer);
      
      console.log(`✅ Producer créé: ${producer.id} (${producer.kind})`);
      return producer;
    } catch (error) {
      console.error('❌ Erreur lors de la production:', error);
      throw error;
    }
  }, [createSendTransport]);

  // Consommer (recevoir) de la vidéo/audio
  const consume = useCallback(async (producerId: string, userId: string) => {
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
        rtpParameters: consumerData.rtpParameters
      });

      consumersRef.current.set(consumer.id, consumer);

      // Reprendre la consommation
      await new Promise<void>((resolve, reject) => {
        socket?.emit('resumeConsumer', { consumerId: consumer.id }, (response: any) => {
          if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve();
          }
        });
      });

      console.log(`✅ Consumer créé: ${consumer.id} (${consumer.kind})`);

      // Ajouter le track au stream distant
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

      return consumer;
    } catch (error) {
      console.error('❌ Erreur lors de la consommation:', error);
      throw error;
    }
  }, [socket, createRecvTransport]);

  // Démarrer la caméra
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

      // Initialiser le device si nécessaire
      if (!deviceRef.current) {
        await initDevice();
      }

      // Créer le send transport si nécessaire
      if (!sendTransportRef.current) {
        await createSendTransport();
      }

      // Produire chaque track
      for (const track of stream.getTracks()) {
        await produce(track);
      }

      console.log('✅ Caméra démarrée et flux envoyé');
      return stream;
    } catch (error) {
      console.error('❌ Erreur lors du démarrage de la caméra:', error);
      throw error;
    }
  }, [initDevice, createSendTransport, produce]);

  // Arrêter la caméra
  const stopCamera = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }

    // Fermer tous les producers
    producersRef.current.forEach(producer => {
      producer.close();
    });
    producersRef.current.clear();

    console.log('🛑 Caméra arrêtée');
  }, [localStream]);

  // Écouter les nouveaux producers
  useEffect(() => {
    if (!socket) return;

    const handleNewProducer = async ({ producerId, userId, kind }: any) => {
      console.log(`🆕 Nouveau producer détecté: ${producerId} (${kind}) de ${userId}`);
      
      try {
        await consume(producerId, userId);
      } catch (error) {
        console.error('Erreur lors de la consommation du nouveau producer:', error);
      }
    };

    socket.on('newProducer', handleNewProducer);

    return () => {
      socket.off('newProducer', handleNewProducer);
    };
  }, [socket, consume]);

  // Obtenir les producers existants lors de la connexion
  useEffect(() => {
    if (!socket || !roomId) return;

    const getExistingProducers = async () => {
      try {
        // Attendre un peu pour que l'utilisateur rejoigne complètement la room
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

        console.log(`📋 ${producers.length} producer(s) existant(s) dans la room`);

        // Initialiser le device avant de consommer
        if (!deviceRef.current) {
          await initDevice();
        }

        for (const { producerId, userId } of producers) {
          try {
            await consume(producerId, userId);
          } catch (error) {
            console.error(`Erreur lors de la consommation du producer ${producerId}:`, error);
          }
        }
      } catch (error) {
        console.error('Erreur lors de la récupération des producers:', error);
      }
    };

    getExistingProducers();
  }, [socket, roomId, initDevice, consume]);

  // Démarrer le partage d'écran
  const startScreenShare = useCallback(async () => {
    try {
      console.log('🖥️ Démarrage du partage d\'écran...');

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: { ideal: 30, max: 60 }
        },
        audio: true
      });

      setScreenStream(stream);

      // Initialiser le device si nécessaire
      if (!deviceRef.current) {
        await initDevice();
      }

      // Créer un transport dédié pour le partage d'écran si nécessaire
      if (!screenTransportRef.current) {
        try {
          const transportData = await new Promise<any>((resolve, reject) => {
            socket?.emit('createWebRtcTransport', { roomId, sender: true }, (response: any) => {
              if (response.error) {
                reject(new Error(response.error));
              } else {
                resolve(response);
              }
            });
          });

          const transport = deviceRef.current!.createSendTransport({
            id: transportData.id,
            iceParameters: transportData.iceParameters,
            iceCandidates: transportData.iceCandidates,
            dtlsParameters: transportData.dtlsParameters
          });

          transport.on('connect', async ({ dtlsParameters }, callback, errback) => {
            try {
              await new Promise<void>((resolve, reject) => {
                socket?.emit('connectTransport', {
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

          transport.on('produce', async ({ kind, rtpParameters }, callback, errback) => {
            try {
              const { id } = await new Promise<{ id: string }>((resolve, reject) => {
                socket?.emit('produce', {
                  transportId: transport.id,
                  kind,
                  rtpParameters
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

          screenTransportRef.current = transport;
        } catch (error) {
          console.error('Erreur création transport partage d\'écran:', error);
        }
      }

      // Produire les tracks du partage d'écran
      for (const track of stream.getTracks()) {
        const producer = await screenTransportRef.current!.produce({ track });
        screenProducersRef.current.set(producer.id, producer);
        console.log(`✅ Producer partage d'écran créé: ${producer.id} (${producer.kind})`);
      }

      // Détecter l'arrêt manuel
      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };

      console.log('✅ Partage d\'écran démarré');
      return stream;
    } catch (error) {
      console.error('❌ Erreur lors du partage d\'écran:', error);
      throw error;
    }
  }, [socket, roomId, initDevice]);

  // Arrêter le partage d'écran
  const stopScreenShare = useCallback(() => {
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
    }

    // Fermer tous les producers du partage d'écran
    screenProducersRef.current.forEach(producer => {
      producer.close();
    });
    screenProducersRef.current.clear();

    console.log('🛑 Partage d\'écran arrêté');
  }, [screenStream]);

  // Nettoyage lors du démontage
  useEffect(() => {
    return () => {
      // Fermer tous les producers
      producersRef.current.forEach(producer => producer.close());
      producersRef.current.clear();

      // Fermer tous les consumers
      consumersRef.current.forEach(consumer => consumer.close());
      consumersRef.current.clear();

      // Fermer les transports
      sendTransportRef.current?.close();
      recvTransportRef.current?.close();

      // Arrêter le stream local
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return {
    localStream,
    remoteStreams,
    screenStream,
    startCamera,
    stopCamera,
    startScreenShare,
    stopScreenShare,
    device: deviceRef.current
  };
};