import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DotLoading, Toast, SearchBar } from 'antd-mobile';
import { getWorksList, deleteWork, updateWorkPrivacy, type WorkItem, type WorksListParams } from '../../services/api';
import { useI18n } from '../../context/I18nContext';
import { useAuth } from '../../context/AuthContext';
import { LoginDialog } from '../../components/LoginDialog';
import './My.scss';

type MyTab = 'published' | 'uploads' | 'private';

const PAGE_SIZE = 20;

type TabData = { list: WorkItem[]; page: number; hasMore: boolean };
const EMPTY_TAB: TabData = { list: [], page: 0, hasMore: true };

function MyCardMedia({ videoUrl, coverUrl, fullUrl }: {
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
    <div className="my-card-media" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <div
        className="my-card-img"
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
        className="my-card-video"
        style={{ opacity: playing ? 1 : 0 }}
        onPlaying={() => { if (wantPlayRef.current) setPlaying(true); }}
      />
    </div>
  );
}

export function My() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const p = t.seedance.my;
  const plaza = t.seedance.plaza;

  const [tab, setTab] = useState<MyTab>('published');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [tabData, setTabData] = useState<Record<MyTab, TabData>>({
    published: { ...EMPTY_TAB },
    uploads: { ...EMPTY_TAB },
    private: { ...EMPTY_TAB },
  });
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [loginVisible, setLoginVisible] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  const fetchingRef = useRef(false);
  const initializedRef = useRef<Set<MyTab>>(new Set());
  const prevUserIdRef = useRef<number | null>(null);

  const fullUrl = (url: string) => (url?.startsWith('http') ? url : `${window.location.origin}${url || ''}`);
  const displayAuthor = (author: string | undefined) => {
    if (!author) return '?';
    return author.includes('@') ? author.split('@')[0] : author;
  };

  // Reset all tab caches on user change (logout / switch account)
  useEffect(() => {
    const uid = user?.id ?? null;
    if (prevUserIdRef.current !== null && prevUserIdRef.current !== uid) {
      initializedRef.current.clear();
      setTabData({
        published: { ...EMPTY_TAB },
        uploads: { ...EMPTY_TAB },
        private: { ...EMPTY_TAB },
      });
    }
    prevUserIdRef.current = uid;
  }, [user]);

  const fetchPage = useCallback(async (t: MyTab, page: number) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    const isFirst = page === 1;
    if (isFirst) setLoading(true); else setLoadingMore(true);
    try {
      const params: WorksListParams = { mine: true, page, limit: PAGE_SIZE };
      if (t === 'published') params.isPrivate = false;
      else if (t === 'private') params.isPrivate = true;
      else params.source = 'upload';

      const res = await getWorksList(params);
      if (res.data) {
        if (isFirst) initializedRef.current.add(t);
        setTabData(prev => ({
          ...prev,
          [t]: {
            list: isFirst ? res.data!.list : [...prev[t].list, ...res.data!.list],
            page,
            hasMore: res.data!.hasMore,
          },
        }));
      }
    } catch (e) {
      Toast.show({ content: (e as Error).message, icon: 'fail' });
    } finally {
      if (isFirst) setLoading(false); else setLoadingMore(false);
      fetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoginVisible(true); return; }
    if (!initializedRef.current.has(tab)) {
      fetchPage(tab, 1);
    }
  }, [tab, user, authLoading, fetchPage]);

  useEffect(() => {
    if (!openMenuId) return;
    const handle = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpenMenuId(null);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [openMenuId]);

  const resetTab = (t: MyTab) => {
    initializedRef.current.delete(t);
    setTabData(prev => ({ ...prev, [t]: { ...EMPTY_TAB } }));
  };

  const handleTogglePrivacy = async (work: WorkItem) => {
    setOpenMenuId(null);
    const newPrivate = !work.is_private;
    try {
      await updateWorkPrivacy(work.id, !!newPrivate);
      if (tab === 'published') {
        setTabData(prev => ({ ...prev, published: { ...prev.published, list: prev.published.list.filter(w => w.id !== work.id) } }));
        resetTab('private');
      } else if (tab === 'private') {
        setTabData(prev => ({ ...prev, private: { ...prev.private, list: prev.private.list.filter(w => w.id !== work.id) } }));
        resetTab('published');
      } else {
        setTabData(prev => ({ ...prev, uploads: { ...prev.uploads, list: prev.uploads.list.map(w => w.id === work.id ? { ...w, is_private: newPrivate ? 1 : 0 } : w) } }));
        // making private → published is stale; making public → private is stale
        resetTab(newPrivate ? 'published' : 'private');
      }
      Toast.show({ content: newPrivate ? plaza.setPrivate : plaza.setPublic, icon: 'success' });
    } catch (e) {
      Toast.show({ content: (e as Error).message, icon: 'fail' });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    const id = deleteTarget;
    setDeleteTarget(null);
    try {
      await deleteWork(id);
      // Filter from all tab lists without resetting pagination
      setTabData(prev => ({
        published: { ...prev.published, list: prev.published.list.filter(w => w.id !== id) },
        uploads: { ...prev.uploads, list: prev.uploads.list.filter(w => w.id !== id) },
        private: { ...prev.private, list: prev.private.list.filter(w => w.id !== id) },
      }));
      Toast.show({ content: plaza.deleteWork, icon: 'success' });
    } catch (e) {
      Toast.show({ content: (e as Error).message, icon: 'fail' });
    }
  };

  const handleLoadMore = () => {
    const data = tabData[tab];
    if (!data.hasMore || loadingMore || fetchingRef.current) return;
    fetchPage(tab, data.page + 1);
  };

  const currentData = tabData[tab];
  const kw = searchKeyword.trim().toLowerCase();
  const displayList = kw ? currentData.list.filter(w => (w.title || '').toLowerCase().includes(kw)) : currentData.list;
  const emptyText = tab === 'published' ? p.emptyPublished : tab === 'uploads' ? p.emptyUploads : p.emptyPrivate;

  const tabs: { key: MyTab; label: string }[] = [
    { key: 'published', label: p.tabPublished },
    { key: 'uploads', label: p.tabUploads },
    { key: 'private', label: p.tabPrivate },
  ];

  return (
    <div className="my-page">
      <LoginDialog visible={loginVisible} onClose={() => setLoginVisible(false)} />

      <div className="my-top-actions">
        <div className="my-search-wrap">
          <SearchBar placeholder={t.common.searchPlaceholder} value={searchKeyword} onChange={setSearchKeyword} className="my-search" />
        </div>
      </div>

      <div className="my-tabs">
        {tabs.map(item => (
          <button
            key={item.key}
            type="button"
            className={`my-tab${tab === item.key ? ' my-tab--active' : ''}`}
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="my-loading">
          <DotLoading color="primary" />
          <p>{p.loading}</p>
        </div>
      ) : displayList.length === 0 ? (
        <div className="my-empty">
          <div className="my-empty-icon">✦</div>
          <p>{emptyText}</p>
        </div>
      ) : (
        <>
          <div className="my-grid">
            {displayList.map((work) => (
              <button
                key={work.id}
                type="button"
                className="my-card"
                onClick={() => navigate(`/works/${work.id}`)}
              >
                <div className="my-card-cover">
                  <MyCardMedia
                    videoUrl={work.video_url}
                    coverUrl={work.cover_url ?? undefined}
                    fullUrl={fullUrl}
                  />
                  <div className="my-card-overlay" />

                  {!!work.is_private && (
                    <span className="my-card-private-badge">{plaza.privateLabel}</span>
                  )}

                  <div
                    className="my-card-menu-wrap"
                    ref={openMenuId === work.id ? menuRef : null}
                  >
                    <button
                      type="button"
                      className="my-card-menu-btn"
                      onClick={e => { e.stopPropagation(); setOpenMenuId(prev => prev === work.id ? null : work.id); }}
                    >⋯</button>
                    {openMenuId === work.id && (
                      <div className="my-card-menu">
                        <button
                          type="button"
                          className="my-card-menu-item"
                          onClick={e => { e.stopPropagation(); handleTogglePrivacy(work); }}
                        >
                          {work.is_private ? plaza.setPublic : plaza.setPrivate}
                        </button>
                        <button
                          type="button"
                          className="my-card-menu-item my-card-menu-item--danger"
                          onClick={e => { e.stopPropagation(); setOpenMenuId(null); setDeleteTarget(work.id); }}
                        >
                          {plaza.deleteWork}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="my-card-body">
                  <div className="my-card-title">{work.title || '—'}</div>
                  <div className="my-card-author">
                    <span className="my-card-avatar">{displayAuthor(work.author)?.[0]?.toUpperCase() ?? '?'}</span>
                    {displayAuthor(work.author)}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="my-load-more">
            {currentData.hasMore ? (
              <button
                type="button"
                className="my-load-more-btn"
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? <DotLoading color="primary" /> : p.loadMore}
              </button>
            ) : (
              <span className="my-no-more">{p.noMore}</span>
            )}
          </div>
        </>
      )}

      {deleteTarget && (
        <div className="my-confirm-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="my-confirm-dialog" onClick={e => e.stopPropagation()}>
            <div className="my-confirm-icon">🗑</div>
            <h3 className="my-confirm-title">{plaza.deleteWork}</h3>
            <p className="my-confirm-desc">{plaza.deleteConfirm}</p>
            <div className="my-confirm-actions">
              <button type="button" className="my-confirm-btn my-confirm-btn--cancel" onClick={() => setDeleteTarget(null)}>
                {plaza.deleteCancel}
              </button>
              <button type="button" className="my-confirm-btn my-confirm-btn--danger" onClick={handleDeleteConfirm}>
                {plaza.deleteConfirmBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
