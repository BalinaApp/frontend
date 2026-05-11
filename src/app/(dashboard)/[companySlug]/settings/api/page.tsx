'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  ArrowUpRightFromSquare,
  ChevronRight,
  CircleCheckFill,
  Copy,
  Globe,
  Key,
} from '@gravity-ui/icons';
import { toast } from '@heroui/react';
import { useCompanyStore } from '@/stores/companyStore';
import { usePageTitle } from '@/hooks/use-page-title';

export default function ApiSettingsPage() {
  usePageTitle('API');

  const router = useRouter();
  const { currentCompany } = useCompanyStore();
  const slug = currentCompany?.slug ?? '';

  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003/api';
  // Swagger lives at /api/docs on the same host as the API base URL.
  const swaggerUrl = baseUrl.replace(/\/api\/?$/, '') + '/api/docs';

  const [copied, setCopied] = useState(false);
  const copyBaseUrl = async () => {
    await navigator.clipboard.writeText(baseUrl);
    setCopied(true);
    toast.success('Base URL kopyalandı');
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <>
      {/* Section header */}
      <div className="flex h-[61px] items-center gap-2 border-b border-black/[0.02] px-3.5">
        <h2 className="text-sm font-medium text-foreground">API</h2>
      </div>

      <div className="flex flex-1 flex-col items-center overflow-y-auto py-6">
        <div className="flex w-full max-w-[616px] flex-col px-3">
          <div className="flex flex-col rounded-xl bg-surface">
            {/* Base URL — click to copy */}
            <button
              type="button"
              onClick={copyBaseUrl}
              className="flex cursor-pointer items-center gap-3 border-b border-black/[0.04] p-3 text-left"
            >
              <div className="flex flex-1 items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-yellow-500 text-white">
                  <Globe className="h-5 w-5" />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <span className="text-sm font-medium text-foreground/85">
                    Base URL
                  </span>
                  <span className="break-all text-xs text-muted">
                    {baseUrl}
                  </span>
                </div>
              </div>
              {copied ? (
                <CircleCheckFill className="h-3 w-3 text-success" />
              ) : (
                <Copy className="h-3 w-3 text-muted" />
              )}
            </button>

            {/* API'ler — link to keys list */}
            <button
              type="button"
              onClick={() => router.push(`/${slug}/settings/api/keys`)}
              className="flex cursor-pointer items-center gap-3 border-b border-black/[0.04] p-3 text-left"
            >
              <div className="flex flex-1 items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-500 text-white">
                  <Key className="h-5 w-5" />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <span className="text-sm font-medium text-foreground/85">
                    API&apos;ler
                  </span>
                  <span className="text-xs text-muted">
                    Yeni api oluşturun.
                  </span>
                </div>
              </div>
              <ChevronRight className="h-3 w-3 text-muted" />
            </button>

            {/* Swagger documentation — opens external doc */}
            <a
              href={swaggerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex cursor-pointer items-center gap-3 p-3"
            >
              <div className="flex flex-1 items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white">
                  <ArrowUpRightFromSquare className="h-5 w-5" />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <span className="text-sm font-medium text-foreground/85">
                    Swagger Dökümantasyonu
                  </span>
                  <span className="break-all text-xs text-muted">
                    {swaggerUrl}
                  </span>
                </div>
              </div>
              <ArrowUpRightFromSquare className="h-3 w-3 text-muted" />
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
