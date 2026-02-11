import React, { useState } from 'react';
import { Tabs, SearchBar } from 'antd-mobile';
import { useI18n } from '../../context/I18nContext';
import './Assets.scss';

const videoThumb = 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400';

export function Assets() {
  const { t } = useI18n();
  const p = t.seedance.pages;
  const [contentTab, setContentTab] = useState('videos');
  const [filterTab, setFilterTab] = useState('all');
  const [searchKeyword, setSearchKeyword] = useState('');

  const videoList = [
    { id: '1', date: '12月16日', thumb: videoThumb, duration: '00:05' },
  ];

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
        {videoList.length === 0 ? (
          <div className="assets-empty">
            <p>{p.assetsDesc}</p>
          </div>
        ) : (
          <>
            <div className="assets-date-group">
              <div className="assets-date-label">{videoList[0].date}</div>
              <div className="assets-video-grid">
                {videoList.map((v) => (
                  <div key={v.id} className="assets-video-item">
                    <div className="assets-video-thumb" style={{ backgroundImage: `url(${v.thumb})` }}>
                      <span className="assets-video-duration">{v.duration}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
