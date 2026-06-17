'use client';

import { useEffect, useState } from 'react';
import { Plus, TrashBin } from '@gravity-ui/icons';
import {
  BalinaButton,
  BalinaConfirmDialog,
  BalinaModal,
  BalinaModalClose,
  BalinaSwitch,
  BalinaTextField,
  BalinaTextarea,
  toast,
} from '@/components/balina';
import { usePageTitle } from '@/hooks/use-page-title';
import { PageHeader } from '@/components/layout/page-header';
import { BalinaCommentsIcon } from '@/components/balina';
import { useCompanyStore } from '@/stores/companyStore';
import { useStoreStore } from '@/stores/storeStore';
import { useKnowledgeBaseStore } from '@/stores/knowledgeBaseStore';

export default function KnowledgeBasePage() {
  usePageTitle('Bilgi tabanı');
  const { currentCompany } = useCompanyStore();
  const { stores, fetchStores } = useStoreStore();
  const {
    items,
    isLoading,
    fetchItems,
    createItem,
    updateItem,
    deleteItem,
  } = useKnowledgeBaseStore();

  const [activeStoreId, setActiveStoreId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (currentCompany?.id) fetchStores(currentCompany.id);
  }, [currentCompany?.id, fetchStores]);

  useEffect(() => {
    if (!activeStoreId && stores.length > 0) {
      setActiveStoreId(stores[0].id);
    }
  }, [stores, activeStoreId]);

  useEffect(() => {
    if (currentCompany?.id && activeStoreId) {
      fetchItems(currentCompany.id, activeStoreId);
    }
  }, [currentCompany?.id, activeStoreId, fetchItems]);

  const handleCreate = async (input: {
    questionPattern: string;
    idealAnswer: string;
    appliesTo: string;
  }) => {
    if (!currentCompany?.id || !activeStoreId) return;
    const result = await createItem(currentCompany.id, activeStoreId, {
      questionPattern: input.questionPattern,
      idealAnswer: input.idealAnswer,
      appliesTo: input.appliesTo || undefined,
    });
    if (result) {
      toast.success('Pattern eklendi');
      setCreateOpen(false);
    } else {
      toast.danger('Eklenemedi');
    }
  };

  const handleDelete = async () => {
    if (!currentCompany?.id || !activeStoreId || !deleteId) return;
    const ok = await deleteItem(currentCompany.id, activeStoreId, deleteId);
    if (ok) {
      toast.success('Silindi');
      setDeleteId(null);
    } else {
      toast.danger('Silinemedi');
    }
  };

  return (
    <>
      <PageHeader
        title="Bilgi tabanı"
        icon={<BalinaCommentsIcon className="h-4 w-4" />}
        action={
          activeStoreId && (
            <BalinaButton
              variant="soft"
              size="small"
              onClick={() => setCreateOpen(true)}
              leftIcon={<Plus className="h-3.5 w-3.5" />}
              className="h-8 px-3 text-xs"
            >
              Yeni pattern
            </BalinaButton>
          )
        }
      />

      <div className="flex flex-1 flex-col gap-3 p-4">
        {/* Store seçici */}
        <div className="flex flex-wrap gap-1">
          {stores.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveStoreId(s.id)}
              className={[
                'inline-flex h-7 items-center rounded-full px-2.5 text-[11px] font-medium transition-colors',
                activeStoreId === s.id
                  ? 'bg-foreground/[0.10] text-foreground'
                  : 'bg-foreground/[0.04] text-muted hover:bg-foreground/[0.06]',
              ].join(' ')}
            >
              {s.name}
            </button>
          ))}
        </div>

        {isLoading && items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-foreground/[0.10] p-6 text-center text-xs text-muted">
            Yükleniyor…
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-foreground/[0.10] bg-foreground/[0.02] p-8 text-center text-xs text-muted">
            Henüz pattern eklenmedi. AI'ın doğru cevap vermesi için soru/cevap
            kalıpları ekle — örn. &quot;İade var mı?&quot; → &quot;Hijyen
            sebebiyle iade kabul etmiyoruz.&quot;
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-foreground/[0.06] bg-white/60 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {item.questionPattern}
                      </span>
                      {item.appliesTo && (
                        <span className="rounded-full bg-foreground/[0.06] px-2 py-0.5 text-[10px] font-medium text-foreground/70">
                          {item.appliesTo}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-xs leading-relaxed text-foreground/80">
                      {item.idealAnswer}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <BalinaSwitch
                      checked={item.active}
                      onCheckedChange={(v) =>
                        currentCompany?.id &&
                        activeStoreId &&
                        updateItem(
                          currentCompany.id,
                          activeStoreId,
                          item.id,
                          { active: v },
                        )
                      }
                    />
                    <BalinaButton
                      variant="soft"
                      size="small"
                      onClick={() => setDeleteId(item.id)}
                      aria-label="Sil"
                      className="h-7 w-7 text-danger"
                    >
                      <TrashBin className="h-3 w-3" />
                    </BalinaButton>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      {createOpen && (
        <CreatePatternModal
          isOpen={createOpen}
          onClose={() => setCreateOpen(false)}
          onSubmit={handleCreate}
        />
      )}

      {/* Delete confirm */}
      <BalinaConfirmDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Pattern'ı sil"
        description="Bu pattern kalıcı olarak silinecek."
        confirmLabel="Sil"
        cancelLabel="Vazgeç"
        onConfirm={handleDelete}
        danger
      />
    </>
  );
}

function CreatePatternModal({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: {
    questionPattern: string;
    idealAnswer: string;
    appliesTo: string;
  }) => Promise<void>;
}) {
  const [questionPattern, setQuestionPattern] = useState('');
  const [idealAnswer, setIdealAnswer] = useState('');
  const [appliesTo, setAppliesTo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!questionPattern.trim() || !idealAnswer.trim()) return;
    setSubmitting(true);
    await onSubmit({ questionPattern, idealAnswer, appliesTo });
    setSubmitting(false);
  };

  return (
    <BalinaModal
      open={isOpen}
      onOpenChange={(o) => !o && onClose()}
      className="sm:max-w-[520px]"
      title="Yeni pattern"
      footer={
        <>
          <BalinaModalClose asChild>
            <BalinaButton variant="soft" size="large" disabled={submitting}>
              Vazgeç
            </BalinaButton>
          </BalinaModalClose>
          <BalinaButton
            variant="primary"
            size="large"
            onClick={handleSubmit}
            disabled={
              submitting ||
              !questionPattern.trim() ||
              !idealAnswer.trim()
            }
          >
            Ekle
          </BalinaButton>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <BalinaTextField
          label="Soru kalıbı"
          value={questionPattern}
          onChange={setQuestionPattern}
          placeholder='Örn: "İade var mı?"'
        />
        <div className="flex flex-col gap-1">
          <label className="text-body-small-one-liner-medium px-1 text-[var(--balina-text-strong)]">
            İdeal cevap
          </label>
          <BalinaTextarea
            rows={4}
            value={idealAnswer}
            onChange={(e) => setIdealAnswer(e.target.value)}
            placeholder="AI'ın bu pattern'a yakın sorulara nasıl cevap vermesini istersin?"
          />
        </div>
        <BalinaTextField
          label="Kapsam (opsiyonel)"
          value={appliesTo}
          onChange={setAppliesTo}
          placeholder="all / product / order / exchange / ..."
        />
      </div>
    </BalinaModal>
  );
}
