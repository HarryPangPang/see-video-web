import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useI18n } from '../../context/I18nContext';
import { useNavigate } from 'react-router-dom';
import { Button, TextArea, ImageUploader, Toast } from 'antd-mobile';
import type { ImageUploadItem } from 'antd-mobile/es/components/image-uploader';
import { createGeneration, fileToBase64, getCreditsBalance, type CreateGenerationRequest } from '../../services/api';
import { RechargeDialog } from '../../components/RechargeDialog';
import { LoginDialog } from '../../components/LoginDialog';
import { useAuth } from '../../context/AuthContext';
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
import exampleImage1 from '../../assets/tos_0f73fd3acb6c712261a7e26166120267.webp';
import exampleImage2 from '../../assets/tos_cc270a0f597d17627ff1f17b196dbe5d.jpg';
import exampleImage3 from '../../assets/tos_fb5822a5502c5002c95598decab889e8.jpg';

const EXAMPLE_IMAGES = [exampleImage1, exampleImage2, exampleImage3] as const;

type CreationType = 'agent' | 'image' | 'video';
type ModelKey = 'seedance20' | 'seedance20fast' | '35pro' | '30pro' | '30fast' | '30';
type FrameModeKey = 'omni' | 'startEnd' | 'multi' | 'subject';
type RatioKey = 'auto size' | '21:9' | '16:9' | '4:3' | '1:1' | '3:4' | '9:16';
type DurationKey = '4' | '5' | '6' | '7' | '8' | '9' | '10'| '11'| '12'| '13'| '14'| '15';

