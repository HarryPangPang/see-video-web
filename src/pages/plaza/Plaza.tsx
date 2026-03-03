import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DotLoading, Toast } from 'antd-mobile';
import { getWorksList, type WorkItem, type WorksListParams } from '../../services/api';
import { useI18n } from '../../context/I18nContext';
import './Plaza.scss';

type SortType = 'foryou' | 'newest' | 'likes';

const PAGE_SIZE = 20;

export function Plaza() {
  const navigate = useNavigate();
  const { t } = useI18n();
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
                  <span className="plaza-card-likes">♥ {work.like_count ?? 0}</span>
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
