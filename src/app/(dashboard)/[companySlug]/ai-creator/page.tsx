'use client';

import { GuidedAiChatPanel } from '@/components/ai/guided-ai-chat-panel';
import { PageHeader } from '@/components/layout/page-header';
import { usePageTitle } from '@/hooks/use-page-title';

export default function AiCreatorPage() {
  usePageTitle('AI Üretim');

  return (
    <>
      <PageHeader title="AI Üretim" />
      <div className="flex flex-1 overflow-hidden p-1">
        <div className="mx-auto flex h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-surface">
          <GuidedAiChatPanel variant="full" />
        </div>
      </div>
    </>
  );
}
