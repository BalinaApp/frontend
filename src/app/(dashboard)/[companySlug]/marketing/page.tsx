import { redirect } from 'next/navigation';

/** /[companySlug]/marketing → /[companySlug]/marketing/contacts. Faz 1'de
 *  tek aktif görünüm "Kontaklar"; campaigns eklendiğinde bu route tab nav'a
 *  veya bir landing'e dönüşür. */
export default async function MarketingIndexRedirect({
  params,
}: {
  params: Promise<{ companySlug: string }>;
}) {
  const { companySlug } = await params;
  redirect(`/${companySlug}/marketing/contacts`);
}
