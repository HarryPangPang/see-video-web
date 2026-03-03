import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { DotLoading, Toast, Dialog } from 'antd-mobile';
import { getWorksList, deleteWork, updateWorkPrivacy, type WorkItem, type WorksListParams } from '../../services/api';
import { useI18n } from '../../context/I18nContext';
import { useAuth } from '../../context/AuthContext';
import './Plaza.scss';

type SortType = 'foryou' | 'newest' | 'likes';

const PAGE_SIZE = 20;

export function Plaza() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { user } = useAuth();
  const p = t.seedance.plaza;

  const tabs: { key: SortType; label: string }[] = [
    { key: 'foryou', label: p.tabForYou },
    { key: 'newest', label: p.tabNewest },
    { key: 'likes', label: p.tabLikes },
  ];

  const [sort, setSort] = useState<SortType>('foryou');
  const [list, setList] = useState<WorkItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const fetchPage = useCallback(async (params: WorksListParams, append: boolean) => {
    try {
      const res = await getWorksList(params);
      if (res.data) {
        setList(prev => append ? [...prev, ...res.data!.list] : res.data!.list);
        setHasMore(res.data.hasMore);
      }
    } catch (e) {
      Toast.show({ content: (e as Error).message, icon: 'fail' });
    }
  }, []);

  // 切换 tab 时重置
  useEffect(() => {
    setPage(1);
    setHasMore(false);
    if (list.length === 0) {
      setLoading(true);
      fetchPage({ sort, page: 1, limit: PAGE_SIZE }, false).finally(() => setLoading(false));
    } else {
      setTransitioning(true);
      fetchPage({ sort, page: 1, limit: PAGE_SIZE }, false).finally(() => setTransitioning(false));
    }
  }, [sort]); // eslint-disable-line react-hooks/exhaustive-deps

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    if (openMenuId) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [openMenuId]);

  const handleLoadMore = async () => {
    const nextPage = page + 1;
    setLoadingMore(true);
    await fetchPage({ sort, page: nextPage, limit: PAGE_SIZE }, true);
    setPage(nextPage);
    setLoadingMore(false);
  };

  const handleTabChange = (key: SortType) => {
    if (key !== sort) setSort(key);
  };

  const handleToggleMenu = (e: React.MouseEvent, workId: string) => {
    e.stopPropagation();
    setOpenMenuId(prev => prev === workId ? null : workId);
  };

  const handleSetPrivacy = async (e: React.MouseEvent, work: WorkItem) => {
    e.stopPropagation();
    setOpenMenuId(null);
    const isPrivate = !work.is_private;
    try {
      await updateWorkPrivacy(work.id, isPrivate);
      setList(prev => prev.map(w => w.id === work.id ? { ...w, is_private: isPrivate ? 1 : 0 } : w));
      Toast.show({ content: isPrivate ? p.setPrivate : p.setPublic, icon: 'success' });
    } catch (e) {
      Toast.show({ content: (e as Error).message, icon: 'fail' });
    }
  };

  const handleDelete = async (e: React.MouseEvent, workId: string) => {
    e.stopPropagation();
    setOpenMenuId(null);
    const confirmed = await Dialog.confirm({ content: p.deleteConfirm });
    if (!confirmed) return;
    try {
      await deleteWork(workId);
      setList(prev => prev.filter(w => w.id !== workId));
      Toast.show({ content: p.deleteWork, icon: 'success' });
    } catch (e) {
      Toast.show({ content: (e as Error).message, icon: 'fail' });
    }
  };

  const fullUrl = (url: string) => (url?.startsWith('http') ? url : `${window.location.origin}${url || ''}`);

  return (
    <div className="plaza-page">
      <div className="plaza-bg" />

      <div className="plaza-header">
        <h1 className="plaza-header-title">{p.title}</h1>
        <p className="plaza-header-desc">{p.desc}</p>
      </div>

      <div className="plaza-tabs">
        {tabs.map(tab => (
          <button
            key={tab.key}
            type="button"
            className={`plaza-tab${sort === tab.key ? ' plaza-tab--active' : ''}`}
            onClick={() => handleTabChange(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="plaza-loading">
          <DotLoading color="primary" />
          <p>{p.loading}</p>
        </div>
      ) : list.length === 0 ? (
        <div className="plaza-empty">
          <div className="plaza-empty-icon">✦</div>
          <p>{p.empty}</p>
        </div>
      ) : (
        <div className={`plaza-content${transitioning ? ' plaza-content--loading' : ''}`}>
          <div className="plaza-grid">
            {list.map((work) => (
              <button
                key={work.id}
                type="button"
                className={`plaza-card${work.is_private ? ' plaza-card--private' : ''}`}
                onClick={() => navigate(`/works/${work.id}`)}
              >
                <div className="plaza-card-cover">
                  {work.cover_url ? (
                    <div
                      className="plaza-card-img"
                      style={{ backgroundImage: `url(${fullUrl(work.cover_url)})` }}
                    />
                  ) : (
                    <div className="plaza-card-video-wrap">
                      <video
                        src={fullUrl(work.video_url)}
                        muted
                        playsInline
                        preload="metadata"
                        className="plaza-card-video"
                      />
                    </div>
                  )}
                  <div className="plaza-card-overlay" />
                  {work.is_private ? (
                    <span className="plaza-card-private-badge">{p.privateLabel}</span>
                  ) : (
                    <span className="plaza-card-likes">♥ {work.like_count ?? 0}</span>
                  )}

                  {/* 仅自己的作品显示管理按钮 */}
                  {user && work.user_id === user.id && (
                    <div
                      className="plaza-card-menu-wrap"
                      ref={openMenuId === work.id ? menuRef : null}
                    >
                      <button
                        type="button"
                        className="plaza-card-menu-btn"
                        onClick={(e) => handleToggleMenu(e, work.id)}
                      >
                        ⋯
                      </button>
                      {openMenuId === work.id && (
                        <div className="plaza-card-menu">
                          <button
                            type="button"
                            className="plaza-card-menu-item"
                            onClick={(e) => handleSetPrivacy(e, work)}
                          >
                            {work.is_private ? p.setPublic : p.setPrivate}
                          </button>
                          <button
                            type="button"
                            className="plaza-card-menu-item plaza-card-menu-item--danger"
                            onClick={(e) => handleDelete(e, work.id)}
                          >
                            {p.deleteWork}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="plaza-card-body">
                  <div className="plaza-card-title">{work.title}</div>
                  <div className="plaza-card-author">
                    <span className="plaza-card-avatar">{work.author?.[0]?.toUpperCase() ?? '?'}</span>
                    {work.author}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {hasMore && (
            <div className="plaza-load-more">
              <button
                type="button"
                className="plaza-load-more-btn"
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? <DotLoading color="primary" /> : p.loadMore}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
