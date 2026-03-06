import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Input, TextArea, Toast } from 'antd-mobile';
import {
  IconGenerate,
  IconFolder,
  IconGrid,
  IconArrowUp,
  IconUser,
  IconShare,
} from '../components/Icons';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { LayoutProvider } from '../context/LayoutContext';
import { Credits } from '../components/Credits';
import { LoginDialog } from '../components/LoginDialog';
import { NotificationBell, NotificationsPanel } from '../components/NotificationsPanel';
import { getNotificationUnreadCount } from '../services/api';
import dazeitLogo from '../assets/logo.png';
import './MainLayout.scss';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, updateProfile, uploadAvatar, removeAvatar, changePassword } = useAuth();
  const { t } = useI18n();
  const layout = t.seedance.layout;
  const authT = t.seedance.auth;
  const c = t.common;
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [loginDialogVisible, setLoginDialogVisible] = useState(false);
  const [profileDialogVisible, setProfileDialogVisible] = useState(false);
  const [profileNickname, setProfileNickname] = useState('');
  const [profileBio, setProfileBio] = useState('');
  const [profileLocation, setProfileLocation] = useState('');
  const [profileWebsite, setProfileWebsite] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profilePasswordCurrent, setProfilePasswordCurrent] = useState('');
  const [profilePasswordNew, setProfilePasswordNew] = useState('');
  const [profilePasswordConfirm, setProfilePasswordConfirm] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [pendingAvatar, setPendingAvatar] = useState<File | 'reset' | null>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationBellRef = useRef<HTMLButtonElement>(null);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);

  const fetchNotificationUnreadCount = React.useCallback(async () => {
    try {
      const res = await getNotificationUnreadCount();
      if (res.success && res.data) setNotificationUnreadCount(res.data.count);
    } catch {
      setNotificationUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchNotificationUnreadCount();
    const interval = setInterval(fetchNotificationUnreadCount, 60000);
    return () => clearInterval(interval);
  }, [user, fetchNotificationUnreadCount]);

  const fullUrl = (path: string) => (path?.startsWith('http') ? path : `${window.location.origin}${path || ''}`);

  // 待提交为新文件时的预览 URL，变更时 revoke 旧 URL
  const pendingPreviewUrl = React.useMemo(
    () => (pendingAvatar instanceof File ? URL.createObjectURL(pendingAvatar) : null),
    [pendingAvatar]
  );
  useEffect(() => {
    return () => {
      if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl);
    };
  }, [pendingPreviewUrl]);

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
    setProfileBio(user?.bio ?? '');
    setProfileLocation(user?.location ?? '');
    setProfileWebsite(user?.website ?? '');
    setProfilePasswordCurrent('');
    setProfilePasswordNew('');
    setProfilePasswordConfirm('');
    setPendingAvatar(null);
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

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      Toast.show({ icon: 'fail', content: layout.avatarFormatHint });
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      Toast.show({ icon: 'fail', content: layout.avatarSizeHint });
      return;
    }
    e.target.value = '';
    setPendingAvatar(file);
  };

  const handleResetAvatar = () => {
    if (pendingAvatar === 'reset') {
      setPendingAvatar(null);
    } else if (pendingAvatar instanceof File) {
      setPendingAvatar(null);
    } else if (user?.avatar) {
      setPendingAvatar('reset');
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
      if (pendingAvatar === 'reset') {
        await removeAvatar();
      } else if (pendingAvatar instanceof File) {
        await uploadAvatar(pendingAvatar);
      }
      await updateProfile({
        username: name,
        bio: profileBio.trim() || undefined,
        location: profileLocation.trim() || undefined,
        website: profileWebsite.trim() || undefined,
      });
      Toast.show({ icon: 'success', content: layout.profileUpdated });
      setProfileDialogVisible(false);
      setPendingAvatar(null);
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
    { id: 'referral', label: layout.navReferral, icon: IconShare, path: '/referral' },
  ];

  const isPathActive = (path: string) =>
    location.pathname === path || (path === '/' && location.pathname === '/');

  return (
    <LayoutProvider openProfileDialog={openProfileDialog}>
    <div className="main-layout seedance-layout">
      <LoginDialog
        visible={loginDialogVisible}
        onClose={() => setLoginDialogVisible(false)}
      />
      {profileDialogVisible && (
        <div className="profile-dialog-overlay" onClick={() => { setProfileDialogVisible(false); setPendingAvatar(null); }}>
          <div className="profile-dialog" onClick={(e) => e.stopPropagation()}>
            <h3 className="profile-dialog-title">{layout.editProfile}</h3>
            <div className="profile-dialog-field profile-dialog-avatar-field">
              <label>{layout.avatarLabel}</label>
              <div className="profile-dialog-avatar-wrap">
                <div className="profile-dialog-avatar-preview">
                  {pendingAvatar === 'reset' ? (
                    <span className="profile-dialog-avatar-letter">{(user?.username || user?.email)?.[0]?.toUpperCase() ?? '?'}</span>
                  ) : pendingAvatar instanceof File && pendingPreviewUrl ? (
                    <img src={pendingPreviewUrl} alt="" className="profile-dialog-avatar-img" />
                  ) : user?.avatar ? (
                    <img src={fullUrl(user.avatar)} alt="" className="profile-dialog-avatar-img" />
                  ) : (
                    <span className="profile-dialog-avatar-letter">{(user?.username || user?.email)?.[0]?.toUpperCase() ?? '?'}</span>
                  )}
                </div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="profile-dialog-avatar-input"
                  onChange={handleAvatarChange}
                />
                <div className="profile-dialog-avatar-btns">
                <button
                  type="button"
                  className="profile-dialog-avatar-btn"
                  onClick={() => avatarInputRef.current?.click()}
                >
                  {layout.changeAvatar}
                </button>
                {(user?.avatar || pendingAvatar) && (
                  <button
                    type="button"
                    className="profile-dialog-avatar-btn profile-dialog-avatar-btn--reset"
                    onClick={handleResetAvatar}
                  >
                    {layout.resetAvatar}
                  </button>
                )}
                </div>
              </div>
            </div>
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
              <label>{layout.bioLabel}</label>
              <TextArea
                value={profileBio}
                onChange={setProfileBio}
                placeholder={layout.bioPlaceholder}
                maxLength={500}
                rows={3}
                className="profile-dialog-input"
              />
            </div>
            <div className="profile-dialog-field">
              <label>{layout.locationLabel}</label>
              <Input
                value={profileLocation}
                onChange={setProfileLocation}
                placeholder={layout.locationPlaceholder}
                maxLength={200}
                className="profile-dialog-input"
              />
            </div>
            <div className="profile-dialog-field">
              <label>{layout.websiteLabel}</label>
              <Input
                value={profileWebsite}
                onChange={setProfileWebsite}
                placeholder={layout.websitePlaceholder}
                maxLength={500}
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
              <button type="button" className="profile-dialog-cancel" onClick={() => { setProfileDialogVisible(false); setPendingAvatar(null); }}>{c.cancel}</button>
              <button type="button" className="profile-dialog-save" disabled={profileSaving} onClick={handleProfileSave}>{profileSaving ? '...' : layout.profileSave}</button>
            </div>
          </div>
        </div>
      )}
      <aside className="sidebar">
        <div className="sidebar-top">
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

          <div className="sidebar-footer">
            <div className="sidebar-footer-card">
              <div className="sidebar-footer-card-credits">
                <Credits />
              </div>
              <div className="sidebar-footer-card-actions">
                {user && (
                  <div className="sidebar-notifications-wrap">
                    <NotificationBell
                      ref={notificationBellRef}
                      isOpen={notificationPanelOpen}
                      unreadCount={notificationUnreadCount}
                      onClick={() => setNotificationPanelOpen((v) => !v)}
                    />
                    <NotificationsPanel
                      isOpen={notificationPanelOpen}
                      onClose={() => setNotificationPanelOpen(false)}
                      anchorRef={notificationBellRef}
                      onMarkedRead={fetchNotificationUnreadCount}
                    />
                  </div>
                )}
                <div className="sidebar-user" ref={userMenuRef}>
              {user ? (
                <>
                  <button
                    type="button"
                    className="sidebar-user-trigger"
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    aria-expanded={isUserMenuOpen}
                  >
                    <span className="sidebar-user-avatar">
                      {user.avatar ? (
                        <img src={fullUrl(user.avatar)} alt="" className="sidebar-user-avatar-img" />
                      ) : (
                        <span className="sidebar-user-avatar-letter">{user.email?.[0]?.toUpperCase()}</span>
                      )}
                    </span>
                    <span className="sidebar-user-membership">{user.username || user.email?.split('@')[0]}</span>
                  </button>
                  {isUserMenuOpen && (
                    <div className="sidebar-user-dropdown">
                      <div className="sidebar-user-dropdown-head">
                        <span className="sidebar-user-avatar sidebar-user-avatar--lg">
                          {user.avatar ? (
                            <img src={fullUrl(user.avatar)} alt="" className="sidebar-user-avatar-img" />
                          ) : (
                            <span className="sidebar-user-avatar-letter">{user.email?.[0]?.toUpperCase()}</span>
                          )}
                        </span>
                        <div className="sidebar-user-dropdown-info">
                          <span className="sidebar-user-dropdown-name">{user.username || user.email?.split('@')[0]}</span>
                          <span className="sidebar-user-dropdown-email">{user.email}</span>
                        </div>
                      </div>
                      <div className="sidebar-user-dropdown-divider" />
                      <button type="button" className="sidebar-user-dropdown-item" onClick={() => { setIsUserMenuOpen(false); navigate('/profile'); }}>
                        {t.seedance.profile.yourProfile}
                      </button>
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
              </div>
            </div>

            <div className="sidebar-legal sidebar-legal--mobile">
              <Link to="/privacy-policy">Privacy Policy</Link>
              <span className="sidebar-legal-sep">·</span>
              <Link to="/terms-of-service">Terms of Service</Link>
            </div>
          </div>
        </div>

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
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
    </LayoutProvider>
  );
}
