'use client';

import { useState, useRef, useEffect } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

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

  const handleCancel = () => {
    setEditValue(value !== null ? String(value) : '');
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const formatPrice = (price: number | null) => {
    if (price === null) return placeholder;
    return `${price.toLocaleString('tr-TR')} ${currency}`;
  };

  if (disabled) {
    return (
      <div className={cn('min-w-[80px] h-8 flex items-center justify-center text-gray-500', className)}>
        {formatPrice(value)}
      </div>
    );
  }

  if (isSaving) {
    return (
      <div className={cn('min-w-[80px] h-8 flex items-center justify-center', className)}>
        <Loader2 className="h-4 w-4 animate-spin text-primary" />
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className={cn('flex items-center gap-1', className)}>
        <Input
          ref={inputRef}
          type="number"
          step="0.01"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          min={min}
          placeholder="0.00"
          className="w-24 h-8 text-center"
        />
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className={cn(
        'min-w-[80px] h-8 px-2 flex items-center justify-center rounded border transition-all text-sm',
        showSuccess
          ? 'border-green-500 bg-green-50 text-green-700'
          : value === null
            ? 'border-dashed border-gray-300 text-gray-400 hover:border-primary hover:text-gray-600'
            : 'border-gray-200 hover:border-primary hover:bg-gray-50',
        className
      )}
    >
      {showSuccess ? (
        <Check className="h-4 w-4 text-green-600" />
      ) : (
        <span className={value === null ? 'italic' : 'font-medium'}>{formatPrice(value)}</span>
      )}
    </button>
  );
}
