'use client';

import * as React from 'react';
import { ChevronDown, Plus, Pencil, Copy, TrashBin } from '@gravity-ui/icons';
import {
  BalinaButton,
  BalinaModal,
  BalinaTextField,
  BalinaDropdown,
  BalinaDropdownItem,
} from '@/components/balina';
import { useSavedFilterStore, type SavedFilter } from '@/stores/savedFilterStore';
import {
  FilterDef,
  applyFilterPayload,
  arePayloadsEqual,
  captureFilterPayload,
  clearFilters,
  isFilterActive,
} from './filter-types';

interface SavedFilterTabsProps {
  companyId: string | undefined;
  context: string;
  filters: FilterDef[];
  /** Trailing slot — tabs ile filter icon arasındaki "+" gibi aksiyonlar için. */
  trailing?: React.ReactNode;
  /** Sağ uçta render edilen filter icon vb. */
  rightAction?: React.ReactNode;
}

/**
 * Linear-vari tab strip. "Tümü" + kayıtlı filtre setleri.
 *   - Aktif tab: dark filled chip
 *   - Pasif tab: ghost (hover'da subtle bg)
 *   - Aktif saved tab'a tıklanınca: chevron dropdown menü açar
 *     (Adı Değiştir / Çoğalt / Sil)
 *   - Trailing: tab'lar yanında "+" ikon-only butonu
 *   - rightAction: en sağda filter popover ikonu
 */
export function SavedFilterTabs({
  companyId,
  context,
  filters,
  trailing,
  rightAction,
}: SavedFilterTabsProps) {
  const fetchSaved = useSavedFilterStore((s) => s.fetch);
  const list = useSavedFilterStore((s) => s.list);
  const create = useSavedFilterStore((s) => s.create);
  const update = useSavedFilterStore((s) => s.update);
  const remove = useSavedFilterStore((s) => s.remove);

  React.useEffect(() => {
    if (companyId) fetchSaved(companyId, context);
  }, [companyId, context, fetchSaved]);

  const saved = list(context);

  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [saveOpen, setSaveOpen] = React.useState(false);
  const [renameId, setRenameId] = React.useState<string | null>(null);

  const currentPayload = captureFilterPayload(filters);
  const hasActive = filters.some(isFilterActive);

  const activeTab: SavedFilter | undefined = activeId
    ? saved.find((s) => s.id === activeId)
    : undefined;

  const isDirty = activeTab
    ? !arePayloadsEqual(activeTab.payload, currentPayload)
    : hasActive;

  const handleSelectAll = () => {
    setActiveId(null);
    clearFilters(filters);
  };

  const handleSelectTab = (sf: SavedFilter) => {
    setActiveId(sf.id);
    applyFilterPayload(filters, sf.payload);
  };

  const handleSaveCurrent = async (name: string) => {
    if (!companyId) return;
    const sf = await create(companyId, context, name, currentPayload);
    if (sf) setActiveId(sf.id);
  };

  const handleUpdateActive = async () => {
    if (!companyId || !activeTab) return;
    await update(companyId, activeTab.id, { payload: currentPayload });
  };

  const handleDelete = async (sf: SavedFilter) => {
    if (!companyId) return;
    if (activeId === sf.id) {
      setActiveId(null);
      clearFilters(filters);
    }
    await remove(companyId, sf.id);
  };

  const handleDuplicate = async (sf: SavedFilter) => {
    if (!companyId) return;
    const dup = await create(companyId, context, `${sf.name} kopyası`, sf.payload);
    if (dup) setActiveId(dup.id);
  };

  const handleRename = async (id: string, name: string) => {
    if (!companyId) return;
    await update(companyId, id, { name });
  };

  return (
    <>
      <div className="flex flex-wrap content-center items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Tümü — default tab */}
          <TabButton isActive={activeId === null} onClick={handleSelectAll}>
            Tüm Ürünler
          </TabButton>

          {/* Kullanıcı tarafından kaydedilmiş tablar */}
          {saved.map((sf) => (
            <SavedTabButton
              key={sf.id}
              tab={sf}
              isActive={activeId === sf.id}
              onSelect={() => handleSelectTab(sf)}
              onRename={() => setRenameId(sf.id)}
              onDuplicate={() => handleDuplicate(sf)}
              onDelete={() => handleDelete(sf)}
            />
          ))}

          {/* "+" — yeni filtre seti kaydet (aktif filtre yokken disabled). */}
          <button
            type="button"
            aria-label="Yeni filtre seti kaydet"
            onClick={() => setSaveOpen(true)}
            disabled={!hasActive}
            className={[
              'inline-flex h-8 w-8 items-center justify-center rounded-2xl transition-colors',
              hasActive
                ? 'text-foreground hover:bg-foreground/[0.04]'
                : 'cursor-not-allowed text-muted/40',
            ].join(' ')}
          >
            <Plus className="h-4 w-4" />
          </button>

          {/* Dirty saved tab → "Güncelle" mini CTA */}
          {activeTab && isDirty && (
            <button
              type="button"
              onClick={handleUpdateActive}
              className="rounded-md px-2 py-1 text-xs font-medium text-foreground/70 transition-colors hover:bg-surface-secondary hover:text-foreground"
            >
              Güncelle
            </button>
          )}

          {trailing}
        </div>

        {/* Right action — filter popover icon (active-styled, far right) */}
        {rightAction}
      </div>

      {/* Save modal */}
      <NamePromptModal
        open={saveOpen}
        title="Filtreyi Kaydet"
        defaultValue=""
        onCancel={() => setSaveOpen(false)}
        onSubmit={async (name) => {
          await handleSaveCurrent(name);
          setSaveOpen(false);
        }}
      />

      {/* Rename modal */}
      <NamePromptModal
        open={renameId !== null}
        title="Filtreyi Yeniden Adlandır"
        defaultValue={saved.find((s) => s.id === renameId)?.name ?? ''}
        onCancel={() => setRenameId(null)}
        onSubmit={async (name) => {
          if (renameId) await handleRename(renameId, name);
          setRenameId(null);
        }}
      />
    </>
  );
}

