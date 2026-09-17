import { redirect } from 'next/navigation';

export default function LegacyBniPage() {
  redirect('/payment-gateway');
}
