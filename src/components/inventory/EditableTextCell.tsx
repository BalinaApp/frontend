'use client';

import { useState, useRef, useEffect } from 'react';
import { Check, ArrowsRotateRight as Loader2 } from '@gravity-ui/icons';
import { Input, TextField } from '@/components/ui';

interface EditableTextCellProps {
  value: string;
  onSave: (newValue: string) => Promise<boolean>;
  /** Boş bırakılamaz mı? (default true) */
  isRequired?: boolean;
  className?: string;
  disabled?: boolean;
  /** Hücre okuma modunda ek class — hizalama/typography için. */
  readClassName?: string;
}

/**
 * Tablo hücresinde inline metin düzenlemesi. Tıklayınca input'a dönüşür,
 * Enter / blur ile kaydeder, Esc ile iptal. Save sırasında loader, başarılı
 * olunca kısa süre check ikonu.
 */
export function EditableTextCell({
  value,
  onSave,
  isRequired = true,
  className,
  disabled = false,
  readClassName,
}: EditableTextCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    const trimmed = editValue.trim();
    if (isRequired && trimmed.length === 0) {
      setEditValue(value);
      setIsEditing(false);
      return;
    }
    if (trimmed === value) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    const ok = await onSave(trimmed);
    setIsSaving(false);
    if (ok) {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 900);
    } else {
      setEditValue(value);
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsEditing(true)}
        className={[
          'group inline-flex max-w-full items-center gap-1 rounded-md text-left transition-colors',
          disabled
            ? 'cursor-default'
            : 'cursor-text hover:bg-surface-secondary/60',
          readClassName ?? '',
        ].join(' ')}
      >
        <span className={['truncate', className ?? ''].join(' ')}>{value}</span>
        {showSuccess && <Check className="h-3 w-3 shrink-0 text-success" />}
      </button>
    );
  }

  return (
    <TextField
      value={editValue}
      onChange={setEditValue}
      isDisabled={isSaving}
      aria-label="Düzenle"
    >
      <Input
        ref={inputRef}
        onBlur={handleSave}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleSave();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            handleCancel();
          }
        }}
        className={[
          'h-8 rounded-md border border-border bg-surface px-2 text-sm',
          className ?? '',
        ].join(' ')}
      />
      {isSaving && (
        <span className="ml-1 inline-flex">
          <Loader2 className="h-3 w-3 animate-spin text-muted" />
        </span>
      )}
    </TextField>
  );
}
