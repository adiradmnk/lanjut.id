import LoginForm from '@/components/LoginForm';

export default function PartnerLoginPage() {
  return (
    <LoginForm
      role="partner"
      title="Portal Mitra lanjut"
      subtitle="Pantau portofolio SME, eksposur pinjaman, dan kesehatan makro merchant binaan Anda."
      accentColor="[#005E6A]"
      badge="Bank & Payment Partner"
      redirectTo="/bni"
      demoEmail="rm@bni.co.id"
    />
  );
}