// ---- Tab buttons ----------------------------------------------------------

function TabButton({
  isActive,
  onClick,
  children,
}: {
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded-2xl px-3 py-1.5 text-sm font-medium leading-5 text-foreground transition-colors',
        isActive
          ? 'bg-foreground/[0.06]'
          : 'hover:bg-foreground/[0.04]',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

/** Kaydedilmiş tab — aktif olduğunda yanında chevron + dropdown menü. */
function SavedTabButton({
  tab,
  isActive,
  onSelect,
  onRename,
  onDuplicate,
  onDelete,
}: {
  tab: SavedFilter;
  isActive: boolean;
  onSelect: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={[
        'inline-flex h-8 min-w-8 items-center gap-1 rounded-2xl text-sm font-medium leading-5 text-foreground transition-colors',
        isActive ? 'bg-foreground/[0.06]' : 'hover:bg-foreground/[0.04]',
      ].join(' ')}
    >
      <button
        type="button"
        onClick={onSelect}
        className={['inline-flex h-full items-center py-1.5 pl-3', isActive ? 'pr-1' : 'pr-3'].join(' ')}
      >
        {tab.name}
      </button>
      {isActive && (
        <BalinaDropdown
          trigger={
            <button
              type="button"
              aria-label="Filtre menüsü"
              className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded text-foreground/60 transition-colors hover:bg-foreground/[0.08] hover:text-foreground"
            >
              <ChevronDown className="h-3 w-3" />
            </button>
          }
        >
          <BalinaDropdownItem
            icon={<Pencil className="h-3.5 w-3.5" />}
            onSelect={onRename}
          >
            Adı Değiştir
          </BalinaDropdownItem>
          <BalinaDropdownItem
            icon={<Copy className="h-3.5 w-3.5" />}
            onSelect={onDuplicate}
          >
            Çoğalt
          </BalinaDropdownItem>
          <BalinaDropdownItem
            icon={<TrashBin className="h-3.5 w-3.5" />}
            onSelect={onDelete}
          >
            Sil
          </BalinaDropdownItem>
        </BalinaDropdown>
      )}
    </div>
  );
}

// ---- Name prompt modal ----------------------------------------------------

function NamePromptModal({
  open,
  title,
  defaultValue,
  onCancel,
  onSubmit,
}: {
  open: boolean;
  title: string;
  defaultValue: string;
  onCancel: () => void;
  onSubmit: (name: string) => void;
}) {
  const [value, setValue] = React.useState(defaultValue);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setValue(defaultValue);
      setError(null);
    }
  }, [open, defaultValue]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed) {
      setError('İsim boş olamaz');
      return;
    }
    onSubmit(trimmed);
  };

  return (
    <BalinaModal
      open={open}
      onOpenChange={(o) => !o && onCancel()}
      className="sm:max-w-[420px]"
      title={title}
      footer={
        <>
          <BalinaButton variant="ghost" size="large" onClick={onCancel}>
            Vazgeç
          </BalinaButton>
          <BalinaButton variant="primary" size="large" onClick={handleSubmit}>
            Kaydet
          </BalinaButton>
        </>
      }
    >
      <BalinaTextField
        label="İsim"
        value={value}
        onChange={(v) => {
          setValue(v);
          if (error) setError(null);
        }}
        error={error ?? undefined}
        placeholder="Örn. Stoğu bitenler"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleSubmit();
          }
        }}
      />
    </BalinaModal>
  );
}
