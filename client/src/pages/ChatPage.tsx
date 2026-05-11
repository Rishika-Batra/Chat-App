import React, { useState, useEffect, useRef, KeyboardEvent, ChangeEvent, ReactNode } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import useSocket from '../hooks/useSocket';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import ProfileModal from '../components/ProfileModal';

interface Contact {
  id: string;
  username: string;
  avatar_url?: string;
  is_online: boolean;
  last_seen?: string;
}

interface Conversation {
  id: string;
  contact: Contact;
  last_message_at?: string;
  created_at: string;
  unread_count?: number;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface ChatErrorFallbackState { hasError: boolean; }
interface ChatErrorFallbackProps { children: ReactNode; }

class ChatErrorFallback extends React.Component<ChatErrorFallbackProps, ChatErrorFallbackState> {
  constructor(props: ChatErrorFallbackProps) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(_error: Error) { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0614' }}>
          <div style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: 20, padding: 40, textAlign: 'center', color: '#e2d9f3' }}>
            <h2 style={{ fontSize: 24, marginBottom: 8 }}>Something went wrong</h2>
            <button onClick={() => window.location.reload()} style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 24px', cursor: 'pointer', marginTop: 16 }}>Refresh</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=DM+Sans:wght@300;400;500&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0a0614; font-family: 'DM Sans', sans-serif; }

  .chat-root {
    display: flex; height: 100vh;
    background: #0a0614; overflow: hidden; position: relative;
  }
  .chat-root::before {
    content: ''; position: fixed; top: -30%; left: -20%;
    width: 60%; height: 60%;
    background: radial-gradient(ellipse, rgba(109,40,217,0.18) 0%, transparent 70%);
    pointer-events: none; z-index: 0;
  }
  .chat-root::after {
    content: ''; position: fixed; bottom: -20%; right: -10%;
    width: 50%; height: 50%;
    background: radial-gradient(ellipse, rgba(168,85,247,0.12) 0%, transparent 70%);
    pointer-events: none; z-index: 0;
  }

  .sidebar {
    width: 300px; flex-shrink: 0; display: flex; flex-direction: column;
    background: rgba(15,8,30,0.85); border-right: 1px solid rgba(139,92,246,0.15);
    backdrop-filter: blur(20px); position: relative; z-index: 1;
  }

  .sidebar-header {
    padding: 16px 20px; border-bottom: 1px solid rgba(139,92,246,0.12);
    display: flex; align-items: center; gap: 12px;
    background: rgba(109,40,217,0.06);
  }

  .sidebar-avatar {
    width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0;
    background: linear-gradient(135deg, #7c3aed, #a855f7);
    display: flex; align-items: center; justify-content: center;
    font-family: 'Cormorant Garamond', serif; font-size: 15px;
    font-weight: 600; color: #fff; text-transform: uppercase;
    cursor: pointer; overflow: hidden;
    box-shadow: 0 0 10px rgba(168,85,247,0.3);
    transition: box-shadow 0.2s;
  }
  .sidebar-avatar:hover { box-shadow: 0 0 18px rgba(168,85,247,0.55); }
  .sidebar-avatar img { width: 100%; height: 100%; object-fit: cover; }

  .sidebar-username {
    font-family: 'Cormorant Garamond', serif; font-size: 17px;
    font-weight: 600; color: #e2d9f3; overflow: hidden;
    text-overflow: ellipsis; white-space: nowrap; flex: 1;
    cursor: pointer;
  }
  .sidebar-username:hover { color: #c084fc; }

  .logout-btn {
    background: none; border: 1px solid rgba(239,68,68,0.3);
    color: #f87171; font-size: 12px; font-family: 'DM Sans', sans-serif;
    padding: 4px 10px; border-radius: 8px; cursor: pointer;
    transition: all 0.2s; flex-shrink: 0;
  }
  .logout-btn:hover {
    background: rgba(239,68,68,0.1); border-color: rgba(239,68,68,0.6);
    box-shadow: 0 0 10px rgba(239,68,68,0.2);
  }

  .search-wrap {
    padding: 16px; border-bottom: 1px solid rgba(139,92,246,0.1); position: relative;
  }
  .search-input {
    width: 100%; background: rgba(139,92,246,0.08);
    border: 1px solid rgba(139,92,246,0.2); border-radius: 12px;
    padding: 10px 14px; color: #e2d9f3; font-family: 'DM Sans', sans-serif;
    font-size: 13px; outline: none; transition: all 0.3s;
  }
  .search-input::placeholder { color: rgba(196,181,253,0.4); }
  .search-input:focus {
    border-color: rgba(168,85,247,0.5); background: rgba(139,92,246,0.12);
    box-shadow: 0 0 16px rgba(168,85,247,0.15), inset 0 0 8px rgba(168,85,247,0.05);
  }

  .search-dropdown {
    position: absolute; top: calc(100% - 8px); left: 16px; right: 16px;
    background: rgba(20,10,40,0.97); border: 1px solid rgba(139,92,246,0.25);
    border-radius: 14px; box-shadow: 0 8px 32px rgba(109,40,217,0.25);
    max-height: 220px; overflow-y: auto; z-index: 50; backdrop-filter: blur(20px);
  }
  .search-result-item {
    display: flex; align-items: center; gap: 10px; padding: 12px 14px;
    cursor: pointer; border-bottom: 1px solid rgba(139,92,246,0.08); transition: background 0.2s;
  }
  .search-result-item:last-child { border-bottom: none; }
  .search-result-item:hover { background: rgba(139,92,246,0.1); }

  .conv-list { flex: 1; overflow-y: auto; padding: 10px 8px; }
  .conv-list::-webkit-scrollbar { width: 4px; }
  .conv-list::-webkit-scrollbar-track { background: transparent; }
  .conv-list::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.3); border-radius: 4px; }

