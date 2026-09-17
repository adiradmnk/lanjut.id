"""
Dynamic Tactic Synthesizer & Universal Retention Knowledge Base
Menghasilkan taktik retensi adaptif langsung dari Business Rules hasil analisis guidebook,
bukan dari daftar statis spesifik industri tertentu.
"""

from typing import Dict, Any, List
from app.core.schemas import ExtractedBusinessRules

class DynamicTacticsSynthesizer:
    @classmethod
    def synthesize_tactics(cls, business_rules: ExtractedBusinessRules, intent_category: str = "") -> List[Dict[str, Any]]:
        tactics = []
        category = (business_rules.business_profile.category or "Layanan").lower()
        currency = business_rules.financial_constraints.currency or "IDR"
        max_disc = business_rules.financial_constraints.max_discount_allowed_pct
        min_margin = business_rules.financial_constraints.min_margin_floor_idr

        # 1. Sintesis dari cancellation_triggers pada Guidebook
        for trigger in business_rules.cancellation_triggers:
            tactics.append({
                "action": trigger.recommended_action,
                "benefit": trigger.description,
                "allowed_discount_pct": min(trigger.allowed_discount_pct, max_disc),
                "category": "GUIDEBOOK_TRIGGER_POLICY",
                "trigger_pattern": trigger.trigger_pattern
            })

        # 2. Sintesis dari Retention Policy (Freeze / Reschedule / Flex)
        policy = business_rules.retention_policy
        if policy.free_freeze_allowed and policy.max_freeze_days > 0:
            tactics.append({
                "action": "FREEZE_MEMBERSHIP_PAUSE",
                "benefit": f"Jeda akun gratis hingga {policy.max_freeze_days} hari tanpa kehilangan status aktif.",
                "allowed_discount_pct": 0.0,
                "category": "RETENTION_POLICY_FREEZE",
                "trigger_pattern": "Kendala temporer / libur / sakit"
            })

        if policy.allow_reschedule:
            notice = f" (Pemberitahuan min. {policy.reschedule_notice_hours} jam)" if policy.reschedule_notice_hours else ""
            tactics.append({
                "action": "FLEXIBLE_RESCHEDULE_OFF_PEAK",
                "benefit": f"Pindah jadwal/sesi ke waktu lain yang masih tersedia{notice} tanpa biaya pinalti.",
                "allowed_discount_pct": 0.0,
                "category": "RESOURCE_OPTIMIZATION",
                "trigger_pattern": "Jadwal bentrok / kesibukan mendadak"
            })

        # 3. Sintesis dari Katalog Produk (Downgrade / Alternative Tier)
        if business_rules.product_catalog and len(business_rules.product_catalog) > 1:
            # Sort katalog dari harga terendah ke tertinggi
            sorted_products = sorted(business_rules.product_catalog, key=lambda p: p.price_idr)
            cheapest = sorted_products[0]
            tactics.append({
                "action": "DOWNGRADE_TO_AFFORDABLE_TIER",
                "benefit": f"Pindah ke opsi lebih hemat '{cheapest.name}' ({currency} {cheapest.price_idr:,.0f}) dengan tetap menjaga margin aman.",
                "allowed_discount_pct": min(10.0, max_disc),
                "category": "TIER_OPTIMIZATION",
                "trigger_pattern": "Kendala anggaran / efisiensi pengeluaran"
            })

        # Fallback jika guidebook belum memiliki triggers lengkap
        if not tactics:
            tactics.append({
                "action": "GENERIC_INTERVENTION_SAFE_MARGIN",
                "benefit": f"Penyesuaian paket fleksibel dengan diskon maksimal {max_disc}% (Menjaga margin minimal {currency} {min_margin:,.0f}).",
                "allowed_discount_pct": max_disc,
                "category": "FINANCIAL_GUARDRAIL",
                "trigger_pattern": "Semua jenis keluhan pelanggan"
            })

        return tactics
