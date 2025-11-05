export interface PeerConnection {
  [userId: string]: RTCPeerConnection;
}

export interface RemoteStream {
  userId: string;
  stream: MediaStream;
  userName?: string;
}

export interface ICEServerConfig {
  iceServers: RTCIceServer[];
  iceCandidatePoolSize?: number;
  bundlePolicy?: RTCBundlePolicy;
  rtcpMuxPolicy?: RTCRtcpMuxPolicy;
}

export interface MediaConstraints {
  video: boolean | MediaTrackConstraints;
  audio: boolean | MediaTrackConstraints;
}