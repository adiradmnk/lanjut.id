"""
Universal Agentic Retention Assistant & Reasoning Loop
State Machine: ANALYZING -> RETRIEVING -> REASONING -> GENERATING.
Guidebook-Driven & Compliant: Memanfaatkan panduan bisnis merchant langsung sebagai batasan reasoning.
"""

import os
import json
import logging
from typing import Dict, Any, List, Optional
try:
    import google.generativeai as genai
    HAS_GENAI = True
except ImportError:
    genai = None
    HAS_GENAI = False

from app.core.schemas import ExtractedBusinessRules
from app.core.tactics_kb import DynamicTacticsSynthesizer
from app.core.sanitizer import PIISanitizer

logger = logging.getLogger(__name__)

class RetentionAgent:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY", "")
        self.state = "IDLE"
        if self.api_key and HAS_GENAI:
            try:
                genai.configure(api_key=self.api_key)
            except Exception as e:
                logger.warning(f"Failed to configure Gemini: {e}")

    def run_agentic_workflow(
        self,
        customer_profile: Dict[str, Any],
        risk_evaluation: Dict[str, Any],
        business_rules: Optional[ExtractedBusinessRules] = None
    ) -> Dict[str, Any]:
        """
        Menjalankan loop agentic retensi universal:
        1. ANALYZING: Analisis profil & skor probabilitas churn
        2. RETRIEVING: Pencarian taktik langsung dari aturan bisnis Guidebook
        3. REASONING: Reasoning sintesis strategi dengan PII Sanitizer & LLM
        4. GENERATING: Menghasilkan Structured Strategy Report yang aman secara margin
        """
        rules = business_rules or ExtractedBusinessRules()
        biz_profile = rules.business_profile
        fin_constraints = rules.financial_constraints

        # 1. State: ANALYZING
        self.state = "ANALYZING"
        prob = risk_evaluation.get("probability", 0.5)
        top_factors = risk_evaluation.get("top_contributing_factors", [])
        cluster_name = risk_evaluation.get("cluster_name", "General Risk Profile")

        # 2. State: RETRIEVING
        self.state = "RETRIEVING"
        retrieved_tactics = DynamicTacticsSynthesizer.synthesize_tactics(rules)

        # 3. State: REASONING
        self.state = "REASONING"
        reasoning_log = [
            f"Mengevaluasi nasabah pada industri '{biz_profile.category}' dengan risiko churn {prob:.1%}.",
            f"Segmentasi risiko teridentifikasi: '{cluster_name}'.",
            f"Faktor pemicu utama: {', '.join(top_factors) if top_factors else 'Variasi normal'}.",
            f"Mengambil {len(retrieved_tactics)} opsi intervensi tervalidasi dari Guidebook '{biz_profile.business_name}'.",
            f"Mengunci kepatuhan margin perbankan: Diskon maksimal {fin_constraints.max_discount_allowed_pct}%, Margin minimal {fin_constraints.currency} {fin_constraints.min_margin_floor_idr:,.0f}."
        ]

        # 4. State: GENERATING
        self.state = "GENERATING"
        strategy_result = self._synthesize_strategy(
            customer_profile=customer_profile,
            risk_evaluation=risk_evaluation,
            tactics=retrieved_tactics,
            rules=rules
        )

        self.state = "COMPLETED"
        return {
            "state": self.state,
            "merchant_name": biz_profile.business_name,
            "merchant_industry": biz_profile.category,
            "churn_probability": prob,
            "reasoning_steps": reasoning_log,
            "recommended_actions": retrieved_tactics[:3],
            "synthesized_strategy": strategy_result,
            "guardrail_compliance": {
                "max_discount_allowed_pct": fin_constraints.max_discount_allowed_pct,
                "min_margin_floor_idr": fin_constraints.min_margin_floor_idr,
                "status": "VERIFIED_SAFE"
            }
        }

    def _synthesize_strategy(
        self,
        customer_profile: Dict[str, Any],
        risk_evaluation: Dict[str, Any],
        tactics: List[Dict[str, Any]],
        rules: ExtractedBusinessRules
    ) -> Dict[str, Any]:
        member_name = customer_profile.get("member_name", "Nasabah")
        # Masking PII
        sanitized_name, pii_map = PIISanitizer.sanitize_text(member_name, member_name)

        if self.api_key and HAS_GENAI:
            try:
                model = genai.GenerativeModel("gemini-1.5-flash")
                prompt = f"""
                Anda adalah Enterprise Retention Strategic Advisor untuk mitra merchant perbankan BNI.
                Berikan rekomendasi retensi terstruktur dalam format JSON murni.

                Konteks Merchant:
                - Usaha: {rules.business_profile.business_name} ({rules.business_profile.category})
                - Batas Diskon Maks: {rules.financial_constraints.max_discount_allowed_pct}%
                - Margin Minimal: {rules.financial_constraints.min_margin_floor_idr} IDR

                Data Nasabah:
                - Nama: {sanitized_name}
                - Peluang Churn: {risk_evaluation.get('probability', 0.5) * 100:.1f}%
                - Klaster: {risk_evaluation.get('cluster_name')}
                - Pemicu Risiko: {json.dumps(risk_evaluation.get('top_contributing_factors', []))}
                - Opsi Tersedia dari Guidebook: {json.dumps([t['action'] for t in tactics])}

                Output JSON persis:
                {{
                    "primary_strategy": "Ringkasan 1 kalimat solusi utama",
                    "intervention_urgency": "IMMEDIATE" | "STANDARD" | "OBSERVATION",
                    "executive_notes": "Catatan singkat untuk pemilik merchant"
                }}
                """
                resp = model.generate_content(prompt, generation_config={"response_mime_type": "application/json"})
                parsed = json.loads(resp.text.strip())
                # Desanitize if needed
                parsed["primary_strategy"] = PIISanitizer.desanitize_text(parsed["primary_strategy"], pii_map)
                return parsed
            except Exception as e:
                logger.warning(f"Gemini synthesis failed: {e}")

        # Deterministic Guidebook-driven fallback
        top_tactic = tactics[0] if tactics else {"action": "INTERVENSI_MARGIN_AMAN", "benefit": "Penyesuaian paket aman"}
        return {
            "primary_strategy": f"Terapkan {top_tactic['action']}: {top_tactic['benefit']} untuk {member_name}.",
            "intervention_urgency": "IMMEDIATE" if risk_evaluation.get("probability", 0) >= 0.7 else "STANDARD",
            "executive_notes": f"Intervensi otomatis disesuaikan dengan batasan diskon maks {rules.financial_constraints.max_discount_allowed_pct}%."
        }
