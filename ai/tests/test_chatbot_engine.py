import unittest
from app.core.schemas import ExtractedBusinessRules, BusinessProfile, FinancialConstraints, ProductItem, CancellationTrigger, RetentionPolicy
from app.core.guardrails import FinancialGuardrailValidator
from app.services.business_logic_bot import ConversationalLogicAgent

class TestChatbotEngine(unittest.TestCase):
    def setUp(self):
        # Baseline rules dari Guidebook Merchant
        self.baseline_rules = ExtractedBusinessRules(
            business_profile=BusinessProfile(business_name="FitZen Studio", category="Health & Fitness"),
            financial_constraints=FinancialConstraints(
                max_discount_allowed_pct=15.0,
                min_margin_floor_idr=60000.0,
                currency="IDR"
            ),
            product_catalog=[
                ProductItem(name="Sesi Yoga Reguler", price_idr=100000.0, quota_sessions=1, validity_days=30),
                ProductItem(name="Sesi Pilates Premium", price_idr=200000.0, quota_sessions=1, validity_days=30)
            ],
            retention_policy=RetentionPolicy(free_freeze_allowed=True, max_freeze_days=14)
        )
        self.agent = ConversationalLogicAgent()

    def test_inquiry_intent(self):
        msg = "Halo, berapa batas diskon dan margin minimal saya saat ini?"
        res = self.agent.process_merchant_message(msg, self.baseline_rules)
        
        self.assertEqual(res["status"], "INQUIRY_ANSWER")
        self.assertIn("FitZen Studio", res["reply_message"])
        self.assertIn("15.0%", res["reply_message"])
        self.assertEqual(len(res["mutation_diff"]), 0)

    def test_valid_discount_mutation(self):
        # Minta ubah diskon jadi 20%.
        # Produk terendah Rp 100.000 * (1 - 0.20) = Rp 80.000.
        # Rp 80.000 >= Rp 60.000 (Margin Floor) -> AMAN (ACCEPTED)
        msg = "Tolong ubah batas maksimal diskon jadi 20%"
        res = self.agent.process_merchant_message(msg, self.baseline_rules)
        
        self.assertEqual(res["status"], "ACCEPTED")
        self.assertTrue(res["guardrail_report"]["is_safe"])
        self.assertEqual(res["updated_rules"]["financial_constraints"]["max_discount_allowed_pct"], 20.0)
        self.assertTrue(any("20" in diff for diff in res["mutation_diff"]))

    def test_guardrail_rejection_on_unsafe_discount(self):
        # Minta ubah diskon jadi 50%.
        # Produk terendah Rp 100.000 * (1 - 0.50) = Rp 50.000.
        # Rp 50.000 < Rp 60.000 (Margin Floor) -> DITOLAK (REJECTED)
        msg = "Tolong ubah batas maksimal diskon jadi 50%"
        res = self.agent.process_merchant_message(msg, self.baseline_rules)
        
        self.assertEqual(res["status"], "REJECTED")
        self.assertFalse(res["guardrail_report"]["is_safe"])
        self.assertIn("Belum Dapat Disimpan", res["reply_message"])
        self.assertIn("Saran Sistem", res["reply_message"])
        # Diskon di updated_rules tidak boleh berubah
        self.assertEqual(res["updated_rules"]["financial_constraints"]["max_discount_allowed_pct"], 15.0)

    def test_update_freeze_policy(self):
        msg = "Tolong perpanjang jeda cuti atau freeze jadi 30 hari"
        res = self.agent.process_merchant_message(msg, self.baseline_rules)
        
        self.assertEqual(res["status"], "ACCEPTED")
        self.assertEqual(res["updated_rules"]["retention_policy"]["max_freeze_days"], 30)

if __name__ == "__main__":
    unittest.main()
