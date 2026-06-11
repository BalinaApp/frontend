'use client';

import { createContext, useContext } from 'react';

/** Modal/AlertDialog kapatma köprüsü. HeroUI'de `<Button slot="close">` parent
 *  dialog'u kapatır; Radix'te kapatma `Dialog.Close` ile olur. Modal sarmalayıcısı
 *  bu context'i `close` ile doldurur, Button slot="close" iken onu çağırır. */
export const DialogCloseContext = createContext<(() => void) | null>(null);

export function useDialogClose() {
  return useContext(DialogCloseContext);
}
