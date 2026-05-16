'use client';

import * as React from 'react';
import { Plus, Xmark } from '@gravity-ui/icons';
import {
  Button,
  Dropdown,
  FieldError,
  Input,
  Label,
  Modal,
  TextField,
  toast,
} from '@heroui/react';
import {
  arePayloadsEqual,
  captureFilterPayload,
  clearFilters,
  FilterDef,
  isFilterActive,
  resetFilter,
  summarizeFilterValue,
} from './filter-types';
import type { SavedFilter } from '@/stores/savedFilterStore';
import { FilterDetailPanel, FilterPopover } from './filter-popover';
import { useSavedFilterStore } from '@/stores/savedFilterStore';

interface ActiveFilterChipsProps {
  filters: FilterDef[];
  /** Save (Kaydet) için gerekli — verilmezse Kaydet butonu gizlenir. */
  companyId?: string;
  /** Save kayıtları için context anahtarı (örn. "products"). */
  context?: string;
  /** Şu an seçili saved tab — eğer current filter payload bu tab'ın
   *  payload'una eşitse chips alanı render edilmez (filter zaten tab ile
   *  temsil ediliyor; chips dirty-state için). */
  activeSavedFilter?: SavedFilter | null;
  /** Kaydet sonrası parent'a yeni saved filter bildir — parent activeSavedId'i
   *  yeni id'ye çevirir, böylece chips alanı otomatik saklanır. */
  onSaved?: (saved: SavedFilter) => void;
  className?: string;
}

/**
 * Figma 12281:5427 — Aktif filtre alanı.
 *
 *   ┌── outer card: bg rgba(0,0,0,0.04), rounded-16, padding-16 ──┐
 *   │                                                              │
 *   │  [Durumu | ile | Aktif | ×]  [+]          [Vazgeç] [Kaydet] │
 *   │                                                              │
 *   └──────────────────────────────────────────────────────────────┘
 *
 * Her aktif filtre, Figma "ButtonGroup" desenine uygun olarak tek bir
 * #EBEBEC pill içinde 4 hücreden oluşur: filter adı, preposition
 * (ör. "ile"), seçili değer, × silme. Hücreler arası ayraç görünmüyor
 * (Figma'da fill_0NBBPX: [] — empty fill); cell hover'ı görsel olarak
 * segmenti belirginleştiriyor.
 *
 * Sağ tarafta Vazgeç (clear) ve Kaydet (filter set olarak sakla) butonları.
 * Kaydet, HeroUI Modal ile isim alıp `useSavedFilterStore.create()` çağırır.
 */
