import React, { useState, useEffect } from 'react';
import { SearchBar, Toast, DotLoading } from 'antd-mobile';
import { useI18n } from '../../context/I18nContext';
import { useAuth } from '../../context/AuthContext';
import { getVideoList, getWorksList, type WorkItem } from '../../services/api';
import { LoginDialog } from '../../components/LoginDialog';
import { PublishDialog } from '../../components/PublishDialog';
import recordLoadingVideo from '../../assets/record-loading.mp4';
import './Assets.scss';

interface QueueInfo {
  位置?: number;
  总人数?: number;
  等待分钟?: number;
  pos?: number;
  total?: number;
  wait?: number;
}

interface VideoAsset {
  id: string;
  generate_id?: string;
  duration: string;
  model: string;
  ratio: string;
  created_at: number;
  updated_at: number;
  video_local_path?: string;
  cover_local_path?: string;
  prompt?: string;
  video_url?: string;
  cover_url?: string;
  error_message?: string;
  queue_info?: QueueInfo;
}

export function Assets() {
  const { t, $l } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const p = t.seedance.pages;
  const c = t.common;
  const [filterTab, setFilterTab] = useState('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [videoList, setVideoList] = useState<VideoAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [loginDialogVisible, setLoginDialogVisible] = useState(false);
  const [publishVideo, setPublishVideo] = useState<VideoAsset | null>(null);
  const [publishWork, setPublishWork] = useState<WorkItem | null>(null);
  const [uploadList, setUploadList] = useState<WorkItem[]>([]);
  const [uploadLoading, setUploadLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      setLoginDialogVisible(true);
    }
  }, [authLoading, user]);

  // 登录后加载生成视频列表
  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      try {
        const result = await getVideoList(controller.signal);
        if (result.success && result.data?.asset_list) {
          const videos = result.data.asset_list;
          setVideoList(videos);
          Toast.show({ content: $l('seedance.toast.videoLoadSuccess').replace('{count}', videos.length.toString()) });
        } else {
          Toast.show({ content: $l('seedance.toast.videoLoadFailed'), icon: 'fail' });
        }
      } catch (err: any) {
        if ((err as Error).name === 'AbortError') return;
        console.error('[Assets] 获取视频列表错误:', err);
        Toast.show({ content: err.message || $l('seedance.toast.networkError'), icon: 'fail' });
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => controller.abort();
  }, [user]);

  // 登录后加载上传列表（所有视频和我的上传 tab 都需要）
  useEffect(() => {
    if (!user) return;
    setUploadLoading(true);
    getWorksList({ mine: true, source: 'upload', limit: 100 })
      .then(res => { if (res.data) setUploadList(res.data.list); })
      .catch(err => Toast.show({ content: err.message, icon: 'fail' }))
      .finally(() => setUploadLoading(false));
  }, [user]);

  const fullUrl = (url: string) => (url?.startsWith('http') ? url : `${window.location.origin}${url || ''}`);

  const getVideoUrl = (video: VideoAsset): string | undefined => {
    if (video.video_local_path) return `${window.location.origin}${video.video_local_path}`;
    return video.video_url;
  };

  const getCoverUrl = (video: VideoAsset): string | null => {
    if (video.cover_local_path) return `${window.location.origin}${video.cover_local_path}`;
    return video.cover_url || null;
  };

  const hasCover = (video: VideoAsset): boolean => {
    return !!(video.cover_local_path || video.cover_url);
  };

  const downloadVideo = async (video: VideoAsset) => {
    const videoUrl = getVideoUrl(video);
    if (!videoUrl) {
      Toast.show({ content: $l('seedance.toast.videoNotAvailable'), icon: 'fail' });
      return;
    }
    try {
      Toast.show({ content: $l('seedance.toast.downloadStarting'), icon: 'loading', duration: 0 });
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `video_${video.id}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      Toast.clear();
      Toast.show({ content: $l('seedance.toast.downloadSuccess'), icon: 'success' });
    } catch (err: any) {
      console.error('[Assets] 下载视频错误:', err);
      Toast.clear();
      Toast.show({ content: $l('seedance.toast.downloadFailed'), icon: 'fail' });
    }
  };

  const downloadUpload = async (work: WorkItem) => {
    const videoUrl = fullUrl(work.video_url);
    if (!videoUrl) {
      Toast.show({ content: $l('seedance.toast.videoNotAvailable'), icon: 'fail' });
      return;
    }
    try {
      Toast.show({ content: $l('seedance.toast.downloadStarting'), icon: 'loading', duration: 0 });
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `upload_${work.id}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      Toast.clear();
      Toast.show({ content: $l('seedance.toast.downloadSuccess'), icon: 'success' });
    } catch (err: any) {
      console.error('[Assets] 下载上传视频错误:', err);
      Toast.clear();
      Toast.show({ content: $l('seedance.toast.downloadFailed'), icon: 'fail' });
    }
  };

  const formatDuration = (video: VideoAsset) => {
    if (!video.duration) return '00:00';
    try {
      const seconds = parseInt(video.duration, 10);
      if (isNaN(seconds)) return '00:00';
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    } catch {
      return '00:00';
    }
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return $l('seedance.date.unknownDate');
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return $l('seedance.date.today');
    if (date.toDateString() === yesterday.toDateString()) return $l('seedance.date.yesterday');
    return $l('seedance.date.monthDay').replace('{month}', (date.getMonth() + 1).toString()).replace('{day}', date.getDate().toString());
  };

  const groupedVideos = videoList.reduce((acc, video) => {
    const date = formatDate(video.created_at);
    if (!acc[date]) acc[date] = [];
    acc[date].push(video);
    return acc;
  }, {} as Record<string, VideoAsset[]>);

  // 上传卡片（下载/发布操作）
  const renderUploadCard = (work: WorkItem) => {
    const handleThumbClick = (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('.assets-video-download')) {
        e.preventDefault();
        e.stopPropagation();
        downloadUpload(work);
        return;
      }
      if (target.closest('.assets-video-publish')) {
        e.preventDefault();
        e.stopPropagation();
        if (user) setPublishWork(work);
        else setLoginDialogVisible(true);
        return;
      }
      // 点击封面预览视频
      const videoUrl = fullUrl(work.video_url);
      if (videoUrl) window.open(videoUrl, '_blank', 'noopener,noreferrer');
    };

    return (
      <div key={work.id} className="assets-video-item">
        <div className="assets-video-thumb" onClick={handleThumbClick} style={{ cursor: 'pointer' }}>
          {work.cover_url ? (
            <div
              className="assets-video-cover"
              style={{ backgroundImage: `url(${fullUrl(work.cover_url)})` }}
            />
          ) : (
            <video
              className="assets-video-cover"
              src={fullUrl(work.video_url)}
              muted
              playsInline
              preload="metadata"
            />
          )}
          {work.is_private ? (
            <span className="assets-video-status" style={{ background: 'rgba(219,39,119,0.85)', color: '#fff' }}>
              {t.seedance.plaza.privateLabel}
            </span>
          ) : null}
          <div className="assets-video-publish" title="Publish to Plaza">
            Publish
          </div>
          <div className="assets-video-download">
            {$l('seedance.video.download')}
          </div>
        </div>
        <div className="assets-video-prompt" title={work.title}>
          {work.title?.slice(0, 20) || $l('seedance.video.noTitle')}
        </div>
      </div>
    );
  };

  const isLoadingAll = loading || uploadLoading;

  return (
    <div className="assets-page">
      <LoginDialog
        visible={loginDialogVisible}
        onClose={() => setLoginDialogVisible(false)}
      />
      <PublishDialog
        visible={!!publishVideo}
        onClose={() => setPublishVideo(null)}
        videoId={publishVideo?.id ?? ''}
        defaultTitle={publishVideo?.prompt ?? ''}
      />
      <PublishDialog
        visible={!!publishWork}
        onClose={() => setPublishWork(null)}
        videoId={publishWork?.id ?? ''}
        defaultTitle={publishWork?.title ?? ''}
      />

      <div className="assets-top-actions">
        <SearchBar placeholder={c.searchPlaceholder} value={searchKeyword} onChange={setSearchKeyword} className="assets-search" />
        <span className="assets-batch">{p.batchOps}</span>
      </div>

      <div className="assets-filter-tabs">
        <button
          type="button"
          className={`filter-tab ${filterTab === 'all' ? 'active' : ''}`}
          onClick={() => setFilterTab('all')}
        >
          {p.allVideos}
        </button>
        <button
          type="button"
          className={`filter-tab ${filterTab === 'collections' ? 'active' : ''}`}
          onClick={() => setFilterTab('collections')}
        >
          {p.myCollections}
        </button>
        <button
          type="button"
          className={`filter-tab ${filterTab === 'uploads' ? 'active' : ''}`}
          onClick={() => setFilterTab('uploads')}
        >
          {p.myUploads}
        </button>
      </div>

      {/* 所有视频 */}
      {filterTab === 'all' && (
        <div className="assets-video-list">
          {isLoadingAll ? (
            <div className="assets-loading">
              <DotLoading color="primary" />
              <p>{c.loading}</p>
            </div>
          ) : videoList.length === 0 && uploadList.length === 0 ? (
            <div className="assets-empty">
              <p>{p.assetsDesc}</p>
            </div>
          ) : (
            <>
              {Object.entries(groupedVideos).map(([date, videos]) => (
                <div key={date} className="assets-date-group">
                  <div className="assets-date-label">{date}</div>
                  <div className="assets-video-grid">
                    {videos.map((video) => {
                      const videoUrl = getVideoUrl(video);
                      const hasVideo = hasCover(video) && videoUrl;

                      const handleThumbClick = (e: React.MouseEvent) => {
                        const target = e.target as HTMLElement;
                        if (target.closest('.assets-video-download')) {
                          e.preventDefault();
                          e.stopPropagation();
                          downloadVideo(video);
                          return;
                        }
                        if (target.closest('.assets-video-publish')) {
                          e.preventDefault();
                          e.stopPropagation();
                          if (user) setPublishVideo(video);
                          else setLoginDialogVisible(true);
                          return;
                        }
                        if (hasCover(video)) {
                          e.preventDefault();
                          e.stopPropagation();
                          if (hasVideo && videoUrl) {
                            window.open(videoUrl, '_blank', 'noopener,noreferrer');
                          }
                        }
                      };

                      return (
                        <div key={video.id} className="assets-video-item">
                          <div
                            className="assets-video-thumb"
                            onClick={handleThumbClick}
                            style={{ cursor: hasCover(video) ? 'pointer' : 'default' }}
                          >
                            {hasCover(video) ? (
                              <div
                                className="assets-video-cover"
                                style={{ backgroundImage: `url(${getCoverUrl(video)})` }}
                              />
                            ) : !video.error_message ? (
                              <video
                                className="assets-video-cover"
                                src={recordLoadingVideo}
                                autoPlay
                                loop
                                muted
                                playsInline
                              />
                            ) : (
                              <div className="assets-video-cover" />
                            )}
                            <span className="assets-video-duration">{formatDuration(video)}</span>
                            {video.error_message ? (
                              <span className="assets-video-status assets-video-failure">{$l('seedance.video.failure')}</span>
                            ) : !hasCover(video) ? (
                              <>
                                {video.queue_info ? (
                                  <span className="assets-video-queue-text">
                                    {(video.queue_info.位置 ?? video.queue_info.pos) === 0
                                      ? $l('seedance.video.creating')
                                      : $l('seedance.video.queueStatus')
                                          .replace('{pos}', String(video.queue_info.位置 ?? video.queue_info.pos ?? 0))
                                          .replace('{total}', String(video.queue_info.总人数 ?? video.queue_info.total ?? 0))
                                          .replace('{wait}', String(video.queue_info.等待分钟 ?? video.queue_info.wait ?? 0))}
                                  </span>
                                ) : null}
                                <span className="assets-video-generating-badge">{$l('seedance.video.generating')}</span>
                              </>
                            ) : null}
                            {hasCover(video) && (
                              <>
                                <div className="assets-video-publish" title="Publish to Plaza">
                                  Publish
                                </div>
                                <div className="assets-video-download">
                                  {$l('seedance.video.download')}
                                </div>
                              </>
                            )}
                          </div>
                          <div className="assets-video-prompt" title={video.prompt || $l('seedance.video.noTitle')}>
                            {video.prompt?.slice(0, 20) || $l('seedance.video.noTitle')}
                          </div>
                          {video.error_message && (
                            <div className="assets-video-error" title={video.error_message}>
                              {video.error_message}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {uploadList.length > 0 && (
                <div className="assets-date-group">
                  <div className="assets-date-label">{p.myUploads}</div>
                  <div className="assets-video-grid">
                    {uploadList.map(work => renderUploadCard(work))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* 我的收藏 */}
      {filterTab === 'collections' && (
        <div className="assets-video-list">
          <div className="assets-empty">
            <p>{p.myCollections}</p>
          </div>
        </div>
      )}

      {/* 我的上传 */}
      {filterTab === 'uploads' && (
        <div className="assets-video-list">
          {uploadLoading ? (
            <div className="assets-loading">
              <DotLoading color="primary" />
              <p>{c.loading}</p>
            </div>
          ) : uploadList.length === 0 ? (
            <div className="assets-empty">
              <p>{p.myUploadsEmpty}</p>
            </div>
          ) : (
            <div className="assets-video-grid">
              {uploadList.map(work => renderUploadCard(work))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
