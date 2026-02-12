import React, { useState, useEffect } from 'react';
import { Tabs, SearchBar, Toast, DotLoading } from 'antd-mobile';
import { useI18n } from '../../context/I18nContext';
import { getVideoList } from '../../services/api';
import './Assets.scss';

interface VideoAsset {
  id: string;
  type: number;
  local_video_url?: string;  // 本地视频 URL
  local_cover_url?: string;  // 本地封面 URL
  has_local_cache?: boolean; // 是否有本地缓存
  video?: {
    created_time?: number;
    item_list?: Array<{
      common_attr?: {
        cover_url?: string;
      };
      video?: {
        cover_url?: string;
        duration_info?: string;
        transcoded_video?: {
          origin?: {
            video_url?: string;
          };
        };
      };
    }>;
  };
  aigc_image_params?: {
    text2video_params?: {
      video_gen_inputs?: Array<{ prompt: string }>;
    };
  };
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
        // 过滤出包含 video 字段的资源（type 2 和 type 7 都是视频）
        const videos = result.data.asset_list.filter((item: VideoAsset) => item.video);
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

  // 获取 API 基础 URL
  const API_HOST = (_GLOBAL_VARS_ as any).VITE_API_HOST || 'http://localhost';

  // 获取视频 URL（优先使用本地缓存）
  const getVideoUrl = (video: VideoAsset): string | undefined => {
    // 优先使用本地 URL
    if (video.local_video_url) {
      return `${API_HOST}${video.local_video_url}`;
    }
    // 降级到远程 URL
    return video.video?.item_list?.[0]?.video?.transcoded_video?.origin?.video_url;
  };

  // 获取封面 URL（优先使用本地缓存）
  const getCoverUrl = (video: VideoAsset): string | undefined => {
    // 优先使用本地 URL
    if (video.local_cover_url) {
      return `${API_HOST}${video.local_cover_url}`;
    }
    // 降级到远程 URL
    return video.video?.item_list?.[0]?.common_attr?.cover_url ||
           video.video?.item_list?.[0]?.video?.cover_url;
  };

  // 获取时长信息
  const getDurationInfo = (video: VideoAsset): string | undefined => {
    return video.video?.item_list?.[0]?.video?.duration_info;
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

  // 格式化时长
  const formatDuration = (video: VideoAsset) => {
    const durationInfo = getDurationInfo(video);
    if (!durationInfo) return '00:00';
    try {
      const parsed = JSON.parse(durationInfo);
      const seconds = Math.floor(parsed.play_info_duration || 0);
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    } catch {
      return '00:00';
    }
  };

  // 格式化日期
  const formatDate = (timestamp?: number) => {
    if (!timestamp) return '未知日期';
    const date = new Date(timestamp * 1000);
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
    const date = formatDate(video.video?.created_time);
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
                      <div className="assets-video-thumb" style={{ backgroundImage: `url(${getCoverUrl(video)})` }}>
                        <span className="assets-video-duration">{formatDuration(video)}</span>
                        {video.has_local_cache && (
                          <span className="assets-video-cached" title="本地缓存">📦</span>
                        )}
                        <div className="assets-video-download">⬇️ 下载</div>
                      </div>
                      <div className="assets-video-prompt">
                        {video.aigc_image_params?.text2video_params?.video_gen_inputs?.[0]?.prompt?.slice(0, 20) || '无标题'}
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
