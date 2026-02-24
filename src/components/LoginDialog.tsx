import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import './LoginDialog.scss';

interface LoginDialogProps {
  visible: boolean;
  onClose: () => void;
  onLoginSuccess?: () => void;
}

export function LoginDialog({ visible, onClose, onLoginSuccess }: LoginDialogProps) {
  const { login } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const a = t.seedance.auth;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!visible) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError(a.errorFill);
      return;
    }
    try {
      setLoading(true);
      setError('');
      await login(email, password);
      onLoginSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = () => {
    onClose();
    navigate('/register');
  };

  return (
    <div className="login-dialog-overlay" onClick={onClose}>
      <div className="login-dialog-box" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="login-dialog-close" onClick={onClose}>×</button>
        <h2>{a.loginTitle}</h2>
        {error && <div className="login-dialog-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="login-dialog-field">
            <label>{a.email}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={a.placeholderEmail}
            />
          </div>
          <div className="login-dialog-field">
            <label>{a.password}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={a.placeholderPassword}
            />
          </div>
          <button type="submit" className="login-dialog-submit" disabled={loading}>
            {loading ? a.loggingIn : a.login}
          </button>
        </form>
        <div className="login-dialog-footer">
          {a.noAccount}{' '}
          <button type="button" className="login-dialog-register-btn" onClick={handleRegister}>
            {a.goRegister}
          </button>
        </div>
      </div>
    </div>
  );
}
