/** Marketing içerik kabı — tek content alanı. Dashboard layout zaten panel
 *  kartını sağlıyor; bu yüzden burada ekstra kart YOK. Kontaklar/Kampanyalar
 *  arası geçiş sol sidebar'ın kayan panelinden yapılıyor. */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
  );
}
