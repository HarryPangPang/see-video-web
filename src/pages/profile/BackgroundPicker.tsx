import { useRef } from 'react';
import { Toast } from 'antd-mobile';
import { PRESET_GRADIENTS } from './presets';
import { useI18n } from '../../context/I18nContext';

interface BackgroundPickerProps {
  currentBackground: string | null;
  onSelectPreset: (presetKey: string) => void;
  onUpload: (file: File) => void;
  onReset: () => void;
  onClose: () => void;
}

export function BackgroundPicker({ currentBackground, onSelectPreset, onUpload, onReset, onClose }: BackgroundPickerProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { t } = useI18n();
  const p = t.seedance.profile;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext || '')) {
      Toast.show({ icon: 'fail', content: p.backgroundFormatHint });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      Toast.show({ icon: 'fail', content: p.backgroundSizeHint });
      return;
    }
    onUpload(file);
  };

  return (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div className="profile-modal profile-modal--bg-picker" onClick={(e) => e.stopPropagation()}>
        <div className="profile-modal-header">
          <span className="profile-modal-title">{p.backgroundPickerTitle}</span>
          <button type="button" className="profile-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="bg-picker-body">
          <div className="bg-picker-section-label">{p.presetGradients}</div>
          <div className="bg-picker-grid">
            {PRESET_GRADIENTS.map((g) => (
              <button
                key={g.key}
                type="button"
                className={`bg-picker-swatch${currentBackground === `preset:${g.key}` ? ' bg-picker-swatch--active' : ''}`}
                style={{ background: g.css }}
                onClick={() => onSelectPreset(g.key)}
              />
            ))}
          </div>
          <button type="button" className="bg-picker-upload-btn" onClick={() => fileRef.current?.click()}>
            {p.uploadCustom}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <button type="button" className="bg-picker-reset-btn" onClick={onReset}>
            {p.resetBackground}
          </button>
        </div>
      </div>
    </div>
  );
}
