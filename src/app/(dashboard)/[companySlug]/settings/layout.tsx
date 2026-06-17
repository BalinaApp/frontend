'use client';

import * as React from 'react';

/* Ayarlar sol rail'i artık app-sidebar'daki kayan "Ayarlar" menüsünde. Bu layout
 * yalnızca içeriği tek bir content alanı olarak geçirir — dashboard layout zaten
 * dış content card'ını sağlıyor, bu yüzden burada ayrı bir pane sarmıyoruz. */
export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>;
}
