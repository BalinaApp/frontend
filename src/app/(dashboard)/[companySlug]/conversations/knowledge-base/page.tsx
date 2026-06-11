'use client';

import { useEffect, useState } from 'react';
import { Plus, TrashBin } from '@gravity-ui/icons';
import {
  AlertDialog,
  Button,
  Input,
  Label,
  Modal,
  Switch,
  TextArea,
  TextField,
  toast,
} from '@/components/ui';
import { usePageTitle } from '@/hooks/use-page-title';
import { PageHeader } from '@/components/layout/page-header';
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
        action={
          activeStoreId && (
            <Button
              variant="primary"
              size="sm"
              onPress={() => setCreateOpen(true)}
              className="h-8 rounded-full px-3 text-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              Yeni pattern
            </Button>
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
                    <Switch
                      isSelected={item.active}
                      onChange={(v) =>
                        currentCompany?.id &&
                        activeStoreId &&
                        updateItem(
                          currentCompany.id,
                          activeStoreId,
                          item.id,
                          { active: v },
                        )
                      }
                    >
                      <Switch.Control>
                        <Switch.Thumb />
                      </Switch.Control>
                    </Switch>
                    <Button
                      variant="tertiary"
                      size="sm"
                      isIconOnly
                      onPress={() => setDeleteId(item.id)}
                      aria-label="Sil"
                      className="h-7 w-7 rounded-full text-danger"
                    >
                      <TrashBin className="h-3 w-3" />
                    </Button>
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
      <AlertDialog
        isOpen={deleteId !== null}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialog.Backdrop>
          <AlertDialog.Container>
            <AlertDialog.Dialog className="sm:max-w-[420px]">
              <AlertDialog.Header>
                <AlertDialog.Icon status="danger" />
                <AlertDialog.Heading>Pattern&apos;ı sil</AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body className="px-2 pb-0">
                Bu pattern kalıcı olarak silinecek.
              </AlertDialog.Body>
              <AlertDialog.Footer className="!mt-3 px-2">
                <Button variant="tertiary" slot="close">
                  Vazgeç
                </Button>
                <Button variant="danger" onPress={handleDelete}>
                  Sil
                </Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>
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
    <Modal isOpen={isOpen} onOpenChange={(o) => !o && onClose()}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-[520px]">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>Yeni pattern</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="px-4">
              <div className="flex flex-col gap-3">
                <TextField
                  value={questionPattern}
                  onChange={setQuestionPattern}
                >
                  <Label>Soru kalıbı</Label>
                  <Input placeholder='Örn: "İade var mı?"' />
                </TextField>
                <TextField value={idealAnswer} onChange={setIdealAnswer}>
                  <Label>İdeal cevap</Label>
                  <TextArea
                    rows={4}
                    placeholder="AI'ın bu pattern'a yakın sorulara nasıl cevap vermesini istersin?"
                  />
                </TextField>
                <TextField value={appliesTo} onChange={setAppliesTo}>
                  <Label>Kapsam (opsiyonel)</Label>
                  <Input placeholder="all / product / order / exchange / ..." />
                </TextField>
              </div>
            </Modal.Body>
            <Modal.Footer>
              <Button variant="tertiary" slot="close" isDisabled={submitting}>
                Vazgeç
              </Button>
              <Button
                variant="primary"
                onPress={handleSubmit}
                isPending={submitting}
                isDisabled={
                  submitting ||
                  !questionPattern.trim() ||
                  !idealAnswer.trim()
                }
              >
                Ekle
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
