'use client';

import { ChevronDown, Copy, Pencil, TrashBin } from '@gravity-ui/icons';
import { Dropdown } from '@heroui/react';

interface SavedTabProps {
  name: string;
  isActive: boolean;
  onSelect: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

/** Saved filter tab — pill button + (aktifken) Düzenle/Kopyala/Sil dropdown'u.
 *  Products ve Orders sayfaları aynı pattern'ı paylaşır. */
export function SavedTab({
  name,
  isActive,
  onSelect,
  onRename,
  onDuplicate,
  onDelete,
}: SavedTabProps) {
  return (
    <div
      className={[
        'inline-flex h-8 cursor-pointer items-center justify-center rounded-full text-sm font-medium text-foreground transition-colors',
        isActive ? 'bg-foreground/[0.10]' : 'hover:bg-foreground/[0.10]',
      ].join(' ')}
    >
      <button
        type="button"
        onClick={onSelect}
        className={[
          'inline-flex h-8 items-center px-3',
          isActive ? 'rounded-l-full pr-2' : 'rounded-full',
        ].join(' ')}
      >
        {name}
      </button>
      {isActive && (
        <Dropdown>
          <Dropdown.Trigger
            aria-label="Filtre seti aksiyonları"
            className="mr-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-foreground/[0.06] text-muted transition-colors hover:bg-foreground/[0.10] hover:text-foreground"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </Dropdown.Trigger>
          <Dropdown.Popover
            className="w-[180px] overflow-hidden bg-surface/95 p-0 backdrop-blur-[4px]"
            style={{
              border: '1px solid var(--border)',
              boxShadow:
                '0px 1px 1px 0px rgba(0,0,0,0.04), 0px 3px 9px 0px rgba(0,0,0,0.04), 0px 6px 18px 0px rgba(0,0,0,0.02)',
            }}
          >
            <Dropdown.Menu
              aria-label="Filtre seti aksiyonları"
              onAction={(key) => {
                if (key === 'rename') onRename();
                else if (key === 'duplicate') onDuplicate();
                else if (key === 'delete') onDelete();
              }}
              className="flex flex-col gap-0 py-1 outline-none"
            >
              <Dropdown.Item
                id="rename"
                textValue="Düzenle"
                className="flex h-8 cursor-pointer items-center gap-2 px-3 text-[13px] font-medium text-foreground outline-none transition-colors data-[hovered=true]:bg-default/60 data-[focused=true]:bg-default/60"
              >
                <Pencil className="h-3.5 w-3.5 shrink-0 text-muted" />
                <span className="flex-1">Düzenle</span>
              </Dropdown.Item>
              <Dropdown.Item
                id="duplicate"
                textValue="Kopyala"
                className="flex h-8 cursor-pointer items-center gap-2 px-3 text-[13px] font-medium text-foreground outline-none transition-colors data-[hovered=true]:bg-default/60 data-[focused=true]:bg-default/60"
              >
                <Copy className="h-3.5 w-3.5 shrink-0 text-muted" />
                <span className="flex-1">Kopyala</span>
              </Dropdown.Item>
              <Dropdown.Item
                id="delete"
                textValue="Sil"
                className="flex h-8 cursor-pointer items-center gap-2 px-3 text-[13px] font-medium text-danger outline-none transition-colors data-[hovered=true]:bg-danger/10 data-[focused=true]:bg-danger/10"
              >
                <TrashBin className="h-3.5 w-3.5 shrink-0" />
                <span className="flex-1">Sil</span>
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      )}
    </div>
  );
}