export function Canvas() {
  const { t, $l } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const p = t.seedance.pages;
  const g = t.seedance.generate;
  const [startFrame, setStartFrame] = useState<ImageUploadItem[]>([]);
  const [endFrame, setEndFrame] = useState<ImageUploadItem[]>([]);
  const [omniFrames, setOmniFrames] = useState<ImageUploadItem[]>([]); // 全能参考模式：支持1-5张图
  const [prompt, setPrompt] = useState('');
  const [openDropdown, setOpenDropdown] = useState<'creationType' | 'model' | 'frameMode' | 'ratio' | 'duration' | null>(null);
  const [creationType, setCreationType] = useState<CreationType>('video');
  const [model, setModel] = useState<ModelKey>('seedance20');
  const [frameMode, setFrameMode] = useState<FrameModeKey>('omni');
  const [ratio, setRatio] = useState<RatioKey>('16:9');
  const [duration, setDuration] = useState<DurationKey>('5');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rechargeDialogVisible, setRechargeDialogVisible] = useState(false);
  const [loginDialogVisible, setLoginDialogVisible] = useState(false);
  const [currentCredits, setCurrentCredits] = useState(0);

  // 登录后刷新积分
  useEffect(() => {
    if (user) fetchCredits();
  }, [user]);

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

  // 根据 frameMode 判断显示逻辑
  const isOmniMode = frameMode === 'omni';
  const isStartEndMode = frameMode === 'startEnd';
  // 仅当实际上传了 2 张图（起始帧+结束帧都有）时，3.0 PRO、3.0 Fast 不可选；一张图时所有都可选
  const isTwoImages = isStartEndMode && startFrame.length > 0 && endFrame.length > 0;
  const disable30ProAndFast = isTwoImages;
  // omni 模式下只允许选择 seedance20 和 seedance20fast
  const disableNonSeedance20Models = isOmniMode;

  const creationTypeRef = useRef<HTMLDivElement>(null);
  const modelRef = useRef<HTMLDivElement>(null);
  const frameModeRef = useRef<HTMLDivElement>(null);
  const ratioRef = useRef<HTMLDivElement>(null);
  const durationRef = useRef<HTMLDivElement>(null);

  const mockUpload = (file: File): Promise<ImageUploadItem> =>
    new Promise((resolve, reject) => {
      if (!user) {
        setLoginDialogVisible(true);
        reject(new Error('login required'));
        return;
      }
      setTimeout(() => resolve({ url: URL.createObjectURL(file) }), 300);
    });

  const creationTypeLabel = {
    agent: p.agentMode,
    image: g.creationTypeImage,
    video: g.creationTypeVideo,
  };
  const modelLabel: Record<ModelKey, string> = {
    seedance20: g.modelSeedance20,
    seedance20fast: g.modelSeedance20Fast,
    '35pro': g.model35Pro,
    '30pro': g.model30ProPlus,
    '30fast': g.model30Fast,
    '30': g.model30,
  };
  const modelDesc: Record<ModelKey, string> = {
    seedance20: g.modelSeedance20Desc,
    seedance20fast: g.modelSeedance20FastDesc,
    '35pro': g.model35ProDesc,
    '30pro': g.model30ProPlusDesc,
    '30fast': g.model30FastDesc,
    '30': g.model30Desc,
  };
  const frameModeLabel: Record<FrameModeKey, string> = {
    omni: g.frameModeOmni,
    startEnd: g.frameModeStartEnd,
    multi: g.frameModeMulti,
    subject: g.frameModeSubject,
  };

  const ratios: RatioKey[] = ['auto size','21:9', '16:9', '4:3', '1:1', '3:4', '9:16'];
  // seedance20 和 seedance20fast 支持 4–15s；其他模型仅 5s、10s
  const durations: DurationKey[] = useMemo(
    () => (model === 'seedance20' || model === 'seedance20fast' ? ['4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15'] : ['5', '10']),
    [model]
  );

  // 切换为非 seedance20/seedance20fast 时，若当前时长不在 5s/10s 则重置为 5s
  useEffect(() => {
    if (model !== 'seedance20' && model !== 'seedance20fast' && duration !== '5' && duration !== '10') {
      setDuration('5');
    }
  }, [model]);

  // 上传了第二张图且当前为 3.0 PRO / 3.0 Fast 时，自动切到 seedance20
  useEffect(() => {
    if (isTwoImages && (model === '30pro' || model === '30fast')) {
      setModel('seedance20');
    }
  }, [isTwoImages, model]);

  // omni 模式下，如果当前模型不是 seedance20 或 seedance20fast，自动切换到 seedance20
  useEffect(() => {
    if (isOmniMode && model !== 'seedance20' && model !== 'seedance20fast') {
      setModel('seedance20');
    }
  }, [isOmniMode, model]);

  // 处理表单提交
  const handleSubmit = async () => {
    if (!user) {
      setLoginDialogVisible(true);
      return;
    }

    // 验证必填项
    if (!prompt.trim()) {
      Toast.show({
        icon: 'fail',
        content: $l('seedance.toast.pleaseInputPrompt'),
      });
      return;
    }

    // 根据帧模式验证图片
    if (frameMode === 'startEnd' && startFrame.length === 0) {
      Toast.show({
        icon: 'fail',
        content: $l('seedance.toast.uploadStartFrame'),
      });
      return;
    }

    if (frameMode === 'omni' && omniFrames.length === 0) {
      Toast.show({
        icon: 'fail',
        content: $l('seedance.toast.uploadReference'),
      });
      return;
    }

    setIsSubmitting(true);
    const loadingToast = Toast.show({
      icon: 'loading',
      content: $l('seedance.toast.submitting'),
      duration: 0,
    });

    try {
      // 准备提交数据
      const requestData: CreateGenerationRequest = {
        creationType,
        model,
        frameMode,
        ratio,
        duration,
        prompt: prompt.trim(),
      };

      // 全能参考模式：处理多张图片
      if (frameMode === 'omni' && omniFrames.length > 0) {
        const omniFramesBase64 = [];
        for (const frame of omniFrames) {
          if (frame.url) {
            if (frame.url.startsWith('blob:')) {
              const response = await fetch(frame.url);
              const blob = await response.blob();
              const file = new File([blob], `omni-frame-${omniFramesBase64.length}.png`, { type: blob.type });
              omniFramesBase64.push(await fileToBase64(file));
            } else {
              omniFramesBase64.push(frame.url);
            }
          }
        }
        requestData.omniFrames = omniFramesBase64;
      }

      // 处理起始帧图片（startEnd 模式）
      if (frameMode === 'startEnd' && startFrame.length > 0 && startFrame[0].url) {
        // 如果是 blob URL，需要转换为 base64
        if (startFrame[0].url.startsWith('blob:')) {
          const response = await fetch(startFrame[0].url);
          const blob = await response.blob();
          const file = new File([blob], 'start-frame.png', { type: blob.type });
          requestData.startFrame = await fileToBase64(file);
        } else {
          requestData.startFrame = startFrame[0].url;
        }
      }

      // 处理结束帧图片（仅在 startEnd 模式下）
      if (frameMode === 'startEnd' && endFrame.length > 0 && endFrame[0].url) {
        if (endFrame[0].url.startsWith('blob:')) {
          const response = await fetch(endFrame[0].url);
          const blob = await response.blob();
          const file = new File([blob], 'end-frame.png', { type: blob.type });
          requestData.endFrame = await fileToBase64(file);
        } else {
          requestData.endFrame = endFrame[0].url;
        }
      }

      // 提交到服务器
      const result = await createGeneration(requestData);

      loadingToast.close();
      if(!result.success){
        Toast.show({
          icon: 'fail',
          content: result.message || $l('seedance.toast.submitFailedRetry'),
        });
        return;
      }else{
        Toast.show({
          icon: 'success',
          content: result.message || $l('seedance.toast.submitSuccess'),
        });

        // 刷新积分
        fetchCredits();

        if (result.data?.projectId) {
          navigate('/');
        }
      }

    } catch (error) {
      loadingToast.close();
      const errorMessage = error instanceof Error ? error.message : $l('seedance.toast.submitFailedRetry');

      // 调试日志
      console.log('[Canvas] Error caught:', errorMessage);

      // 检测是否是积分不足错误（不区分大小写，支持多种表达）
      const lowerMessage = errorMessage.toLowerCase();
      const isInsufficientCredits =
        errorMessage.includes('积分不足') ||
        lowerMessage.includes('insufficient') ||
        lowerMessage.includes('not enough credit') ||
        lowerMessage.includes('credit') && (lowerMessage.includes('insufficient') || lowerMessage.includes('not enough'));

      if (isInsufficientCredits) {
        console.log('[Canvas] Detected insufficient credits, showing recharge dialog');
        // 刷新积分并显示充值对话框
        await fetchCredits();
        setRechargeDialogVisible(true);
      } else {
        console.log('[Canvas] Showing error toast');
        Toast.show({
          icon: 'fail',
          content: errorMessage,
        });
      }
      console.error('Submit error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRechargeClose = () => {
    setRechargeDialogVisible(false);
    // 关闭对话框后刷新积分
    fetchCredits();
  };

  return (
    <div className="canvas-page">
      <LoginDialog
        visible={loginDialogVisible}
        onClose={() => setLoginDialogVisible(false)}
        onLoginSuccess={fetchCredits}
      />
      <RechargeDialog
        visible={rechargeDialogVisible}
        onClose={handleRechargeClose}
        currentCredits={currentCredits}
      />

      <h1 className="canvas-question">{p.canvasQuestion}</h1>

      <div style={{ textAlign: 'center', margin: '16px 0' }}>
        <a
          href="https://discord.com/invite/94YKekdH"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            padding: '10px 24px',
            backgroundColor: '#faad14',
            color: '#ffffff',
            borderRadius: '8px',
            textDecoration: 'none',
            fontWeight: '600',
            fontSize: '16px',
            boxShadow: '0 2px 8px rgba(114, 137, 218, 0.4)',
            transition: 'all 0.2s ease'
          }}
        >
          {p.discordInvite}
        </a>
      </div>

      <div>
        <div className="canvas-card-body">
          <div className="canvas-frames-col">
            {isOmniMode ? (
              // 全能参考模式：支持1-5张图片多选，平铺展示
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="canvas-frame-box-omni">
                  <ImageUploader
                    value={omniFrames}
                    onChange={setOmniFrames}
                    upload={mockUpload}
                    maxCount={5}
                    accept="image/*"
                    className="canvas-frame-uploader"
                    multiple
                    style={{
                      '--cell-size': '120px',
                      '--gap-horizontal': '12px',
                      '--gap-vertical': '12px',
                    }}
                  >
                    <div className="canvas-frame-placeholder">
                      <span className="canvas-frame-plus">+</span>
                      <span className="canvas-frame-label">{g.uploadReferenceImages}</span>
                    </div>
                  </ImageUploader>
                </div>
                {omniFrames.length > 0 && (
                  <div style={{ fontSize: '12px', color: '#666', textAlign: 'center' }}>
                    {g.uploadedCount.replace('{count}', omniFrames.length.toString())}
                  </div>
                )}
              </div>
            ) : (
              // 起始帧+结束帧模式
              <>
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
                {isStartEndMode && (
                  <>
                    <div className="canvas-frames-arrow">
                      +
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
              disabled
              className={`canvas-opt-item canvas-opt-dropdown ${openDropdown === 'creationType' ? 'is-open' : ''}`}
              // onClick={() => setOpenDropdown(openDropdown === 'creationType' ? null : 'creationType')}
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
              <OptionItem icon="▶" label={g.creationTypeVideo} active={creationType === 'video'} onClick={() => { setCreationType('video'); setOpenDropdown(null); }} />
            </OptionDropdown>
          </div>
            {/* 模型下拉 */}
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
              <OptionItem icon="S2.0 Fast" label={g.modelSeedance20Fast} desc={modelDesc.seedance20fast} badge={g.badgeNew} active={model === 'seedance20fast'} onClick={() => { setModel('seedance20fast'); setOpenDropdown(null); }} />
              <OptionItem icon="3.5 PRO" label={g.model35Pro} desc={modelDesc['35pro']} badge={g.badgeNew} active={model === '35pro'} disabled={disableNonSeedance20Models} onClick={() => { setModel('35pro'); setOpenDropdown(null); }} />
              <OptionItem icon="3.0 PRO" label={g.model30ProPlus} desc={modelDesc['30pro']} active={model === '30pro'} disabled={disable30ProAndFast || disableNonSeedance20Models} onClick={() => { setModel('30pro'); setOpenDropdown(null); }} />
              <OptionItem icon="3.0 Fast" label={g.model30Fast} desc={modelDesc['30fast']} active={model === '30fast'} disabled={disable30ProAndFast || disableNonSeedance20Models} onClick={() => { setModel('30fast'); setOpenDropdown(null); }} />
              <OptionItem icon="3.0" label={g.model30} desc={modelDesc['30']} active={model === '30'} disabled={disableNonSeedance20Models} onClick={() => { setModel('30'); setOpenDropdown(null); }} />
            </OptionDropdown>
          </div>
          {/* 帧模式下拉 */}
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
              {/* <OptionItem icon="▦" label={g.frameModeMulti} active={frameMode === 'multi'} onClick={() => { setFrameMode('multi'); setOpenDropdown(null); }} />
              <OptionItem icon="👤" label={g.frameModeSubject} active={frameMode === 'subject'} onClick={() => { setFrameMode('subject'); setOpenDropdown(null); }} /> */}
            </OptionDropdown>
          </div>

          <div className="canvas-opt-wrap" ref={ratioRef}>
            <button
              type="button"
              className={`canvas-opt-item canvas-opt-dropdown ${openDropdown === 'ratio' ? 'is-open' : ''}`}
              // onClick={() => setOpenDropdown(openDropdown === 'ratio' ? null : 'ratio')}
              disabled
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

          <Button
            color="primary"
            className="canvas-submit-btn"
            onClick={handleSubmit}
            loading={isSubmitting}
            disabled={isSubmitting}
          >
            <IconArrowUp className="canvas-submit-icon" />
          </Button>
        </div>
      </div>

      {/* 提交须知 */}
      <div className="canvas-submit-tips">
        <h3 className="canvas-submit-tips-title">{t.seedance.submitTips.title}</h3>
        <div className="canvas-submit-tips-content">
          <div className="canvas-submit-tips-item">
            <span className="canvas-submit-tips-text">{t.seedance.submitTips.processingTime}</span>
          </div>
          <div className="canvas-submit-tips-item">
            <span className="canvas-submit-tips-text">{t.seedance.submitTips.checkResults}</span>
          </div>
          <div className="canvas-submit-tips-item">
            <span className="canvas-submit-tips-text">{t.seedance.submitTips.autoRefund}</span>
          </div>
          <div className="canvas-submit-tips-item">
            <span className="canvas-submit-tips-text">{t.seedance.submitTips.refreshPage}</span>
          </div>
          <div className="canvas-submit-tips-item">
            <span className="canvas-submit-tips-text">
              <a  href="https://discord.com/invite/94YKekdH"
          target="_blank" rel='noopener noreferrer'>{t.seedance.submitTips.contactSupport}</a>
            </span>          </div>
        </div>
      </div>

      <section className="canvas-quick-start">
        <h2 className="canvas-section-title">{p.quickStart}</h2>
        <div className="canvas-quick-scroll">
          {EXAMPLE_IMAGES.map((image, index) => (
            <div key={index} className="canvas-quick-card">
              <img src={image} alt={`Example ${index + 1}`} className="canvas-quick-image" />
            </div>
          ))}
        </div>
      </section>
        
      {/* <section className="canvas-recent">
        <h2 className="canvas-section-title">{p.recentProjects}</h2>
        <button type="button" className="canvas-new-project" onClick={() => navigate('/')}>
          <span className="canvas-new-plus">+</span>
          <span className="canvas-new-label">{p.newProject}</span>
        </button>
      </section> */}
    </div>
  );
}
