'use client';

import { useState, useRef, useEffect } from 'react';
import { Check, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

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

  const handleCancel = () => {
    setEditValue(String(value));
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

  if (disabled) {
    return (
      <div className={cn('w-16 h-8 flex items-center justify-center text-gray-500', className)}>
        {value}
      </div>
    );
  }

  if (isSaving) {
    return (
      <div className={cn('w-16 h-8 flex items-center justify-center', className)}>
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
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          min={min}
          className="w-16 h-8 text-center"
        />
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className={cn(
        'w-16 h-8 flex items-center justify-center rounded border transition-all',
        showSuccess
          ? 'border-green-500 bg-green-50 text-green-700'
          : 'border-gray-200 hover:border-primary hover:bg-gray-50',
        className
      )}
    >
      {showSuccess ? (
        <Check className="h-4 w-4 text-green-600" />
      ) : (
        <span className="font-medium">{value}</span>
      )}
    </button>
  );
}
