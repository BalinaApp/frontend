'use client';

import * as React from 'react';
import { cn } from './cn';

/* HeroUI v3 TextField drop-in — value/onChange(string) context'i Input/TextArea'ya
 * geçirir. Label/Input/FieldError compound çocukları context üzerinden bağlanır. */

interface TextFieldCtx {
  id: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  isDisabled?: boolean;
  isRequired?: boolean;
  isReadOnly?: boolean;
  isInvalid?: boolean;
  name?: string;
  type?: string;
  autoFocus?: boolean;
}

const TextFieldContext = React.createContext<TextFieldCtx | null>(null);
export const useTextField = () => React.useContext(TextFieldContext);

export interface TextFieldProps {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  isDisabled?: boolean;
  isRequired?: boolean;
  isReadOnly?: boolean;
  isInvalid?: boolean;
  name?: string;
  type?: string;
  autoFocus?: boolean;
  /** HeroUI uyumu — Input'a iletilir (görsel varyant). */
  variant?: 'primary' | 'secondary';
  className?: string;
  'aria-label'?: string;
  children?: React.ReactNode;
}

export function TextField({
  value,
  defaultValue,
  onChange,
  isDisabled,
  isRequired,
  isReadOnly,
  isInvalid,
  name,
  type,
  autoFocus,
  variant,
  className,
  children,
  ...rest
}: TextFieldProps) {
  const reactId = React.useId();
  const ctx: TextFieldCtx = {
    id: reactId,
    value,
    defaultValue,
    onChange,
    isDisabled,
    isRequired,
    isReadOnly,
    isInvalid,
    name,
    type,
    autoFocus,
  };
  return (
    <TextFieldContext.Provider value={ctx}>
      <div className={cn('text-field flex flex-col gap-1.5', className)} {...rest}>
        {children}
      </div>
    </TextFieldContext.Provider>
  );
}
