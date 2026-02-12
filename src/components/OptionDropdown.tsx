import React, { useEffect, useRef } from 'react';

interface OptionDropdownProps {
  open: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  title: string;
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
  layout?: 'list' | 'row';
  disabled?: boolean;
}

export function OptionDropdown({
  open,
  onClose,
  triggerRef,
  title,
  children,
  className = '',
  align = 'left',
  layout = 'list',
  disabled = false,
}: OptionDropdownProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        panelRef.current?.contains(target) ||
        triggerRef.current?.contains(target)
      ) return;
      onClose();
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open, onClose, triggerRef]);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      className={`option-dropdown-panel option-dropdown-panel--${layout} option-dropdown-panel--${align} ${disabled ? 'is-disabled' : ''} ${className}`}
      aria-disabled={disabled}
    >
      <div className="option-dropdown-title">{title}</div>
      <div className="option-dropdown-content">{children}</div>
    </div>
  );
}

interface OptionItemProps {
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  icon?: React.ReactNode;
  label: React.ReactNode;
  desc?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

export function OptionItem({
  active,
  disabled,
  onClick,
  icon,
  label,
  desc,
  badge,
  className = '',
}: OptionItemProps) {
  return (
    <button
      type="button"
      className={`option-dropdown-item ${active ? 'is-active' : ''} ${disabled ? 'is-disabled' : ''} ${className}`}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
    >
      {icon && <span className="option-dropdown-item-icon">{icon}</span>}
      <span className="option-dropdown-item-main">
        <span className="option-dropdown-item-label">
          {label}
          {badge && <span className="option-dropdown-item-badge">{badge}</span>}
        </span>
        {desc && <span className="option-dropdown-item-desc">{desc}</span>}
      </span>
      {active && (
        <span className="option-dropdown-item-check" aria-hidden>✓</span>
      )}
    </button>
  );
}

interface OptionRatioItemProps {
  ratio: string;
  active?: boolean;
  onClick?: () => void;
  shape?: 'wide' | 'square' | 'tall';
}

export function OptionRatioItem({ ratio, active, onClick, shape = 'wide' }: OptionRatioItemProps) {
  return (
    <button
      type="button"
      className={`option-dropdown-ratio-item ${active ? 'is-active' : ''} option-dropdown-ratio-item--${shape}`}
      onClick={onClick}
    >
      <span className="option-dropdown-ratio-shape" />
      <span className="option-dropdown-ratio-label">{ratio}</span>
    </button>
  );
}
