import re
import unittest

# 1. Standalone test for PIISanitizer logic
class TestSanitizerLogic(unittest.TestCase):
    EMAIL_PATTERN = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b')
    PHONE_PATTERN = re.compile(r'(\+62|62|08)[0-9]{8,12}')
    ACCOUNT_PATTERN = re.compile(r'\b[0-9]{10,16}\b')

    def sanitize(self, text, name=""):
        mapping = {}
        s = text
        if name:
            mapping["[MEMBER_NAME]"] = name
            s = re.sub(re.escape(name), "[MEMBER_NAME]", s, flags=re.IGNORECASE)
        for i, email in enumerate(set(self.EMAIL_PATTERN.findall(s))):
            token = f"[MASKED_EMAIL_{i+1}]"
            mapping[token] = email
            s = s.replace(email, token)
        for i, phone in enumerate(set(self.PHONE_PATTERN.findall(s))):
            token = f"[MASKED_PHONE_{i+1}]"
            mapping[token] = phone
            s = s.replace(phone, token)
        for i, acc in enumerate(set(self.ACCOUNT_PATTERN.findall(s))):
            token = f"[MASKED_ACCOUNT_{i+1}]"
            mapping[token] = acc
            s = s.replace(acc, token)
        return s, mapping

    def test_masking(self):
        txt = "Nasabah Adit nomor HP 081299998888 dan no VA 9881234567890123 email adit@lanjut.id"
        s, m = self.sanitize(txt, "Adit")
        self.assertNotIn("Adit", s)
        self.assertNotIn("081299998888", s)
        self.assertNotIn("9881234567890123", s)
        self.assertNotIn("adit@lanjut.id", s)
        self.assertIn("[MEMBER_NAME]", s)

    def test_dynamic_threshold_logic(self):
        def evaluate_risk(days_inactive, threshold_days):
            score = 0.0
            if days_inactive >= threshold_days:
                score += 0.45
            return score

        # 15 days inactivity against 10 days (strict) vs 30 days (relaxed)
        score_strict = evaluate_risk(15, 10)
        score_relaxed = evaluate_risk(15, 30)
        self.assertEqual(score_strict, 0.45)
        self.assertEqual(score_relaxed, 0.0)

if __name__ == "__main__":
    unittest.main()
