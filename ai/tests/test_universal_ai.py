import unittest
from app.core.schemas import ExtractedBusinessRules, BusinessProfile, FinancialConstraints, ProductItem, CancellationTrigger, RetentionPolicy
from app.core.sanitizer import PIISanitizer
from app.core.tactics_kb import DynamicTacticsSynthesizer
from app.services.guidebook_extractor import GuidebookExtractor
from app.services.risk_engine import PaymentRiskScoringEngine
from app.services.ml_churn_model import MLChurnPredictionEngine
from app.services.retention_agent import RetentionAgent

class TestUniversalAI(unittest.TestCase):
    def test_pii_sanitizer(self):
        raw_text = "Saya Budi Hartono ingin komplain tagihan ke budi.hartono@email.com no HP 081234567890 dan no VA 9881234567890123"
        sanitized, mapping = PIISanitizer.sanitize_text(raw_text, "Budi Hartono")
        
        self.assertNotIn("Budi Hartono", sanitized)
        self.assertIn("[MEMBER_NAME]", sanitized)
        self.assertNotIn("budi.hartono@email.com", sanitized)
        self.assertIn("[MASKED_EMAIL_1]", sanitized)
        self.assertNotIn("081234567890", sanitized)
        self.assertNotIn("9881234567890123", sanitized)
        
        # Desanitize
        restored = PIISanitizer.desanitize_text(sanitized, mapping)
        self.assertEqual(restored, raw_text)

    def test_dynamic_guidebook_extractor_saas(self):
        saas_doc = """
        Nama Usaha: CloudAccounting Pro PT Solusi Digital
        Kategori: B2B SaaS & Digital Services
        Model: Layanan software akuntansi berlangganan bulanan dan tahunan.
        Katalog:
        Paket Starter: Rp 150000 per bulan
        Paket Enterprise: Rp 750000 per bulan
        Ketentuan: Diskon maksimal retensi 20%, batas margin minimal Rp 70.000.
        Kebijakan: Boleh jeda atau freeze akun hingga 45 hari jika audit selesai.
        """
        res = GuidebookExtractor.extract_rules(saas_doc, "sop_saas.txt")
        rules = res["rules"]
        
        self.assertIn("cloudaccounting pro", rules["business_profile"]["business_name"].lower())
        self.assertEqual(rules["business_profile"]["category"].lower(), "b2b saas & digital services")
        self.assertEqual(rules["financial_constraints"]["max_discount_allowed_pct"], 20.0)
        self.assertEqual(rules["financial_constraints"]["min_margin_floor_idr"], 70000.0)
        self.assertTrue(rules["retention_policy"]["free_freeze_allowed"])
        self.assertGreaterEqual(len(rules["product_catalog"]), 2)

    def test_dynamic_tactics_synthesizer(self):
        music_rules = ExtractedBusinessRules(
            business_profile=BusinessProfile(business_name="Irama Nada Musik", category="Education & Tutoring"),
            financial_constraints=FinancialConstraints(max_discount_allowed_pct=10.0, min_margin_floor_idr=30000.0),
            cancellation_triggers=[
                CancellationTrigger(
                    trigger_pattern="Jadwal ujian sekolah / les bentrok",
                    recommended_action="RESCHEDULE_TO_WEEKEND",
                    allowed_discount_pct=5.0,
                    description="Pindahkan sesi les ke hari Sabtu/Minggu"
                )
            ],
            retention_policy=RetentionPolicy(free_freeze_allowed=True, max_freeze_days=14, allow_reschedule=True)
        )
        
        tactics = DynamicTacticsSynthesizer.synthesize_tactics(music_rules)
        actions = [t["action"] for t in tactics]
        
        self.assertIn("RESCHEDULE_TO_WEEKEND", actions)
        self.assertIn("FREEZE_MEMBERSHIP_PAUSE", actions)
        self.assertIn("FLEXIBLE_RESCHEDULE_OFF_PEAK", actions)
        
        # Bebas hardcode gym/pilates
        for t in tactics:
            self.assertNotIn("pilates", t["benefit"].lower())

    def test_risk_scoring_engine_dynamic_threshold(self):
        strict_rules = ExtractedBusinessRules(
            financial_constraints=FinancialConstraints(auto_intervention_threshold_days=10)
        )
        relaxed_rules = ExtractedBusinessRules(
            financial_constraints=FinancialConstraints(auto_intervention_threshold_days=40)
        )
        
        profile = {"days_since_last_visit": 15, "missed_payments_count": 0, "quota_utilization_pct": 0.5, "tenure_months": 5}
        
        res_strict = PaymentRiskScoringEngine.evaluate(profile, strict_rules)
        res_relaxed = PaymentRiskScoringEngine.evaluate(profile, relaxed_rules)
        
        self.assertEqual(res_strict["cluster_name"], "Inactive Silent Churn")
        self.assertGreater(res_strict["probability"], res_relaxed["probability"])

    def test_agentic_retention_loop_universal(self):
        agent = RetentionAgent()
        rules = ExtractedBusinessRules(
            business_profile=BusinessProfile(business_name="Bimbel Pintar BNI", category="Education & Tutoring"),
            financial_constraints=FinancialConstraints(max_discount_allowed_pct=15.0, min_margin_floor_idr=25000.0)
        )
        customer = {"member_name": "Siti Nurhaliza"}
        risk_eval = {"probability": 0.72, "cluster_name": "Payment At-Risk Segment", "top_contributing_factors": ["Gagal bayar VA"]}
        
        output = agent.run_agentic_workflow(customer, risk_eval, rules)
        
        self.assertEqual(output["state"], "COMPLETED")
        self.assertEqual(output["merchant_name"], "Bimbel Pintar BNI")
        self.assertEqual(output["guardrail_compliance"]["max_discount_allowed_pct"], 15.0)
        self.assertGreater(len(output["recommended_actions"]), 0)

if __name__ == "__main__":
    unittest.main()
