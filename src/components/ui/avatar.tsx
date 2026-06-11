'use client';

import * as React from 'react';
import * as RAvatar from '@radix-ui/react-avatar';
import { cn } from './cn';

/* HeroUI v3 Avatar drop-in — Radix Avatar. Compound: Avatar.Image + Avatar.Fallback. */

function AvatarRoot({
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <RAvatar.Root
      className={cn(
        'relative inline-flex h-9 w-9 shrink-0 select-none items-center justify-center overflow-hidden rounded-full bg-default text-sm font-medium text-foreground',
        className,
      )}
      {...rest}
    >
      {children}
    </RAvatar.Root>
  );
}

function Image({
  className,
  ...rest
}: React.ComponentPropsWithoutRef<typeof RAvatar.Image>) {
  return (
    <RAvatar.Image className={cn('h-full w-full object-cover', className)} {...rest} />
  );
}

function Fallback({
  className,
  ...rest
}: React.ComponentPropsWithoutRef<typeof RAvatar.Fallback>) {
  return (
    <RAvatar.Fallback
      className={cn('flex h-full w-full items-center justify-center', className)}
      {...rest}
    />
  );
}

export const Avatar = Object.assign(AvatarRoot, { Image, Fallback });
