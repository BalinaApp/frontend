'use client';

import * as React from 'react';
import { BalinaModal } from './balina-modal';
import { BalinaButton } from './balina-button';

/* Balina Confirm Dialog — HeroUI v3 AlertDialog yerine. BalinaModal üzerine
 * standart onay deseni: başlık + açıklama + Vazgeç / Onayla. `danger` ile
 * yıkıcı aksiyon (kırmızı buton). Kontrollü kullanım (open/onOpenChange). */

export interface BalinaConfirmDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  title?: React.ReactNode;
  titleIcon?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  /** Yıkıcı aksiyon — onay butonu kırmızı (danger) olur. */
  danger?: boolean;
  /** İşlem sürüyor — butonlar pasifleşir. */
  loading?: boolean;
}

export function BalinaConfirmDialog({
  open,
  onOpenChange,
  trigger,
  title,
  titleIcon,
  description,
  children,
  confirmLabel = 'Onayla',
  cancelLabel = 'Vazgeç',
  onConfirm,
  danger = false,
  loading = false,
}: BalinaConfirmDialogProps) {
  return (
    <BalinaModal
      open={open}
      onOpenChange={onOpenChange}
      trigger={trigger}
      title={title}
      titleIcon={titleIcon}
      description={description}
      footer={
        <>
          <BalinaButton
            variant="soft"
            size="large"
            onClick={() => onOpenChange?.(false)}
            disabled={loading}
          >
            {cancelLabel}
          </BalinaButton>
          <BalinaButton
            variant={danger ? 'danger' : 'primary'}
            size="large"
            onClick={onConfirm}
            disabled={loading}
          >
            {confirmLabel}
          </BalinaButton>
        </>
      }
    >
      {children}
    </BalinaModal>
  );
}
