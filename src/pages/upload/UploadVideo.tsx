import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Toast } from 'antd-mobile';
import { publishWorkUpload } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { LoginDialog } from '../../components/LoginDialog';
import './UploadVideo.scss';

export function UploadVideo() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useI18n();
  const p = t.seedance.pages;
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginVisible, setLoginVisible] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const acceptFile = (f: File) => {
    if (f.type.startsWith('video/')) {
      setFile(f);
    } else {
      Toast.show({ content: 'Please select a video file', icon: 'fail' });
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
      const res = await publishWorkUpload(file, title.trim());
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
                <span className="upload-file-icon">🎬</span>
                <div className="upload-file-meta">
                  <span className="upload-file-name">{file.name}</span>
                  <span className="upload-file-size">{formatSize(file.size)}</span>
                </div>
                <button
                  type="button"
                  className="upload-file-remove"
                  onClick={e => { e.stopPropagation(); setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
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
