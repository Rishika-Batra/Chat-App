import { useRef, useEffect, useState, Dispatch, SetStateAction } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  conversation_id: string;
}

interface Conversation {
  id: string;
  contact: {
    id: string;
    username: string;
    is_online: boolean;
    avatar_url?: string;
  };
  last_message_at?: string;
  created_at: string;
}

interface UseSocketOptions {
  setMessages: Dispatch<SetStateAction<Message[]>>;
  setConversations: Dispatch<SetStateAction<Conversation[]>>;
  onNewMessage?: (msg: Message) => void;
}

const useSocket = (activeConversationId: string | undefined, { setMessages, setConversations, onNewMessage }: UseSocketOptions) => {
  const { token, user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeConversationIdRef = useRef(activeConversationId);
  const lastTypingSentRef = useRef(0);
  const onNewMessageRef = useRef(onNewMessage);

  useEffect(() => { activeConversationIdRef.current = activeConversationId; }, [activeConversationId]);
  useEffect(() => { onNewMessageRef.current = onNewMessage; }, [onNewMessage]);

  useEffect(() => {
    if (!token) return;

    socketRef.current = io('http://localhost:3000', {
      auth: { token }
    });

    socketRef.current.on('connect', () => {
      if (activeConversationIdRef.current) {
        socketRef.current?.emit('join_conversation', {
          conversationId: activeConversationIdRef.current
        });
      }
    });

    socketRef.current.on('new_message', (payload: any) => {
      const message: Message = {
        id: payload.id,
        sender_id: payload.senderId,
        content: payload.content,
        created_at: payload.createdAt,
        is_read: payload.isRead,
        conversation_id: payload.conversationId
      };

      if (message.conversation_id === activeConversationIdRef.current) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
      }

      onNewMessageRef.current?.(message);

      setConversations((prev) => {
        const updated = prev.map((conv) =>
          conv.id === message.conversation_id
            ? { ...conv, last_message_at: message.created_at }
            : conv
        );
        return [...updated].sort((a, b) => {
          const timeA = new Date(a.last_message_at || a.created_at).getTime();
          const timeB = new Date(b.last_message_at || b.created_at).getTime();
          return timeB - timeA;
        });
      });
    });

    socketRef.current.on('user_typing', (payload: any) => {
      if (payload.conversationId === activeConversationIdRef.current) {
        setIsTyping(true);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setIsTyping(false), 2000);
      }
    });

    socketRef.current.on('messages_read', (payload: any) => {
      if (payload.conversationId === activeConversationIdRef.current) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.sender_id === user?.id ? { ...msg, is_read: true } : msg
          )
        );
      }
    });

    socketRef.current.on('user_online', ({ userId }: { userId: string }) => {
      setConversations((prev) =>
        prev.map((conv) =>
          conv.contact.id === userId
            ? { ...conv, contact: { ...conv.contact, is_online: true } }
            : conv
        )
      );
    });

    socketRef.current.on('user_offline', ({ userId }: { userId: string }) => {
      setConversations((prev) =>
        prev.map((conv) =>
          conv.contact.id === userId
            ? { ...conv, contact: { ...conv.contact, is_online: false } }
            : conv
        )
      );
    });

    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [token]);

  useEffect(() => {
    if (socketRef.current?.connected && activeConversationId) {
      socketRef.current.emit('join_conversation', { conversationId: activeConversationId });
      socketRef.current.emit('mark_read', { conversationId: activeConversationId });
    }
  }, [activeConversationId]);

  const markRead = () => {
    if (!socketRef.current || !activeConversationId) return;
    socketRef.current.emit('mark_read', { conversationId: activeConversationId });
  };

  const sendMessage = (content: string) => {
    if (!socketRef.current || !activeConversationId || !content.trim() || !user) return;
    socketRef.current.emit('send_message', {
      conversationId: activeConversationId,
      content
    });
  };

  const sendTyping = () => {
    if (!socketRef.current || !activeConversationId) return;
    const now = Date.now();
    if (now - lastTypingSentRef.current > 1000) {
      socketRef.current.emit('typing', { conversationId: activeConversationId });
      lastTypingSentRef.current = now;
    }
  };

  return { sendMessage, sendTyping, markRead, typingState: isTyping };
};

export default useSocket;