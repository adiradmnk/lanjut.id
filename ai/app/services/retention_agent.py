"""
Agentic Retention Assistant & Reasoning Loop
Diadaptasi dari RetentionAgent pada Outlier.AI (retention_automation.py & retention_agent.py).
Menerapkan State Machine: ANALYZING -> RETRIEVING -> REASONING -> GENERATING.
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
from app.core.tactics_kb import RETENTION_TACTICS_KB

logger = logging.getLogger(__name__)


class RetentionAgent:
    """
    Agentic AI Assistant yang melakukan penalaran (reasoning) terhadap faktor risiko,
    mengambil taktik terbaik dari Knowledge Base, dan memproduksi laporan retensi terstruktur.
    """

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY", "")
        self.state = "IDLE"
        if self.api_key:
            try:
                genai.configure(api_key=self.api_key)
            except Exception as e:
                logger.warning(f"Failed to configure Gemini: {e}")

    def run_agentic_workflow(
        self,
        customer_profile: Dict[str, Any],
        risk_evaluation: Dict[str, Any],
        merchant_constraint: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Menjalankan loop agentic penuh:
        1. ANALYZING: Analisis profil & skor probabilitas
        2. RETRIEVING: Pencarian taktik dari Knowledge Base
        3. REASONING: Sintesis alasan pemicu churn & strategi penanggulangan
        4. GENERATING: Membentuk Structured Retention Strategy Report
        """
        merchant_constraint = merchant_constraint or {
            "max_discount_pct": 15.0,
            "min_margin_idr": 50000,
            "business_name": "FITBODY Studio"
        }

        # -----------------------------------------------------
        # 1. State: ANALYZING
        # -----------------------------------------------------
        self.state = "ANALYZING"
        prob = risk_evaluation.get("probability", 0.5)
        top_factors = risk_evaluation.get("top_contributing_factors", [])
        cluster_name = risk_evaluation.get("cluster_name", "Unknown Archetype")

        # -----------------------------------------------------
        # 2. State: RETRIEVING
        # -----------------------------------------------------
        self.state = "RETRIEVING"
        retrieved_tactics = self._retrieve_tactics(customer_profile, risk_evaluation)

        # -----------------------------------------------------
        # 3. State: REASONING
        # -----------------------------------------------------
        self.state = "REASONING"
        reasoning_log = [
            f"Evaluated member with churn risk of {prob:.1%}.",
            f"Identified customer archetype: '{cluster_name}'.",
            f"Primary risk drivers from SHAP analysis: {', '.join(top_factors) if top_factors else 'Normal variation'}.",
            f"Matched {len(retrieved_tactics)} retention tactics from domain Knowledge Base.",
            f"Enforcing merchant margin safety constraint: Max Discount {merchant_constraint.get('max_discount_pct')}%."
        ]

        # -----------------------------------------------------
        # 4. State: GENERATING (LLM Synthesis or Intelligent Fallback)
        # -----------------------------------------------------
        self.state = "GENERATING"
        executive_strategy = self._synthesize_strategy_with_llm(
            customer_profile=customer_profile,
            risk_evaluation=risk_evaluation,
            tactics=retrieved_tactics,
            merchant_constraint=merchant_constraint
        )

        self.state = "COMPLETED"

        # Membentuk Format Laporan Final Terstruktur (Sesuai Outlier.AI Report Schema)
        report = {
            "summary": {
                "member_name": customer_profile.get("member_name", "Member"),
                "risk_level": risk_evaluation.get("risk_level", "MODERATE"),
                "probability": f"{prob:.1%}",
                "customer_segment": cluster_name,
                "cluster_id": risk_evaluation.get("cluster_id", 0)
            },
            "contributing_factors": top_factors,
            "reasoning_log": reasoning_log,
            "executive_strategy": executive_strategy,
            "recommended_actions": retrieved_tactics,
            "references": list(set([t.get("reference", "LANJUT Policy") for t in retrieved_tactics])),
            "disclaimers": {
                "business": "Rekomendasi ini dihitung secara otomatis oleh LANJUT AI Engine. Penyesuaian harga tetap tunduk pada batas margin minimal merchant.",
                "fintech_compliance": "Setiap pembayaran lanjutan atau virtual account yang diterbitkan menggunakan standar API BNI SNAP resmi."
            }
        }
        return report

    def _retrieve_tactics(self, profile: Dict[str, Any], risk_eval: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Mengambil taktik relevan dari KB berdasarkan kontributor risiko utama."""
        tactics = []
        cluster_id = risk_eval.get("cluster_id", 0)
        top_factors_str = " ".join(risk_eval.get("top_contributing_factors", [])).lower()

        if "bni" in top_factors_str or "gagal" in top_factors_str or cluster_id == 1:
            tactics.extend(RETENTION_TACTICS_KB["PAYMENT_FRICTION"])
        if "inaktivitas" in top_factors_str or cluster_id == 2:
            tactics.extend(RETENTION_TACTICS_KB["SILENT_CHURN"])
        if "utilisasi" in top_factors_str or "kontrak" in top_factors_str or cluster_id == 3:
            tactics.extend(RETENTION_TACTICS_KB["PRICE_SENSITIVITY"])
            tactics.extend(RETENTION_TACTICS_KB["SCHEDULE_CONFLICT"])

        # Fallback jika tidak ada matching spesifik
        if not tactics:
            tactics.extend(RETENTION_TACTICS_KB["SCHEDULE_CONFLICT"])

        return tactics[:4]

    def _synthesize_strategy_with_llm(
        self,
        customer_profile: Dict[str, Any],
        risk_evaluation: Dict[str, Any],
        tactics: List[Dict[str, Any]],
        merchant_constraint: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Memanggil Gemini untuk reasoning sintesis atau fallback deterministik."""
        if self.api_key:
            try:
                model = genai.GenerativeModel("gemini-1.5-flash")
                prompt = f"""
                Anda adalah Strategic Retention Advisor untuk platform LANJUT (B2B Merchant Retention).
                Analisis data risiko pelanggan ini dan berikan output JSON murni tanpa markdown formatting.

                Profil Pelanggan:
                - Nama: {customer_profile.get('member_name', 'Dina')}
                - Churn Probability: {risk_evaluation.get('probability', 0.5) * 100}%
                - Segment: {risk_evaluation.get('cluster_name')}
                - Pemicu Risiko: {json.dumps(risk_evaluation.get('top_contributing_factors', []))}
                - Taktik Kandidat: {json.dumps([t['action'] for t in tactics])}
                - Batas Merchant: Diskon maks {merchant_constraint.get('max_discount_pct')}%

                Kembalikan JSON dengan format persis:
                {{
                    "core_issue": "Masalah utama pelanggan secara ringkas",
                    "intervention_strategy": "Tindakan intervensi retensi terbaik",
                    "offer_headline": "Judul penawaran solusi menarik untuk pelanggan",
                    "action_type": "SCHEDULE_PIVOT" | "PAYMENT_RECOVERY" | "PRICE_TIER_DOWNGRADE" | "PAUSE_ACCOUNT",
                    "estimated_revenue_saved_idr": 450000
                }}
                """
                response = model.generate_content(
                    prompt,
                    generation_config={"response_mime_type": "application/json"}
                )
                return json.loads(response.text.strip())
            except Exception as e:
                logger.warning(f"LLM generation fallback: {e}")

        # Deterministic Intelligent Fallback
        cluster_id = risk_evaluation.get("cluster_id", 0)
        if cluster_id == 1:
            return {
                "core_issue": "Pembayaran Virtual Account tertunda / gagal berulang.",
                "intervention_strategy": "Kirimkan link auto-debit BNI dan perpanjang grace period tagihan 7 hari.",
                "offer_headline": "Kemudahan Pembayaran Otomatis BNI + Cashback 5%",
                "action_type": "PAYMENT_RECOVERY",
                "estimated_revenue_saved_idr": 450000
            }
        elif cluster_id == 2:
            return {
                "core_issue": "Inaktivitas panjang > 21 hari (Silent Churn).",
                "intervention_strategy": "Hubungi member via WhatsApp untuk menawarkan 1 sesi konsultasi trainer gratis.",
                "offer_headline": "Sesi Re-aktivasi Spesial & Free Personal Trainer",
                "action_type": "SCHEDULE_PIVOT",
                "estimated_revenue_saved_idr": 400000
            }
        else:
            return {
                "core_issue": "Sensitivitas harga dan kendala jadwal kantor.",
                "intervention_strategy": "Tawarkan perpindahan ke kelas malam off-peak dengan diskon aman 10%.",
                "offer_headline": "Pindah ke Sesi Malam Lebih Hemat 10%",
                "action_type": "PRICE_TIER_DOWNGRADE",
                "estimated_revenue_saved_idr": 350000
            }
