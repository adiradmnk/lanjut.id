import unittest

class Test8RepoWorkflows(unittest.TestCase):
    def test_bestoism_document_processor_pattern(self):
        # Memastikan extractor mampu mengekstrak dokumen mentah menjadi aturan terstruktur
        raw_doc = """
        Nama Usaha: Solusi Bisnis Cloud PT
        Kategori: B2B SaaS
        Paket Premium: Rp 300000 per bulan
        Diskon maksimal: 20%
        Margin minimal: Rp 80000
        Kebijakan jeda: Diizinkan freeze hingga 30 hari
        """
        from app.features.guidebook.extractor import DocumentProcessor
        proc = DocumentProcessor()
        res = proc.extract_structured_rules(raw_doc, "sop_saas.txt")
        self.assertIn("rules", res)
        rules = res["rules"]
        self.assertEqual(rules["financial_constraints"]["max_discount_allowed_pct"], 20.0)
        self.assertEqual(rules["financial_constraints"]["min_margin_floor_idr"], 80000.0)
        self.assertTrue(rules["retention_policy"]["free_freeze_allowed"])

    def test_langchain_tool_calling_guardrail_rejection(self):
        # Memastikan instruksi yang melanggar margin ditolak oleh agent
        from app.core.schemas import ExtractedBusinessRules, FinancialConstraints, ProductItem
        from app.features.chatbot.agent import ConversationalLogicAgent

        rules = ExtractedBusinessRules(
            financial_constraints=FinancialConstraints(max_discount_allowed_pct=10.0, min_margin_floor_idr=60000.0),
            product_catalog=[ProductItem(name="Layanan Dasar", price_idr=100000.0)]
        )
        agent = ConversationalLogicAgent()
        # Diskon 60% membuat harga Rp 40.000 (< Rp 60.000 floor)
        msg = "Tolong ubah diskon retensi jadi 60%"
        res = agent.process_merchant_message(msg, rules)
        self.assertEqual(res["status"], "REJECTED")
        self.assertFalse(res["guardrail_report"]["is_safe"])
        self.assertIn("reply_message", res)

    def test_vercel_ai_dynamic_survey_generation(self):
        # Memastikan form kuesioner dinamis tersusun atas pertanyaan, checkbox, dan isian bebas
        from app.core.schemas import ExtractedBusinessRules, BusinessProfile
        from app.features.lifecycle.survey_generator import DynamicSurveyGenerator

        rules = ExtractedBusinessRules(
            business_profile=BusinessProfile(business_name="Les Bahasa Pintar", category="Education")
        )
        last_trx = {"detected_pattern": "EXPIRED_UNPAID_INVOICE", "days_to_expiry": 5, "unused_quota": 2}
        survey = DynamicSurveyGenerator.generate_cancellation_survey("Ahmad", last_trx, rules)
        
        self.assertIn("question_title", survey)
        self.assertTrue(survey["is_multi_select"])
        self.assertGreaterEqual(len(survey["multiple_choice_options"]), 3)
        self.assertIn("free_text_field", survey)

    def test_rag_retention_offer_margin_lock(self):
        # Memastikan penawaran retensi terkunci aman di atas margin minimum
        from app.core.schemas import ExtractedBusinessRules, FinancialConstraints, ProductItem
        from app.features.lifecycle.survey_generator import UserFeedbackAnalyzer

        rules = ExtractedBusinessRules(
            financial_constraints=FinancialConstraints(max_discount_allowed_pct=15.0, min_margin_floor_idr=70000.0),
            product_catalog=[ProductItem(name="Paket Reguler", price_idr=100000.0)]
        )
        feedback = UserFeedbackAnalyzer.analyze_feedback_and_generate_offer(
            member_name="Ahmad",
            selected_option_ids=["opt_price"],
            free_text_feedback="anggaran menipis bulan ini",
            business_rules=rules
        )
        self.assertIn("personalized_retention_offers", feedback)
        offers = feedback["personalized_retention_offers"]
        self.assertGreater(len(offers), 0)
        # Cek jika ada penawaran berbayar, wajib >= Rp 70.000
        for off in offers:
            if off.get("price_idr", 0) > 0:
                self.assertGreaterEqual(off["price_idr"], 70000.0)

    def test_fastapi_revenue_optimizer_analytics(self):
        from app.core.schemas import ExtractedBusinessRules
        from app.features.lifecycle.revenue_optimizer import RevenueOptimizerEngine

        rules = ExtractedBusinessRules()
        insights = RevenueOptimizerEngine.generate_revenue_insights(
            total_members=100,
            churn_risk_count=15,
            saved_members_count=10,
            feedback_summary_list=[{"category": "schedule_conflict"}],
            business_rules=rules
        )
        self.assertIn("metrics", insights)
        self.assertIn("actionable_revenue_optimizations", insights)

    def test_langchain_banking_rm_payment_health(self):
        from app.features.lifecycle.rm_payment_health import RMPaymentHealthEngine

        trx_history = [
            {"trx_id": "1", "status": "PAID", "amount": 200000},
            {"trx_id": "2", "status": "EXPIRED", "amount": 200000}
        ]
        report = RMPaymentHealthEngine.evaluate_gateway_health("Mitra BNI 01", trx_history, [])
        self.assertEqual(report["overview"]["success_rate_pct"], 50.0)
        self.assertEqual(report["overview"]["bni_rm_priority"], "HIGH_ATTENTION")
        self.assertIn("actionable_rm_recommendations", report)

if __name__ == "__main__":
    unittest.main()
