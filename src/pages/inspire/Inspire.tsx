import React, { useState } from 'react';
import { Tabs, SearchBar, Card, Grid } from 'antd-mobile';
import { useI18n } from '../../context/I18nContext';
import { useNavigate } from 'react-router-dom';
import { IconArrowUp } from '../../components/Icons';
import './Inspire.scss';

const demoSrc = 'https://images.unsplash.com/photo-1567945716310-4745a6b7844f?w=200';

export function Inspire() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const p = t.seedance.pages;
  const g = t.seedance.generate;
  const [discoverTab, setDiscoverTab] = useState('discover');
  const [searchKeyword, setSearchKeyword] = useState('');

  const featureCards = [
    { key: 'canvas', title: g.featureCanvas, desc: g.featureCanvasDesc, icon: '🦄', badge: undefined },
    { key: 'image', title: g.featureImage, desc: g.featureImageDesc, icon: '', badge: '4.1' },
    { key: 'video', title: g.featureVideo, desc: g.featureVideoDesc, icon: '', badge: '3.5 PRO', toGenerate: true },
    { key: 'human', title: g.featureHuman, desc: g.featureHumanDesc, icon: '👤', badge: undefined },
    { key: 'action', title: g.featureAction, desc: g.featureActionDesc, icon: '🏃', badge: undefined },
  ];

  const discoverItems = [
    { id: 1, thumb: demoSrc, title: g.discoverItemExample },
    { id: 2, thumb: demoSrc, title: '' },
    { id: 3, thumb: demoSrc, title: '' },
    { id: 4, thumb: demoSrc, title: '' },
    { id: 5, thumb: demoSrc, title: '' },
    { id: 6, thumb: demoSrc, title: '' },
  ];

  return (
    <div className="inspire-page">
      <div className="inspire-header">
        <h1 className="inspire-title">
          {p.inspireHeader} 
        </h1>
      </div>

  
      <div className="inspire-mode-bar">
        <div className="mode-item mode-dropdown">
          <span>{p.agentMode}</span>
          <span className="arrow">▼</span>
        </div>
        <div className="mode-item">{p.auto}</div>
        <div className="mode-item mode-search">
          <SearchBar placeholder={p.inspirationSearch} className="inspire-search-inline" />
        </div>
        <div className="mode-item">
          <span className="mode-pin">📍</span> {p.creativeDesign}
        </div>
      </div>

      <div className="inspire-feature-cards">
        <Grid columns={5} gap={12}>
          {featureCards.map((item) => (
            <Grid.Item key={item.key}>
              <Card
                className={`feature-card ${item.toGenerate ? 'feature-video' : ''}`}
                onClick={() => item.toGenerate && navigate('/')}
              >
                <div className="feature-card-icon">
                  {item.badge ? <span className="badge">{item.badge}</span> : item.icon}
                </div>
                <div className="feature-card-title">{item.title}</div>
                <div className="feature-card-desc">{item.desc}</div>
              </Card>
            </Grid.Item>
          ))}
        </Grid>
      </div>

      <div className="inspire-discover">
        <div className="discover-tabs-row">
          <Tabs activeKey={discoverTab} onChange={(k) => setDiscoverTab(k as string)} className="discover-tabs">
            <Tabs.Tab title={g.discoverDiscover} key="discover" />
            <Tabs.Tab title={g.discoverShorts} key="shorts" />
            <Tabs.Tab title={g.discoverActivities} key="activities" />
          </Tabs>
          <div className="discover-search-wrap">
            <SearchBar placeholder={g.searchPlaceholder} value={searchKeyword} onChange={setSearchKeyword} className="discover-search" />
          </div>
        </div>
        <div className="discover-grid">
          {discoverItems.map((item) => (
            <div key={item.id} className="discover-item">
              <div className="discover-item-thumb" style={{ backgroundImage: `url(${item.thumb})` }} />
              {item.title ? <div className="discover-item-title">{item.title}</div> : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
