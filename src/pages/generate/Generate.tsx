import React, { useState } from 'react';
import { Button, TextArea, ImageUploader, SearchBar } from 'antd-mobile';
import type { ImageUploadItem } from 'antd-mobile/es/components/image-uploader';
import { IconArrowUp, IconRefresh, IconCube, IconDoc, IconRect, IconClock } from '../../components/Icons';
import { useI18n } from '../../context/I18nContext';
import './Generate.scss';

const demoSrc = 'https://images.unsplash.com/photo-1567945716310-4745a6b7844f?w=400';
const videoThumb = 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400';

export function Generate() {
  const { t } = useI18n();
  const g = t.seedance.generate;
  const p = t.seedance.pages;
  const [startFrame, setStartFrame] = useState<ImageUploadItem[]>([]);
  const [endFrame, setEndFrame] = useState<ImageUploadItem[]>([]);
  const [prompt, setPrompt] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const mockUpload = (file: File): Promise<ImageUploadItem> =>
    new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      setTimeout(() => resolve({ url }), 300);
    });

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await new Promise((r) => setTimeout(r, 1500));
    } finally {
      setSubmitting(false);
    }
  };

  const generatedVideos = [
    { id: '1', date: '12月16日', prompt: '天空失去颜色的那一天...', thumb: videoThumb, duration: '00:05', version: p.videoMetaVersion },
  ];

  return (
    <div className="generate-page">
      <div className="generate-top-bar">
        <SearchBar placeholder={p.inspirationSearch} className="generate-search" />
        <div className="generate-filters">
          <div className="filter-item"><span>{p.filterTime}</span> <span className="arrow">▼</span></div>
          <div className="filter-item"><span>{p.filterGenType}</span> <span className="arrow">▼</span></div>
          <div className="filter-item"><span>{p.filterOpType}</span> <span className="arrow">▼</span></div>
        </div>
      </div>

      {generatedVideos.length > 0 && (
        <div className="generate-result-section">
          {generatedVideos.map((v) => (
            <div key={v.id} className="generate-result-card">
              <div className="result-date">{v.date}</div>
              <p className="result-prompt">{v.prompt}</p>
              <div className="result-meta">
                <span>{v.version}</span>
                <span>{g.paramDuration}</span>
                <span className="result-details">{p.details} ℹ</span>
              </div>
              <div className="result-thumb" style={{ backgroundImage: `url(${v.thumb})` }} />
              <div className="result-actions">
                <Button size="small" className="result-btn">
                  <IconRefresh style={{ width: 16, height: 16 }} /> {p.reEdit}
                </Button>
                <Button size="small" color="primary" className="result-btn">
                  <IconRefresh style={{ width: 16, height: 16 }} /> {p.generateAgain}
                </Button>
                <span className="result-more">⋯</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="generate-card generate-input-card">
        <div className="card-row">
          <div className="frame-upload-section">
            <div className="frame-upload-box">
              <ImageUploader
                value={startFrame}
                onChange={setStartFrame}
                upload={mockUpload}
                maxCount={1}
                accept="image/*"
                className="frame-uploader"
              >
                <div className="frame-placeholder">
                  <span className="frame-plus">+</span>
                  <span className="frame-label">{g.startFrame}</span>
                </div>
              </ImageUploader>
            </div>
            <span className="frame-equals">=</span>
            <div className="frame-upload-box">
              <ImageUploader
                value={endFrame}
                onChange={setEndFrame}
                upload={mockUpload}
                maxCount={1}
                accept="image/*"
                className="frame-uploader"
              >
                <div className="frame-placeholder">
                  <span className="frame-plus">+</span>
                  <span className="frame-label">{g.endFrame}</span>
                </div>
              </ImageUploader>
            </div>
          </div>
          <div className="prompt-section">
            <TextArea
              value={prompt}
              onChange={setPrompt}
              placeholder={g.promptPlaceholder}
              rows={4}
              className="prompt-textarea"
              autoSize={{ minRows: 4, maxRows: 6 }}
            />
            <div className="submit-row">
              <Button color="primary" loading={submitting} onClick={handleSubmit} className="submit-btn">
                <IconArrowUp className="submit-icon" />
                <span>{g.submitPoints}</span>
              </Button>
            </div>
          </div>
        </div>
        <div className="params-row">
          <div className="param-item"><IconRefresh className="param-icon" /><span>{g.paramVideo}</span><span className="param-arrow">▼</span></div>
          <div className="param-item"><IconCube className="param-icon" /><span>{g.paramModel}</span><span className="param-arrow">▼</span></div>
          <div className="param-item"><IconDoc className="param-icon" /><span>{g.paramFrames}</span><span className="param-arrow">▼</span></div>
          <div className="param-item"><IconRect className="param-icon" /><span>{g.paramRatio}</span><span className="param-arrow">▼</span></div>
          <div className="param-item"><IconClock className="param-icon" /><span>{g.paramDuration}</span><span className="param-arrow">▼</span></div>
        </div>
      </div>

      <div className="generate-bottom-bar">
        <div className="bottom-placeholder">
          <span className="bp-plus">+</span>
          <span>{p.announcement}</span>
        </div>
        <div className="bottom-mode-row">
          <span className="mode-dropdown">{p.agentMode} ▼</span>
          <span className="mode-auto">{p.auto}</span>
          <span>{p.inspirationSearch}</span>
          <span>📍 {p.creativeDesign}</span>
        </div>
        <button type="button" className="scroll-top-btn" aria-label="Scroll to top">
          <IconArrowUp />
        </button>
      </div>
    </div>
  );
}
