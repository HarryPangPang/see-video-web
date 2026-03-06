import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getNotifications,
  getNotificationUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  type NotificationItem,
  type NotificationType,
} from '../services/api';
import { useI18n } from '../context/I18nContext';
import { IconBell } from './Icons';
import './NotificationsPanel.scss';

const fullUrl = (url: string) => (url?.startsWith('http') ? url : `${window.location.origin}${url || ''}`);

const TABS: { key: NotificationType | 'all'; labelKey: string }[] = [
  { key: 'like', labelKey: 'notificationTabLikes' },
  { key: 'comment', labelKey: 'notificationTabComments' },
  { key: 'follow', labelKey: 'notificationTabFollowers' },
];

function formatTime(ts: number) {
  const d = new Date(ts);
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return d.toLocaleDateString();
}

function messageFor(n: NotificationItem): string {
  const name = n.actor_username || `User ${n.actor_id}`;
  if (n.type === 'like') return `${name} liked your video${n.work_title ? ` "${n.work_title}"` : ''}`;
  if (n.type === 'comment') return n.extra ? `${name} commented: ${n.extra.slice(0, 60)}${n.extra.length > 60 ? '…' : ''}` : `${name} commented on your video`;
  if (n.type === 'follow') return `${name} followed you`;
  return '';
}

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  /** 标记已读后调用，用于刷新铃铛上的未读数 */
  onMarkedRead?: () => void;
}

export function NotificationsPanel({ isOpen, onClose, anchorRef, onMarkedRead }: NotificationsPanelProps) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const layout = t.seedance.layout;
  const [tab, setTab] = useState<NotificationType | 'all'>('all');
  const [list, setList] = useState<NotificationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchList = async () => {
    if (!isOpen) return;
    setLoading(true);
    try {
      const type = tab === 'all' ? undefined : tab;
      const res = await getNotifications(type, 30, 0);
      if (res.success && res.data) {
        setList(res.data.list);
        setTotal(res.data.total);
      }
    } catch {
      setList([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  const fetchUnread = async () => {
    try {
      const res = await getNotificationUnreadCount();
      if (res.success && res.data) setUnreadCount(res.data.count);
    } catch {
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchList();
      fetchUnread();
    }
  }, [isOpen, tab]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        isOpen &&
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, anchorRef]);

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead(tab === 'all' ? undefined : tab);
      fetchList();
      fetchUnread();
      onMarkedRead?.();
    } catch {
      // ignore
    }
  };

  const handleItemClick = async (n: NotificationItem) => {
    if (!n.read) {
      try {
        await markNotificationRead(n.id);
        setList((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: 1 } : x)));
        setUnreadCount((c) => Math.max(0, c - 1));
        onMarkedRead?.();
      } catch {
        // ignore
      }
    }
    onClose();
    if (n.type === 'follow') {
      navigate(`/profile/${n.actor_id}`);
    } else if (n.related_id) {
      navigate(`/works/${n.related_id}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="notifications-panel" ref={panelRef}>
      <div className="notifications-panel-header">
        <h2 className="notifications-panel-title">{layout.notifications}</h2>
        {total > 0 && list.some((n) => !n.read) && (
          <button type="button" className="notifications-panel-mark-all" onClick={handleMarkAllRead}>
            {layout.notificationMarkAllRead}
          </button>
        )}
      </div>
      <div className="notifications-panel-tabs">
        <button
          type="button"
          className={`notifications-panel-tab ${tab === 'all' ? 'active' : ''}`}
          onClick={() => setTab('all')}
        >
          All
        </button>
        {TABS.map(({ key, labelKey }) => (
          <button
            key={key}
            type="button"
            className={`notifications-panel-tab ${tab === key ? 'active' : ''}`}
            onClick={() => setTab(key)}
          >
            {(layout as Record<string, string>)[labelKey] || key}
          </button>
        ))}
      </div>
      <div className="notifications-panel-body">
        {loading ? (
          <div className="notifications-panel-loading">Loading…</div>
        ) : list.length === 0 ? (
          <div className="notifications-panel-empty">
            <p>{layout.notificationEmpty}</p>
          </div>
        ) : (
          <ul className="notifications-panel-list">
            {list.map((n) => (
              <li
                key={n.id}
                className={`notifications-panel-item ${n.read ? 'read' : ''}`}
                onClick={() => handleItemClick(n)}
              >
                <div
                  className="notifications-panel-item-avatar"
                  style={n.actor_avatar ? { backgroundImage: `url(${fullUrl(n.actor_avatar)})` } : undefined}
                >
                  {!n.actor_avatar && (n.actor_username?.[0]?.toUpperCase() || '?')}
                </div>
                <div className="notifications-panel-item-content">
                  <p className="notifications-panel-item-text">{messageFor(n)}</p>
                  <span className="notifications-panel-item-time">{formatTime(n.created_at)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

interface NotificationBellProps {
  onClick: () => void;
  isOpen: boolean;
  /** 未读数量，由父组件传入并在标记已读后刷新 */
  unreadCount?: number;
}

export const NotificationBell = React.forwardRef<HTMLButtonElement, NotificationBellProps>(
  function NotificationBell({ onClick, isOpen, unreadCount = 0 }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        className={`notifications-bell ${isOpen ? 'active' : ''}`}
        onClick={onClick}
        aria-label="Notifications"
      >
        <IconBell className="notifications-bell-icon" />
        {unreadCount > 0 && (
          <span className="notifications-bell-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>
    );
  }
);
