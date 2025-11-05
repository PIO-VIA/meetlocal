export interface ServerToClientEvents {
  roomsList: (rooms: Room[]) => void;
  roomCreated: (data: { roomId: string; roomName: string }) => void;
  roomError: (data: { error: string; message: string }) => void;
  userJoined: (data: { userName: string; userId: string; isCreator: boolean; rejoining?: boolean }) => void;
  userLeft: (data: { userName: string }) => void;
  message: (data: { userName: string; message: string }) => void;
  getUsers: (users: User[]) => void;
  streamStarted: (data: { userName: string; userId: string }) => void;
  streamStopped: (data: { userName: string }) => void;
  screenStarted: (data: { userName: string }) => void;
  screenStopped: (data: { userName: string }) => void;
  meetingEnded: (data: { message: string }) => void;
  adminDisconnected: (data: { message: string }) => void;
  'user-connected': (userId: string) => void;
  'user-disconnected': (userId: string) => void;
  offer: (data: { offer: RTCSessionDescriptionInit; userId: string }) => void;
  answer: (data: { answer: RTCSessionDescriptionInit; from: string }) => void;
  'ice-candidate': (data: { candidate: RTCIceCandidateInit; from: string }) => void;
  error: (data: { message: string }) => void;
}

export interface ClientToServerEvents {
  createRoom: (data: { userName: string; roomName: string; keepAlive?: boolean; customRoomId?: string }) => void;
  joinRoom: (data: { roomId: string; userName: string }, callback: (success: boolean, response?: any) => void) => void;
  leaveRoom: (data: { roomId: string; userName: string }) => void;
  endMeeting: (data: { roomId: string; userName: string }) => void;
  checkRoom: (data: { roomId: string }, callback: (exists: boolean) => void) => void;
  getRoomsList: () => void;
  message: (data: { roomId: string; message: string }) => void;
  getUsers: (data: { roomId: string }, callback?: (users: User[]) => void) => void;
  startStream: (data: { roomId: string }) => void;
  stopStream: (data: { roomId: string }) => void;
  startScreen: (data: { roomId: string }) => void;
  stopScreen: (data: { roomId: string }) => void;
  offer: (data: { offer: RTCSessionDescriptionInit; to: string; from?: string }) => void;
  answer: (data: { answer: RTCSessionDescriptionInit; to: string; from?: string }) => void;
  'ice-candidate': (data: { candidate: RTCIceCandidateInit; to: string; roomId: string }) => void;
}

export interface User {
  id?: string;
  name: string;
  isCreator?: boolean;
  isStreaming?: boolean;
  isScreenSharing?: boolean;
  disconnected?: boolean;
}

export interface Room {
  id: string;
  name: string;
  persistent: boolean;
  createdAt?: string;
  users: User[];
  disconnectedUsers: number;
  totalUsers: number;
}