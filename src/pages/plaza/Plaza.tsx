import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { DotLoading, Toast } from 'antd-mobile';
import { getWorksList, deleteWork, updateWorkPrivacy, likeWork, unlikeWork, hideWork, unhideWork, type WorkItem, type WorksListParams } from '../../services/api';
import { useI18n } from '../../context/I18nContext';
import { useAuth } from '../../context/AuthContext';
import { LoginDialog } from '../../components/LoginDialog';
import './Plaza.scss';

type SortType = 'foryou' | 'newest' | 'likes' | 'following';

// For You 列表模块级缓存（跨 tab 切换保持内容稳定，5 分钟 TTL）
const FORYOU_CACHE_TTL = 5 * 60 * 1000;
const foryouCache: { list: WorkItem[]; seed: number | null; page: number; hasMore: boolean; timestamp: number } = {
  list: [], seed: null, page: 1, hasMore: false, timestamp: 0,
};

/** 胖胖的实心爱心 SVG，与卡片点赞数同用 currentColor */
function PlumpHeartIcon() {
  return (
    <svg className="plaza-card-likes-heart-svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}

function PlazaCardMedia({ videoUrl, coverUrl, fullUrl }: {
  videoUrl: string;
  coverUrl?: string;
  fullUrl: (url: string) => string;
}) {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wantPlayRef = useRef(false);

  const handleMouseEnter = () => {
    timerRef.current = setTimeout(() => {
      wantPlayRef.current = true;
      const video = videoRef.current;
      if (!video) return;
      if (!video.src) video.src = fullUrl(videoUrl);
      video.play().catch(() => {});
    }, 200);
  };

  const handleMouseLeave = () => {
    wantPlayRef.current = false;
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    setPlaying(false);
    const video = videoRef.current;
    if (video) { video.pause(); video.currentTime = 0; }
  };

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return (
    <div className="plaza-card-media" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <div
        className="plaza-card-img"
        style={{
          backgroundImage: coverUrl ? `url(${fullUrl(coverUrl)})` : undefined,
          opacity: playing ? 0 : 1,
        }}
      />
      <video
        ref={videoRef}
        muted
        playsInline
        loop
        preload="none"
        className="plaza-card-video-preview"
        style={{ opacity: playing ? 1 : 0 }}
        onPlaying={() => { if (wantPlayRef.current) setPlaying(true); }}
      />
    </div>
  );
}

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
    { key: 'following', label: p.tabFollowing },
  ];

  const [sort, setSort] = useState<SortType>('foryou');
  const [list, setList] = useState<WorkItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [loginVisible, setLoginVisible] = useState(false);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const menuRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadMoreCallbackRef = useRef<() => void>(() => {});
  const followingSentinelRef = useRef<HTMLDivElement>(null);
  const followingLoadMoreCallbackRef = useRef<() => void>(() => {});

  // Following feed state
  const [followingList, setFollowingList] = useState<WorkItem[]>([]);
  const [followingPage, setFollowingPage] = useState(1);
  const [followingHasMore, setFollowingHasMore] = useState(true);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [followingLoadingMore, setFollowingLoadingMore] = useState(false);

  const foryouSeedRef = useRef<number | null>(null);

  const fetchPage = useCallback(async (params: WorksListParams, forceRefresh = false, append = false) => {
    if (params.sort === 'foryou' && forceRefresh) {
      foryouSeedRef.current = null; // 强制刷新时重置 seed，拿到全新顺序
    }
    if (params.sort === 'foryou' && !forceRefresh) {
      const age = Date.now() - foryouCache.timestamp;
      if (age < FORYOU_CACHE_TTL && foryouCache.list.length > 0) {
        setList([...foryouCache.list]);
        setHasMore(foryouCache.hasMore);
        setPage(foryouCache.page);
        foryouSeedRef.current = foryouCache.seed;
        return;
      }
    }
    // foryou 追加时带上当前 seed，保证分页顺序稳定
    const requestParams = (params.sort === 'foryou' && foryouSeedRef.current !== null)
      ? { ...params, seed: foryouSeedRef.current }
      : params;
    try {
      const res = await getWorksList(requestParams);
      if (res.data) {
        if (append) {
          setList(prev => [...prev, ...res.data!.list]);
        } else {
          setList(res.data.list);
        }
        setHasMore(!!res.data.hasMore);
        if (params.sort === 'foryou') {
          if (res.data.seed !== undefined) foryouSeedRef.current = res.data.seed;
          foryouCache.list = append ? [...foryouCache.list, ...res.data.list] : res.data.list;
          foryouCache.seed = foryouSeedRef.current;
          foryouCache.page = params.page ?? 1;
          foryouCache.hasMore = !!res.data.hasMore;
          foryouCache.timestamp = Date.now();
        }
      }
    } catch (e) {
      Toast.show({ content: (e as Error).message, icon: 'fail' });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchFollowingPage = useCallback(async (pg: number) => {
    const isFirst = pg === 1;
    if (isFirst) setFollowingLoading(true); else setFollowingLoadingMore(true);
    try {
      const res = await getWorksList({ sort: 'following', page: pg, limit: PAGE_SIZE });
      if (res.data) {
        setFollowingList(prev => isFirst ? res.data!.list : [...prev, ...res.data!.list]);
        setFollowingPage(pg);
        setFollowingHasMore(res.data!.hasMore);
      }
    } catch (e) {
      Toast.show({ content: (e as Error).message, icon: 'fail' });
    } finally {
      if (isFirst) setFollowingLoading(false); else setFollowingLoadingMore(false);
    }
  }, []);

  // 切换 tab 时加载对应数据
  useEffect(() => {
    if (sort === 'following') {
      fetchFollowingPage(1);
      return;
    }
    setList([]);
    setPage(1);
    setHasMore(false);
    setLoadingMore(false);
    setLoading(true);
    fetchPage({ sort, page: 1, limit: PAGE_SIZE }).finally(() => setLoading(false));
  }, [sort]); // eslint-disable-line react-hooks/exhaustive-deps

  // loadMore 函数（newest/likes 下拉加载下一页）
  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    await fetchPage({ sort, page: nextPage, limit: PAGE_SIZE }, false, true);
    setPage(nextPage);
    setLoadingMore(false);
  }, [hasMore, loadingMore, page, sort, fetchPage]);

  // 始终保持 ref 指向最新 loadMore，避免 IntersectionObserver 内闭包过期
  useEffect(() => { loadMoreCallbackRef.current = loadMore; });
  useEffect(() => {
    followingLoadMoreCallbackRef.current = () => {
      if (followingHasMore && !followingLoadingMore) fetchFollowingPage(followingPage + 1);
    };
  });

  // IntersectionObserver 监听哨兵元素，有更多数据时自动加载（foryou/newest/likes）
  useEffect(() => {
    if (sort === 'following') return;
    if (!hasMore || loading) return;
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMoreCallbackRef.current(); },
      { rootMargin: '200px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [sort, hasMore, loading]);

  // IntersectionObserver 监听哨兵元素（following）
  useEffect(() => {
    if (sort !== 'following') return;
    if (!followingHasMore || followingLoading) return;
    const sentinel = followingSentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) followingLoadMoreCallbackRef.current(); },
      { rootMargin: '200px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [sort, followingHasMore, followingLoading]);

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
      foryouCache.list = foryouCache.list.filter(w => w.id !== id);
      Toast.show({ content: p.deleteWork, icon: 'success' });
    } catch (e) {
      Toast.show({ content: (e as Error).message, icon: 'fail' });
    }
  };

  const handleHide = async (e: React.MouseEvent, workId: string) => {
    e.stopPropagation();
    if (!user) { setLoginVisible(true); return; }
    setOpenMenuId(null);
    setHiddenIds(prev => new Set(prev).add(workId));
    try {
      await hideWork(workId);
      foryouCache.list = foryouCache.list.filter(w => w.id !== workId);
    } catch {
      setHiddenIds(prev => { const s = new Set(prev); s.delete(workId); return s; });
    }
  };

  const handleUnhide = async (e: React.MouseEvent, workId: string) => {
    e.stopPropagation();
    setOpenMenuId(null);
    setHiddenIds(prev => { const s = new Set(prev); s.delete(workId); return s; });
    try {
      await unhideWork(workId);
      foryouCache.timestamp = 0; // 强制下次切回 For You 时重新拉取
    } catch {
      setHiddenIds(prev => new Set(prev).add(workId));
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

  const handleFollowingLike = async (e: React.MouseEvent, work: WorkItem) => {
    e.stopPropagation();
    if (!user) { setLoginVisible(true); return; }
    const liked = !work.liked;
    setFollowingList(prev => prev.map(w => w.id === work.id ? { ...w, liked, like_count: (w.like_count ?? 0) + (liked ? 1 : -1) } : w));
    try {
      const res = liked ? await likeWork(work.id) : await unlikeWork(work.id);
      if (res.data) setFollowingList(prev => prev.map(w => w.id === work.id ? { ...w, liked, like_count: res.data!.like_count } : w));
    } catch (e) {
      setFollowingList(prev => prev.map(w => w.id === work.id ? { ...w, liked: !liked, like_count: (w.like_count ?? 0) + (liked ? -1 : 1) } : w));
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

      {sort === 'following' ? (
        followingLoading ? (
          <div className="plaza-loading">
            <DotLoading color="primary" />
            <p>{p.loading}</p>
          </div>
        ) : followingList.length === 0 ? (
          <div className="plaza-empty">
            <div className="plaza-empty-icon">✦</div>
            <p>{p.emptyFollowing}</p>
          </div>
        ) : (
          <div className="plaza-content">
            <div className="plaza-grid">
              {followingList.map((work) => (
                <button
                  key={work.id}
                  type="button"
                  className="plaza-card"
                  onClick={() => navigate(`/works/${work.id}`)}
                >
                  <div className="plaza-card-cover">
                    <PlazaCardMedia
                      videoUrl={work.video_url}
                      coverUrl={work.cover_url ?? undefined}
                      fullUrl={fullUrl}
                    />
                    <div className="plaza-card-overlay" />
                    {user && work.user_id === user.id ? (
                      <span className="plaza-card-likes plaza-card-likes--own">
                        <span className="plaza-card-likes-heart"><PlumpHeartIcon /></span> {work.like_count ?? 0}
                      </span>
                    ) : (
                      <button
                        type="button"
                        className={`plaza-card-likes${work.liked ? ' plaza-card-likes--liked' : ''}`}
                        onClick={(e) => handleFollowingLike(e, work)}
                      >
                        <span className="plaza-card-likes-heart"><PlumpHeartIcon /></span> {work.like_count ?? 0}
                      </button>
                    )}
                  </div>
                  <div className="plaza-card-body">
                    <div className="plaza-card-title">{work.title || '—'}</div>
                    <div className="plaza-card-author">
                      <span className="plaza-card-avatar">{displayAuthor(work.author)?.[0]?.toUpperCase() ?? '?'}</span>
                      {displayAuthor(work.author)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <div className="plaza-load-more">
              {followingLoadingMore && <DotLoading color="primary" />}
              {!followingHasMore && followingList.length > 0 && <span className="plaza-no-more">{p.noMore}</span>}
              <div ref={followingSentinelRef} />
            </div>
          </div>
        )
      ) : loading ? (
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
            {list.map((work) => {
              const isHidden = hiddenIds.has(work.id);
              const isOwn = user && work.user_id === user.id;
              return (
              <button
                key={work.id}
                type="button"
                className={`plaza-card${isHidden ? ' plaza-card--hidden' : ''}`}
                onClick={() => !isHidden && navigate(`/works/${work.id}`)}
              >
                <div className="plaza-card-cover">
                  <PlazaCardMedia
                    videoUrl={work.video_url}
                    coverUrl={work.cover_url ?? undefined}
                    fullUrl={fullUrl}
                  />
                  <div className="plaza-card-overlay" />
                  {!isOwn && (
                    <button
                      type="button"
                      className={`plaza-card-likes${work.liked ? ' plaza-card-likes--liked' : ''}`}
                      onClick={(e) => handleCardLike(e, work)}
                    >
                      <span className="plaza-card-likes-heart"><PlumpHeartIcon /></span> {work.like_count ?? 0}
                    </button>
                  )}
                  {isOwn && (
                    <span className="plaza-card-likes plaza-card-likes--own">
                      <span className="plaza-card-likes-heart"><PlumpHeartIcon /></span> {work.like_count ?? 0}
                    </span>
                  )}

                  {!!work.is_private && (
                    <span className="plaza-card-private-badge">{p.privateLabel}</span>
                  )}

                  {user && (
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
                          {isOwn ? (
                            <>
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
                                onClick={(e) => handleDeleteRequest(e, work.id)}
                              >
                                {p.deleteWork}
                              </button>
                            </>
                          ) : isHidden ? (
                            <button
                              type="button"
                              className="plaza-card-menu-item"
                              onClick={(e) => handleUnhide(e, work.id)}
                            >
                              {p.undoHide}
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="plaza-card-menu-item"
                              onClick={(e) => handleHide(e, work.id)}
                            >
                              {p.notInterested}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {isHidden && (
                    <div className="plaza-card-hidden-overlay" onClick={(e) => e.stopPropagation()}>
                      <span className="plaza-card-hidden-label">{p.hiddenLabel}</span>
                      <button
                        type="button"
                        className="plaza-card-hidden-undo"
                        onClick={(e) => handleUnhide(e, work.id)}
                      >
                        {p.undoHide}
                      </button>
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
            ); })}
          </div>

          <div className="plaza-load-more">
            {loadingMore && <DotLoading color="primary" />}
            {!hasMore && list.length > 0 && (
              sort === 'foryou' ? (
                <button
                  type="button"
                  className={`plaza-refresh-btn${transitioning ? ' plaza-refresh-btn--spinning' : ''}`}
                  onClick={async () => {
                    if (transitioning) return;
                    setTransitioning(true);
                    setList([]);
                    setPage(1);
                    await fetchPage({ sort: 'foryou', page: 1, limit: PAGE_SIZE }, true);
                    setTransitioning(false);
                  }}
                  disabled={transitioning}
                >
                  <span className="plaza-refresh-icon">↻</span>
                  {p.refreshFeed}
                </button>
              ) : (
                <span className="plaza-no-more">{p.noMore}</span>
              )
            )}
            <div ref={sentinelRef} />
          </div>
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
