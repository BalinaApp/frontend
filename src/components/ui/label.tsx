'use client';

import * as React from 'react';
import { cn } from './cn';
import { useTextField } from './text-field';

/* HeroUI v3 Label drop-in — TextField içindeyse ilgili input'a htmlFor ile bağlanır. */

export interface LabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement> {}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  function Label({ className, htmlFor, ...rest }, ref) {
    const tf = useTextField();
    return (
      <label
        ref={ref}
        htmlFor={htmlFor ?? tf?.id}
        className={cn(
          'label text-sm font-medium leading-none text-foreground',
          className,
        )}
        {...rest}
      />
    );
  },
);
