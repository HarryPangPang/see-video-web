import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { DotLoading, Toast } from 'antd-mobile';
import { getWorksList, deleteWork, updateWorkPrivacy, likeWork, unlikeWork, type WorkItem, type WorksListParams } from '../../services/api';
import { useI18n } from '../../context/I18nContext';
import { useAuth } from '../../context/AuthContext';
import { LoginDialog } from '../../components/LoginDialog';
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
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [loginVisible, setLoginVisible] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const totalPages = total > 0 ? Math.ceil(total / PAGE_SIZE) : 1;

  const fetchPage = useCallback(async (params: WorksListParams) => {
    try {
      const res = await getWorksList(params);
      if (res.data) {
        setList(res.data.list);
        setTotal(res.data.total);
      }
    } catch (e) {
      Toast.show({ content: (e as Error).message, icon: 'fail' });
    }
  }, []);

  // 切换 tab 时重置到第 1 页
  useEffect(() => {
    setPage(1);
    if (list.length === 0) {
      setLoading(true);
      fetchPage({ sort, page: 1, limit: PAGE_SIZE }).finally(() => setLoading(false));
    } else {
      setTransitioning(true);
      fetchPage({ sort, page: 1, limit: PAGE_SIZE }).finally(() => setTransitioning(false));
    }
  }, [sort]); // eslint-disable-line react-hooks/exhaustive-deps

  // 点击外部关闭卡片菜单
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    };
    if (openMenuId) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [openMenuId]);

  const handleTabChange = (key: SortType) => {
    if (key !== sort) setSort(key);
  };

  const handlePrevPage = async () => {
    if (page <= 1 || transitioning) return;
    const prevPage = page - 1;
    setTransitioning(true);
    await fetchPage({ sort, page: prevPage, limit: PAGE_SIZE });
    setPage(prevPage);
    setTransitioning(false);
  };

  const handleNextPage = async () => {
    if (page >= totalPages || transitioning) return;
    const nextPage = page + 1;
    setTransitioning(true);
    await fetchPage({ sort, page: nextPage, limit: PAGE_SIZE });
    setPage(nextPage);
    setTransitioning(false);
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
      // 设为私密时立即从广场移除；设为公开不会出现在此（该操作在 Assets 里完成）
      if (isPrivate) {
        setList(prev => prev.filter(w => w.id !== work.id));
      } else {
        setList(prev => prev.map(w => w.id === work.id ? { ...w, is_private: 0 } : w));
      }
      Toast.show({ content: isPrivate ? p.setPrivate : p.setPublic, icon: 'success' });
    } catch (e) {
      Toast.show({ content: (e as Error).message, icon: 'fail' });
    }
  };

  const handleDeleteRequest = (e: React.MouseEvent, workId: string) => {
    e.stopPropagation();
    setOpenMenuId(null);
    setDeleteTarget(workId);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget;
    setDeleteTarget(null);
    try {
      await deleteWork(id);
      setList(prev => prev.filter(w => w.id !== id));
      Toast.show({ content: p.deleteWork, icon: 'success' });
    } catch (e) {
      Toast.show({ content: (e as Error).message, icon: 'fail' });
    }
  };

  const handleCardLike = async (e: React.MouseEvent, work: WorkItem) => {
    e.stopPropagation();
    if (!user) {
      setLoginVisible(true);
      return;
    }
    const liked = !work.liked;
    setList(prev => prev.map(w => w.id === work.id ? { ...w, liked, like_count: (w.like_count ?? 0) + (liked ? 1 : -1) } : w));
    try {
      const res = liked ? await likeWork(work.id) : await unlikeWork(work.id);
      if (res.data) {
        setList(prev => prev.map(w => w.id === work.id ? { ...w, liked, like_count: res.data!.like_count } : w));
      }
    } catch (e) {
      setList(prev => prev.map(w => w.id === work.id ? { ...w, liked: !liked, like_count: (w.like_count ?? 0) + (liked ? -1 : 1) } : w));
      Toast.show({ content: (e as Error).message, icon: 'fail' });
    }
  };

  const fullUrl = (url: string) => (url?.startsWith('http') ? url : `${window.location.origin}${url || ''}`);
  const displayAuthor = (author: string | undefined) => {
    if (!author) return '?';
    return author.includes('@') ? author.split('@')[0] : author;
  };

  return (
    <div className="plaza-page">
      <LoginDialog visible={loginVisible} onClose={() => setLoginVisible(false)} />
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
                className="plaza-card"
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
                  <button
                    type="button"
                    className={`plaza-card-likes${work.liked ? ' plaza-card-likes--liked' : ''}`}
                    onClick={(e) => handleCardLike(e, work)}
                  >
                    ♥ {work.like_count ?? 0}
                  </button>

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
                            {p.setPrivate}
                          </button>
                          <button
                            type="button"
                            className="plaza-card-menu-item plaza-card-menu-item--danger"
                            onClick={(e) => handleDeleteRequest(e, work.id)}
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
                    <span className="plaza-card-avatar">{displayAuthor(work.author)?.[0]?.toUpperCase() ?? '?'}</span>
                    {displayAuthor(work.author)}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {sort === 'foryou' && list.length >= PAGE_SIZE && (
            <div className="plaza-refresh-bar">
              <button
                type="button"
                className={`plaza-refresh-btn${transitioning ? ' plaza-refresh-btn--spinning' : ''}`}
                onClick={async () => {
                  if (transitioning) return;
                  setTransitioning(true);
                  await fetchPage({ sort: 'foryou', page: 1, limit: PAGE_SIZE });
                  setTransitioning(false);
                }}
                disabled={transitioning}
              >
                <span className="plaza-refresh-icon">↻</span>
                {p.refreshFeed}
              </button>
            </div>
          )}
          {sort !== 'foryou' && totalPages > 1 && (
            <div className="plaza-pagination">
              <button
                type="button"
                className="plaza-page-btn"
                onClick={handlePrevPage}
                disabled={page <= 1 || transitioning}
              >
                ← {p.prevPage}
              </button>
              <span className="plaza-page-info">{page} / {totalPages}</span>
              <button
                type="button"
                className="plaza-page-btn"
                onClick={handleNextPage}
                disabled={page >= totalPages || transitioning}
              >
                {p.nextPage} →
              </button>
            </div>
          )}
        </div>
      )}

      {deleteTarget && (
        <div className="plaza-confirm-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="plaza-confirm-dialog" onClick={e => e.stopPropagation()}>
            <div className="plaza-confirm-icon">🗑</div>
            <h3 className="plaza-confirm-title">{p.deleteWork}</h3>
            <p className="plaza-confirm-desc">{p.deleteConfirm}</p>
            <div className="plaza-confirm-actions">
              <button
                type="button"
                className="plaza-confirm-btn plaza-confirm-btn--cancel"
                onClick={() => setDeleteTarget(null)}
              >
                {p.deleteCancel}
              </button>
              <button
                type="button"
                className="plaza-confirm-btn plaza-confirm-btn--danger"
                onClick={handleDeleteConfirm}
              >
                {p.deleteConfirmBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
