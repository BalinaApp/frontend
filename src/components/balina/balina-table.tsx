'use client';

import * as React from 'react';
import { cn } from '@/components/ui/cn';

/* Balina Table — Notion-tarzı veritabanı tablosu. Izgara çizgili hücreler,
 * property-ikonlu başlıklar. Kolon hizası CSS subgrid ile sağlanır: kök grid
 * kolonları tanımlar, her satır `grid-cols-subgrid` ile aynı kolonlara oturur
 * (böylece satır tek bir kutu olarak hover/click alabilir). */

const BORDER = 'border-[var(--balina-background-dark-default)]';

interface BalinaTableProps extends React.HTMLAttributes<HTMLDivElement> {
  /** CSS grid-template-columns — ör. "40px minmax(11rem,2fr) repeat(5,1fr) 40px". */
  columns: string;
}

function TableRoot({ columns, className, style, ...rest }: BalinaTableProps) {
  // Linear tarzı — çizgisiz (sadece başlık altı ince çizgi + satır hover).
  return (
    <div
      role="table"
      className={cn('grid w-full text-sm', className)}
      style={{ gridTemplateColumns: columns, ...style }}
      {...rest}
    />
  );
}

/** Satır — tüm kolonları kaplar, subgrid ile kök kolonlara hizalanır. */
function TableRow({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="row"
      className={cn('col-span-full grid grid-cols-subgrid', className)}
      {...rest}
    />
  );
}

interface HeadCellProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Property-tipi ikonu (başlık metninden önce). */
  icon?: React.ReactNode;
}

function HeadCell({ icon, className, children, ...rest }: HeadCellProps) {
  return (
    <div
      role="columnheader"
      className={cn(
        'flex select-none items-center gap-1.5 border-b px-2 py-2 text-xs text-[var(--balina-text-muted)]',
        BORDER,
        className,
      )}
      {...rest}
    >
      {icon != null && (
        <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center text-[var(--balina-icon-muted)]">
          {icon}
        </span>
      )}
      {children != null && children !== '' && <span className="min-w-0 truncate">{children}</span>}
    </div>
  );
}

function TableCell({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      role="cell"
      className={cn('flex min-w-0 items-center gap-2 px-2', className)}
      {...rest}
    />
  );
}

export const BalinaTable = Object.assign(TableRoot, {
  Row: TableRow,
  HeadCell,
  Cell: TableCell,
});
