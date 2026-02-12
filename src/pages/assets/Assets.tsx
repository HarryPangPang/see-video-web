import React, { useState, useEffect } from 'react';
import { Tabs, SearchBar, Toast, DotLoading } from 'antd-mobile';
import { useI18n } from '../../context/I18nContext';
import { getVideoList } from '../../services/api';
import recordLoadingVideo from '../../assets/record-loading.mp4';
import './Assets.scss';

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
}

export function Assets() {
  const { t } = useI18n();
  const p = t.seedance.pages;
  const [contentTab, setContentTab] = useState('videos');
  const [filterTab, setFilterTab] = useState('all');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [videoList, setVideoList] = useState<VideoAsset[]>([]);
  const [loading, setLoading] = useState(false);

  // 获取视频列表
  useEffect(() => {
    fetchVideoList();
  }, []);

  const fetchVideoList = async () => {
    setLoading(true);
    try {
      const result = await getVideoList();
      if (result.success && result.data?.asset_list) {
        // 直接使用返回的视频列表
        const videos = result.data.asset_list;
        setVideoList(videos);
        console.log('[Assets] 获取到的视频列表:', videos);
        Toast.show({ content: `加载了 ${videos.length} 个视频` });
      } else {
        Toast.show({ content: '获取视频列表失败', icon: 'fail' });
      }
    } catch (err: any) {
      console.error('[Assets] 获取视频列表错误:', err);
      Toast.show({ content: err.message || '网络错误', icon: 'fail' });
    } finally {
      setLoading(false);
    }
  };


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
      Toast.show({ content: '视频地址不可用', icon: 'fail' });
      return;
    }

    try {
      Toast.show({ content: '开始下载...', icon: 'loading', duration: 0 });

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
      Toast.show({ content: '下载成功', icon: 'success' });
    } catch (err: any) {
      console.error('[Assets] 下载视频错误:', err);
      Toast.clear();
      Toast.show({ content: '下载失败', icon: 'fail' });
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
    if (!timestamp) return '未知日期';
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // 判断是否是今天
    if (date.toDateString() === today.toDateString()) {
      return '今天';
    }
    // 判断是否是昨天
    if (date.toDateString() === yesterday.toDateString()) {
      return '昨天';
    }
    // 否则显示月日
    return `${date.getMonth() + 1}月${date.getDate()}日`;
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
      <div className="assets-top-tabs">
        <Tabs activeKey={contentTab} onChange={(k) => setContentTab(k as string)} className="assets-content-tabs">
          <Tabs.Tab title={p.assetsVideos} key="videos" />
        </Tabs>
        <div className="assets-top-actions">
          <SearchBar placeholder="Q" value={searchKeyword} onChange={setSearchKeyword} className="assets-search" />
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
            <p>加载中...</p>
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
                  {videos.map((video) => (
                    <div key={video.id} className="assets-video-item" onClick={() => downloadVideo(video)}>
                      <div className="assets-video-thumb">
                        {hasCover(video) ? (
                          // 有封面：显示背景图片
                          <div className="assets-video-cover" style={{ backgroundImage: `url(${getCoverUrl(video)})` }} />
                        ) : (
                          // 无封面：显示 record-loading 视频
                          <video
                            className="assets-video-cover"
                            src={recordLoadingVideo}
                            autoPlay
                            loop
                            muted
                            playsInline
                          />
                        )}
                        <span className="assets-video-duration">{formatDuration(video)}</span>
                        {!hasCover(video) ? (
                          // 没有封面：显示"生成中"标签
                          <span className="assets-video-status assets-video-generating">生成中</span>
                        ) : video.video_local_path ? (
                          // 有本地缓存：显示缓存标签
                          <span className="assets-video-status assets-video-cached" title="本地缓存">📦</span>
                        ) : null}
                        {/* 只有有封面时才显示下载按钮 */}
                        {hasCover(video) && (
                          <div className="assets-video-download">⬇️ 下载</div>
                        )}
                      </div>
                      <div className="assets-video-prompt">
                        {video.prompt?.slice(0, 20) || '无标题'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
