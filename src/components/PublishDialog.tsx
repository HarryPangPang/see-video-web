import React, { useState, useEffect, useRef } from 'react';
import { Toast } from 'antd-mobile';
import { publishWork } from '../services/api';
import './PublishDialog.scss';

interface PublishDialogProps {
  visible: boolean;
  onClose: () => void;
  videoId: string;
  defaultTitle?: string;
  onSuccess?: () => void;
}

export function PublishDialog({ visible, onClose, videoId, defaultTitle = '', onSuccess }: PublishDialogProps) {
  const [title, setTitle] = useState(defaultTitle);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (visible) {
      setTitle(defaultTitle);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [visible, defaultTitle]);

  const handleSubmit = async () => {
    const t = title.trim();
    if (!t) {
      Toast.show({ content: '请输入作品标题', icon: 'fail' });
      return;
    }
    setLoading(true);
    try {
      await publishWork(videoId, t);
      Toast.show({ content: '发布成功！已上架广场 ✨', icon: 'success' });
      onClose();
      setTitle('');
      onSuccess?.();
    } catch (e) {
      Toast.show({ content: (e as Error).message, icon: 'fail' });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) handleSubmit();
    if (e.key === 'Escape') onClose();
  };

  if (!visible) return null;

  return (
    <div className="pd-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="pd-card">
        <div className="pd-glow" />
        <div className="pd-header">
          <div className="pd-icon">✦</div>
          <h2 className="pd-title">发布到广场</h2>
          <p className="pd-subtitle">分享你的 AI 创作，让更多人看见</p>
        </div>

        <div className="pd-body">
          <label className="pd-label">作品标题</label>
          <div className="pd-input-wrap">
            <input
              ref={inputRef}
              className="pd-input"
              placeholder="给你的作品起个名字..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              maxLength={100}
            />
            <span className="pd-input-count">{title.length}/100</span>
          </div>
        </div>

        <div className="pd-footer">
          <button className="pd-btn-cancel" onClick={onClose} disabled={loading}>
            取消
          </button>
          <button
            className="pd-btn-submit"
            onClick={handleSubmit}
            disabled={loading || !title.trim()}
          >
            {loading ? (
              <span className="pd-loading-dots">
                <span /><span /><span />
              </span>
            ) : '发布 ✦'}
          </button>
        </div>

        <button className="pd-close" onClick={onClose} aria-label="关闭">✕</button>
      </div>
    </div>
  );
}
