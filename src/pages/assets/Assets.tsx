import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchBar, Toast, DotLoading } from 'antd-mobile';
import { useI18n } from '../../context/I18nContext';
import { useAuth } from '../../context/AuthContext';
import {
  getVideoList,
  getWorksList,
  deleteWork,
  deleteVideoGeneration,
  updateWorkPrivacy,
  type WorkItem,
} from '../../services/api';
import { LoginDialog } from '../../components/LoginDialog';
import { PublishDialog } from '../../components/PublishDialog';
import recordLoadingVideo from '../../assets/record-loading.mp4';
import './Assets.scss';

interface QueueInfo {
  位置?: number; 总人数?: number; 等待分钟?: number;
  pos?: number; total?: number; wait?: number;
}

export interface VideoAsset {
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
  work_id?: string | null;
  work_is_private?: number | null;
  start_frame?: string;
  end_frame?: string;
  omni_frames?: string[];
}

// 删除确认目标
interface DeleteTarget {
  items: Array<{ id: string; isWork: boolean }>;
}

export function Assets() {
  const navigate = useNavigate();
  const { t, $l } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const p = t.seedance.pages;
  const plaza = t.seedance.plaza;
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
  // 批量选择
  const [batchMode, setBatchMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Map<string, 'generation' | 'work'>>(new Map());

  // 三点菜单
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // 删除确认
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  useEffect(() => {
    if (!authLoading && !user) setLoginDialogVisible(true);
  }, [authLoading, user]);

  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    setLoading(true);
    getVideoList(controller.signal)
      .then(result => {
        if (result.success && result.data?.asset_list) {
          setVideoList(result.data.asset_list);
          Toast.show({ content: $l('seedance.toast.videoLoadSuccess').replace('{count}', result.data.asset_list.length.toString()) });
        } else {
          Toast.show({ content: $l('seedance.toast.videoLoadFailed'), icon: 'fail' });
        }
      })
      .catch(err => {
        if ((err as Error).name === 'AbortError') return;
        Toast.show({ content: err.message || $l('seedance.toast.networkError'), icon: 'fail' });
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setUploadLoading(true);
    getWorksList({ mine: true, source: 'upload', limit: 100 })
      .then(res => { if (res.data) setUploadList(res.data.list); })
      .catch(err => Toast.show({ content: err.message, icon: 'fail' }))
      .finally(() => setUploadLoading(false));
  }, [user]);


  // 点击外部关闭菜单
  useEffect(() => {
    if (!openMenuId) return;
    const handle = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [openMenuId]);

  // 退出批量模式时清空选中
  useEffect(() => {
    if (!batchMode) setSelectedItems(new Map());
  }, [batchMode]);

  const fullUrl = (url: string) => (url?.startsWith('http') ? url : `${window.location.origin}${url || ''}`);
  const getCoverUrl = (video: VideoAsset) => video.cover_local_path ? `${window.location.origin}${video.cover_local_path}` : (video.cover_url || null);
  const getVideoUrl = (video: VideoAsset) => video.video_local_path ? `${window.location.origin}${video.video_local_path}` : (video.video_url || undefined);
  const hasCover = (video: VideoAsset) => !!(video.cover_local_path || video.cover_url);


  const formatDuration = (video: VideoAsset) => {
    if (!video.duration) return '00:00';
    try {
      const s = parseInt(video.duration, 10);
      if (isNaN(s)) return '00:00';
      return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    } catch { return '00:00'; }
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return $l('seedance.date.unknownDate');
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return $l('seedance.date.today');
    if (date.toDateString() === yesterday.toDateString()) return $l('seedance.date.yesterday');
    return $l('seedance.date.monthDay').replace('{month}', String(date.getMonth() + 1)).replace('{day}', String(date.getDate()));
  };

  // ── 搜索过滤 ──
  const kw = searchKeyword.trim().toLowerCase();
  const filteredVideoList = kw ? videoList.filter(v => (v.prompt || '').toLowerCase().includes(kw)) : videoList;
  const filteredUploadList = kw ? uploadList.filter(w => (w.title || '').toLowerCase().includes(kw)) : uploadList;

  // ── 批量选择 ──
  const toggleSelect = (id: string, type: 'generation' | 'work') => {
    setSelectedItems(prev => {
      const next = new Map(prev);
      next.has(id) ? next.delete(id) : next.set(id, type);
      return next;
    });
  };

  // ── 删除 ──
  const requestDelete = (items: Array<{ id: string; isWork: boolean }>) => {
    setOpenMenuId(null);
    setDeleteTarget({ items });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const targets = deleteTarget.items;
    setDeleteTarget(null);
    try {
      await Promise.all(targets.map(({ id, isWork }) => isWork ? deleteWork(id) : deleteVideoGeneration(id)));
      const workIds = new Set(targets.filter(t => t.isWork).map(t => t.id));
      const genIds = new Set(targets.filter(t => !t.isWork).map(t => t.id));
      if (genIds.size) setVideoList(prev => prev.filter(v => !genIds.has(v.id)));
      if (workIds.size) setUploadList(prev => prev.filter(w => !workIds.has(w.id)));
      setSelectedItems(new Map());
      setBatchMode(false);
      Toast.show({ content: plaza.deleteWork, icon: 'success' });
    } catch (e) {
      Toast.show({ content: (e as Error).message, icon: 'fail' });
    }
  };

  // ── 隐私切换 ──
  const handleTogglePrivacy = async (workId: string, isCurrentlyPrivate: boolean, genId?: string) => {
    setOpenMenuId(null);
    const newPrivate = !isCurrentlyPrivate;
    try {
      await updateWorkPrivacy(workId, newPrivate);
      if (genId) {
        setVideoList(prev => prev.map(v => v.id === genId ? { ...v, work_is_private: newPrivate ? 1 : 0 } : v));
      } else {
        setUploadList(prev => prev.map(w => w.id === workId ? { ...w, is_private: newPrivate ? 1 : 0 } : w));
      }
      Toast.show({ content: newPrivate ? t.seedance.plaza.setPrivate : t.seedance.plaza.setPublic, icon: 'success' });
    } catch (e) {
      Toast.show({ content: (e as Error).message, icon: 'fail' });
    }
  };

  // ── 渲染三点菜单 ──
  const renderMenu = (menuId: string, items: React.ReactNode) => (
    openMenuId === menuId ? (
      <div className="assets-card-menu" ref={menuRef}>
        {items}
      </div>
    ) : null
  );

  // ── 生成视频卡片 ──
  const renderGenCard = (video: VideoAsset) => {
    const isSelected = selectedItems.has(video.id);
    const menuId = `g:${video.id}`;
    const isPrivate = !!(video.work_is_private);

    const handleThumbClick = (e: React.MouseEvent) => {
      if (batchMode) { toggleSelect(video.id, 'generation'); return; }
      const target = e.target as HTMLElement;
      if (target.closest('.assets-video-publish')) {
        e.stopPropagation();
        if (!user) { setLoginDialogVisible(true); return; }
        if (isPrivate && video.work_id) {
          // 重新发布：直接设为公开，无需弹窗
          handleTogglePrivacy(video.work_id, true, video.id);
        } else {
          setPublishVideo(video);
        }
        return;
      }
      if (target.closest('.assets-card-menu-wrap')) return;
      navigate(`/assets/${video.id}`, { state: { video } });
    };

    return (
      <div key={video.id} className={`assets-video-item${isSelected ? ' assets-video-item--selected' : ''}`}>
        <div className="assets-video-thumb" onClick={handleThumbClick} style={{ cursor: batchMode ? 'pointer' : (hasCover(video) ? 'pointer' : 'default') }}>
          {hasCover(video) ? (
            <div className="assets-video-cover" style={{ backgroundImage: `url(${getCoverUrl(video)})` }} />
          ) : !video.error_message ? (
            <video className="assets-video-cover" src={recordLoadingVideo} autoPlay loop muted playsInline />
          ) : (
            <div className="assets-video-cover" />
          )}

          <span className="assets-video-duration">{formatDuration(video)}</span>

          {video.error_message ? (
            <span className="assets-video-status assets-video-failure">{$l('seedance.video.failure')}</span>
          ) : !hasCover(video) ? (
            <>
              {video.queue_info && (
                <span className="assets-video-queue-text">
                  {(video.queue_info.pos ?? video.queue_info.位置) === 0
                    ? $l('seedance.video.creating')
                    : $l('seedance.video.queueStatus')
                        .replace('{pos}', String(video.queue_info.pos ?? video.queue_info.位置 ?? 0))
                        .replace('{total}', String(video.queue_info.total ?? video.queue_info.总人数 ?? 0))
                        .replace('{wait}', String(video.queue_info.wait ?? video.queue_info.等待分钟 ?? 0))}
                </span>
              )}
              <span className="assets-video-generating-badge">{$l('seedance.video.generating')}</span>
            </>
          ) : null}

          {/* 私密徽章 */}
          {isPrivate && (
            <span className="assets-video-status" style={{ background: 'rgba(51,65,85,0.82)', color: '#e2e8f0' }}>
              {t.seedance.plaza.privateLabel}
            </span>
          )}

          {/* Publish 悬浮操作 */}
          {hasCover(video) && !batchMode && (!video.work_id || isPrivate) && (
            <div className="assets-video-actions">
              <div className="assets-video-publish" title={isPrivate ? 'Re-publish to Plaza' : 'Publish to Plaza'}>
                {isPrivate ? 'Re-publish' : 'Publish'}
              </div>
            </div>
          )}

          {/* 批量勾选框 */}
          {batchMode && (
            <div className={`assets-card-checkbox${isSelected ? ' assets-card-checkbox--checked' : ''}`} />
          )}

          {/* 三点菜单 */}
          {!batchMode && hasCover(video) && (
            <div className="assets-card-menu-wrap" ref={openMenuId === menuId ? menuRef : null}>
              <button
                type="button"
                className="assets-card-menu-btn"
                onClick={e => { e.stopPropagation(); setOpenMenuId(prev => prev === menuId ? null : menuId); }}
              >⋯</button>
              {renderMenu(menuId, <>
                {video.work_id && (
                  <button type="button" className="assets-card-menu-item" onClick={() => handleTogglePrivacy(video.work_id!, isPrivate, video.id)}>
                    {isPrivate ? t.seedance.plaza.setPublic : t.seedance.plaza.setPrivate}
                  </button>
                )}
                <button type="button" className="assets-card-menu-item assets-card-menu-item--danger" onClick={() => requestDelete([{ id: video.id, isWork: false }])}>
                  {plaza.deleteWork}
                </button>
              </>)}
            </div>
          )}
        </div>

        <div className="assets-video-prompt" title={video.prompt || $l('seedance.video.noTitle')}>
          {String(video.prompt ?? '').slice(0, 20) || $l('seedance.video.noTitle')}
        </div>
        {video.error_message && (
          <div className="assets-video-error" title={video.error_message}>{video.error_message}</div>
        )}
      </div>
    );
  };

  // ── 上传卡片 ──
  const renderUploadCard = (work: WorkItem) => {
    const isSelected = selectedItems.has(work.id);
    const menuId = `u:${work.id}`;
    const isPrivate = !!(work.is_private);

    const handleThumbClick = (e: React.MouseEvent) => {
      if (batchMode) { toggleSelect(work.id, 'work'); return; }
      const target = e.target as HTMLElement;
      if (target.closest('.assets-video-publish')) { e.stopPropagation(); user ? setPublishWork(work) : setLoginDialogVisible(true); return; }
      if (target.closest('.assets-card-menu-wrap')) return;
      navigate(`/works/${work.id}`);
    };

    return (
      <div key={work.id} className={`assets-video-item${isSelected ? ' assets-video-item--selected' : ''}`}>
        <div className="assets-video-thumb" onClick={handleThumbClick} style={{ cursor: 'pointer' }}>
          {work.cover_url ? (
            <div className="assets-video-cover" style={{ backgroundImage: `url(${fullUrl(work.cover_url)})` }} />
          ) : (
            <video className="assets-video-cover" src={fullUrl(work.video_url)} muted playsInline preload="metadata" />
          )}

          {isPrivate && (
            <span className="assets-video-status" style={{ background: 'rgba(51,65,85,0.82)', color: '#e2e8f0' }}>
              {t.seedance.plaza.privateLabel}
            </span>
          )}


          {batchMode && (
            <div className={`assets-card-checkbox${isSelected ? ' assets-card-checkbox--checked' : ''}`} />
          )}

          {!batchMode && (
            <div className="assets-card-menu-wrap" ref={openMenuId === menuId ? menuRef : null}>
              <button
                type="button"
                className="assets-card-menu-btn"
                onClick={e => { e.stopPropagation(); setOpenMenuId(prev => prev === menuId ? null : menuId); }}
              >⋯</button>
              {renderMenu(menuId, <>
                <button type="button" className="assets-card-menu-item" onClick={() => handleTogglePrivacy(work.id, isPrivate)}>
                  {isPrivate ? t.seedance.plaza.setPublic : t.seedance.plaza.setPrivate}
                </button>
                <button type="button" className="assets-card-menu-item assets-card-menu-item--danger" onClick={() => requestDelete([{ id: work.id, isWork: true }])}>
                  {plaza.deleteWork}
                </button>
              </>)}
            </div>
          )}
        </div>

        <div className="assets-video-prompt" title={work.title}>
          {String(work.title ?? '').slice(0, 20) || $l('seedance.video.noTitle')}
        </div>
      </div>
    );
  };

  const groupedVideos = filteredVideoList.reduce((acc, video) => {
    const date = formatDate(video.created_at);
    if (!acc[date]) acc[date] = [];
    acc[date].push(video);
    return acc;
  }, {} as Record<string, VideoAsset[]>);

  const isLoadingAll = loading || uploadLoading;
  const selectedCount = selectedItems.size;

  return (
    <div className="assets-page">
      <LoginDialog visible={loginDialogVisible} onClose={() => setLoginDialogVisible(false)} />
      <PublishDialog
        visible={!!publishVideo}
        onClose={() => setPublishVideo(null)}
        videoId={publishVideo?.id ?? ''}
        defaultTitle={publishVideo?.prompt ?? ''}
        defaultCoverUrl={publishVideo ? (getCoverUrl(publishVideo) ?? undefined) : undefined}
        videoUrl={publishVideo ? getVideoUrl(publishVideo) : undefined}
      />
      <PublishDialog
        visible={!!publishWork}
        onClose={() => setPublishWork(null)}
        videoId={publishWork?.id ?? ''}
        defaultTitle={publishWork?.title ?? ''}
        videoUrl={publishWork ? fullUrl(publishWork.video_url) : undefined}
      />

      <div className="assets-top-actions">
        <SearchBar placeholder={c.searchPlaceholder} value={searchKeyword} onChange={setSearchKeyword} className="assets-search" />
        <button
          type="button"
          className={`assets-batch-btn${batchMode ? ' assets-batch-btn--active' : ''}`}
          onClick={() => setBatchMode(v => !v)}
        >
          {batchMode ? p.batchCancel : p.batchOps}
        </button>
      </div>

      <div className="assets-filter-tabs">
        {(['all', 'collections'] as const).map((key) => (
          <button key={key} type="button" className={`filter-tab${filterTab === key ? ' active' : ''}`} onClick={() => setFilterTab(key)}>
            {key === 'all' ? p.allVideos : p.myCollections}
          </button>
        ))}
      </div>

      {/* 所有视频 */}
      {filterTab === 'all' && (
        <div className="assets-video-list">
          {isLoadingAll ? (
            <div className="assets-loading"><DotLoading color="primary" /><p>{c.loading}</p></div>
          ) : filteredVideoList.length === 0 && filteredUploadList.length === 0 ? (
            <div className="assets-empty"><p>{p.assetsDesc}</p></div>
          ) : (
            <>
              {Object.entries(groupedVideos).map(([date, videos]) => (
                <div key={date} className="assets-date-group">
                  <div className="assets-date-label">{date}</div>
                  <div className="assets-video-grid">{videos.map(renderGenCard)}</div>
                </div>
              ))}
              {filteredUploadList.length > 0 && (
                <div className="assets-date-group">
                  <div className="assets-date-label">{p.myUploads}</div>
                  <div className="assets-video-grid">{filteredUploadList.map(renderUploadCard)}</div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* 我的收藏 */}
      {filterTab === 'collections' && (
        <div className="assets-video-list">
          <div className="assets-empty"><p>{p.myCollections}</p></div>
        </div>
      )}


      {/* 批量操作栏 */}
      {batchMode && selectedCount > 0 && (
        <div className="assets-batch-bar">
          <span className="assets-batch-count">已选 {selectedCount} 项</span>
          <button
            type="button"
            className="assets-batch-delete-btn"
            onClick={() => requestDelete([...selectedItems.entries()].map(([id, type]) => ({ id, isWork: type === 'work' })))}
          >
            删除
          </button>
        </div>
      )}

      {/* 删除确认弹窗 */}
      {deleteTarget && (
        <div className="assets-confirm-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="assets-confirm-dialog" onClick={e => e.stopPropagation()}>
            <div className="assets-confirm-icon">🗑</div>
            <h3 className="assets-confirm-title">{plaza.deleteWork}</h3>
            <p className="assets-confirm-desc">
              {deleteTarget.items.length > 1
                ? `确定删除选中的 ${deleteTarget.items.length} 项？此操作不可撤销。`
                : plaza.deleteConfirm}
            </p>
            <div className="assets-confirm-actions">
              <button type="button" className="assets-confirm-btn assets-confirm-btn--cancel" onClick={() => setDeleteTarget(null)}>
                {plaza.deleteCancel}
              </button>
              <button type="button" className="assets-confirm-btn assets-confirm-btn--danger" onClick={confirmDelete}>
                {plaza.deleteConfirmBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
