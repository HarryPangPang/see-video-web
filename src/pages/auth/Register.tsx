import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { buildGoogleRedirectUrl } from '../../utils/googleAuth';
import './auth.scss';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export function Register() {
  const navigate = useNavigate();
  const { register, loginWithGoogle } = useAuth();
  const { t } = useI18n();
  const a = t.seedance.auth;
  // const { register, sendVerificationCode } = useAuth(); // 完整版本

  const [searchParams] = useSearchParams();
  const inviteFromUrl = searchParams.get('invite') || '';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [inviteCode, setInviteCode] = useState(inviteFromUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (inviteFromUrl && !inviteCode) setInviteCode(inviteFromUrl);
  }, [inviteFromUrl, inviteCode]);

  /* ===== 验证码发送功能 - 已暂时禁用 =====
  const handleSendCode = async () => {
    if (!email) {
      setError('请输入邮箱');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await sendVerificationCode(email, 'register');

      // 开始倒计时
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  */

  const handleGoogleSuccess = async (credential: string) => {
    try {
      setLoading(true);
      setError('');
      await loginWithGoogle(credential, inviteCode || undefined);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 注册
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    // 验证
    if (!email || !password) {
      setError(a.errorFill);
      return;
    }

    if (password.length < 6) {
      setError(a.errorPasswordLength);
      return;
    }

    if (password !== confirmPassword) {
      setError(a.errorPasswordMismatch);
      return;
    }

    try {
      setLoading(true);
      setError('');
      await register(email, password, '', username || undefined, inviteCode || undefined);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h1>{a.registerTitle}</h1>

        {error && <div className="auth-error">{error}</div>}

        {GOOGLE_CLIENT_ID && (
          <div className="auth-google-wrap">
            <GoogleLogin
              theme="filled_black"
              size="large"
              text="continue_with"
              locale="en"
              onSuccess={(res) => res.credential && handleGoogleSuccess(res.credential)}
              onError={() => setError(a.loginGoogleFailed)}
              useOneTap={false}
            />
            <button
              type="button"
              className="auth-google-redirect-btn"
              onClick={() => { window.location.href = buildGoogleRedirectUrl(GOOGLE_CLIENT_ID); }}
            >
              {a.loginGoogleRedirect}
            </button>
          </div>
        )}

        {GOOGLE_CLIENT_ID && (
          <div className="auth-divider">
            <span>{a.orEmailRegister}</span>
          </div>
        )}

        {inviteFromUrl && (
          <div className="auth-invite-hint">
            {a.inviteHint}
          </div>
        )}
        <form onSubmit={handleRegister}>
          {inviteFromUrl && (
            <div className="form-group">
              <label>{a.inviteCodeLabel}</label>
              <input
                type="text"
                value={inviteCode}
                readOnly
                placeholder="邀请码"
                className="form-input readonly"
              />
            </div>
          )}
          <div className="form-group">
            <label>{a.email} *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={a.placeholderEmail}
              required
            />
          </div>

          <div className="form-group">
            <label>{a.username}</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={a.placeholderUsername}
            />
          </div>

          <div className="form-group">
            <label>{a.password} *</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={a.placeholderPasswordMin}
              required
            />
          </div>

          <div className="form-group">
            <label>{a.confirmPassword} *</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={a.placeholderConfirmPassword}
              required
            />
          </div>

          {/* ===== 验证码输入 - 已暂时禁用 =====
          <div className="form-group">
            <label>验证码 *</label>
            <div className="code-input-group">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="请输入验证码"
                maxLength={6}
                required
              />
              <button
                type="button"
                onClick={handleSendCode}
                disabled={loading || countdown > 0}
                className="send-code-btn"
              >
                {countdown > 0 ? `${countdown}秒后重试` : '发送验证码'}
              </button>
            </div>
          </div>
          */}

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? a.registering : a.register}
          </button>
        </form>

        <div className="auth-footer">
          {a.hasAccount} <Link to="/login">{a.goLogin}</Link>
          <span className="auth-footer-sep">·</span>
          <Link to="/privacy-policy">Privacy Policy</Link>
          <span className="auth-footer-sep">·</span>
          <Link to="/terms-of-service">Terms of Service</Link>
        </div>
      </div>
    </div>
  );
}
