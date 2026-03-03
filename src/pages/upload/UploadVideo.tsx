import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Toast } from 'antd-mobile';
import { publishWorkUpload } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { LoginDialog } from '../../components/LoginDialog';
import './UploadVideo.scss';

function extractFirstFrame(videoFile: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(videoFile);
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    const cleanup = () => URL.revokeObjectURL(url);
    video.addEventListener('loadedmetadata', () => { video.currentTime = 0.001; }, { once: true });
    video.addEventListener('seeked', () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 360;
        canvas.getContext('2d')!.drawImage(video, 0, 0);
        cleanup();
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.85);
      } catch {
        cleanup();
        resolve(null);
      }
    }, { once: true });
    video.addEventListener('error', () => { cleanup(); resolve(null); }, { once: true });
    video.load();
  });
}

export function UploadVideo() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();
  const p = t.seedance.pages;
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [coverBlob, setCoverBlob] = useState<Blob | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginVisible, setLoginVisible] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => { if (coverPreview) URL.revokeObjectURL(coverPreview); };
  }, [coverPreview]);

  const acceptFile = async (f: File) => {
    if (!f.type.startsWith('video/')) {
      Toast.show({ content: 'Please select a video file', icon: 'fail' });
      return;
    }
    setFile(f);
    setCoverBlob(null);
    setCoverPreview(null);
    const blob = await extractFirstFrame(f);
    if (blob) {
      setCoverBlob(blob);
      setCoverPreview(URL.createObjectURL(blob));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) acceptFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) acceptFile(f);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const handleSubmit = async () => {
    if (!user) { setLoginVisible(true); return; }
    if (!title.trim()) {
      Toast.show({ content: p.uploadLabelTitle, icon: 'fail' });
      return;
    }
    if (!file) {
      Toast.show({ content: p.uploadLabelFile, icon: 'fail' });
      return;
    }
    setLoading(true);
    try {
      const res = await publishWorkUpload(file, title.trim(), coverBlob ?? undefined);
      Toast.show({ content: p.uploadSuccess, icon: 'success' });
      navigate(res.data?.id ? `/works/${res.data.id}` : '/plaza');
    } catch (e) {
      Toast.show({ content: (e as Error).message, icon: 'fail' });
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = !!title.trim() && !!file && !loading;

  return (
    <div className="upload-page">
      <LoginDialog visible={loginVisible} onClose={() => setLoginVisible(false)} />

      <div className="upload-bg" />

      <div className="upload-header">
        <h1 className="upload-title">{p.uploadVideoTitle}</h1>
        <p className="upload-desc">{p.uploadVideoDesc}</p>
      </div>

      <div className="upload-form">
        {/* 标题 */}
        <div className="upload-field">
          <label className="upload-label">{p.uploadLabelTitle}</label>
          <input
            className="upload-input"
            type="text"
            placeholder={p.uploadTitlePlaceholder}
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={100}
          />
        </div>

        {/* 文件上传区 */}
        <div className="upload-field">
          <label className="upload-label">{p.uploadLabelFile}</label>
          <div
            className={`upload-dropzone${dragging ? ' upload-dropzone--active' : ''}${file ? ' upload-dropzone--has-file' : ''}`}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            {file ? (
              <div className="upload-file-info">
                {coverPreview ? (
                  <img className="upload-file-thumb" src={coverPreview} alt="cover" />
                ) : (
                  <span className="upload-file-icon">🎬</span>
                )}
                <div className="upload-file-meta">
                  <span className="upload-file-name">{file.name}</span>
                  <span className="upload-file-size">{formatSize(file.size)}</span>
                </div>
                <button
                  type="button"
                  className="upload-file-remove"
                  onClick={e => {
                    e.stopPropagation();
                    setFile(null);
                    setCoverBlob(null);
                    if (coverPreview) { URL.revokeObjectURL(coverPreview); setCoverPreview(null); }
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="upload-dropzone-hint">
                <span className="upload-dropzone-icon">☁</span>
                <span className="upload-dropzone-text">{p.uploadDropHint}</span>
                <span className="upload-dropzone-types">{p.uploadFileTypes}</span>
              </div>
            )}
          </div>
        </div>

        {/* 提交按钮 */}
        <button
          type="button"
          className={`upload-submit-btn${!canSubmit ? ' upload-submit-btn--disabled' : ''}`}
          onClick={handleSubmit}
          disabled={!canSubmit}
        >
          {loading ? p.uploadSubmitting : p.uploadSubmitBtn}
        </button>
      </div>
    </div>
  );
}
