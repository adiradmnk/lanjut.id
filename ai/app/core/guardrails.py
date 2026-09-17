"""
Financial Guardrail Validator (Banking & Safety Protocol)
Mengevaluasi apakah usulan perubahan aturan bisnis dari merchant
tetap aman bagi margin usaha dan mematuhi batas kelayakan angsuran BNI.
"""

from typing import Dict, Any, List, Tuple
from app.core.schemas import ExtractedBusinessRules, FinancialConstraints

class FinancialGuardrailValidator:
    @classmethod
    def validate_mutation(
        cls,
        current_rules: ExtractedBusinessRules,
        proposed_max_discount: float = None,
        proposed_min_margin: float = None
    ) -> Dict[str, Any]:
        """
        Memvalidasi usulan perubahan diskon atau batas margin minimum terhadap katalog produk.
        Formula Keselamatan:
        Harga Terdiskon = Harga Produk * (1 - (Diskon Maks / 100))
        Wajib memenuhi: Harga Terdiskon >= Batas Margin Minimal
        """
        max_disc = proposed_max_discount if proposed_max_discount is not None else current_rules.financial_constraints.max_discount_allowed_pct
        min_margin = proposed_min_margin if proposed_min_margin is not None else current_rules.financial_constraints.min_margin_floor_idr
        currency = current_rules.financial_constraints.currency or "IDR"

        violations = []
        catalog = current_rules.product_catalog or []

        # 1. Cek batas absolut diskon kebijakan perbankan (Maksimal 35% untuk retensi aman)
        if max_disc > 35.0:
            violations.append(
                f"Diskon {max_disc:.1f}% melebihi batas toleransi kehati-hatian perbankan (Maksimum absolut 35.0%)."
            )

        # 2. Cek simulasi terhadap setiap produk pada katalog
        for prod in catalog:
            discounted_price = prod.price_idr * (1.0 - (max_disc / 100.0))
            if discounted_price < min_margin:
                deficit = min_margin - discounted_price
                violations.append(
                    f"Produk '{prod.name}' (Harga normal: {currency} {prod.price_idr:,.0f}) setelah diskon {max_disc:.1f}% "
                    f"menjadi {currency} {discounted_price:,.0f}, berada di bawah margin minimum ({currency} {min_margin:,.0f}) selisih defisit {currency} {deficit:,.0f}."
                )

        is_safe = len(violations) == 0

        # Hitung rekomendasi diskon aman alternatif jika terjadi pelanggaran
        suggested_safe_discount = max_disc
        if not is_safe and catalog:
            safe_discounts = []
            for prod in catalog:
                # prod.price_idr * (1 - d/100) = min_margin  =>  1 - d/100 = min_margin / prod.price_idr  =>  d = (1 - min_margin/price) * 100
                if prod.price_idr > min_margin:
                    max_d = ((prod.price_idr - min_margin) / prod.price_idr) * 100.0
                    safe_discounts.append(max_d)
                else:
                    safe_discounts.append(0.0)
            suggested_safe_discount = max(0.0, round(min(safe_discounts), 1)) if safe_discounts else 10.0
            suggested_safe_discount = min(35.0, suggested_safe_discount)

        return {
            "is_safe": is_safe,
            "proposed_max_discount_pct": max_disc,
            "proposed_min_margin_floor_idr": min_margin,
            "violations": violations,
            "suggested_safe_discount_pct": suggested_safe_discount,
            "rationale": "Audit otomatis guardrail finansial BNI untuk menjaga arus kas perputaran VA."
        }
