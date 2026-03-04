import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Input, Toast } from 'antd-mobile';
import {
  IconGenerate,
  IconFolder,
  IconGrid,
  IconArrowUp,
  IconUser,
} from '../components/Icons';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { Credits } from '../components/Credits';
import { LoginDialog } from '../components/LoginDialog';
import dazeitLogo from '../assets/logo.png';
import './MainLayout.scss';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, updateProfile, changePassword } = useAuth();
  const { t, language, setLanguage } = useI18n();
  const layout = t.seedance.layout;
  const authT = t.seedance.auth;
  const c = t.common;
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [loginDialogVisible, setLoginDialogVisible] = useState(false);
  const [profileDialogVisible, setProfileDialogVisible] = useState(false);
  const [profileNickname, setProfileNickname] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profilePasswordCurrent, setProfilePasswordCurrent] = useState('');
  const [profilePasswordNew, setProfilePasswordNew] = useState('');
  const [profilePasswordConfirm, setProfilePasswordConfirm] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const openProfileDialog = () => {
    setProfileNickname(user?.username || user?.email?.split('@')[0] || '');
    setProfilePasswordCurrent('');
    setProfilePasswordNew('');
    setProfilePasswordConfirm('');
    setProfileDialogVisible(true);
    setIsUserMenuOpen(false);
  };

  const handlePasswordChange = async () => {
    if (!profilePasswordNew || profilePasswordNew !== profilePasswordConfirm) {
      Toast.show({ icon: 'fail', content: authT.errorPasswordMismatch });
      return;
    }
    if (profilePasswordNew.length < 6) {
      Toast.show({ icon: 'fail', content: authT.errorPasswordLength });
      return;
    }
    setPasswordSaving(true);
    try {
      await changePassword(profilePasswordCurrent, profilePasswordNew);
      Toast.show({ icon: 'success', content: layout.passwordChanged });
      setProfilePasswordCurrent('');
      setProfilePasswordNew('');
      setProfilePasswordConfirm('');
    } catch (e) {
      Toast.show({ icon: 'fail', content: (e as Error).message });
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleProfileSave = async () => {
    const name = profileNickname.trim();
    if (!name) {
      Toast.show({ icon: 'fail', content: layout.nicknamePlaceholder });
      return;
    }
    setProfileSaving(true);
    try {
      await updateProfile(name);
      Toast.show({ icon: 'success', content: layout.profileUpdated });
      setProfileDialogVisible(false);
    } catch (e) {
      Toast.show({ icon: 'fail', content: (e as Error).message });
    } finally {
      setProfileSaving(false);
    }
  };

  const menuItems = [
    { id: 'generate', label: layout.navGenerate, icon: IconGenerate, path: '/canvas' },
    { id: 'plaza', label: layout.navPlaza, icon: IconGrid, path: '/' },
    { id: 'assets', label: layout.navAssets, icon: IconFolder, path: '/assets' },
    { id: 'upload', label: layout.navUpload, icon: IconArrowUp, path: '/upload' },
    { id: 'my', label: layout.navMy, icon: IconUser, path: '/my' },
  ];

  const isPathActive = (path: string) =>
    location.pathname === path || (path === '/' && location.pathname === '/');

  return (
    <div className="main-layout seedance-layout">
      <LoginDialog
        visible={loginDialogVisible}
        onClose={() => setLoginDialogVisible(false)}
      />
      {profileDialogVisible && (
        <div className="profile-dialog-overlay" onClick={() => setProfileDialogVisible(false)}>
          <div className="profile-dialog" onClick={(e) => e.stopPropagation()}>
            <h3 className="profile-dialog-title">{layout.editProfile}</h3>
            <div className="profile-dialog-field">
              <label>{layout.emailLabel}</label>
              <div className="profile-dialog-email" aria-readonly>{user?.email ?? ''}</div>
            </div>
            <div className="profile-dialog-field">
              <label>{layout.nicknameLabel}</label>
              <Input
                value={profileNickname}
                onChange={setProfileNickname}
                placeholder={layout.nicknamePlaceholder}
                maxLength={50}
                className="profile-dialog-input"
              />
            </div>
            <div className="profile-dialog-field">
              <label>{layout.passwordSection}</label>
              {user?.isGoogleUser ? (
                <p className="profile-dialog-password-hint">{layout.googleNoPasswordHint}</p>
              ) : (
                <>
                  <Input
                    type="password"
                    value={profilePasswordCurrent}
                    onChange={setProfilePasswordCurrent}
                    placeholder={layout.currentPassword}
                    className="profile-dialog-input"
                  />
                  <Input
                    type="password"
                    value={profilePasswordNew}
                    onChange={setProfilePasswordNew}
                    placeholder={layout.newPassword}
                    className="profile-dialog-input"
                  />
                  <Input
                    type="password"
                    value={profilePasswordConfirm}
                    onChange={setProfilePasswordConfirm}
                    placeholder={layout.confirmPassword}
                    className="profile-dialog-input"
                  />
                  <button
                    type="button"
                    className="profile-dialog-password-btn"
                    disabled={passwordSaving}
                    onClick={handlePasswordChange}
                  >
                    {passwordSaving ? '...' : layout.changePassword}
                  </button>
                </>
              )}
            </div>
            <div className="profile-dialog-actions">
              <button type="button" className="profile-dialog-cancel" onClick={() => setProfileDialogVisible(false)}>{c.cancel}</button>
              <button type="button" className="profile-dialog-save" disabled={profileSaving} onClick={handleProfileSave}>{profileSaving ? '...' : layout.profileSave}</button>
            </div>
          </div>
        </div>
      )}
      <aside className="sidebar">
        <button
          type="button"
          className="sidebar-brand"
          onClick={() => navigate('/')}
          aria-label="DazeIt - 返回首页"
        >
          <span className="sidebar-logo">
            <img src={dazeitLogo} alt="" className="sidebar-logo-icon" />
          </span>
          <span className="sidebar-brand-name">DazeIt</span>
        </button>

        <nav className="sidebar-nav" aria-label="Main">
          <ul className="sidebar-menu">
            {menuItems.map((item) => {
              const isActive = isPathActive(item.path);
              const Icon = item.icon;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => navigate(item.path)}
                    className={`sidebar-menu-btn ${item.id === 'generate' ? 'sidebar-menu-btn--primary' : ''} ${isActive ? 'is-active' : ''}`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span className="sidebar-menu-icon">
                      <Icon />
                    </span>
                    <span className="sidebar-menu-label">{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <Credits />

          <div className="sidebar-user" ref={userMenuRef}>
            {user ? (
              <>
                <button
                  type="button"
                  className="sidebar-user-trigger"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  aria-expanded={isUserMenuOpen}
                >
                  <span className="sidebar-user-avatar">{user.email?.[0]?.toUpperCase()}</span>
                  <span className="sidebar-user-membership">{user.username || user.email?.split('@')[0]}</span>
                </button>
                {isUserMenuOpen && (
                  <div className="sidebar-user-dropdown">
                    <div className="sidebar-user-dropdown-head">
                      <span className="sidebar-user-avatar sidebar-user-avatar--lg">{user.email?.[0]?.toUpperCase()}</span>
                      <div className="sidebar-user-dropdown-info">
                        <span className="sidebar-user-dropdown-name">{user.username || user.email?.split('@')[0]}</span>
                        <span className="sidebar-user-dropdown-email">{user.email}</span>
                      </div>
                    </div>
                    <div className="sidebar-user-dropdown-divider" />
                    <button type="button" className="sidebar-user-dropdown-item" onClick={openProfileDialog}>
                      {layout.editProfile}
                    </button>
                    <button type="button" className="sidebar-user-dropdown-item sidebar-user-dropdown-item--danger" onClick={handleLogout}>
                      {layout.logout}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <button
                type="button"
                className="sidebar-login-btn"
                onClick={() => setLoginDialogVisible(true)}
              >
                <span className="sidebar-login-icon">👤</span>
                <span className="sidebar-login-text">{layout.login}</span>
              </button>
            )}
          </div>



          <div className="sidebar-lang" role="group" aria-label="Language">
            <button
              type="button"
              className={`sidebar-lang-btn ${language === 'en-US' ? 'is-active' : ''}`}
              onClick={() => setLanguage('en-US')}
              aria-pressed={language === 'en-US'}
            >
              EN
            </button>
            <button
              type="button"
              className={`sidebar-lang-btn ${language === 'zh-CN' ? 'is-active' : ''}`}
              onClick={() => setLanguage('zh-CN')}
              aria-pressed={language === 'zh-CN'}
            >
              中文
            </button>
          </div>

          <div className="sidebar-legal">
            <Link to="/privacy-policy">Privacy Policy</Link>
            <span className="sidebar-legal-sep">·</span>
            <Link to="/terms-of-service">Terms of Service</Link>
          </div>
        </div>
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
