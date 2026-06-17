'use client';

import * as React from 'react';
import { Plus, Xmark, Check } from '@gravity-ui/icons';
import { BalinaPopover, BalinaTextField, BalinaCheckbox } from '@/components/balina';

interface EditableTagsCellProps {
  value: string[];
  /** Aynı şirket için var olan etiketler (auto-suggest). Boş bırakılabilir. */
  knownTags?: string[];
  onSave: (next: string[]) => Promise<boolean>;
  className?: string;
  disabled?: boolean;
}

/**
 * Etiket hücresi — okuma modunda chip dizisi (boşsa "+" ipucu),
 * tıklayınca popover'da bilinen etiketler checkbox ile + yeni etiket
 * eklemek için input. Popover kapandığında diff varsa onSave çağrılır.
 */
export function EditableTagsCell({
  value,
  knownTags = [],
  onSave,
  className,
  disabled = false,
}: EditableTagsCellProps) {
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<Set<string>>(new Set(value));
  const [newTag, setNewTag] = React.useState('');

  // Popover her açılışta state'i mevcut value ile resetle.
  React.useEffect(() => {
    if (open) {
      setDraft(new Set(value));
      setNewTag('');
    }
  }, [open, value]);

  const allOptions = React.useMemo(() => {
    const set = new Set<string>([...knownTags, ...value]);
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'tr'));
  }, [knownTags, value]);

  const persist = async (next: Set<string>) => {
    const sorted = Array.from(next).sort((a, b) => a.localeCompare(b, 'tr'));
    const sameLength = sorted.length === value.length;
    const sameContent = sameLength && sorted.every((t, i) => t === value[i]);
    if (sameContent) return;
    await onSave(sorted);
  };

  const toggle = (tag: string, on: boolean) => {
    const updated = new Set(draft);
    if (on) updated.add(tag);
    else updated.delete(tag);
    setDraft(updated);
  };

  const addNewTag = () => {
    const t = newTag.trim();
    if (!t) return;
    const updated = new Set(draft);
    updated.add(t);
    setDraft(updated);
    setNewTag('');
  };

  return (
    <BalinaPopover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) void persist(draft);
      }}
      className="w-[260px] max-w-none overflow-hidden p-0"
      trigger={
        <button
          type="button"
          disabled={disabled}
          className={[
            'inline-flex max-w-full flex-wrap items-center gap-1 rounded-md px-1 py-1 text-left transition-colors',
            disabled ? 'cursor-default' : 'hover:bg-surface-secondary/60',
            className ?? '',
          ].join(' ')}
        >
          {value.length === 0 ? (
            <span className="inline-flex items-center gap-1 text-xs text-muted">
              <Plus className="h-3 w-3" /> Ekle
            </span>
          ) : (
            value.map((t) => (
              <span
                key={t}
                className="inline-flex h-5 items-center rounded-full bg-foreground/[0.06] px-2 text-[11px] font-medium text-foreground"
              >
                {t}
              </span>
            ))
          )}
        </button>
      }
    >
      <div className="flex flex-col">
        <div className="border-b border-border/60 p-2">
          <BalinaTextField
            value={newTag}
            onChange={setNewTag}
            aria-label="Yeni etiket"
            placeholder="Yeni etiket…"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addNewTag();
              }
            }}
          />
        </div>
        <div className="flex max-h-[240px] flex-col overflow-auto py-1">
          {allOptions.length === 0 ? (
            <div className="px-3 py-3 text-center text-xs text-muted">
              Henüz etiket yok — yukarıdan ekle
            </div>
          ) : (
            allOptions.map((tag) => {
              const isOn = draft.has(tag);
              return (
                <label
                  key={tag}
                  className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm transition-colors hover:bg-surface-secondary"
                >
                  <BalinaCheckbox
                    checked={isOn}
                    onCheckedChange={(next) => toggle(tag, next)}
                  />
                  <span className="flex-1 truncate text-foreground">{tag}</span>
                  {isOn && <Check className="h-3 w-3 text-accent" />}
                </label>
              );
            })
          )}
        </div>
        {draft.size > 0 && (
          <div className="flex items-center justify-between border-t border-border/60 px-2 py-2 text-xs">
            <span className="text-muted">
              {draft.size} seçili
            </span>
            <button
              type="button"
              onClick={() => setDraft(new Set())}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-muted hover:bg-surface-secondary hover:text-foreground"
            >
              <Xmark className="h-3 w-3" /> Temizle
            </button>
          </div>
        )}
      </div>
    </BalinaPopover>
  );
}
