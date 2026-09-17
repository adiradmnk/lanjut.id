import type { Metadata } from 'next';
import PaymentGatewayDashboard from './payment-gateway-dashboard';

export const metadata: Metadata = {
  title: 'Payment Gateway — Lanjut.id',
  description: 'Pantau perputaran BNI Virtual Account dan pembayaran retensi merchant.',
};

export default function PaymentGatewayPage() {
  return <PaymentGatewayDashboard />;
}
