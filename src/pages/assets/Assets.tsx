import React, { useState, useEffect } from 'react';
import { Tabs, SearchBar, Toast, DotLoading } from 'antd-mobile';
import { useI18n } from '../../context/I18nContext';
import { useAuth } from '../../context/AuthContext';
import { getVideoList } from '../../services/api';
import { LoginDialog } from '../../components/LoginDialog';
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
  duration: string;           // 时长如 "5"
  model: string;              // 模型
  ratio: string;              // 比例如 "16:9"
  created_at: number;         // 创建时间（毫秒时间戳）
  updated_at: number;         // 更新时间（毫秒时间戳）
  video_local_path?: string;  // 本地视频 URL（已是 URL 格式）
  cover_local_path?: string;  // 本地封面 URL（已是 URL 格式）
  prompt?: string;            // 提示词
  video_url?: string;         // 远程视频 URL
  cover_url?: string;         // 远程封面 URL
  error_message?: string;     // 错误信息
  queue_info?: QueueInfo;    // 排队信息 { pos, total, wait }
}

export function Assets() {
  const { t, $l } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const p = t.seedance.pages;
  const c = t.common;
  const [contentTab, setContentTab] = useState('videos');
  const [filterTab, setFilterTab] = useState('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [videoList, setVideoList] = useState<VideoAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [loginDialogVisible, setLoginDialogVisible] = useState(false);

  // 仅在 auth 加载完成后且未登录时弹出登录框，避免刷新时误弹
  useEffect(() => {
    if (!authLoading && !user) {
      setLoginDialogVisible(true);
    }
  }, [authLoading, user]);

  // 登录后加载视频列表（使用 AbortController 避免 Strict Mode 或依赖重复触发时发两次请求）
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


  // 获取视频 URL（优先使用本地缓存）
  const getVideoUrl = (video: VideoAsset): string | undefined => {
    // 优先使用本地 URL（后端已返回完整路径）
    if (video.video_local_path) {
      return `${window.location.origin}${video.video_local_path}`;
    }
    // 降级到远程 URL
    return video.video_url;
  };

  // 获取封面 URL（只返回图片封面，不返回视频）
  const getCoverUrl = (video: VideoAsset): string | null => {
    // 优先使用本地 URL（后端已返回完整路径）
    if (video.cover_local_path) {
      return `${window.location.origin}${video.cover_local_path}`;
    }
    // 降级到远程 URL
    return video.cover_url || null;
  };

  // 检查是否有封面
  const hasCover = (video: VideoAsset): boolean => {
    return !!(video.cover_local_path || video.cover_url);
  };

  // 获取时长信息（新接口直接返回秒数字符串）
  const getDurationInfo = (video: VideoAsset): string | undefined => {
    return video.duration;
  };

  // 下载视频
  const downloadVideo = async (video: VideoAsset) => {
    const videoUrl = getVideoUrl(video);
    if (!videoUrl) {
      Toast.show({ content: $l('seedance.toast.videoNotAvailable'), icon: 'fail' });
      return;
    }

    try {
      Toast.show({ content: $l('seedance.toast.downloadStarting'), icon: 'loading', duration: 0 });

      // 使用 fetch 下载视频
      const response = await fetch(videoUrl);
      const blob = await response.blob();

      // 创建下载链接
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

  // 格式化时长（新接口 duration 是秒数字符串如 "5"）
  const formatDuration = (video: VideoAsset) => {
    const durationInfo = getDurationInfo(video);
    if (!durationInfo) return '00:00';
    try {
      const seconds = parseInt(durationInfo, 10);
      if (isNaN(seconds)) return '00:00';
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    } catch {
      return '00:00';
    }
  };

  // 格式化日期（新接口 created_at 已是毫秒时间戳）
  const formatDate = (timestamp?: number) => {
    if (!timestamp) return $l('seedance.date.unknownDate');
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // 判断是否是今天
    if (date.toDateString() === today.toDateString()) {
      return $l('seedance.date.today');
    }
    // 判断是否是昨天
    if (date.toDateString() === yesterday.toDateString()) {
      return $l('seedance.date.yesterday');
    }
    // 否则显示月日
    return $l('seedance.date.monthDay').replace('{month}', (date.getMonth() + 1).toString()).replace('{day}', date.getDate().toString());
  };

  // 按日期分组
  const groupedVideos = videoList.reduce((acc, video) => {
    const date = formatDate(video.created_at);
    if (!acc[date]) acc[date] = [];
    acc[date].push(video);
    return acc;
  }, {} as Record<string, VideoAsset[]>);

  return (
    <div className="assets-page">
      <LoginDialog
        visible={loginDialogVisible}
        onClose={() => setLoginDialogVisible(false)}
      />
      <div className="assets-top-tabs">
        <Tabs activeKey={contentTab} onChange={(k) => setContentTab(k as string)} className="assets-content-tabs">
          <Tabs.Tab title={p.assetsVideos} key="videos" />
        </Tabs>
        <div className="assets-top-actions">
          <SearchBar placeholder={c.searchPlaceholder} value={searchKeyword} onChange={setSearchKeyword} className="assets-search" />
          <span className="assets-batch">{p.batchOps}</span>
        </div>
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
      </div>

      <div className="assets-video-list">
        {loading ? (
          <div className="assets-loading">
            <DotLoading color="primary" />
            <p>{c.loading}</p>
          </div>
        ) : videoList.length === 0 ? (
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

                    // 在缩略图容器上统一处理点击事件
                    const handleThumbClick = (e: React.MouseEvent) => {
                      // 检查是否点击了下载按钮
                      const target = e.target as HTMLElement;
                      if (target.closest('.assets-video-download')) {
                        console.log('[Assets] 点击下载视频:', video);
                        e.preventDefault();
                        e.stopPropagation();
                        downloadVideo(video);
                        return;
                      }

                      // 点击了其他区域（封面），预览视频
                      if (hasCover(video)) {
                        console.log('[Assets] 点击预览视频:', video);
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
                            // 有封面：显示背景图片，点击可查看视频
                            <div
                              className="assets-video-cover"
                              style={{ backgroundImage: `url(${getCoverUrl(video)})` }}
                            />
                          ) : !video.error_message ? (
                            // 无封面且无错误：显示 record-loading 视频（生成中）
                            <video
                              className="assets-video-cover"
                              src={recordLoadingVideo}
                              autoPlay
                              loop
                              muted
                              playsInline
                            />
                          ) : (
                            // 无封面但有错误：显示空白占位
                            <div className="assets-video-cover" />
                          )}
                          <span className="assets-video-duration">{formatDuration(video)}</span>
                          {video.error_message ? (
                            // 有错误信息：显示"生成失败"标签
                            <span className="assets-video-status assets-video-failure">{$l('seedance.video.failure')}</span>
                          ) : !hasCover(video) ? (
                            // 没有封面：剩余时间居中，Generating 右下角
                            <>
                              {video.queue_info ? (
                                <span className="assets-video-queue-text">
                                  {$l('seedance.video.queueStatus')
                                    .replace('{pos}', String(video.queue_info.位置 ?? video.queue_info.pos ?? 0))
                                    .replace('{total}', String(video.queue_info.总人数 ?? video.queue_info.total ?? 0))
                                    .replace('{wait}', String(video.queue_info.等待分钟 ?? video.queue_info.wait ?? 0))}
                                </span>
                              ) : null}
                              <span className="assets-video-generating-badge">{$l('seedance.video.generating')}</span>
                            </>
                          ) : video.video_local_path ? (
                            // 有本地缓存：显示缓存标签
                            <span className="assets-video-status assets-video-cached" title={$l('seedance.video.localCached')}>📦</span>
                          ) : null}
                          {/* 只有有封面时才显示下载按钮 */}
                          {hasCover(video) && (
                            <div className="assets-video-download">
                              {$l('seedance.video.download')}
                            </div>
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
          </>
        )}
      </div>
    </div>
  );
}
