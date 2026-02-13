import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  IconHome,
  IconGenerate,
  IconFolder,
  IconGrid,
  IconBell,
  IconMessage,
  IconApi,
  IconMenu,
} from '../components/Icons';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/I18nContext';
import { Credits } from '../components/Credits';
import './MainLayout.scss';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { t, language, setLanguage } = useI18n();
  const layout = t.seedance.layout;
  const c = t.common;
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
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

  const menuItems = [
    // { id: 'inspire', label: layout.navInspire, icon: IconHome, path: '/inspire' },
    { id: 'generate', label: layout.navGenerate, icon: IconGenerate, path: '/' },
    { id: 'assets', label: layout.navAssets, icon: IconFolder, path: '/assets' },
    // { id: 'canvas', label: layout.navCanvas, icon: IconGrid, path: '/canvas' },
  ];

  const isPathActive = (path: string) =>
    location.pathname === path || (path === '/' && location.pathname === '/');

  return (
    <div className="main-layout seedance-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <button type="button" className="sidebar-logo" onClick={() => navigate('/')} aria-label="SeeLit">
            <span className="sidebar-logo-icon" />
          </button>
          <span className="sidebar-brand-name">SeeLit</span>
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

        <div className="sidebar-footer">
          <Credits />

          <div className="sidebar-user" ref={userMenuRef}>
            <button
              type="button"
              className="sidebar-user-trigger"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              aria-expanded={isUserMenuOpen}
            >
              <span className="sidebar-user-avatar">{user?.email?.[0]?.toUpperCase() || 'U'}</span>
              <span className="sidebar-user-membership">{user?.username || user?.email?.split('@')[0] || c.user}</span>
            </button>
            {isUserMenuOpen && (
              <div className="sidebar-user-dropdown">
                <div className="sidebar-user-dropdown-head">
                  <span className="sidebar-user-avatar sidebar-user-avatar--lg">{user?.email?.[0]?.toUpperCase()}</span>
                  <div className="sidebar-user-dropdown-info">
                    <span className="sidebar-user-dropdown-name">{user?.username || user?.email?.split('@')[0] || '用户'}</span>
                    <span className="sidebar-user-dropdown-email">{user?.email}</span>
                  </div>
                </div>
                <div className="sidebar-user-dropdown-divider" />
                <button type="button" className="sidebar-user-dropdown-item sidebar-user-dropdown-item--danger" onClick={handleLogout}>
                  {layout.logout}
                </button>
              </div>
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
        </div>
      </aside>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
