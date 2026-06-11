'use client';

import * as React from 'react';
import { OTPInput, OTPInputContext, REGEXP_ONLY_DIGITS } from 'input-otp';
import { Minus } from '@gravity-ui/icons';
import { cn } from './cn';

/* HeroUI v3 InputOTP drop-in — input-otp üzerine. Compound: Group/Slot/Separator. */

export { REGEXP_ONLY_DIGITS };

type OTPProps = React.ComponentPropsWithoutRef<typeof OTPInput> & {
  isDisabled?: boolean;
};

const Root = React.forwardRef<React.ElementRef<typeof OTPInput>, OTPProps>(
  function InputOTP(
    { className, containerClassName, isDisabled, disabled, ...props },
    ref,
  ) {
    return (
      <OTPInput
        ref={ref}
        disabled={disabled ?? isDisabled}
        containerClassName={cn(
          'flex items-center gap-2 has-[:disabled]:opacity-50',
          containerClassName,
        )}
        className={cn('disabled:cursor-not-allowed', className)}
        {...props}
      />
    );
  },
);

function Group({ className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center gap-2', className)} {...rest} />;
}

function Slot({
  index,
  className,
  ...rest
}: { index: number } & React.HTMLAttributes<HTMLDivElement>) {
  const ctx = React.useContext(OTPInputContext);
  const slot = ctx?.slots[index];
  return (
    <div
      className={cn(
        'relative flex h-11 w-10 items-center justify-center rounded-xl border border-border bg-field text-base shadow-field outline-none transition-all',
        slot?.isActive && 'z-10 ring-2 ring-[var(--color-focus)]/40',
        className,
      )}
      {...rest}
    >
      {slot?.char}
      {slot?.hasFakeCaret && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-5 w-px animate-caret-blink bg-foreground" />
        </div>
      )}
    </div>
  );
}

function Separator(props: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div role="separator" {...props}>
      <Minus className="h-4 w-4 text-muted" />
    </div>
  );
}

export const InputOTP = Object.assign(Root, { Group, Slot, Separator });
