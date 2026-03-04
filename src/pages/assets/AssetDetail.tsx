import { useState, useCallback } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { useI18n } from '../../context/I18nContext';
import type { VideoAsset } from './Assets';
import './AssetDetail.scss';

function buildImageList(video: VideoAsset): Array<{ url: string; label: string }> {
  const images: Array<{ url: string; label: string }> = [];
  if (video.start_frame) images.push({ url: video.start_frame, label: 'start' });
  if (video.omni_frames?.length) {
    video.omni_frames.forEach((url, i) => images.push({ url, label: `omni_${i}` }));
  }
  if (video.end_frame) images.push({ url: video.end_frame, label: 'end' });
  return images;
}

function getVideoUrl(video: VideoAsset): string | undefined {
  return video.video_local_path
    ? `${window.location.origin}${video.video_local_path}`
    : video.video_url;
}

function getCoverUrl(video: VideoAsset): string | undefined {
  return video.cover_local_path
    ? `${window.location.origin}${video.cover_local_path}`
    : video.cover_url ?? undefined;
}

function formatDuration(video: VideoAsset): string {
  if (!video.duration) return '—';
  const s = parseInt(video.duration, 10);
  if (isNaN(s)) return video.duration;
  return `${s}`;
}

function formatDate(ts?: number): string {
  if (!ts) return '—';
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function AssetDetail() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const { t } = useI18n();
  const d = t.seedance.assetDetail;

  const video: VideoAsset | undefined = (location.state as any)?.video;

  const [imgIndex, setImgIndex] = useState(0);
  const [fading, setFading] = useState(false);

  const switchTo = useCallback((next: number) => {
    setFading(true);
    setTimeout(() => {
      setImgIndex(next);
      setFading(false);
    }, 160);
  }, []);

  if (!video || video.id !== id) {
    return (
      <div className="asset-detail-page">
        <div className="asset-detail-back-wrap">
          <button type="button" className="asset-detail-back" onClick={() => navigate('/assets')}>
            {d.back}
          </button>
        </div>
        <div className="asset-detail-not-found">Asset not found.</div>
      </div>
    );
  }

  const images = buildImageList(video);
  const videoUrl = getVideoUrl(video);
  const coverUrl = getCoverUrl(video);
  const hasCover = !!(video.cover_local_path || video.cover_url);

  const prevImg = () => { if (imgIndex > 0) switchTo(imgIndex - 1); };
  const nextImg = () => { if (imgIndex < images.length - 1) switchTo(imgIndex + 1); };

  function getImageLabel(label: string, index: number): string {
    if (label === 'start') return d.startFrame;
    if (label === 'end') return d.endFrame;
    return d.referenceFrame.replace('{index}', String(index + 1));
  }

  return (
    <div className="asset-detail-page">
      <div className="asset-detail-back-wrap">
        <button type="button" className="asset-detail-back" onClick={() => navigate('/assets')}>
          {d.back}
        </button>
      </div>

      <div className="asset-detail-body">
        {/* ── Left: image gallery ── */}
        <div className="asset-detail-left">
          <div className="asset-detail-gallery">
            {images.length > 0 ? (
              <>
                <div className="asset-detail-img-wrap">
                  <img
                    className={`asset-detail-img${fading ? ' asset-detail-img--fading' : ''}`}
                    src={images[imgIndex].url}
                    alt={getImageLabel(images[imgIndex].label, imgIndex)}
                  />
                  <span className="asset-detail-img-label">
                    {getImageLabel(images[imgIndex].label, imgIndex)}
                  </span>

                  {images.length > 1 && (
                    <>
                      <div
                        className={`asset-detail-nav asset-detail-nav--prev${imgIndex === 0 ? ' asset-detail-nav--disabled' : ''}`}
                        onClick={prevImg}
                      />
                      <div
                        className={`asset-detail-nav asset-detail-nav--next${imgIndex === images.length - 1 ? ' asset-detail-nav--disabled' : ''}`}
                        onClick={nextImg}
                      />
                    </>
                  )}
                </div>

                {images.length > 1 && (
                  <div className="asset-detail-dots">
                    {images.map((img, i) => (
                      <button
                        key={img.label}
                        type="button"
                        className={`asset-detail-dot${i === imgIndex ? ' asset-detail-dot--active' : ''}`}
                        onClick={() => i !== imgIndex && switchTo(i)}
                      />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="asset-detail-no-imgs">
                {hasCover && coverUrl ? (
                  <img className="asset-detail-img" src={coverUrl} alt="cover" />
                ) : (
                  <div className="asset-detail-no-imgs-text">{d.noImages}</div>
                )}
              </div>
            )}
          </div>

          {/* Video preview link */}
          {videoUrl && (
            <a
              className="asset-detail-video-btn"
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              ▶ {d.watchVideo}
            </a>
          )}
        </div>

        {/* ── Right: info ── */}
        <div className="asset-detail-right">
          {/* Prompt */}
          <div className="asset-detail-section">
            <div className="asset-detail-label">
              {d.prompt}
              {video.error_message ? (
                <span className="asset-detail-badge asset-detail-badge--fail">{d.failed}</span>
              ) : !hasCover ? (
                <span className="asset-detail-badge asset-detail-badge--generating">{d.generating}</span>
              ) : null}
            </div>
            <div className="asset-detail-prompt">
              {video.prompt || <span className="asset-detail-muted">{d.noPrompt}</span>}
            </div>
          </div>

          {/* Meta bar */}
          <div className="asset-detail-meta-bar">
            <div className="asset-detail-meta-chip">
              <span className="asset-detail-chip-label">{d.model}</span>
              <span className="asset-detail-chip-value">{video.model || '—'}</span>
            </div>
            <span className="asset-detail-meta-sep" />
            <div className="asset-detail-meta-chip">
              <span className="asset-detail-chip-label">{d.duration}</span>
              <span className="asset-detail-chip-value">
                {formatDuration(video)}{video.duration ? ` ${d.seconds}` : ''}
              </span>
            </div>
            <span className="asset-detail-meta-sep" />
            <div className="asset-detail-meta-chip">
              <span className="asset-detail-chip-label">{d.ratio}</span>
              <span className="asset-detail-chip-value">{video.ratio || '—'}</span>
            </div>
          </div>
          <div className="asset-detail-created">{formatDate(video.created_at)}</div>

          {/* Error */}
          {video.error_message && (
            <div className="asset-detail-error">{video.error_message}</div>
          )}
        </div>
      </div>
    </div>
  );
}
