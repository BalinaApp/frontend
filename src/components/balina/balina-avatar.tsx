'use client';

import * as React from 'react';
import { cn } from '@/components/ui/cn';

/* Balina Avatar — kaynak .Avatar_* spec'inin portu. İçerik olarak görsel
 * (src) ya da fallback (baş harf) verilebilir. */

export type BalinaAvatarSize = 'xsmall' | 'small' | 'medium' | 'large' | 'default';

export interface BalinaAvatarProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  size?: BalinaAvatarSize;
  src?: string;
  alt?: string;
  /** Görsel yoksa gösterilecek metin (baş harfler). */
  fallback?: React.ReactNode;
}

const sizeClasses: Record<BalinaAvatarSize, string> = {
  xsmall: 'w-3.5 h-3.5',
  small: 'w-4 h-4',
  medium: 'w-5 h-5',
  large: 'w-6 h-6',
  default: 'w-8 h-8',
};

export function BalinaAvatar({
  size = 'default',
  src,
  alt = '',
  fallback,
  className,
  ...rest
}: BalinaAvatarProps) {
  return (
    <span
      className={cn(
        'inline-flex select-none items-center justify-center overflow-hidden rounded-full align-middle',
        'bg-[var(--balina-background-dark-default)] text-body-tiny-regular font-medium text-[var(--balina-text-strong)]',
        sizeClasses[size],
        className,
      )}
      {...rest}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : (
        fallback
      )}
    </span>
  );
}

/* İki avatarın bindirmeli (mask'lı) grubu — kaynak .Avatar_avatarGroup spec'i.
 * Sabit 28×28 (1.75rem) kutu; iki adet 20px (medium) avatar. İlk avatarda,
 * ikincinin oturduğu yerde dairesel kesik (mask) açılır. */
const PAIR_MASK =
  'radial-gradient(circle at 18px 18px, #000 0, #000 10px, transparent 10px, transparent 12px, #000 12px, #000 100%)';

export interface BalinaAvatarPairItem {
  src?: string;
  alt?: string;
  fallback?: React.ReactNode;
}

export interface BalinaAvatarPairProps {
  first: BalinaAvatarPairItem;
  second: BalinaAvatarPairItem;
  className?: string;
}

export function BalinaAvatarPair({ first, second, className }: BalinaAvatarPairProps) {
  return (
    <div className={cn('relative h-7 w-7 shrink-0', className)}>
      <BalinaAvatar
        size="medium"
        src={first.src}
        alt={first.alt}
        fallback={first.fallback}
        className="absolute left-0 top-0 bg-[var(--balina-base-heavy)]"
        style={{ WebkitMaskImage: PAIR_MASK, maskImage: PAIR_MASK }}
      />
      <BalinaAvatar
        size="medium"
        src={second.src}
        alt={second.alt}
        fallback={second.fallback}
        className="absolute left-2 top-2 bg-[var(--balina-base-heavy)]"
      />
    </div>
  );
}
