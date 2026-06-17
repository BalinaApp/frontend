'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CircleCheckFill } from '@gravity-ui/icons';
import {
  toast,
  BalinaGlobeIcon,
  BalinaApiIcon,
  BalinaCopyIcon,
  BalinaRightIcon,
  BalinaExternalIcon,
} from '@/components/balina';
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
                <span className="flex h-8 w-8 shrink-0 items-center justify-center text-foreground/70">
                  <BalinaGlobeIcon className="h-5 w-5" />
                </span>
                <div className="flex flex-1 flex-col gap-1">
                  <span className="text-body-small-one-liner-medium text-foreground/85">
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
                <BalinaCopyIcon className="h-4 w-4 text-muted" />
              )}
            </button>

            {/* API'ler — link to keys list */}
            <button
              type="button"
              onClick={() => router.push(`/${slug}/settings/api/keys`)}
              className="flex cursor-pointer items-center gap-3 border-b border-black/[0.04] p-3 text-left"
            >
              <div className="flex flex-1 items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center text-foreground/70">
                  <BalinaApiIcon className="h-5 w-5" />
                </span>
                <div className="flex flex-1 flex-col gap-1">
                  <span className="text-body-small-one-liner-medium text-foreground/85">
                    API&apos;ler
                  </span>
                  <span className="text-xs text-muted">
                    Yeni api oluşturun.
                  </span>
                </div>
              </div>
              <BalinaRightIcon className="h-4 w-4 text-muted" />
            </button>

            {/* Swagger documentation — opens external doc */}
            <a
              href={swaggerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex cursor-pointer items-center gap-3 p-3"
            >
              <div className="flex flex-1 items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 20 20"
                    fill="none"
                    className="h-6 w-6"
                    aria-hidden="true"
                  >
                    <path d="M9.99991 15.7139C6.84924 15.7139 4.28589 13.1508 4.28589 10C4.28589 6.84924 6.84924 4.28613 9.99991 4.28613C13.1506 4.28613 15.7139 6.84948 15.7139 10.0002C15.7139 13.1508 13.1506 15.7139 9.99991 15.7139Z" fill="#85EA2D" />
                    <path d="M9.99994 4.57197C12.9978 4.57197 15.4279 7.00207 15.4279 9.99994C15.4279 12.9977 12.9978 15.4279 9.99994 15.4279C7.00219 15.4279 4.57197 12.9977 4.57197 9.99994C4.57197 7.00219 7.00219 4.57197 9.99994 4.57197ZM9.99994 4C6.69156 4 4 6.69156 4 9.99994C4 13.3083 6.69156 15.9999 9.99994 15.9999C13.3083 15.9999 16 13.3083 16 9.99994C16 6.69156 13.3083 4 9.99994 4Z" fill="#173647" />
                    <path d="M7.77799 8.06072C7.75952 8.26604 7.78483 8.47833 7.77115 8.68593C7.75496 8.89366 7.72954 9.09898 7.68804 9.30431C7.63035 9.59731 7.44805 9.81883 7.19667 10.0034C7.68588 10.3218 7.74117 10.8155 7.77343 11.3162C7.78962 11.5862 7.78267 11.8584 7.81037 12.126C7.83112 12.3336 7.91184 12.3867 8.12652 12.3936C8.21419 12.3959 8.30402 12.3936 8.40572 12.3936V13.035C7.77127 13.1434 7.24752 12.9635 7.11823 12.426C7.07662 12.2299 7.04891 12.0291 7.0398 11.826C7.02588 11.6115 7.04891 11.3969 7.03284 11.1824C6.98666 10.594 6.91051 10.3956 6.34766 10.3679V9.63653C6.38915 9.62729 6.42837 9.62034 6.46987 9.61578C6.77906 9.59959 6.91051 9.50496 6.97743 9.20045C7.00981 9.02978 7.02828 8.85672 7.03512 8.68137C7.05827 8.34688 7.04903 8.00543 7.1066 7.67321C7.18731 7.19563 7.48271 6.96488 7.9742 6.93717C8.11261 6.93022 8.25341 6.93717 8.41256 6.93717V7.59249C8.34564 7.59717 8.28795 7.60629 8.22798 7.60629C7.82884 7.59237 7.80797 7.7285 7.77799 8.06072ZM8.54629 9.57884H8.53705C8.3063 9.56733 8.10793 9.74723 8.09629 9.97798C8.08478 10.211 8.26468 10.4095 8.49544 10.4209H8.52314C8.75161 10.4348 8.94759 10.2593 8.9615 10.031V10.008C8.96618 9.77493 8.77932 9.58352 8.54629 9.57884ZM9.99293 9.57884C9.76913 9.57188 9.58216 9.74723 9.57532 9.96875C9.57532 9.98266 9.57532 9.99417 9.57772 10.008C9.57772 10.2595 9.74839 10.421 10.0068 10.421C10.2606 10.421 10.4199 10.2549 10.4199 9.99417C10.4175 9.74267 10.249 9.57656 9.99293 9.57884ZM11.4742 9.57884C11.2389 9.57416 11.0427 9.76114 11.0359 9.99645C11.0359 10.2318 11.225 10.4209 11.4603 10.4209H11.465C11.6773 10.4578 11.8918 10.2525 11.9058 10.0057C11.9172 9.77721 11.7095 9.57884 11.4742 9.57884ZM13.5069 9.61338C13.2392 9.60187 13.1053 9.51192 13.0385 9.25802C12.9969 9.09659 12.9716 8.92808 12.9624 8.76197C12.9439 8.45278 12.9462 8.14131 12.9254 7.83212C12.877 7.09848 12.3464 6.84243 11.5757 6.9692V7.60605C11.6979 7.60605 11.7925 7.60605 11.8872 7.60832C12.051 7.6106 12.1756 7.67297 12.1917 7.85527C12.2079 8.02138 12.2079 8.18976 12.2241 8.35827C12.2564 8.69289 12.2748 9.03194 12.3325 9.36188C12.3833 9.63413 12.5702 9.83718 12.8031 10.0033C12.3948 10.2778 12.2748 10.67 12.254 11.1108C12.2425 11.413 12.2356 11.7175 12.2195 12.0221C12.2056 12.2989 12.1088 12.3889 11.8296 12.3959C11.7512 12.3981 11.675 12.4051 11.5873 12.4098V13.0627C11.7512 13.0627 11.9011 13.0719 12.051 13.0627C12.5171 13.035 12.7985 12.8089 12.8909 12.3566C12.9301 12.1074 12.9531 11.856 12.9601 11.6045C12.9762 11.3738 12.974 11.1407 12.997 10.9124C13.0316 10.5547 13.1954 10.4071 13.5531 10.3841C13.5877 10.3794 13.62 10.3726 13.6524 10.3611V9.62957C13.5923 9.62262 13.5507 9.61578 13.5069 9.61338Z" fill="#173647" />
                  </svg>
                </span>
                <div className="flex flex-1 flex-col gap-1">
                  <span className="text-body-small-one-liner-medium text-foreground/85">
                    Swagger Dökümantasyonu
                  </span>
                  <span className="break-all text-xs text-muted">
                    {swaggerUrl}
                  </span>
                </div>
              </div>
              <BalinaExternalIcon className="h-4 w-4 text-muted" />
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
