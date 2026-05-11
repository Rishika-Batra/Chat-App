import React, { useState, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

interface ProfileModalProps {
  onClose: () => void;
}

const styles = `
  .modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.7);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: fadeIn 0.2s ease-out;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .modal-card {
    background: rgba(15,8,30,0.95);
    border: 1px solid rgba(139,92,246,0.25);
    border-radius: 24px;
    padding: 36px;
    width: 100%;
    max-width: 380px;
    box-shadow: 0 0 60px rgba(109,40,217,0.2), 0 24px 48px rgba(0,0,0,0.5);
    position: relative;
    animation: slideUp 0.25s ease-out;
  }

  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .modal-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(168,85,247,0.5), transparent);
    border-radius: 24px 24px 0 0;
  }

  .modal-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 24px;
    font-weight: 600;
    color: #e2d9f3;
    text-align: center;
    margin-bottom: 28px;
  }

  .close-btn {
    position: absolute;
    top: 16px; right: 16px;
    background: none;
    border: none;
    color: rgba(196,181,253,0.4);
    font-size: 20px;
    cursor: pointer;
    transition: color 0.2s;
    line-height: 1;
  }
  .close-btn:hover { color: #e2d9f3; }

  .avatar-upload-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    margin-bottom: 28px;
  }

  .avatar-preview {
    width: 90px;
    height: 90px;
    border-radius: 50%;
    background: linear-gradient(135deg, #7c3aed, #a855f7);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Cormorant Garamond', serif;
    font-size: 36px;
    font-weight: 600;
    color: #fff;
    text-transform: uppercase;
    box-shadow: 0 0 24px rgba(168,85,247,0.4);
    overflow: hidden;
    cursor: pointer;
    position: relative;
    transition: all 0.25s;
    border: 2px solid rgba(168,85,247,0.3);
  }
  .avatar-preview:hover { box-shadow: 0 0 32px rgba(168,85,247,0.6); }
  .avatar-preview img {
    width: 100%; height: 100%;
    object-fit: cover;
  }
  .avatar-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.2s;
    font-size: 13px;
    color: #fff;
    font-family: 'DM Sans', sans-serif;
  }
  .avatar-preview:hover .avatar-overlay { opacity: 1; }

  .upload-hint {
    font-size: 12px;
    color: rgba(196,181,253,0.4);
    font-family: 'DM Sans', sans-serif;
    text-align: center;
  }

  .field-label-m {
    display: block;
    font-size: 11px;
    color: rgba(196,181,253,0.5);
    margin-bottom: 7px;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    font-weight: 500;
    font-family: 'DM Sans', sans-serif;
  }

  .field-input-m {
    width: 100%;
    background: rgba(139,92,246,0.07);
    border: 1px solid rgba(139,92,246,0.18);
    border-radius: 12px;
    padding: 11px 14px;
    color: #e2d9f3;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    outline: none;
    transition: all 0.3s;
    margin-bottom: 20px;
  }
  .field-input-m:focus {
    border-color: rgba(168,85,247,0.5);
    box-shadow: 0 0 16px rgba(168,85,247,0.12);
  }

  .save-btn-m {
    width: 100%;
    background: linear-gradient(135deg, #7c3aed, #a855f7);
    color: #fff;
    border: none;
    border-radius: 12px;
    padding: 13px;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.25s;
    box-shadow: 0 0 20px rgba(168,85,247,0.3);
  }
  .save-btn-m:hover:not(:disabled) {
    box-shadow: 0 0 32px rgba(168,85,247,0.55);
    transform: translateY(-1px);
  }
  .save-btn-m:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

  .success-msg {
    text-align: center;
    color: #34d399;
    font-size: 13px;
    font-family: 'DM Sans', sans-serif;
    margin-top: 12px;
  }

  .error-msg-m {
    text-align: center;
    color: #f87171;
    font-size: 13px;
    font-family: 'DM Sans', sans-serif;
    margin-top: 12px;
  }
`;

const ProfileModal = ({ onClose }: ProfileModalProps) => {
  const { user, login, token } = useAuth();
  const [username, setUsername] = useState(user?.username || '');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar_url ? `http://localhost:3000${user.avatar_url}` : null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    // Upload
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      setIsLoading(true);
      const res = await axios.post('/api/users/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSuccess('Avatar updated!');
      // Update user in context
      if (user && token) {
        login(token, { ...user, avatar_url: res.data.avatar_url });
      }
    } catch (err) {
      setError('Failed to upload avatar');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!username.trim() || username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }
    setIsLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await axios.patch('/api/users/me', { username });
      if (user && token) {
        login(token, { ...user, username: res.data.username });
      }
      setSuccess('Profile updated!');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const getInitial = (name: string) => name.charAt(0).toUpperCase();

  return (
    <>
      <style>{styles}</style>
      <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="modal-card">
          <button className="close-btn" onClick={onClose}>✕</button>
          <h2 className="modal-title">Edit Profile</h2>

          <div className="avatar-upload-wrap">
            <div className="avatar-preview" onClick={handleAvatarClick}>
              {avatarPreview
                ? <img src={avatarPreview} alt="avatar" />
                : getInitial(user?.username || 'U')
              }
              <div className="avatar-overlay">Change</div>
            </div>
            <p className="upload-hint">Click avatar to upload • Max 5MB</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
          </div>

          <label className="field-label-m">Username</label>
          <input
            className="field-input-m"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
          />

          <button className="save-btn-m" onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>

          {success && <p className="success-msg">✓ {success}</p>}
          {error && <p className="error-msg-m">{error}</p>}
        </div>
      </div>
    </>
  );
};

export default ProfileModal;