  .conv-item {
    display: flex; align-items: center; gap: 12px; padding: 12px;
    border-radius: 14px; cursor: pointer; transition: all 0.25s; margin-bottom: 4px;
    position: relative;
  }
  .conv-item:hover { background: rgba(139,92,246,0.1); }
  .conv-item.active {
    background: rgba(139,92,246,0.18);
    box-shadow: inset 0 0 20px rgba(168,85,247,0.08), 0 0 0 1px rgba(139,92,246,0.2);
  }

  .unread-badge {
    position: absolute; top: 10px; right: 10px;
    background: linear-gradient(135deg, #7c3aed, #a855f7);
    color: #fff; font-size: 10px; font-weight: 600;
    min-width: 18px; height: 18px; border-radius: 9px;
    display: flex; align-items: center; justify-content: center;
    padding: 0 5px; box-shadow: 0 0 8px rgba(168,85,247,0.5);
    font-family: 'DM Sans', sans-serif;
  }

  .empty-convs {
    text-align: center; color: rgba(196,181,253,0.35);
    font-family: 'Cormorant Garamond', serif; font-size: 15px;
    letter-spacing: 0.3px; margin-top: 40px;
  }

  .avatar {
    width: 40px; height: 40px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-family: 'Cormorant Garamond', serif; font-size: 16px;
    font-weight: 600; color: #fff; flex-shrink: 0;
    background: linear-gradient(135deg, #7c3aed, #a855f7);
    position: relative; text-transform: uppercase; overflow: hidden;
  }
  .avatar.lg { width: 44px; height: 44px; font-size: 18px; }
  .avatar img { width: 100%; height: 100%; object-fit: cover; }
  .avatar-glow { box-shadow: 0 0 14px rgba(168,85,247,0.45); }

  .online-dot {
    position: absolute; bottom: 1px; right: 1px;
    width: 10px; height: 10px; border-radius: 50%; border: 2px solid #0a0614;
  }
  .online-dot.online {
    background: #34d399; box-shadow: 0 0 6px rgba(52,211,153,0.7);
    animation: pulse-green 2s infinite;
  }
  .online-dot.offline { background: #4b5563; }

  @keyframes pulse-green {
    0%, 100% { box-shadow: 0 0 6px rgba(52,211,153,0.7); }
    50% { box-shadow: 0 0 12px rgba(52,211,153,1); }
  }

  .main-panel {
    flex: 1; display: flex; flex-direction: column; min-width: 0;
    position: relative; z-index: 1;
  }

  .chat-header {
    height: 68px; background: rgba(15,8,30,0.7);
    border-bottom: 1px solid rgba(139,92,246,0.12);
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 24px; backdrop-filter: blur(20px); flex-shrink: 0;
  }

  .header-name {
    font-family: 'Cormorant Garamond', serif; font-size: 18px;
    font-weight: 600; color: #e2d9f3;
  }
  .header-status { font-size: 12px; color: rgba(196,181,253,0.5); margin-top: 1px; }
  .header-status.online { color: #34d399; }

  .messages-area {
    flex: 1; overflow-y: auto; padding: 24px;
    display: flex; flex-direction: column; gap: 12px;
  }
  .messages-area::-webkit-scrollbar { width: 4px; }
  .messages-area::-webkit-scrollbar-track { background: transparent; }
  .messages-area::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.3); border-radius: 4px; }

  .empty-state {
    flex: 1; display: flex; align-items: center; justify-content: center;
    color: rgba(196,181,253,0.3); font-family: 'Cormorant Garamond', serif;
    font-size: 18px; letter-spacing: 0.5px;
  }

  .history-label { text-align: center; margin-bottom: 8px; }
  .history-label span {
    font-size: 11px; color: rgba(196,181,253,0.35);
    background: rgba(139,92,246,0.08); border: 1px solid rgba(139,92,246,0.12);
    padding: 4px 14px; border-radius: 20px; font-family: 'DM Sans', sans-serif;
    letter-spacing: 0.5px;
  }

  .msg-row {
    display: flex; animation: fadeSlideIn 0.25s ease-out; position: relative;
  }
  .msg-row.mine { justify-content: flex-end; }
  .msg-row.theirs { justify-content: flex-start; }

  @keyframes fadeSlideIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .msg-row:hover .delete-btn { opacity: 1; }

  .delete-btn {
    position: absolute; top: 50%; transform: translateY(-50%);
    background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.25);
    color: #f87171; border-radius: 8px; padding: 4px 8px;
    font-size: 11px; cursor: pointer; opacity: 0; transition: all 0.2s;
    font-family: 'DM Sans', sans-serif; white-space: nowrap;
  }
  .delete-btn:hover { background: rgba(239,68,68,0.25); }
  .msg-row.mine .delete-btn { right: calc(100% + 8px); }
  .msg-row.theirs .delete-btn { left: calc(100% + 8px); }

  .bubble {
    max-width: 65%; padding: 10px 16px; border-radius: 18px;
    font-size: 14px; line-height: 1.5; font-family: 'DM Sans', sans-serif;
  }
  .bubble.mine {
    background: linear-gradient(135deg, #6d28d9, #9333ea); color: #fff;
    border-bottom-right-radius: 4px;
    box-shadow: 0 0 20px rgba(147,51,234,0.35), 0 4px 12px rgba(109,40,217,0.3);
  }
  .bubble.theirs {
    background: rgba(30,15,55,0.9); border: 1px solid rgba(139,92,246,0.18);
    color: #e2d9f3; border-bottom-left-radius: 4px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  }

  .bubble-footer {
    display: flex; align-items: center; justify-content: flex-end;
    gap: 4px; margin-top: 4px;
  }
  .bubble-time { font-size: 10px; opacity: 0.6; }
  .bubble.mine .bubble-time { color: #ddd6fe; }
  .bubble.theirs .bubble-time { color: rgba(196,181,253,0.5); }

  .tick { font-size: 11px; line-height: 1; }
  .tick.sent { color: rgba(221,214,254,0.5); }
  .tick.read { color: #818cf8; }

  .typing-bubble {
    background: rgba(30,15,55,0.9); border: 1px solid rgba(139,92,246,0.18);
    border-radius: 18px; border-bottom-left-radius: 4px;
    padding: 12px 18px; display: inline-flex; gap: 5px; align-items: center;
  }
  .typing-dot {
    width: 7px; height: 7px; background: rgba(168,85,247,0.7);
    border-radius: 50%; animation: typingBounce 1.2s infinite;
  }
  .typing-dot:nth-child(2) { animation-delay: 0.2s; }
  .typing-dot:nth-child(3) { animation-delay: 0.4s; }

  @keyframes typingBounce {
    0%, 100% { transform: translateY(0); opacity: 0.4; }
    50% { transform: translateY(-5px); opacity: 1; box-shadow: 0 0 8px rgba(168,85,247,0.8); }
  }

  .input-bar {
    padding: 16px 24px; background: rgba(15,8,30,0.7);
    border-top: 1px solid rgba(139,92,246,0.12);
    backdrop-filter: blur(20px); flex-shrink: 0; position: relative;
  }
  .input-inner {
    display: flex; align-items: flex-end; gap: 10px;
    max-width: 900px; margin: 0 auto; position: relative;
  }

  .emoji-btn {
    background: rgba(139,92,246,0.1); border: 1px solid rgba(139,92,246,0.2);
    border-radius: 12px; width: 46px; height: 46px;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; font-size: 20px; flex-shrink: 0;
    transition: all 0.25s; color: #a855f7;
  }
  .emoji-btn:hover {
    background: rgba(139,92,246,0.2); box-shadow: 0 0 14px rgba(168,85,247,0.25);
    transform: scale(1.05);
  }
  .emoji-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

  .emoji-picker-wrap {
    position: absolute; bottom: calc(100% + 12px); left: 0; z-index: 100;
    animation: popIn 0.2s ease-out; border-radius: 16px; overflow: hidden;
    box-shadow: 0 0 40px rgba(109,40,217,0.3);
  }
  @keyframes popIn {
    from { opacity: 0; transform: scale(0.95) translateY(8px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }

  .msg-textarea {
    flex: 1; background: rgba(139,92,246,0.08);
    border: 1px solid rgba(139,92,246,0.2); border-radius: 16px;
    padding: 12px 18px; color: #e2d9f3; font-family: 'DM Sans', sans-serif;
    font-size: 14px; resize: none; outline: none;
    min-height: 48px; max-height: 130px; transition: all 0.3s; line-height: 1.5;
  }
  .msg-textarea::placeholder { color: rgba(196,181,253,0.35); }
  .msg-textarea:focus {
    border-color: rgba(168,85,247,0.5); background: rgba(139,92,246,0.12);
    box-shadow: 0 0 20px rgba(168,85,247,0.15), inset 0 0 10px rgba(168,85,247,0.04);
  }
  .msg-textarea:disabled { opacity: 0.4; cursor: not-allowed; }

  .send-btn {
    background: linear-gradient(135deg, #7c3aed, #a855f7); color: #fff;
    border: none; border-radius: 14px; padding: 12px 22px;
    font-family: 'DM Sans', sans-serif; font-size: 14px; font-weight: 500;
    cursor: pointer; flex-shrink: 0; transition: all 0.25s;
    box-shadow: 0 0 16px rgba(168,85,247,0.3); letter-spacing: 0.3px; height: 46px;
  }
  .send-btn:hover:not(:disabled) {
    box-shadow: 0 0 28px rgba(168,85,247,0.55), 0 4px 16px rgba(109,40,217,0.4);
    transform: translateY(-1px);
  }
  .send-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; box-shadow: none; }

  .loader { display: flex; align-items: center; justify-content: center; flex: 1; }
  .spinner {
    width: 32px; height: 32px; border: 3px solid rgba(139,92,246,0.2);
    border-top-color: #a855f7; border-radius: 50%;
    animation: spin 0.8s linear infinite; box-shadow: 0 0 12px rgba(168,85,247,0.3);
  }
  @keyframes spin { to { transform: rotate(360deg); } }
`;

// Notification sound
const playNotificationSound = () => {
  try {
    const audio = new Audio('/notification.mp3');
    audio.volume = 0.4;
    audio.play().catch(() => {});
  } catch {}
};

const getLastSeen = (lastSeen?: string) => {
  if (!lastSeen) return 'Offline';
  const diff = Date.now() - new Date(lastSeen).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Last seen just now';
  if (mins < 60) return `Last seen ${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Last seen ${hrs}h ago`;
  return `Last seen ${Math.floor(hrs / 24)}d ago`;
};

const ChatPageContent = () => {
  const { user, logout } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Contact[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const selectedConvRef = useRef(selectedConversation);

  useEffect(() => { selectedConvRef.current = selectedConversation; }, [selectedConversation]);

  const handleNewMessage = (msg: Message) => {
    // Play sound if message is from someone else and not in active conversation
    if (msg.sender_id !== user?.id) {
      if (msg.conversation_id !== selectedConvRef.current?.id) {
        playNotificationSound();
        setUnreadCounts(prev => ({
          ...prev,
          [msg.conversation_id]: (prev[msg.conversation_id] || 0) + 1
        }));
      }
    }
  };

  const { sendMessage, sendTyping, typingState } = useSocket(selectedConversation?.id, {
    setMessages,
    setConversations,
    onNewMessage: handleNewMessage
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const res = await axios.get('/api/conversations');
        setConversations(res.data);
      } catch (err) {
        console.error('Failed to fetch conversations:', err);
      }
    };
    fetchConversations();
  }, []);

  useEffect(() => {
    if (!selectedConversation) { setMessages([]); return; }
    // Clear unread count when opening conversation
    setUnreadCounts(prev => ({ ...prev, [selectedConversation.id]: 0 }));
    const fetchMessages = async () => {
      setIsLoadingMessages(true);
      try {
        const res = await axios.get(`/api/conversations/${selectedConversation.id}/messages`);
        setMessages(res.data);
      } catch (err) {
        console.error('Failed to fetch messages:', err);
      } finally {
        setIsLoadingMessages(false);
      }
    };
    fetchMessages();
  }, [selectedConversation]);

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const delay = setTimeout(async () => {
      try {
        const res = await axios.get(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
        setSearchResults(res.data);
      } catch (err) {
        console.error('Failed to search users:', err);
      }
    }, 300);
    return () => clearTimeout(delay);
  }, [searchQuery]);

  const handleStartConversation = async (userId: string) => {
    try {
      const res = await axios.post('/api/conversations', { recipientId: userId });
      const newConv = res.data;
      setConversations((prev) => prev.some(c => c.id === newConv.id) ? prev : [newConv, ...prev]);
      setSelectedConversation(newConv);
      setSearchQuery('');
      setSearchResults([]);
    } catch (err) {
      console.error('Failed to start conversation:', err);
    }
  };

  const handleSendMessage = () => {
    if (!message.trim() || !selectedConversation) return;
    sendMessage(message);
    setMessage('');
    setShowEmojiPicker(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    setMessage((prev) => prev + emojiData.emoji);
    textareaRef.current?.focus();
  };

  const handleDeleteMessage = async (msgId: string) => {
    try {
      await axios.delete(`/api/conversations/messages/${msgId}`);
      setMessages(prev => prev.filter(m => m.id !== msgId));
    } catch (err) {
      console.error('Failed to delete message:', err);
    }
  };

  const renderAvatar = (name: string, avatarUrl?: string, large = false, glowing = false) => (
    <div className={`avatar${large ? ' lg' : ''}${glowing ? ' avatar-glow' : ''}`}>
      {avatarUrl
        ? <img src={`http://localhost:3000${avatarUrl}`} alt={name} />
        : name.charAt(0).toUpperCase()
      }
    </div>
  );

  return (
    <>
      <style>{styles}</style>
      <div className="chat-root">
        {/* SIDEBAR */}
        <div className="sidebar">
          <div className="sidebar-header">
            <div
              className="sidebar-avatar"
              onClick={() => setShowProfileModal(true)}
              title="Edit profile"
            >
              {user?.avatar_url
                ? <img src={`http://localhost:3000${user.avatar_url}`} alt="me" />
                : user?.username?.charAt(0).toUpperCase()
              }
            </div>
            <span
              className="sidebar-username"
              onClick={() => setShowProfileModal(true)}
              title="Edit profile"
            >
              {user?.username || '...'}
            </span>
            <button className="logout-btn" onClick={logout}>Logout</button>
          </div>

          <div className="search-wrap">
            <input
              className="search-input"
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchResults.length > 0 && (
              <div className="search-dropdown">
                {searchResults.map((u) => (
                  <div key={u.id} className="search-result-item" onClick={() => handleStartConversation(u.id)}>
                    <div className="avatar" style={{ width: 32, height: 32, fontSize: 13 }}>
                      {u.avatar_url
                        ? <img src={`http://localhost:3000${u.avatar_url}`} alt={u.username} />
                        : u.username.charAt(0).toUpperCase()
                      }
                    </div>
                    <span style={{ color: '#e2d9f3', fontSize: 13 }}>{u.username}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="conv-list">
            {conversations.length === 0 ? (
              <div className="empty-convs">No conversations yet</div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`conv-item ${selectedConversation?.id === conv.id ? 'active' : ''}`}
                  onClick={() => setSelectedConversation(conv)}
                >
                  <div className={`avatar${selectedConversation?.id === conv.id ? ' avatar-glow' : ''}`}>
                    {conv.contact.avatar_url
                      ? <img src={`http://localhost:3000${conv.contact.avatar_url}`} alt={conv.contact.username} />
                      : conv.contact.username.charAt(0).toUpperCase()
                    }
                    <span className={`online-dot ${conv.contact.is_online ? 'online' : 'offline'}`}></span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#e2d9f3', fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {conv.contact.username}
                      </span>
                      <span style={{ color: 'rgba(196,181,253,0.4)', fontSize: 11, flexShrink: 0, marginLeft: 8 }}>
                        {new Date(conv.last_message_at || conv.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                  {(unreadCounts[conv.id] || 0) > 0 && (
                    <div className="unread-badge">{unreadCounts[conv.id]}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* MAIN PANEL */}
        <div className="main-panel">
          <div className="chat-header">
            {selectedConversation ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div className="avatar lg avatar-glow">
                  {selectedConversation.contact.avatar_url
                    ? <img src={`http://localhost:3000${selectedConversation.contact.avatar_url}`} alt={selectedConversation.contact.username} />
                    : selectedConversation.contact.username.charAt(0).toUpperCase()
                  }
                  <span className={`online-dot ${selectedConversation.contact.is_online ? 'online' : 'offline'}`}></span>
                </div>
                <div>
                  <div className="header-name">{selectedConversation.contact.username}</div>
                  <div className={`header-status ${selectedConversation.contact.is_online ? 'online' : ''}`}>
                    {selectedConversation.contact.is_online
                      ? 'Online'
                      : getLastSeen(selectedConversation.contact.last_seen)
                    }
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ color: 'rgba(196,181,253,0.4)', fontFamily: "'Cormorant Garamond', serif", fontSize: 17 }}>
                Select a conversation
              </div>
            )}
          </div>

          <div className="messages-area">
            {!selectedConversation ? (
              <div className="empty-state">Begin a conversation ✦</div>
            ) : isLoadingMessages ? (
              <div className="loader"><div className="spinner"></div></div>
            ) : messages.length === 0 ? (
              <div className="empty-state">No messages yet</div>
            ) : (
              <>
                <div className="history-label"><span>Conversation begins</span></div>
                {messages.map((msg) => {
                  const isMine = msg.sender_id === user?.id;
                  return (
                    <div key={msg.id} className={`msg-row ${isMine ? 'mine' : 'theirs'}`}>
                      {isMine && (
                        <button
                          className="delete-btn"
                          onClick={() => handleDeleteMessage(msg.id)}
                        >
                          Delete
                        </button>
                      )}
                      <div className={`bubble ${isMine ? 'mine' : 'theirs'}`}>
                        <p style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.content}</p>
                        <div className="bubble-footer">
                          <span className="bubble-time">
                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isMine && (
                            <span className={`tick ${msg.is_read ? 'read' : 'sent'}`}>
                              {msg.is_read ? '✓✓' : '✓'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {typingState && (
                  <div className="msg-row theirs">
                    <div className="typing-bubble">
                      <div className="typing-dot"></div>
                      <div className="typing-dot"></div>
                      <div className="typing-dot"></div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          <div className="input-bar">
            <div className="input-inner" ref={emojiPickerRef}>
              {showEmojiPicker && (
                <div className="emoji-picker-wrap">
                  <EmojiPicker
                    onEmojiClick={handleEmojiClick}
                    theme={Theme.DARK}
                    skinTonesDisabled
                    width={320}
                    height={400}
                  />
                </div>
              )}
              <button
                className="emoji-btn"
                onClick={() => setShowEmojiPicker((prev) => !prev)}
                disabled={!selectedConversation}
              >
                😊
              </button>
              <textarea
                ref={textareaRef}
                className="msg-textarea"
                value={message}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => { setMessage(e.target.value); sendTyping(); }}
                onKeyDown={handleKeyDown}
                disabled={!selectedConversation}
                placeholder={selectedConversation ? 'Type a message...' : 'Select a conversation to start'}
                rows={1}
              />
              <button
                className="send-btn"
                onClick={handleSendMessage}
                disabled={!selectedConversation || !message.trim()}
              >
                Send
              </button>
            </div>
          </div>
        </div>

        {showProfileModal && (
          <ProfileModal onClose={() => setShowProfileModal(false)} />
        )}
      </div>
    </>
  );
};

const ChatPage = () => (
  <ChatErrorFallback>
    <ChatPageContent />
  </ChatErrorFallback>
);

export default ChatPage;