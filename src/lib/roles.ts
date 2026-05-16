/**
 * Şirket içi roller — backend Prisma `CompanyRole` enum'uyla 1-1 eşleşir.
 * Frontend'de tek kaynak: setup-company, invite, settings/team,
 * settings/company sayfaları + sidebar/RoleGuard buradan okur. Yeni rol
 * eklemek için backend `CompanyRole` enum'unu ve aşağıdaki haritayı eş
 * zamanlı güncelleyin.
 */

export type CompanyRoleId =
  | 'OWNER'
  | 'ADMIN'
  | 'STOCKIST'
  | 'PRODUCT_UPLOADER';

export interface CompanyRoleDefinition {
  id: CompanyRoleId;
  label: string;
  description: string;
  /** OWNER kendisi şirketi oluşturur — davet listesinde gösterilmez. */
  invitable: boolean;
}

export const COMPANY_ROLES: Record<CompanyRoleId, CompanyRoleDefinition> = {
  OWNER: {
    id: 'OWNER',
    label: 'Sahip',
    description: 'Şirketi oluşturan kişi. Tüm yetkilere sahip.',
    invitable: false,
  },
  ADMIN: {
    id: 'ADMIN',
    label: 'Yönetici',
    description: 'Tüm sayfalara erişebilir, üyeleri ve mağazaları yönetir.',
    invitable: true,
  },
  STOCKIST: {
    id: 'STOCKIST',
    label: 'Stokçu',
    description:
      'Yalnızca ürün listesini görür ve stoğu günceller; fiyat ve diğer ayarlara erişemez.',
    invitable: true,
  },
  PRODUCT_UPLOADER: {
    id: 'PRODUCT_UPLOADER',
    label: 'Ürün Yükleyici',
    description:
      'Ürün listesini görür ve AI Creator ile görsel/içerik üretir; alış fiyatı bilgisine erişemez.',
    invitable: true,
  },
};

/** Davet/atama formlarında gösterilecek roller (OWNER hariç). */
export const INVITABLE_ROLES: CompanyRoleDefinition[] = Object.values(
  COMPANY_ROLES,
).filter((r) => r.invitable);

/** Davet edilebilir rol id'leri (type-safe union). */
export type InvitableRoleId = Exclude<CompanyRoleId, 'OWNER'>;

/** Hızlı id → Türkçe etiket lookup. */
export const ROLE_LABELS: Record<CompanyRoleId, string> = Object.fromEntries(
  Object.values(COMPANY_ROLES).map((r) => [r.id, r.label]),
) as Record<CompanyRoleId, string>;
