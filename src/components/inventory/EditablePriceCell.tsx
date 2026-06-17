'use client';

import { useState, useRef, useEffect } from 'react';
import { Check, ArrowsRotateRight as Loader2 } from '@gravity-ui/icons';
import { BalinaTextField } from '@/components/balina';

interface EditablePriceCellProps {
  value: number | null;
  onSave: (newValue: number) => Promise<boolean>;
  min?: number;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  currency?: string;
}

export function EditablePriceCell({
  value,
  onSave,
  min = 0,
  placeholder = '-',
  className,
  disabled = false,
  currency = 'TL',
}: EditablePriceCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value !== null ? String(value) : '');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(value !== null ? String(value) : '');
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    const newValue = parseFloat(editValue);
    if (isNaN(newValue) || newValue < min) {
      setEditValue(value !== null ? String(value) : '');
      setIsEditing(false);
      return;
    }

    if (newValue === value) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    const success = await onSave(newValue);
    setIsSaving(false);

    if (success) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 1500);
    } else {
      setEditValue(value !== null ? String(value) : '');
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(value !== null ? String(value) : '');
      setIsEditing(false);
    }
  };

  const formatPrice = (price: number | null) => {
    if (price === null) return placeholder;
    return `${price.toLocaleString('tr-TR')} ${currency}`;
  };

  const baseClass = `flex h-8 min-w-[80px] items-center justify-center ${className ?? ''}`;

  if (disabled) return <div className={`${baseClass} text-muted`}>{formatPrice(value)}</div>;

  if (isSaving) {
    return (
      <div className={baseClass}>
        <Loader2 className="h-4 w-4 animate-spin text-accent" />
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className={`flex items-center gap-1 ${className ?? ''}`}>
        <BalinaTextField
          ref={inputRef}
          value={editValue}
          onChange={setEditValue}
          type="number"
          min={min}
          step="0.01"
          placeholder="0.00"
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          containerClassName="w-24"
          className="h-8 text-center"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className={`flex h-8 min-w-[80px] items-center justify-center rounded border px-2 text-sm transition-all ${
        showSuccess
          ? 'border-success bg-success/10 text-success'
          : value === null
            ? 'border-dashed border-border text-muted hover:border-accent hover:text-foreground'
            : 'border-border hover:border-accent hover:bg-default'
      } ${className ?? ''}`}
    >
      {showSuccess ? (
        <Check className="h-4 w-4 text-success" />
      ) : (
        <span className={value === null ? 'italic' : 'font-medium'}>{formatPrice(value)}</span>
      )}
    </button>
  );
}
