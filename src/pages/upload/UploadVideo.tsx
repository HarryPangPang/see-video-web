import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Toast } from 'antd-mobile';
import { publishWorkUpload } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { LoginDialog } from '../../components/LoginDialog';
import './UploadVideo.scss';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ds = Math.floor((seconds % 1) * 10);
  return m > 0 ? `${m}:${String(s).padStart(2, '0')}` : `${s}.${ds}s`;
}

function extractFrames(videoFile: File, count = 12): Promise<Array<{ blob: Blob; time: number }>> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(videoFile);
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    video.preload = 'auto';

    const results: Array<{ blob: Blob; time: number }> = [];
    let index = 0;
    let duration = 0;
    let done = false;

    const finish = () => {
      if (done) return;
      done = true;
      URL.revokeObjectURL(url);
      resolve(results);
    };

    const seekNext = () => {
      if (index >= count) { finish(); return; }
      const t = count === 1 ? 0.001 : 0.001 + (duration - 0.002) * index / (count - 1);
      video.currentTime = Math.max(0.001, Math.min(t, duration - 0.001));
    };

    const captureAndNext = () => {
      if (done) return;
      const capturedTime = video.currentTime;
      try {
        const maxW = 640, maxH = 360;
        const scale = Math.min(maxW / (video.videoWidth || 640), maxH / (video.videoHeight || 360), 1);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round((video.videoWidth || 640) * scale);
        canvas.height = Math.round((video.videoHeight || 360) * scale);
        canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          if (blob) results.push({ blob, time: capturedTime });
          index++;
          seekNext();
        }, 'image/jpeg', 0.82);
      } catch {
        index++;
        seekNext();
      }
    };

    video.addEventListener('loadedmetadata', () => {
      duration = video.duration;
      if (!isFinite(duration) || duration <= 0) { finish(); return; }
      seekNext();
    }, { once: true });

    video.addEventListener('seeked', captureAndNext);
    video.addEventListener('error', finish, { once: true });
    video.load();
  });
}

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
      canvas.width = w;
      canvas.height = h;
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.85);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

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
  const [prompt, setPrompt] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [coverBlob, setCoverBlob] = useState<Blob | null>(null);
  const [originalCoverBlob, setOriginalCoverBlob] = useState<Blob | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginVisible, setLoginVisible] = useState(false);
  const [frames, setFrames] = useState<Array<{ blob: Blob; url: string; time: number }>>([]);
  const [framesLoading, setFramesLoading] = useState(false);
  const [selectedFrameIdx, setSelectedFrameIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const frameExtractRef = useRef<{ cancelled: boolean }>({ cancelled: false });
  const frameUrlsRef = useRef<string[]>([]);
  // URLs we created ourselves (not borrowed from frame strip) — must be revoked manually
  const originalCoverUrlRef = useRef<string | null>(null);
  const coverOwnedUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      frameExtractRef.current.cancelled = true;
      frameUrlsRef.current.forEach(u => URL.revokeObjectURL(u));
      if (originalCoverUrlRef.current) URL.revokeObjectURL(originalCoverUrlRef.current);
      if (coverOwnedUrlRef.current) URL.revokeObjectURL(coverOwnedUrlRef.current);
    };
  }, []);

  const acceptFile = async (f: File) => {
    if (!f.type.startsWith('video/')) {
      Toast.show({ content: 'Please select a video file', icon: 'fail' });
      return;
    }
    setFile(f);
    setCoverBlob(null);
    setOriginalCoverBlob(null);
    setCoverPreview(null);

    // cancel any in-progress frame extraction and revoke old URLs
    frameExtractRef.current.cancelled = true;
    const cancel = { cancelled: false };
    frameExtractRef.current = cancel;
    frameUrlsRef.current.forEach(u => URL.revokeObjectURL(u));
    frameUrlsRef.current = [];
    if (originalCoverUrlRef.current) { URL.revokeObjectURL(originalCoverUrlRef.current); originalCoverUrlRef.current = null; }
    if (coverOwnedUrlRef.current) { URL.revokeObjectURL(coverOwnedUrlRef.current); coverOwnedUrlRef.current = null; }
    setFrames([]);
    setFramesLoading(true);
    setSelectedFrameIdx(null);

    const blob = await extractFirstFrame(f);
    if (blob) {
      const url = URL.createObjectURL(blob);
      originalCoverUrlRef.current = url;
      setCoverBlob(blob);
      setOriginalCoverBlob(blob);
      setCoverPreview(url);
    }

    // extract all frames in background (no await)
    extractFrames(f).then(extracted => {
      if (cancel.cancelled) return;
      const withUrls = extracted.map(fr => ({ ...fr, url: URL.createObjectURL(fr.blob) }));
      frameUrlsRef.current = withUrls.map(x => x.url);
      setFrames(withUrls);
      setFramesLoading(false);
    }).catch(() => {
      if (!cancel.cancelled) setFramesLoading(false);
    });
  };

  const handleSelectFrame = (frame: { blob: Blob; url: string }, idx: number) => {
    // Revoke any owned URL — frame URLs are borrowed and must not be revoked here
    if (coverOwnedUrlRef.current) { URL.revokeObjectURL(coverOwnedUrlRef.current); coverOwnedUrlRef.current = null; }
    setCoverBlob(frame.blob);
    setCoverPreview(frame.url);
    setSelectedFrameIdx(idx);
  };

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const blob = await resizeImage(f);
    if (blob) {
      if (coverOwnedUrlRef.current) URL.revokeObjectURL(coverOwnedUrlRef.current);
      const url = URL.createObjectURL(blob);
      coverOwnedUrlRef.current = url;
      setCoverBlob(blob);
      setCoverPreview(url);
    }
    setSelectedFrameIdx(null);
    if (coverInputRef.current) coverInputRef.current.value = '';
  };

  const handleResetCover = () => {
    if (!originalCoverBlob || !originalCoverUrlRef.current) return;
    // Revoke custom upload URL if any, then reuse the original URL (no new createObjectURL)
    if (coverOwnedUrlRef.current) { URL.revokeObjectURL(coverOwnedUrlRef.current); coverOwnedUrlRef.current = null; }
    setCoverBlob(originalCoverBlob);
    setCoverPreview(originalCoverUrlRef.current);
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
      const res = await publishWorkUpload(file, title.trim(), coverBlob ?? undefined, prompt.trim() || undefined);
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

        {/* 提示词 */}
        <div className="upload-field">
          <label className="upload-label">{p.uploadLabelPrompt}</label>
          <textarea
            className="upload-input upload-textarea"
            placeholder={p.uploadPromptPlaceholder}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            maxLength={2000}
            rows={3}
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
                    setOriginalCoverBlob(null);
                    setCoverPreview(null);
                    if (originalCoverUrlRef.current) { URL.revokeObjectURL(originalCoverUrlRef.current); originalCoverUrlRef.current = null; }
                    if (coverOwnedUrlRef.current) { URL.revokeObjectURL(coverOwnedUrlRef.current); coverOwnedUrlRef.current = null; }
                    frameUrlsRef.current.forEach(u => URL.revokeObjectURL(u));
                    frameUrlsRef.current = [];
                    setFrames([]);
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

        {/* 封面 */}
        {file && (
          <div className="upload-field">
            <label className="upload-label">{p.uploadLabelCover}</label>
            <div className="upload-cover-slot" onClick={() => coverInputRef.current?.click()}>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverChange}
                style={{ display: 'none' }}
              />
              {coverPreview ? (
                <>
                  <img className="upload-cover-img" src={coverPreview} alt="cover" />
                  <div className="upload-cover-overlay">
                    <span className="upload-cover-change-text">{p.uploadCoverChange}</span>
                  </div>
                </>
              ) : (
                <div className="upload-cover-empty">
                  <span className="upload-cover-empty-icon">🖼</span>
                  <span>{p.uploadCoverChange}</span>
                </div>
              )}
            </div>
            {/* 内联帧缩略条 */}
            {(framesLoading || frames.length > 0) && (
              <div className="frame-strip">
                <span className="frame-strip-label">{p.uploadPickFrame}</span>
                {framesLoading ? (
                  <div className="frame-strip-loading">
                    <div className="frame-strip-spinner" />
                    <span>{p.uploadFrameExtracting}</span>
                  </div>
                ) : (
                  <div className="frame-strip-scroll">
                    {frames.map((fr, i) => (
                      <button
                        key={i}
                        type="button"
                        className={`frame-strip-item${selectedFrameIdx === i ? ' frame-strip-item--active' : ''}`}
                        onClick={() => handleSelectFrame(fr, i)}
                      >
                        <img className="frame-strip-img" src={fr.url} alt={formatTime(fr.time)} />
                        <span className="frame-strip-time">{formatTime(fr.time)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {coverBlob !== originalCoverBlob && originalCoverBlob && (
              <button
                type="button"
                className="upload-cover-reset"
                onClick={handleResetCover}
              >
                {p.uploadCoverReset}
              </button>
            )}
          </div>
        )}

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
