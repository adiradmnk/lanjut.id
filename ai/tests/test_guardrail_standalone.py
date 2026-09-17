import unittest

class TestGuardrailStandalone(unittest.TestCase):
    def validate_mutation(self, catalog, max_disc, min_margin):
        violations = []
        if max_disc > 35.0:
            violations.append(f"Diskon {max_disc}% melebihi batas 35.0%")

        for prod in catalog:
            discounted = prod["price"] * (1.0 - (max_disc / 100.0))
            if discounted < min_margin:
                violations.append(f"Produk '{prod['name']}' harga {discounted} di bawah margin {min_margin}")

        is_safe = len(violations) == 0
        suggested_safe = max_disc
        if not is_safe and catalog:
            safe_discounts = []
            for prod in catalog:
                if prod["price"] > min_margin:
                    safe_discounts.append(((prod["price"] - min_margin) / prod["price"]) * 100.0)
                else:
                    safe_discounts.append(0.0)
            suggested_safe = round(min(safe_discounts), 1) if safe_discounts else 10.0

        return is_safe, violations, suggested_safe

    def test_safe_mutation(self):
        catalog = [{"name": "Yoga", "price": 100000.0}, {"name": "Pilates", "price": 200000.0}]
        # Diskon 20%, min margin 60.000 -> Yoga jadi 80.000 (Aman)
        is_safe, violations, suggested = self.validate_mutation(catalog, 20.0, 60000.0)
        self.assertTrue(is_safe)
        self.assertEqual(len(violations), 0)

    def test_unsafe_mutation_rejection(self):
        catalog = [{"name": "Yoga", "price": 100000.0}, {"name": "Pilates", "price": 200000.0}]
        # Diskon 50%, min margin 60.000 -> Yoga jadi 50.000 (Melanggar)
        is_safe, violations, suggested = self.validate_mutation(catalog, 50.0, 60000.0)
        self.assertFalse(is_safe)
        self.assertGreater(len(violations), 0)
        self.assertEqual(suggested, 40.0) # (100.000 - 60.000)/100.000 = 40%

if __name__ == "__main__":
    unittest.main()
