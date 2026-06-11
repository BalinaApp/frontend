'use client';

import { useState, useRef, useEffect } from 'react';
import { Check, ArrowsRotateRight as Loader2 } from '@gravity-ui/icons';
import { Input, TextField } from '@/components/ui';

interface EditableStockCellProps {
  value: number;
  onSave: (newValue: number) => Promise<boolean>;
  min?: number;
  className?: string;
  disabled?: boolean;
}

export function EditableStockCell({
  value,
  onSave,
  min = 0,
  className,
  disabled = false,
}: EditableStockCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(value));
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(String(value));
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    const newValue = parseInt(editValue, 10);
    if (isNaN(newValue) || newValue < min) {
      setEditValue(String(value));
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
      setEditValue(String(value));
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(String(value));
      setIsEditing(false);
    }
  };

  const wrapper = (extra?: string) =>
    ['flex h-8 w-16 items-center justify-center', extra, className].filter(Boolean).join(' ');

  if (disabled) {
    return <div className={wrapper('text-muted')}>{value}</div>;
  }

  if (isSaving) {
    return (
      <div className={wrapper()}>
        <Loader2 className="h-4 w-4 animate-spin text-accent" />
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className={['flex items-center gap-1', className].filter(Boolean).join(' ')}>
        <TextField
          value={editValue}
          onChange={setEditValue}
          type="number"
          className="w-16"
        >
          <Input
            ref={inputRef}
            min={min}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            className="h-8 text-center"
          />
        </TextField>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className={`flex h-8 w-16 items-center justify-center rounded border transition-all ${
        showSuccess
          ? 'border-success bg-success/10 text-success'
          : 'border-border hover:border-accent hover:bg-default'
      } ${className ?? ''}`}
    >
      {showSuccess ? (
        <Check className="h-4 w-4 text-success" />
      ) : (
        <span className="font-medium">{value}</span>
      )}
    </button>
  );
}
