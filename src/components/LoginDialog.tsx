import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { buildGoogleRedirectUrl } from '../utils/googleAuth';
import './LoginDialog.scss';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

interface LoginDialogProps {
  visible: boolean;
  onClose: () => void;
  onLoginSuccess?: () => void;
}

export function LoginDialog({ visible, onClose, onLoginSuccess }: LoginDialogProps) {
  const { login, loginWithGoogle } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const a = t.seedance.auth;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!visible) return null;

  const handleGoogleSuccess = async (credential: string) => {
    try {
      setLoading(true);
      setError('');
      await loginWithGoogle(credential);
      onLoginSuccess?.();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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

        <div className="login-dialog-google-wrap">
          {GOOGLE_CLIENT_ID ? (
            <GoogleLogin
              theme="filled_black"
              size="large"
              text="continue_with"
              locale="en"
              onSuccess={(res) => res.credential && handleGoogleSuccess(res.credential)}
              onError={() => setError(a.loginGoogleFailed)}
              useOneTap={false}
            />
          ) : (
            <div className="login-dialog-google-placeholder" title={a.loginGoogleNotConfigured}>
              <div className="login-dialog-google-placeholder-row">
                <span className="login-dialog-google-placeholder-icon">G</span>
                <span>{a.loginWithGoogle}</span>
              </div>
              <span className="login-dialog-google-placeholder-hint">{a.loginGoogleNotConfigured}</span>
            </div>
          )}
          {GOOGLE_CLIENT_ID && (
            <button
              type="button"
              className="login-dialog-google-redirect-btn"
              onClick={() => { window.location.href = buildGoogleRedirectUrl(GOOGLE_CLIENT_ID); }}
            >
              {a.loginGoogleRedirect}
            </button>
          )}
        </div>

        <div className="login-dialog-divider">
          <span>{a.orEmail}</span>
        </div>

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
