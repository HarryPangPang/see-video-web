import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { buildGoogleRedirectUrl } from '../../utils/googleAuth';
import './auth.scss';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export function Login() {
  const navigate = useNavigate();
  const { login, loginWithGoogle } = useAuth();
  const { t } = useI18n();
  const a = t.seedance.auth;
  // const { login, loginWithCode, sendVerificationCode } = useAuth(); // 完整版本

  // const [mode, setMode] = useState<'password' | 'code'>('password'); // 验证码登录已禁用
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // const [code, setCode] = useState(''); // 验证码登录已禁用
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // const [countdown, setCountdown] = useState(0); // 验证码登录已禁用

  /* ===== 验证码发送功能 - 已暂时禁用 =====
  const handleSendCode = async () => {
    if (!email) {
      setError('请输入邮箱');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await sendVerificationCode(email, 'login');

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
      await loginWithGoogle(credential);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 密码登录
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError(a.errorFill);
      return;
    }

    try {
      setLoading(true);
      setError('');
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ===== 验证码登录功能 - 已暂时禁用 =====
  const handleCodeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !code) {
      setError('请填写完整信息');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await loginWithCode(email, code);
      navigate('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  */

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h1>{a.loginTitle}</h1>

        {/* ===== 登录模式切换 - 已暂时禁用 =====
        <div className="auth-mode-tabs">
          <button
            className={mode === 'password' ? 'active' : ''}
            onClick={() => setMode('password')}
          >
            密码登录
          </button>
          <button
            className={mode === 'code' ? 'active' : ''}
            onClick={() => setMode('code')}
          >
            验证码登录
          </button>
        </div>
        */}

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
            <span>{a.orEmail}</span>
          </div>
        )}

        <form onSubmit={handlePasswordLogin}>
          <div className="form-group">
            <label>{a.email}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={a.placeholderEmail}
              required
            />
          </div>

          <div className="form-group">
            <label>{a.password}</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={a.placeholderPassword}
              required
            />
          </div>

          {/* ===== 验证码输入 - 已暂时禁用 =====
          {mode === 'code' && (
            <div className="form-group">
              <label>验证码</label>
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
          )}
          */}

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? a.loggingIn : a.login}
          </button>
        </form>

        <div className="auth-footer">
          {a.noAccount} <Link to="/register">{a.goRegister}</Link>
          <span className="auth-footer-sep">·</span>
          <Link to="/privacy-policy">Privacy Policy</Link>
          <span className="auth-footer-sep">·</span>
          <Link to="/terms-of-service">Terms of Service</Link>
        </div>
      </div>
    </div>
  );
}
