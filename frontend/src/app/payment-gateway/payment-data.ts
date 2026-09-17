// Existing frontend contracts: /bni and /merchant. Retention logs are not a
// complete payment ledger and do not contain payout or settlement-batch data.
export interface Portfolio {
  merchantCount: number | null;
  monthlyTurnover: number | null;
}

export interface Merchant {
  id: string;
  name: string;
  category: string;
}

export interface RetentionPayment {
  id: string;
  memberName: string;
  amount: number | null;
  status: string;
  timestamp: string;
}

export type PaymentStatus = 'paid' | 'pending' | 'other';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonNegativeNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

export function parsePortfolio(value: unknown): Portfolio {
  if (!isRecord(value) || !isRecord(value.portfolio)) {
    throw new Error('Ringkasan pembayaran belum tersedia.');
  }

  return {
    merchantCount: nonNegativeNumber(value.portfolio.total_sme_merchants_supervised),
    monthlyTurnover: nonNegativeNumber(value.portfolio.total_bni_va_turnover_month_idr),
  };
}

export function parseMerchants(value: unknown): Merchant[] {
  if (!isRecord(value) || !Array.isArray(value.merchants)) {
    throw new Error('Daftar merchant belum tersedia.');
  }

  return value.merchants.map((item: unknown) => {
    if (!isRecord(item) || typeof item.id !== 'string' || !item.id || typeof item.name !== 'string') {
      throw new Error('Data merchant belum dapat ditampilkan.');
    }

    return {
      id: item.id,
      name: item.name,
      category: typeof item.category === 'string' ? item.category : '',
    };
  });
}

export function parsePayments(value: unknown): RetentionPayment[] {
  if (!isRecord(value) || !Array.isArray(value.logs)) {
    throw new Error('Pembayaran retensi belum tersedia.');
  }

  return value.logs.map((item: unknown) => {
    if (!isRecord(item) || typeof item.id !== 'string' || !item.id) {
      throw new Error('Data pembayaran belum dapat ditampilkan.');
    }

    return {
      id: item.id,
      memberName: typeof item.member_name === 'string' ? item.member_name : 'Member',
      amount: nonNegativeNumber(item.amount_idr),
      status: typeof item.bni_va_status === 'string' ? item.bni_va_status : 'UNKNOWN',
      timestamp: typeof item.timestamp === 'string' ? item.timestamp : '—',
    };
  });
}

export function paymentStatus(status: string): PaymentStatus {
  if (status === 'PAID_SETTLED') return 'paid';
  if (status === 'PENDING_VA') return 'pending';
  return 'other';
}

export function paymentStatusLabel(status: string): string {
  if (paymentStatus(status) === 'paid') return 'Lunas / selesai';
  if (paymentStatus(status) === 'pending') return 'Menunggu pembayaran';
  return status === 'UNKNOWN' || !status ? 'Belum diketahui' : status.replaceAll('_', ' ');
}

const rupiahFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

export function formatRupiah(amount: number | null): string {
  return amount === null ? '—' : rupiahFormatter.format(amount);
}
