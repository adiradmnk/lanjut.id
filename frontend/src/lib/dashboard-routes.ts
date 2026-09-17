export type AccountRole = 'merchant' | 'payment_gateway';

export const DASHBOARD_ROUTES = {
  merchant: '/merchant',
  payment_gateway: '/payment-gateway',
} as const satisfies Record<AccountRole, string>;

/** Route only recognized account roles; an unknown role has no default access. */
export function getDashboardPath(role: unknown): string | null {
  if (typeof role !== 'string') return null;
  const normalized = role.trim().toLowerCase().replaceAll('-', '_');
  if (normalized === 'merchant' || normalized === 'payment_gateway') {
    return DASHBOARD_ROUTES[normalized];
  }
  return null;
}