export function ActiveFilterChips({
  filters,
  companyId,
  context,
  activeSavedFilter,
  onSaved,
  className,
}: ActiveFilterChipsProps) {
  const active = filters.filter(isFilterActive);
  const create = useSavedFilterStore((s) => s.create);
  const update = useSavedFilterStore((s) => s.update);

  const [saveOpen, setSaveOpen] = React.useState(false);
  const [saveName, setSaveName] = React.useState('');
  const [saveErr, setSaveErr] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  if (active.length === 0) return null;

  // Aktif saved tab'la birebir aynı payload varsa chips'i gizle — filter
  // zaten tab ile temsil ediliyor (dirty-state'de tekrar görünür).
  if (activeSavedFilter) {
    const current = captureFilterPayload(filters);
    if (arePayloadsEqual(current, activeSavedFilter.payload)) return null;
  }

  // Aktif saved tab varken Kaydet → mevcut seti GÜNCELLE (modal açma, isim
  // sorma). Aktif tab yoksa Kaydet → yeni set oluşturmak için modal aç.
  const handleKaydet = async () => {
    if (!companyId || !context) return;
    if (activeSavedFilter) {
      const payload = captureFilterPayload(filters);
      const result = await update(companyId, activeSavedFilter.id, { payload });
      if (result) {
        toast.success(`"${activeSavedFilter.name}" güncellendi`);
        // Parent activeSavedId'i değiştirmeyi gerekmiyor — zaten aktif.
        onSaved?.(result);
      } else {
        toast.danger('Güncellenemedi');
      }
      return;
    }
    // Yeni set: modal aç.
    setSaveName('');
    setSaveErr(null);
    setSaveOpen(true);
  };

  const canSave = !!companyId && !!context;

  const handleClear = () => clearFilters(filters);

  const handleSubmitSave = async () => {
    if (!companyId || !context) return;
    const name = saveName.trim();
    if (!name) {
      setSaveErr('Lütfen bir isim girin');
      return;
    }
    setIsSaving(true);
    try {
      const payload = captureFilterPayload(filters);
      const result = await create(companyId, context, name, payload);
      if (result) {
        toast.success('Filtre seti kaydedildi');
        setSaveOpen(false);
        // Parent activeSavedId'i yeni id'ye çevirsin — chips alanı saklanır
        // (filter şimdi yeni tab tarafından temsil ediliyor).
        onSaved?.(result);
      } else {
        setSaveErr('Kaydedilemedi — tekrar deneyin');
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className={[className ?? ''].join(' ')}>
        {/* Inner card padding 12 4 — chip ve butonlar kenara yapışmasın. */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-foreground/[0.04] px-4 py-3">
          {/* SOL: chip group + add (+) */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {active.map((f) => (
                <SegmentedChip key={f.id} def={f} />
              ))}
            </div>
            {/* + Filtre ekle — ghost icon-only (Figma 12281:5453) */}
            <FilterPopover
              filters={filters}
              triggerAriaLabel="Filtre ekle"
              triggerClassName="inline-flex h-8 w-8 items-center justify-center rounded-2xl text-foreground transition-colors hover:bg-foreground/[0.06]"
              trigger={<Plus className="h-4 w-4" />}
            />
          </div>

          {/* SAĞ: Vazgeç + Kaydet */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleClear}
              // Vazgeç ghost (sadece text) — outer card #F5F5F5 tonunda olduğu
              // için #EBEBEC bg ile çakışıyordu, görünmüyordu. Hover'da subtle bg.
              className="inline-flex h-8 items-center rounded-2xl px-3 text-sm font-medium leading-5 text-foreground transition-colors hover:bg-foreground/[0.06]"
            >
              Vazgeç
            </button>
            {canSave && (
              <button
                type="button"
                onClick={handleKaydet}
                // Kaydet → aktif saved tab varsa onu güncelle, yoksa yeni
                // set için modal aç. Label "Kaydet" — güncelleme durumu
                // toast ile bildiriliyor.
                className="inline-flex h-8 items-center rounded-2xl bg-accent px-3 text-sm font-medium leading-5 text-accent-foreground transition-colors hover:brightness-95"
              >
                Kaydet
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Save modal — isim al + create() */}
      <Modal
        isOpen={saveOpen}
        onOpenChange={(open) => {
          if (!isSaving) setSaveOpen(open);
        }}
      >
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-[420px]">
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>Filtre setini kaydet</Modal.Heading>
                <p className="mt-1 text-sm text-muted">
                  Bu filtre kombinasyonunu isim vererek kaydedin; daha sonra
                  tek tıkla geri yükleyebilirsiniz.
                </p>
              </Modal.Header>
              <Modal.Body>
                <TextField
                  value={saveName}
                  onChange={(v) => {
                    setSaveName(v);
                    if (saveErr) setSaveErr(null);
                  }}
                  isInvalid={!!saveErr}
                  autoFocus
                >
                  <Label>İsim</Label>
                  <Input
                    placeholder="örn. Pasif WC ürünleri"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleSubmitSave();
                      }
                    }}
                  />
                  {saveErr && <FieldError>{saveErr}</FieldError>}
                </TextField>
              </Modal.Body>
              <Modal.Footer>
                <Button variant="tertiary" slot="close" isDisabled={isSaving}>
                  Vazgeç
                </Button>
                <Button
                  variant="primary"
                  onPress={handleSubmitSave}
                  isPending={isSaving}
                  isDisabled={isSaving}
                >
                  Kaydet
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}

// ---- Segmented chip — Figma 12281:4152 ButtonGroup ----------------------
// Tek pill içinde 4 hücre, hepsi #EBEBEC bg üzerinde. Hücreler arasında
// görünür ayraç yok; cell hover'ı (#000/0.06) ile vurgulanır.

function SegmentedChip({ def }: { def: FilterDef }) {
  const Icon = def.icon;
  const summary = summarizeFilterValue(def);
  const preposition = def.preposition ?? 'ile';

  const [labelOpen, setLabelOpen] = React.useState(false);
  const [valueOpen, setValueOpen] = React.useState(false);

  return (
    <div
      // Outer card #EBEBEC üzerinde chip'in segmentleri görünsün diye chip bg
      // beyaza alındı (Figma'da renkler birbirine çok yakındı, kontrast yok).
      // İnce 1px shadow ile sınırlandırılıyor — segment hover'da bg darklaşıyor.
      className="inline-flex h-8 items-stretch overflow-hidden rounded-2xl bg-surface shadow-[inset_0_0_0_1px_var(--border)]"
    >
      {/* Hücre 1 — icon + label */}
      <Dropdown isOpen={labelOpen} onOpenChange={setLabelOpen}>
        <Dropdown.Trigger
          aria-label={`${def.label} filtresini düzenle`}
          className="inline-flex h-8 items-center gap-1 px-3 text-sm font-medium leading-5 text-foreground transition-colors hover:bg-foreground/[0.04]"
        >
          {Icon ? <Icon className="h-4 w-4 text-foreground" /> : null}
          <span>{def.label}</span>
        </Dropdown.Trigger>
        <ChipDropdownPopover>
          <FilterDetailPanel def={def} onCommit={() => setLabelOpen(false)} />
        </ChipDropdownPopover>
      </Dropdown>

      {/* Hücre 2 — preposition (pasif metin, hover yok) */}
      <span className="inline-flex h-8 items-center px-2 text-sm font-medium leading-5 text-muted">
        {preposition}
      </span>

      {/* Hücre 3 — icon + summary (seçili değer) */}
      <Dropdown isOpen={valueOpen} onOpenChange={setValueOpen}>
        <Dropdown.Trigger
          aria-label={`${def.label} değerini değiştir`}
          className="inline-flex h-8 items-center gap-1 px-3 text-sm font-medium leading-5 text-foreground transition-colors hover:bg-foreground/[0.04]"
        >
          {Icon ? <Icon className="h-4 w-4 text-foreground" /> : null}
          <span className="max-w-[160px] truncate">{summary || '—'}</span>
        </Dropdown.Trigger>
        <ChipDropdownPopover>
          <FilterDetailPanel def={def} onCommit={() => setValueOpen(false)} />
        </ChipDropdownPopover>
      </Dropdown>

      {/* Hücre 4 — × (filtre silme) */}
      <button
        type="button"
        onClick={() => resetFilter(def)}
        aria-label={`${def.label} filtresini kaldır`}
        className="inline-flex h-8 w-8 items-center justify-center text-muted transition-colors hover:bg-foreground/[0.04] hover:text-foreground"
      >
        <Xmark className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// Chip dropdown popover'ları için ortak görünüm (FilterPopover ile aynı).
function ChipDropdownPopover({ children }: { children: React.ReactNode }) {
  return (
    <Dropdown.Popover
      className="w-[206px] overflow-hidden bg-surface/95 p-0 backdrop-blur-[4px]"
      style={{
        border: '1px solid #F3F4F6',
        boxShadow:
          '0px 1px 1px 0px rgba(0,0,0,0.04), 0px 3px 9px 0px rgba(0,0,0,0.04), 0px 6px 18px 0px rgba(0,0,0,0.02)',
      }}
    >
      {children}
    </Dropdown.Popover>
  );
}
