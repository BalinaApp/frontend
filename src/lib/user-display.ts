/**
 * Default display name for users who haven't set one yet.
 * Returns `BalinaOS<num>` where `<num>` is a deterministic 3-digit
 * value derived from the user id, so the same user always renders
 * the same fallback name across pages.
 */
export function defaultUserName(userId?: string | null): string {
  if (!userId) return 'BalinaOS';
  let sum = 0;
  for (let i = 0; i < userId.length; i++) sum += userId.charCodeAt(i);
  const num = (sum % 900) + 100; // 100..999
  return `BalinaOS${num}`;
}

/**
 * Resolve the user's display name, falling back to the BalinaOS-style
 * default when no explicit name is set.
 */
export function userDisplayName(user?: {
  id?: string;
  name?: string | null;
} | null): string {
  if (user?.name && user.name.trim().length > 0) return user.name;
  return defaultUserName(user?.id);
}

/**
 * Auto-generated names follow the `BalinaOS<3-digit>` shape. Real names
 * never do, so the regex is a safe heuristic to tell whether the user
 * has customised their name yet.
 */
const AUTO_NAME = /^BalinaOS\d{3}$/;

export function isAutoUserName(name?: string | null): boolean {
  if (!name) return false;
  return AUTO_NAME.test(name.trim());
}

/** Custom-only name — empty when the user is still on the auto default. */
export function customUserName(user?: {
  name?: string | null;
} | null): string {
  const name = user?.name?.trim() ?? '';
  if (!name || isAutoUserName(name)) return '';
  return name;
}
