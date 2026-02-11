import React, { useState, useRef } from 'react';
import { useI18n } from '../../context/I18nContext';
import { useNavigate } from 'react-router-dom';
import { Button, TextArea, ImageUploader } from 'antd-mobile';
import type { ImageUploadItem } from 'antd-mobile/es/components/image-uploader';
import {
  IconArrowUp,
  IconRefresh,
  IconDoc,
  IconRect,
  IconClock,
  IconArrowLeftRight,
  IconVideo,
} from '../../components/Icons';
import { OptionDropdown, OptionItem, OptionRatioItem } from '../../components/OptionDropdown';
import '../../components/OptionDropdown.scss';
import './Canvas.scss';

const demoSrc = 'https://images.unsplash.com/photo-1567945716310-4745a6b7844f?w=200';

const TEMPLATE_IDS = ['templateTea', 'templateIP', 'templateSpace', 'templatePerfume'] as const;

type CreationType = 'agent' | 'image' | 'video';
type ModelKey = 'seedance20' | '35pro' | '30proplus' | '30fast' | '30';
type FrameModeKey = 'omni' | 'startEnd' | 'multi' | 'subject';
type RatioKey = '21:9' | '16:9' | '4:3' | '1:1' | '3:4' | '9:16';
type DurationKey = '4' | '5' | '6' | '7' | '8' | '9';

