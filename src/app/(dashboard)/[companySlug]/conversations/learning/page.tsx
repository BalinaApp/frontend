'use client';

import { useEffect, useState } from 'react';
import { Check, Xmark } from '@gravity-ui/icons';
import {
  BalinaButton,
  BalinaModal,
  BalinaModalClose,
  BalinaTextField,
  BalinaTextarea,
  toast,
} from '@/components/balina';
import { usePageTitle } from '@/hooks/use-page-title';
import { PageHeader } from '@/components/layout/page-header';
import { BalinaCommentsIcon } from '@/components/balina';
import { useCompanyStore } from '@/stores/companyStore';
import { useStoreStore } from '@/stores/storeStore';
import {
  useKnowledgeBaseStore,
  type LearningCluster,
} from '@/stores/knowledgeBaseStore';

export default function LearningQueuePage() {
  usePageTitle('Öğrenme kuyruğu');
  const { currentCompany } = useCompanyStore();
  const { stores, fetchStores } = useStoreStore();
  const { clusters, isLoading, fetchClusters, approveCluster, rejectCluster } =
    useKnowledgeBaseStore();

  const [activeStoreId, setActiveStoreId] = useState<string | null>(null);
  const [approving, setApproving] = useState<LearningCluster | null>(null);

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
      fetchClusters(currentCompany.id, activeStoreId, 'pending');
    }
  }, [currentCompany?.id, activeStoreId, fetchClusters]);

  const handleApprove = async (overrideAnswer?: string) => {
    if (!currentCompany?.id || !activeStoreId || !approving) return;
    const ok = await approveCluster(
      currentCompany.id,
      activeStoreId,
      approving.id,
      overrideAnswer,
    );
    if (ok) {
      toast.success('Pattern bilgi tabanına eklendi');
      setApproving(null);
    } else {
      toast.danger('Onaylanamadı');
    }
  };

  const handleReject = async (clusterId: string) => {
    if (!currentCompany?.id || !activeStoreId) return;
    const ok = await rejectCluster(currentCompany.id, activeStoreId, clusterId);
    if (ok) {
      toast.success('Reddedildi');
    } else {
      toast.danger('Reddedilemedi');
    }
  };

  return (
    <>
      <PageHeader
        title="Öğrenme kuyruğu"
        icon={<BalinaCommentsIcon className="h-4 w-4" />}
      />

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="rounded-xl bg-foreground/[0.04] p-3 text-xs text-foreground/80">
          Gece her gün AI, kapanmış sohbetlerden ortak desenleri çıkarır. Buraya
          onayına gelen önerileri inceleyip{' '}
          <strong>Bilgi tabanına</strong> taşıyabilirsin.
        </div>

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

        {isLoading && clusters.length === 0 ? (
          <div className="rounded-xl border border-dashed border-foreground/[0.10] p-6 text-center text-xs text-muted">
            Yükleniyor…
          </div>
        ) : clusters.length === 0 ? (
          <div className="rounded-xl border border-dashed border-foreground/[0.10] bg-foreground/[0.02] p-8 text-center text-xs text-muted">
            Şu an onayını bekleyen öneri yok.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {clusters.map((cluster) => (
              <div
                key={cluster.id}
                className="rounded-xl border border-foreground/[0.06] bg-white/60 p-3"
              >
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {cluster.suggestedPattern}
                    </span>
                    <span className="rounded-full bg-foreground/[0.06] px-2 py-0.5 text-[10px] font-medium text-foreground/70">
                      {cluster.clusterSize} örnek
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <BalinaButton
                      variant="primary"
                      size="small"
                      onClick={() => setApproving(cluster)}
                      leftIcon={<Check className="h-3.5 w-3.5" />}
                      className="h-7 px-3 text-xs"
                    >
                      Onayla
                    </BalinaButton>
                    <BalinaButton
                      variant="danger"
                      size="small"
                      onClick={() => handleReject(cluster.id)}
                      aria-label="Reddet"
                      className="h-7 w-7"
                    >
                      <Xmark className="h-3.5 w-3.5" />
                    </BalinaButton>
                  </div>
                </div>
                <div className="text-xs leading-relaxed text-foreground/80">
                  {cluster.suggestedAnswer}
                </div>
                {cluster.sampleQuestions.length > 0 && (
                  <details className="mt-2 text-[11px] text-muted">
                    <summary className="cursor-pointer hover:text-foreground">
                      Örnek sorular ({cluster.sampleQuestions.length})
                    </summary>
                    <ul className="mt-1 list-disc space-y-0.5 pl-4">
                      {cluster.sampleQuestions.slice(0, 5).map((q, i) => (
                        <li key={i}>{q}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Approve confirm with optional answer edit */}
      {approving && (
        <ApproveModal
          cluster={approving}
          onClose={() => setApproving(null)}
          onConfirm={handleApprove}
        />
      )}
    </>
  );
}

function ApproveModal({
  cluster,
  onClose,
  onConfirm,
}: {
  cluster: LearningCluster;
  onClose: () => void;
  onConfirm: (overrideAnswer?: string) => Promise<void>;
}) {
  const [pattern] = useState(cluster.suggestedPattern);
  const [answer, setAnswer] = useState(cluster.suggestedAnswer);
  const [submitting, setSubmitting] = useState(false);

  const handle = async () => {
    setSubmitting(true);
    await onConfirm(
      answer.trim() !== cluster.suggestedAnswer.trim() ? answer : undefined,
    );
    setSubmitting(false);
  };

  return (
    <BalinaModal
      open
      onOpenChange={(o) => !o && onClose()}
      className="sm:max-w-[520px]"
      title="Onayla ve bilgi tabanına ekle"
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
            onClick={handle}
            disabled={submitting || !answer.trim()}
            leftIcon={<Check className="h-3.5 w-3.5" />}
          >
            Onayla
          </BalinaButton>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <BalinaTextField
          label="Soru kalıbı"
          value={pattern}
          onChange={() => {}}
          readOnly
        />
        <div className="flex flex-col gap-1">
          <label className="text-body-small-one-liner-medium px-1 text-[var(--balina-text-strong)]">
            İdeal cevap (düzenleyebilirsin)
          </label>
          <BalinaTextarea
            rows={5}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
          />
        </div>
      </div>
    </BalinaModal>
  );
}
