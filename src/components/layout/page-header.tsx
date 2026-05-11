'use client';

import * as React from 'react';

interface PageHeaderProps {
  title: string;
  /** Optional content rendered on the right (CTA buttons, filters, etc). */
  action?: React.ReactNode;
}

/**
 * Per-page header that lives at the top of the dashboard content card —
 * page title on the left, optional right-aligned CTA, separated from the
 * page body by a 1px line.
 */
export function PageHeader({ title, action }: PageHeaderProps) {
  return (
    <header className="flex items-center gap-2 border-b border-black/10 p-4">
      <div className="flex flex-1 items-center gap-1">
        <h1 className="text-sm font-medium leading-[1.43] text-foreground">
          {title}
        </h1>
      </div>
      {action ? <div className="flex items-center gap-2">{action}</div> : null}
    </header>
  );
}