export function Canvas() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const p = t.seedance.pages;
  const g = t.seedance.generate;
  const [startFrame, setStartFrame] = useState<ImageUploadItem[]>([]);
  const [endFrame, setEndFrame] = useState<ImageUploadItem[]>([]);
  const [prompt, setPrompt] = useState('');
  const [openDropdown, setOpenDropdown] = useState<'creationType' | 'model' | 'frameMode' | 'ratio' | 'duration' | null>(null);
  const [creationType, setCreationType] = useState<CreationType>('video');
  const [model, setModel] = useState<ModelKey>('seedance20');
  const [frameMode, setFrameMode] = useState<FrameModeKey>('startEnd');
  const [ratio, setRatio] = useState<RatioKey>('16:9');
  const [duration, setDuration] = useState<DurationKey>('5');

  // 根据 frameMode 判断是否显示2张图片框（智能多帧模式）
  const showTwoFrames = frameMode === 'startEnd';

  const creationTypeRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<HTMLDivElement>(null);
  const frameModeRef = useRef<HTMLDivElement>(null);
  const ratioRef = useRef<HTMLDivElement>(null);
  const durationRef = useRef<HTMLDivElement>(null);

  const mockUpload = (file: File): Promise<ImageUploadItem> =>
    new Promise((resolve) => {
      setTimeout(() => resolve({ url: URL.createObjectURL(file) }), 300);
    });

  const templates = TEMPLATE_IDS.map((id) => ({
    id,
    title: p[id],
    thumb: demoSrc,
  }));

  const creationTypeLabel = {
    agent: p.agentMode,
    image: g.creationTypeImage,
    video: g.creationTypeVideo,
  };
  const modelLabel: Record<ModelKey, string> = {
    seedance20: g.modelSeedance20,
    '35pro': g.model35Pro,
    '30proplus': g.model30ProPlus,
    '30fast': g.model30Fast,
    '30': g.model30,
  };
  const modelDesc: Record<ModelKey, string> = {
    seedance20: g.modelSeedance20Desc,
    '35pro': g.model35ProDesc,
    '30proplus': g.model30ProPlusDesc,
    '30fast': g.model30FastDesc,
    '30': g.model30Desc,
  };
  const frameModeLabel: Record<FrameModeKey, string> = {
    omni: g.frameModeOmni,
    startEnd: g.frameModeStartEnd,
    multi: g.frameModeMulti,
    subject: g.frameModeSubject,
  };

  const ratios: RatioKey[] = ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16'];
  const durations: DurationKey[] = ['4', '5', '6', '7', '8', '9'];

  return (
    <div className="canvas-page">
      <h1 className="canvas-question">{p.canvasQuestion}</h1>

      <div >
        <div className="canvas-card-body">
          <div className="canvas-frames-col">
            <div className="canvas-frame-box">
              <ImageUploader
                value={startFrame}
                onChange={setStartFrame}
                upload={mockUpload}
                maxCount={1}
                accept="image/*"
                className="canvas-frame-uploader"
              >
                <div className="canvas-frame-placeholder">
                  <span className="canvas-frame-plus">+</span>
                  <span className="canvas-frame-label">{g.startFrame}</span>
                </div>
              </ImageUploader>
            </div>
            {showTwoFrames && (
              <>
                <div className="canvas-frames-arrow">
                  <IconArrowLeftRight />
                </div>
                <div className="canvas-frame-box">
                  <ImageUploader
                    value={endFrame}
                    onChange={setEndFrame}
                    upload={mockUpload}
                    maxCount={1}
                    accept="image/*"
                    className="canvas-frame-uploader"
                  >
                    <div className="canvas-frame-placeholder">
                      <span className="canvas-frame-plus">+</span>
                      <span className="canvas-frame-label">{g.endFrame}</span>
                    </div>
                  </ImageUploader>
                </div>
              </>
            )}
          </div>
          <div className="canvas-prompt-col">
            <TextArea
              value={prompt}
              onChange={setPrompt}
              placeholder={g.promptPlaceholder}
              rows={6}
              className="canvas-prompt-input"
              autoSize={{ minRows: 5, maxRows: 10 }}
            />
          </div>
        </div>
        <div className="canvas-card-options">
          <div className="canvas-opt-wrap" ref={creationTypeRef}>
            <button
              type="button"
              className={`canvas-opt-item canvas-opt-dropdown ${openDropdown === 'creationType' ? 'is-open' : ''}`}
              onClick={() => setOpenDropdown(openDropdown === 'creationType' ? null : 'creationType')}
            >
              <IconRefresh className="canvas-opt-icon" />
              <span>{creationTypeLabel[creationType]}</span>
              <span className="canvas-opt-arrow">▼</span>
            </button>
            <OptionDropdown
              open={openDropdown === 'creationType'}
              onClose={() => setOpenDropdown(null)}
              triggerRef={creationTypeRef}
              title={g.dropdownTitleCreationType}
            >
              <OptionItem icon="◇" label={p.agentMode} active={creationType === 'agent'} onClick={() => { setCreationType('agent'); setOpenDropdown(null); }} />
              <OptionItem icon="▣" label={g.creationTypeImage} active={creationType === 'image'} onClick={() => { setCreationType('image'); setOpenDropdown(null); }} />
              <OptionItem icon="▶" label={g.creationTypeVideo} active={creationType === 'video'} onClick={() => { setCreationType('video'); setOpenDropdown(null); }} />
            </OptionDropdown>
          </div>

          <div className="canvas-opt-wrap" ref={modelRef}>
            <button
              type="button"
              className={`canvas-opt-item canvas-opt-dropdown ${openDropdown === 'model' ? 'is-open' : ''}`}
              onClick={() => setOpenDropdown(openDropdown === 'model' ? null : 'model')}
            >
              <IconVideo className="canvas-opt-icon" />
              <span>{modelLabel[model]}</span>
              <span className="canvas-opt-arrow">▼</span>
            </button>
            <OptionDropdown
              open={openDropdown === 'model'}
              onClose={() => setOpenDropdown(null)}
              triggerRef={modelRef}
              title={`${g.dropdownTitleModel}: ${g.modelSeedance20} by seed`}
            >
              <OptionItem icon="S2.0" label={g.modelSeedance20} desc={modelDesc.seedance20} badge={g.badgeNew} active={model === 'seedance20'} onClick={() => { setModel('seedance20'); setOpenDropdown(null); }} />
              <OptionItem icon="3.5 PRO" label={g.model35Pro} desc={modelDesc['35pro']} badge={g.badgeNew} active={model === '35pro'} onClick={() => { setModel('35pro'); setOpenDropdown(null); }} />
              <OptionItem icon="3.0 PRO" label={g.model30ProPlus} desc={modelDesc['30proplus']} active={model === '30proplus'} onClick={() => { setModel('30proplus'); setOpenDropdown(null); }} />
              <OptionItem icon="3.0 Fast" label={g.model30Fast} desc={modelDesc['30fast']} active={model === '30fast'} onClick={() => { setModel('30fast'); setOpenDropdown(null); }} />
              <OptionItem icon="3.0" label={g.model30} desc={modelDesc['30']} active={model === '30'} onClick={() => { setModel('30'); setOpenDropdown(null); }} />
            </OptionDropdown>
          </div>

          <div className="canvas-opt-wrap" ref={frameModeRef}>
            <button
              type="button"
              className={`canvas-opt-item canvas-opt-dropdown ${openDropdown === 'frameMode' ? 'is-open' : ''}`}
              onClick={() => setOpenDropdown(openDropdown === 'frameMode' ? null : 'frameMode')}
            >
              <IconDoc className="canvas-opt-icon" />
              <span>{frameModeLabel[frameMode]}</span>
              <span className="canvas-opt-arrow">▼</span>
            </button>
            <OptionDropdown
              open={openDropdown === 'frameMode'}
              onClose={() => setOpenDropdown(null)}
              triggerRef={frameModeRef}
              title={g.dropdownTitleFrameMode}
            >
              <OptionItem icon="✦" label={g.frameModeOmni} badge={g.badgeNew} active={frameMode === 'omni'} onClick={() => { setFrameMode('omni'); setOpenDropdown(null); }} />
              <OptionItem icon="▤" label={g.frameModeStartEnd} active={frameMode === 'startEnd'} onClick={() => { setFrameMode('startEnd'); setOpenDropdown(null); }} />
              <OptionItem icon="▦" label={g.frameModeMulti} active={frameMode === 'multi'} onClick={() => { setFrameMode('multi'); setOpenDropdown(null); }} />
              <OptionItem icon="👤" label={g.frameModeSubject} active={frameMode === 'subject'} onClick={() => { setFrameMode('subject'); setOpenDropdown(null); }} />
            </OptionDropdown>
          </div>

          <div className="canvas-opt-wrap" ref={ratioRef}>
            <button
              type="button"
              className={`canvas-opt-item canvas-opt-dropdown ${openDropdown === 'ratio' ? 'is-open' : ''}`}
              onClick={() => setOpenDropdown(openDropdown === 'ratio' ? null : 'ratio')}
            >
              <IconRect className="canvas-opt-icon" />
              <span>{ratio}</span>
              <span className="canvas-opt-arrow">▼</span>
            </button>
            <OptionDropdown
              open={openDropdown === 'ratio'}
              onClose={() => setOpenDropdown(null)}
              triggerRef={ratioRef}
              title={g.dropdownTitleRatio}
              layout="row"
              align="left"
            >
              {ratios.map((r) => (
                <OptionRatioItem
                  key={r}
                  ratio={r}
                  active={ratio === r}
                  shape={r === '1:1' ? 'square' : r === '3:4' || r === '9:16' ? 'tall' : 'wide'}
                  onClick={() => { setRatio(r); setOpenDropdown(null); }}
                />
              ))}
            </OptionDropdown>
          </div>

          <div className="canvas-opt-wrap" ref={durationRef}>
            <button
              type="button"
              className={`canvas-opt-item canvas-opt-dropdown ${openDropdown === 'duration' ? 'is-open' : ''}`}
              onClick={() => setOpenDropdown(openDropdown === 'duration' ? null : 'duration')}
            >
              <IconClock className="canvas-opt-icon" />
              <span>{duration}s</span>
              <span className="canvas-opt-arrow">▼</span>
            </button>
            <OptionDropdown
              open={openDropdown === 'duration'}
              onClose={() => setOpenDropdown(null)}
              triggerRef={durationRef}
              title={g.dropdownTitleDuration}
            >
              {durations.map((d) => (
                <OptionItem
                  key={d}
                  icon="🕐"
                  label={`${d}s`}
                  active={duration === d}
                  onClick={() => { setDuration(d); setOpenDropdown(null); }}
                />
              ))}
            </OptionDropdown>
          </div>

          <Button color="primary" className="canvas-submit-btn" onClick={() => navigate('/')}>
            <IconArrowUp className="canvas-submit-icon" />
          </Button>
        </div>
      </div>

      <section className="canvas-quick-start">
        <h2 className="canvas-section-title">{p.quickStart}</h2>
        <div className="canvas-quick-scroll">
          {templates.map((tpl) => (
            <button key={tpl.id} type="button" className="canvas-quick-card" onClick={() => navigate('/')}>
              <div className="canvas-quick-thumb" style={{ backgroundImage: `url(${tpl.thumb})` }} />
              <span className="canvas-quick-title">{tpl.title}</span>
              <span className="canvas-quick-arrow">→</span>
            </button>
          ))}
        </div>
      </section>

      <section className="canvas-recent">
        <h2 className="canvas-section-title">{p.recentProjects}</h2>
        <button type="button" className="canvas-new-project" onClick={() => navigate('/')}>
          <span className="canvas-new-plus">+</span>
          <span className="canvas-new-label">{p.newProject}</span>
        </button>
      </section>
    </div>
  );
}
