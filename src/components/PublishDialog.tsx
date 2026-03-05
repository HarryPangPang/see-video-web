import React, { useState, useEffect, useRef } from 'react';
import { Toast } from 'antd-mobile';
import { publishWork } from '../services/api';
import './PublishDialog.scss';

function resizeImage(file: File, maxW = 1280, maxH = 720): Promise<Blob | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(maxW / img.width, maxH / img.height, 1);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.85);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

interface PublishDialogProps {
  visible: boolean;
  onClose: () => void;
  videoId: string;
  defaultTitle?: string;
  defaultCoverUrl?: string;
  videoUrl?: string;
  onSuccess?: () => void;
}

export function PublishDialog({ visible, onClose, videoId, defaultTitle = '', defaultCoverUrl, videoUrl, onSuccess }: PublishDialogProps) {
  const [title, setTitle] = useState(defaultTitle);
  const [loading, setLoading] = useState(false);
  const [coverBlob, setCoverBlob] = useState<Blob | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [videoPickerVisible, setVideoPickerVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const dialogVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (visible) {
      setTitle(defaultTitle);
      setCoverBlob(null);
      setCoverPreview(null);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [visible, defaultTitle]);

  // 清理 blob URL
  useEffect(() => {
    return () => { if (coverPreview) URL.revokeObjectURL(coverPreview); };
  }, [coverPreview]);

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const blob = await resizeImage(f);
    if (blob) {
      if (coverPreview) URL.revokeObjectURL(coverPreview);
      setCoverBlob(blob);
      setCoverPreview(URL.createObjectURL(blob));
    }
    if (coverInputRef.current) coverInputRef.current.value = '';
  };

  const handleResetCover = () => {
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverBlob(null);
    setCoverPreview(null);
  };

  const closeVideoPicker = () => {
    if (dialogVideoRef.current) {
      dialogVideoRef.current.pause();
      dialogVideoRef.current.src = '';
      dialogVideoRef.current.load();
    }
    setVideoPickerVisible(false);
  };

  const captureCurrentFrame = () => {
    const video = dialogVideoRef.current;
    if (!video) return;
    video.pause();
    const canvas = document.createElement('canvas');
    const maxW = 1280, maxH = 720;
    const scale = Math.min(maxW / (video.videoWidth || 640), maxH / (video.videoHeight || 360), 1);
    canvas.width = Math.round((video.videoWidth || 640) * scale);
    canvas.height = Math.round((video.videoHeight || 360) * scale);
    canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (!blob) return;
      if (coverPreview) URL.revokeObjectURL(coverPreview);
      setCoverBlob(blob);
      setCoverPreview(URL.createObjectURL(blob));
      closeVideoPicker();
    }, 'image/jpeg', 0.85);
  };

  const currentCoverSrc = coverPreview ?? defaultCoverUrl ?? null;
  const coverChanged = !!coverBlob;

  const handleSubmit = async () => {
    const t = title.trim();
    if (!t) {
      Toast.show({ content: '请输入作品标题', icon: 'fail' });
      return;
    }
    setLoading(true);
    try {
      await publishWork(videoId, t, coverBlob ?? undefined);
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
    <>
      <div className="pd-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="pd-card">
          <div className="pd-glow" />
          <div className="pd-header">
            <div className="pd-icon">✦</div>
            <h2 className="pd-title">发布到广场</h2>
            <p className="pd-subtitle">分享你的 AI 创作，让更多人看见</p>
          </div>

          <div className="pd-body">
            {/* 封面 */}
            {(defaultCoverUrl || coverBlob) && (
              <div className="pd-cover-section">
                <label className="pd-label">封面图</label>
                <input
                  ref={coverInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleCoverChange}
                />
                <div className="pd-cover-slot" onClick={() => coverInputRef.current?.click()}>
                  {currentCoverSrc ? (
                    <>
                      <img className="pd-cover-img" src={currentCoverSrc} alt="cover" />
                      <div className="pd-cover-overlay">
                        <span className="pd-cover-change-text">点击更换封面</span>
                      </div>
                    </>
                  ) : (
                    <div className="pd-cover-empty">
                      <span>🖼</span>
                      <span>点击上传封面</span>
                    </div>
                  )}
                </div>
                {(videoUrl || coverChanged) && (
                  <div className="pd-cover-actions">
                    {videoUrl && (
                      <button type="button" className="pd-capture-btn" onClick={() => setVideoPickerVisible(true)}>
                        🎬 从视频截取
                      </button>
                    )}
                    {coverChanged && (
                      <button type="button" className="pd-cover-reset" onClick={handleResetCover}>
                        恢复原始封面
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 标题 */}
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

      {videoPickerVisible && videoUrl && (
        <div className="pd-vp-overlay" onClick={closeVideoPicker}>
          <div className="pd-vp-dialog" onClick={e => e.stopPropagation()}>
            <div className="pd-vp-header">
              <span className="pd-vp-title">从视频截取封面</span>
              <button type="button" className="pd-vp-close" onClick={closeVideoPicker}>✕</button>
            </div>
            <video
              ref={dialogVideoRef}
              className="pd-vp-video"
              src={videoUrl}
              controls
              playsInline
              preload="metadata"
            />
            <div className="pd-vp-actions">
              <button type="button" className="pd-vp-cancel-btn" onClick={closeVideoPicker}>取消</button>
              <button type="button" className="pd-vp-capture-btn" onClick={captureCurrentFrame}>截取当前帧</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
