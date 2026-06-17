'use client';

import * as React from 'react';
import { cn } from '@/components/ui/cn';

/* Balina Card — HeroUI v3 Card'ın balina token'lı portu. Compound API
 * (Header/Title/Description/Content/Footer) birebir korunur. */

function CardRoot({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex flex-col rounded-[0.625rem] bg-[var(--balina-background-light-shout)] ' +
          'text-[var(--balina-text-strong)] ' +
          'shadow-[0_0.5px_0.5px_0_var(--balina-neutral-dark-6),0_1px_3px_0_var(--balina-neutral-dark-4)]',
        className,
      )}
      {...rest}
    />
  );
}

function Header({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex flex-col gap-1 p-4', className)} {...rest} />;
}

function Title({ className, ...rest }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        'text-body-default-medium text-[var(--balina-text-loud)]',
        className,
      )}
      {...rest}
    />
  );
}

function Description({
  className,
  ...rest
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        'text-body-small-one-liner-regular text-[var(--balina-text-muted)]',
        className,
      )}
      {...rest}
    />
  );
}

function Content({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-4 pt-0', className)} {...rest} />;
}

function Footer({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex items-center gap-2 p-4 pt-0', className)} {...rest} />
  );
}

export const BalinaCard = Object.assign(CardRoot, {
  Header,
  Title,
  Description,
  Content,
  Footer,
});
