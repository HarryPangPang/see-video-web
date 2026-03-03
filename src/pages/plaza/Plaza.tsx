import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DotLoading, Toast } from 'antd-mobile';
import { getWorksList, type WorkItem } from '../../services/api';
import './Plaza.scss';

export function Plaza() {
  const navigate = useNavigate();
  const [list, setList] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await getWorksList();
        if (res.data?.list) setList(res.data.list);
      } catch (e) {
        Toast.show({ content: (e as Error).message, icon: 'fail' });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const fullUrl = (url: string) => (url?.startsWith('http') ? url : `${window.location.origin}${url || ''}`);

  return (
    <div className="plaza-page">
      <div className="plaza-header">
        <h1>Plaza</h1>
        <p className="plaza-desc">Discover published works from the community.</p>
      </div>
      {loading ? (
        <div className="plaza-loading">
          <DotLoading color="primary" />
          <p>Loading...</p>
        </div>
      ) : list.length === 0 ? (
        <div className="plaza-empty">
          <p>No works yet. Be the first to publish!</p>
        </div>
      ) : (
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
                <span className="plaza-card-likes">♥ {work.like_count ?? 0}</span>
              </div>
              <div className="plaza-card-body">
                <div className="plaza-card-title">{work.title}</div>
                <div className="plaza-card-author">by {work.author}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
