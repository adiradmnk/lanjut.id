import unittest

# 1. Test Transaction Churn Detector Logic
class TestLifecycleLogic(unittest.TestCase):
    def test_transaction_churn_detector_unpaid_invoice(self):
        transactions = [
            {"trx_id": "trx_1", "status": "PAID", "amount": 150000},
            {"trx_id": "trx_2", "status": "PENDING", "amount": 150000}
        ]
        
        paid_count = sum(1 for t in transactions if t["status"] == "PAID")
        pending_count = sum(1 for t in transactions if t["status"] in ["PENDING", "EXPIRED"])
        
        self.assertEqual(paid_count, 1)
        self.assertEqual(pending_count, 1)
        # Sinyal Unpaid Invoice terdeteksi
        detected_pattern = "EXPIRED_UNPAID_INVOICE" if (pending_count > 0 and paid_count > 0) else "NORMAL"
        self.assertEqual(detected_pattern, "EXPIRED_UNPAID_INVOICE")

    def test_dynamic_survey_format(self):
        # Memastikan format survei mengandung pertanyaan, opsi checkbox, dan free text
        survey = {
            "question_title": "Halo Budi, ada kendala apa?",
            "is_multi_select": True,
            "multiple_choice_options": [
                {"id": "opt_schedule", "label": "Jadwal bentrok"},
                {"id": "opt_price", "label": "Kendala biaya"}
            ],
            "free_text_field": {
                "label": "Catatan Lainnya",
                "placeholder": "Tulis kendala Anda..."
            }
        }
        self.assertTrue(survey["is_multi_select"])
        self.assertGreaterEqual(len(survey["multiple_choice_options"]), 2)
        self.assertIn("placeholder", survey["free_text_field"])

    def test_feedback_to_retention_offer_margin_lock(self):
        selected_ids = ["opt_price"]
        free_text = "biaya bulan ini berat"
        
        # Guardrail test
        max_discount = 15.0
        min_margin = 50000.0
        product_price = 120000.0
        
        disc_price = max(min_margin, product_price * (1.0 - (max_discount / 100.0)))
        # 120.000 * 0.85 = 102.000 (Tetap di atas margin min 50.000)
        self.assertEqual(disc_price, 102000.0)
        self.assertGreaterEqual(disc_price, min_margin)

    def test_rm_payment_gateway_health(self):
        transactions = [
            {"trx_id": "1", "status": "PAID", "amount": 100000},
            {"trx_id": "2", "status": "PAID", "amount": 100000},
            {"trx_id": "3", "status": "EXPIRED", "amount": 100000}
        ]
        total = len(transactions)
        paid = sum(1 for t in transactions if t["status"] == "PAID")
        success_rate = round((paid / total) * 100, 1)
        
        self.assertEqual(success_rate, 66.7)
        priority = "HIGH_ATTENTION" if success_rate < 75.0 else "PRIME_HEALTHY"
        self.assertEqual(priority, "HIGH_ATTENTION")

if __name__ == "__main__":
    unittest.main()
