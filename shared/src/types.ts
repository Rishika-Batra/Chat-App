export interface User {
  id: string;
  username: string;
  email: string;
  createdAt: Date;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: Date;
}

export interface Conversation {
  id: string;
  participantIds: string[];
  createdAt: Date;
}
