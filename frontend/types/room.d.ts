export interface RoomState {
  roomId: string;
  roomName: string;
  isAdmin: boolean;
  participants: Participant[];
  messages: ChatMessage[];
}

export interface Participant {
  id: string;
  name: string;
  isCreator: boolean;
  isStreaming: boolean;
  isScreenSharing: boolean;
  stream?: MediaStream;
}

export interface ChatMessage {
  id: string;
  userName: string;
  message: string;
  timestamp: Date;
  isSystem: boolean;
}