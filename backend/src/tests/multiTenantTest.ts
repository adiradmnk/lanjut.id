import { dbStore } from '../data/relationalStore';
import { MagicTokenService } from '../services/magicTokenService';
import { AiGatewayService } from '../services/aiGatewayService';
import crypto from 'crypto';

async function runMultiTenantTestSuite() {
  console.log('===============================================================');
  console.log('🚀 ENTERPRISE MULTI-TENANT TEST SUITE & SECURITY VERIFICATION');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  // --------------------------------------------------------------------------
  // TEST 1: Tenant Data Isolation (Strict Query Boundaries)
  // --------------------------------------------------------------------------
  console.log('▶ [Test 1] Tenant Data Isolation: Memverifikasi pemisahan data antar merchant');
  const fitBodyMembers = dbStore.getMembersByMerchant('mch-fitbody-01');
  const zenithMembers = dbStore.getMembersByMerchant('mch-zenyoga-02');
  const crossFitMembers = dbStore.getMembersByMerchant('mch-ironcrossfit-03');
  const coldStartMembers = dbStore.getMembersByMerchant('mch-bandungpilates-04');

  const hasOverlap = fitBodyMembers.some((fm) => zenithMembers.some((zm) => zm.id === fm.id));
  if (!hasOverlap && fitBodyMembers.length > 0 && zenithMembers.length > 0 && coldStartMembers.length > 0) {
    console.log(`  ✅ PASSED: Data terisolasi sempurna! FitBody: ${fitBodyMembers.length} member, Zenith: ${zenithMembers.length} member, Bandung (Cold-Start): ${coldStartMembers.length} member.`);
    passed++;
  } else {
    console.error('  ❌ FAILED: Terjadi kebocoran data (overlap) antar tenant!');
    failed++;
  }

  // --------------------------------------------------------------------------
  // TEST 2: Cross-Tenant Token Forgery Attack Prevention
  // --------------------------------------------------------------------------
  console.log('\n▶ [Test 2] Cross-Tenant Token Forgery Prevention');
  const dinaToken = MagicTokenService.generateToken('mbr-dina-01');
  const validDina = MagicTokenService.validateToken(dinaToken);
  console.log(`  - Token Dina Asli Valid: ${validDina.valid} (Merchant: ${validDina.member?.merchant_id})`);

  // Skenario A: Penyerang mengubah merchant_id tanpa memperbarui signature
  const [pBase64, sig] = dinaToken.split('.');
  const decodedPayload = JSON.parse(Buffer.from(pBase64, 'base64url').toString('utf-8'));
  decodedPayload.merchant_id = 'mch-zenyoga-02';
  const tamperedPayloadBase64 = Buffer.from(JSON.stringify(decodedPayload)).toString('base64url');
  const tamperedToken = `${tamperedPayloadBase64}.${sig}`;
  const tamperedResult = MagicTokenService.validateToken(tamperedToken);

  if (!tamperedResult.valid && tamperedResult.error === 'SIGNATURE_VERIFICATION_FAILED') {
    console.log('  ✅ PASSED: Manipulasi tanda tangan token ditolak seketika (HMAC Signature Mismatch).');
    passed++;
  } else {
    console.error('  ❌ FAILED: Token yang dimanipulasi lolos validasi!');
    failed++;
  }

  // Skenario B: Token sah ditandatangani ulang dengan secret tetapi member.merchant_id di DB tidak cocok
  const forgedPayload = {
    member_id: 'mbr-dina-01', // Dina sebenarnya di FitBody
    merchant_id: 'mch-zenyoga-02', // Dicoba dipakai untuk klaim Zenith Yoga
    issued_at: Date.now(),
    expires_at: Date.now() + 86400000,
    nonce: 'cross_tenant_probe',
  };
  const secret = process.env.MAGIC_TOKEN_HMAC_SECRET || 'lanjut_enterprise_secret_hmac_key_2026_fintech';
  const forgedBase64 = Buffer.from(JSON.stringify(forgedPayload)).toString('base64url');
  const forgedSig = crypto.createHmac('sha256', secret).update(forgedBase64).digest('base64url');
  const forgedToken = `${forgedBase64}.${forgedSig}`;

  const crossTenantResult = MagicTokenService.validateToken(forgedToken);
  if (!crossTenantResult.valid && crossTenantResult.error === 'CROSS_TENANT_ACCESS_DENIED') {
    console.log('  ✅ PASSED: Serangan Cross-Tenant Token Forgery berhasil ditolak (CROSS_TENANT_ACCESS_DENIED).');
    passed++;
  } else {
    console.error('  ❌ FAILED: Cross-tenant forgery tidak terdeteksi!');
    failed++;
  }

  // --------------------------------------------------------------------------
  // TEST 3: Expired Token Rejection (Time-Bound Expiration)
  // --------------------------------------------------------------------------
  console.log('\n▶ [Test 3] Expired Token Rejection (Pencegahan Replay Token Kedaluwarsa)');
  const expiredPayload = {
    member_id: 'mbr-dina-01',
    merchant_id: 'mch-fitbody-01',
    issued_at: Date.now() - 48 * 60 * 60 * 1000,
    expires_at: Date.now() - 24 * 60 * 60 * 1000, // Sudah kadaluwarsa 24 jam lalu
    nonce: 'expired_probe',
  };
  const expiredBase64 = Buffer.from(JSON.stringify(expiredPayload)).toString('base64url');
  const expiredSig = crypto.createHmac('sha256', secret).update(expiredBase64).digest('base64url');
  const expiredToken = `${expiredBase64}.${expiredSig}`;

  const expiredResult = MagicTokenService.validateToken(expiredToken);
  if (!expiredResult.valid && expiredResult.error === 'TOKEN_EXPIRED_PAST_24H') {
    console.log('  ✅ PASSED: Token kedaluwarsa berhasil ditolak dengan tepat (TOKEN_EXPIRED_PAST_24H).');
    passed++;
  } else {
    console.error('  ❌ FAILED: Token kedaluwarsa diterima!');
    failed++;
  }

  // --------------------------------------------------------------------------
  // TEST 4: Cold-Start Tenant (Zero VA Turnover Probation)
  // --------------------------------------------------------------------------
  console.log('\n▶ [Test 4] Cold-Start Tenant: Penanganan Tenant Baru Tanpa Histori Transaksi');
  const coldStartTenant = dbStore.getTenant('mch-bandungpilates-04');
  const coldStartTurnover = dbStore.getMonthlyVaTurnoverByMerchant('mch-bandungpilates-04');

  console.log(`  - Tenant: ${coldStartTenant?.business_name}`);
  console.log(`  - Riwayat Transaksi VA Saat Ini: Rp ${coldStartTurnover}`);

  const coldStartDss = await AiGatewayService.evaluateBniSMECredit({
    merchant_id: 'mch-bandungpilates-04',
    merchant_name: coldStartTenant?.business_name || 'Bandung Pilates',
    total_loan_plafond_idr: 120000000,
    monthly_installment_idr: 5100000,
    monthly_bni_va_turnover_idr: coldStartTurnover,
    retention_rate_pct: 100.0,
    saved_members_count: 5,
    at_risk_members_count: 0,
  });

  if (
    coldStartDss &&
    !isNaN(coldStartDss.dscr_ratio) &&
    (coldStartDss.risk_rating === 'PROBATION_NEW_MERCHANT' || coldStartDss.credit_health_index.includes('COLD_START') || coldStartDss.dscr_ratio === 0)
  ) {
    console.log(`  ✅ PASSED: Cold-start tertangani secara elegan (Rating: ${coldStartDss.risk_rating}, DSCR: ${coldStartDss.dscr_ratio}x, tanpa NaN / ZeroDivisionError).`);
    passed++;
  } else {
    console.error('  ❌ FAILED: Cold-start menghasilkan nilai tak terduga:', coldStartDss);
    failed++;
  }

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('\n===============================================================');
  console.log(`🎯 HASIL AKHIR: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runMultiTenantTestSuite().catch((err) => {
  console.error('Fatal Test Error:', err);
  process.exit(1);
});
