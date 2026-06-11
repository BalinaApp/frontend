'use client';

import * as React from 'react';
import { cn } from './cn';

/* HeroUI v3 Card drop-in — compound: Card.Header/Title/Description/Content/Footer. */

function CardRoot({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'card flex flex-col rounded-xl border border-border bg-surface text-foreground',
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
    <h3 className={cn('text-sm font-semibold text-foreground', className)} {...rest} />
  );
}

function Description({
  className,
  ...rest
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-muted', className)} {...rest} />;
}

function Content({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-4 pt-0', className)} {...rest} />;
}

function Footer({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex items-center gap-2 p-4 pt-0', className)} {...rest} />
  );
}

export const Card = Object.assign(CardRoot, {
  Header,
  Title,
  Description,
  Content,
  Footer,
});
