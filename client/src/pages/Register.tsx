import React, { useState, FormEvent } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@300;400;500&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  .auth-root {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #0a0614;
    font-family: 'DM Sans', sans-serif;
    position: relative;
    overflow: hidden;
  }

  .auth-root::before {
    content: '';
    position: fixed;
    top: -30%;
    left: -20%;
    width: 70%;
    height: 70%;
    background: radial-gradient(ellipse, rgba(109,40,217,0.2) 0%, transparent 70%);
    pointer-events: none;
  }

  .auth-root::after {
    content: '';
    position: fixed;
    bottom: -20%;
    right: -10%;
    width: 60%;
    height: 60%;
    background: radial-gradient(ellipse, rgba(168,85,247,0.15) 0%, transparent 70%);
    pointer-events: none;
  }

  .auth-card {
    width: 100%;
    max-width: 420px;
    background: rgba(15,8,30,0.85);
    border: 1px solid rgba(139,92,246,0.2);
    border-radius: 24px;
    padding: 44px 40px;
    backdrop-filter: blur(24px);
    box-shadow: 0 0 60px rgba(109,40,217,0.15), 0 24px 48px rgba(0,0,0,0.4);
    position: relative;
    z-index: 1;
    animation: cardIn 0.4s ease-out;
  }

  @keyframes cardIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .auth-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(168,85,247,0.5), transparent);
    border-radius: 24px 24px 0 0;
  }

  .auth-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 36px;
    font-weight: 600;
    color: #e2d9f3;
    text-align: center;
    letter-spacing: 0.5px;
    margin-bottom: 6px;
  }

  .auth-subtitle {
    text-align: center;
    color: rgba(196,181,253,0.45);
    font-size: 13px;
    margin-bottom: 32px;
    letter-spacing: 0.3px;
  }

  .error-box {
    background: rgba(239,68,68,0.08);
    border: 1px solid rgba(239,68,68,0.25);
    color: #f87171;
    border-radius: 12px;
    padding: 12px 16px;
    font-size: 13px;
    text-align: center;
    margin-bottom: 20px;
    animation: shake 0.3s ease-out;
  }

  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-6px); }
    75% { transform: translateX(6px); }
  }

  .field-group {
    display: flex;
    flex-direction: column;
    gap: 18px;
    margin-bottom: 28px;
  }

  .field-label {
    display: block;
    font-size: 12px;
    color: rgba(196,181,253,0.6);
    margin-bottom: 7px;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    font-weight: 500;
  }

  .field-input {
    width: 100%;
    background: rgba(139,92,246,0.07);
    border: 1px solid rgba(139,92,246,0.18);
    border-radius: 14px;
    padding: 13px 16px;
    color: #e2d9f3;
    font-family: 'DM Sans', sans-serif;
    font-size: 14px;
    outline: none;
    transition: all 0.3s;
  }
  .field-input::placeholder { color: rgba(196,181,253,0.25); }
  .field-input:focus {
    border-color: rgba(168,85,247,0.5);
    background: rgba(139,92,246,0.12);
    box-shadow: 0 0 20px rgba(168,85,247,0.12), inset 0 0 10px rgba(168,85,247,0.04);
  }

  .submit-btn {
    width: 100%;
    background: linear-gradient(135deg, #7c3aed, #a855f7);
    color: #fff;
    border: none;
    border-radius: 14px;
    padding: 14px;
    font-family: 'DM Sans', sans-serif;
    font-size: 15px;
    font-weight: 500;
    cursor: pointer;
    letter-spacing: 0.4px;
    transition: all 0.25s;
    box-shadow: 0 0 20px rgba(168,85,247,0.3);
    margin-bottom: 20px;
  }
  .submit-btn:hover:not(:disabled) {
    box-shadow: 0 0 32px rgba(168,85,247,0.55), 0 8px 20px rgba(109,40,217,0.4);
    transform: translateY(-2px);
  }
  .submit-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .auth-switch {
    text-align: center;
    font-size: 13px;
    color: rgba(196,181,253,0.4);
  }
  .auth-switch a {
    color: #a855f7;
    text-decoration: none;
    font-weight: 500;
    transition: all 0.2s;
  }
  .auth-switch a:hover {
    color: #c084fc;
    text-shadow: 0 0 10px rgba(168,85,247,0.5);
  }

  .ornament {
    text-align: center;
    color: rgba(139,92,246,0.3);
    font-size: 18px;
    letter-spacing: 8px;
    margin-bottom: 24px;
  }

  .hint {
    font-size: 11px;
    color: rgba(196,181,253,0.25);
    margin-top: 5px;
    padding-left: 4px;
  }
`;

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const response = await axios.post('/api/auth/register', { username, email, password });
      const { token, user } = response.data;
      login(token, user);
      navigate('/');
    } catch (err: any) {
      if (err.response && err.response.data && err.response.data.error) {
        const errMsg = Array.isArray(err.response.data.error)
          ? err.response.data.error[0].message
          : err.response.data.error;
        setError(errMsg);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <style>{styles}</style>
      <div className="auth-root">
        <div className="auth-card">
          <div className="ornament">✦ ✦ ✦</div>
          <h1 className="auth-title">Create account</h1>
          <p className="auth-subtitle">Join and start chatting today</p>

          {error && <div className="error-box">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="field-group">
              <div>
                <label className="field-label">Username</label>
                <input
                  className="field-input"
                  type="text"
                  autoComplete="username"
                  required
                  placeholder="chatfan99"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
                <p className="hint">Minimum 3 characters</p>
              </div>
              <div>
                <label className="field-label">Email address</label>
                <input
                  className="field-input"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="field-label">Password</label>
                <input
                  className="field-input"
                  type="password"
                  autoComplete="new-password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <p className="hint">Minimum 8 characters</p>
              </div>
            </div>

            <button className="submit-btn" type="submit" disabled={isLoading}>
              {isLoading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="auth-switch">
            Already have an account?{' '}
            <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </>
  );
};

export default Register;