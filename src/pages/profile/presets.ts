import type React from 'react';

export interface PresetGradient {
  key: string;
  css: string;
}

export const PRESET_GRADIENTS: PresetGradient[] = [
  { key: 'sunset', css: 'linear-gradient(135deg, #f97316, #ec4899)' },
  { key: 'ocean', css: 'linear-gradient(135deg, #3b82f6, #06b6d4)' },
  { key: 'forest', css: 'linear-gradient(135deg, #22c55e, #15803d)' },
  { key: 'twilight', css: 'linear-gradient(135deg, #a855f7, #1e3a5f)' },
  { key: 'rose', css: 'linear-gradient(135deg, #fb7185, #e11d48)' },
  { key: 'midnight', css: 'linear-gradient(135deg, #1e3a8a, #0f172a)' },
];

export const DEFAULT_GRADIENT = 'linear-gradient(135deg, #7c3aed, #a78bfa)';

export function getBackgroundStyle(background: string | null | undefined): React.CSSProperties {
  if (!background) return { background: DEFAULT_GRADIENT };
  if (background.startsWith('preset:')) {
    const key = background.replace('preset:', '');
    const found = PRESET_GRADIENTS.find(p => p.key === key);
    return { background: found ? found.css : DEFAULT_GRADIENT };
  }
  // Custom image URL
  const url = background.startsWith('http') ? background : `${window.location.origin}${background}`;
  return {
    backgroundImage: `url(${url})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };
}
