'use client';

import { ChevronDown, Copy, Pencil, TrashBin } from '@gravity-ui/icons';
import { BalinaDropdown, BalinaDropdownItem } from '@/components/balina';

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
        <BalinaDropdown
          trigger={
            <button
              type="button"
              aria-label="Filtre seti aksiyonları"
              className="mr-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-foreground/[0.06] text-muted transition-colors hover:bg-foreground/[0.10] hover:text-foreground"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          }
        >
          <BalinaDropdownItem
            icon={<Pencil className="h-3.5 w-3.5" />}
            onSelect={onRename}
          >
            Düzenle
          </BalinaDropdownItem>
          <BalinaDropdownItem
            icon={<Copy className="h-3.5 w-3.5" />}
            onSelect={onDuplicate}
          >
            Kopyala
          </BalinaDropdownItem>
          <BalinaDropdownItem
            icon={<TrashBin className="h-3.5 w-3.5" />}
            onSelect={onDelete}
            danger
          >
            Sil
          </BalinaDropdownItem>
        </BalinaDropdown>
      )}
    </div>
  );
}
