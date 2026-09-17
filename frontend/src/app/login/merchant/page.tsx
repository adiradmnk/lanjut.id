import LoginForm from '@/components/LoginForm';

export default function MerchantLoginPage() {
  return (
    <LoginForm
      role="merchant"
      title="Portal Merchant lanjut"
      subtitle="Kelola retensi member, kapasitas kelas, dan revenue recovery bisnis Anda."
      accentColor="orange-500"
      badge="Merchant Portal"
      redirectTo="/merchant"
      demoEmail="owner@fitbody.id"
    />
  );
}
