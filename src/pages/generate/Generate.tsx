import React, { useState, useEffect } from 'react';
import { Button, TextArea, ImageUploader, SearchBar, Toast } from 'antd-mobile';
import type { ImageUploadItem } from 'antd-mobile/es/components/image-uploader';
import { IconArrowUp, IconRefresh, IconCube, IconDoc, IconRect, IconClock } from '../../components/Icons';
import { useI18n } from '../../context/I18nContext';
import { createGeneration, fileToBase64, getCreditsBalance, type CreateGenerationRequest } from '../../services/api';
import { RechargeDialog } from '../../components/RechargeDialog';
import './Generate.scss';

const demoSrc = 'https://images.unsplash.com/photo-1567945716310-4745a6b7844f?w=400';
const videoThumb = 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400';

export function Generate() {
  const { t, $l } = useI18n();
  const g = t.seedance.generate;
  const p = t.seedance.pages;
  const [startFrame, setStartFrame] = useState<ImageUploadItem[]>([]);
  const [endFrame, setEndFrame] = useState<ImageUploadItem[]>([]);
  const [prompt, setPrompt] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [rechargeDialogVisible, setRechargeDialogVisible] = useState(false);
  const [currentCredits, setCurrentCredits] = useState(0);

  // 获取当前积分
  useEffect(() => {
    fetchCredits();
  }, []);

  const fetchCredits = async () => {
    try {
      const result = await getCreditsBalance();
      if (result.data?.credits !== undefined) {
        setCurrentCredits(result.data.credits);
      }
    } catch (err) {
      console.error('Failed to fetch credits:', err);
    }
  };

  const mockUpload = (file: File): Promise<ImageUploadItem> =>
    new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      setTimeout(() => resolve({ url }), 300);
    });

  const handleSubmit = async () => {
    if (!prompt.trim()) {
      Toast.show({ icon: 'fail', content: $l('seedance.toast.pleaseInputPrompt') });
      return;
    }
    setSubmitting(true);
    const loadingToast = Toast.show({ icon: 'loading', content: $l('seedance.toast.submitting'), duration: 0 });
    try {
      const requestData: CreateGenerationRequest = {
        creationType: 'video',
        model: 'seedance20',
        frameMode: 'startEnd',
        ratio: '16:9',
        duration: '5',
        prompt: prompt.trim(),
      };
      if (startFrame.length > 0 && startFrame[0].url) {
        if (startFrame[0].url.startsWith('blob:')) {
          const res = await fetch(startFrame[0].url);
          const blob = await res.blob();
          const file = new File([blob], 'start-frame.png', { type: blob.type });
          requestData.startFrame = await fileToBase64(file);
        } else {
          requestData.startFrame = startFrame[0].url;
        }
      }
      if (endFrame.length > 0 && endFrame[0].url) {
        if (endFrame[0].url.startsWith('blob:')) {
          const res = await fetch(endFrame[0].url);
          const blob = await res.blob();
          const file = new File([blob], 'end-frame.png', { type: blob.type });
          requestData.endFrame = await fileToBase64(file);
        } else {
          requestData.endFrame = endFrame[0].url;
        }
      }
      await createGeneration(requestData);
      loadingToast.close();
      Toast.show({ icon: 'success', content: $l('seedance.toast.submitSuccess') });
      // 刷新积分
      fetchCredits();
    } catch (err) {
      loadingToast.close();
      const errorMessage = err instanceof Error ? err.message : $l('seedance.toast.submitFailed');

      // 调试日志：查看错误信息
      console.log('[Generate] Error caught:', errorMessage);

      // 检测是否是积分不足错误
      if (errorMessage.includes('积分不足') || errorMessage.includes('Insufficient credits')) {
        console.log('[Generate] Detected insufficient credits, showing recharge dialog');
        // 刷新积分并显示充值对话框
        await fetchCredits();
        setRechargeDialogVisible(true);
      } else {
        console.log('[Generate] Showing error toast');
        Toast.show({ icon: 'fail', content: errorMessage });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleRechargeClose = () => {
    setRechargeDialogVisible(false);
    // 关闭对话框后刷新积分
    fetchCredits();
  };

  const generatedVideos = [
    { id: '1', date: '12月16日', prompt: '天空失去颜色的那一天...', thumb: videoThumb, duration: '00:05', version: p.videoMetaVersion },
  ];

  return (
    <div className="generate-page">
      <RechargeDialog
        visible={rechargeDialogVisible}
        onClose={handleRechargeClose}
        currentCredits={currentCredits}
      />

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
