"""
Banking Relationship Manager (RM) Payment Gateway & Health Intelligence
Mengadopsi pola Autonomous Analytical Banking Agent (LangChain-style):
1. Memantau rasio settlement transaksi Virtual Account BNI SNAP.
2. Mendeteksi pola anomali friksi gateway perbankan.
3. Mengelompokkan profil perilaku bayar nasabah secara agregat mematuhi UU PDP.
4. Mensintesis narasi manajerial & rekomendasi fasilitas kredit BNI via Gemini.
"""

import json
from typing import Dict, Any, List
from app.core.gemini_client import GeminiEngine

class RMPaymentHealthEngine:
    @classmethod
    def evaluate_gateway_health(
        cls,
        merchant_id: str,
        merchant_name: str,
        transaction_history: List[Dict[str, Any]],
        feedback_list: List[Dict[str, Any]],
        thresholds: Dict[str, float] = None
    ) -> Dict[str, Any]:
        if thresholds is None:
            thresholds = {"high_attention_success_pct": 75.0, "high_attention_pending_pct": 0.3, "medium_observation_success_pct": 88.0}
        total_trx = len(transaction_history)
        if total_trx == 0:
            return {
                "merchant_id": merchant_id,
                "merchant_name": merchant_name,
                "overview": {
                    "total_transactions": 0,
                    "paid_transactions": 0,
                    "success_rate_pct": 100.0,
                    "total_settled_turnover_idr": 0,
                    "bni_rm_priority": "STABLE"
                },
                "payment_gateway_friction_patterns": ["Belum ada aktivitas transaksi pada periode berjalan."],
                "member_feedback_personas": [],
                "actionable_rm_recommendations": ["Lakukan pendampingan onboarding aktivasi BNI SNAP."],
                "compliance_statement": "Mematuhi UU Pelindungan Data Pribadi (UU PDP)."
            }

        paid_trx = sum(1 for t in transaction_history if str(t.get("status", "")).upper() == "PAID")
        pending_trx = sum(1 for t in transaction_history if str(t.get("status", "")).upper() in ["PENDING", "EXPIRED"])
        failed_trx = sum(1 for t in transaction_history if str(t.get("status", "")).upper() in ["FAILED", "CANCELLED"])

        success_rate = round((paid_trx / total_trx) * 100, 2)
        total_settled_idr = sum(float(t.get("amount", 0)) for t in transaction_history if str(t.get("status", "")).upper() == "PAID")

        # Prioritas Pendampingan RM BNI
        if success_rate < thresholds["high_attention_success_pct"] or pending_trx >= (total_trx * thresholds["high_attention_pending_pct"]):
            rm_priority = "HIGH_ATTENTION"
        elif success_rate < thresholds["medium_observation_success_pct"]:
            rm_priority = "MEDIUM_OBSERVATION"
        else:
            rm_priority = "PRIME_HEALTHY"

        # 1. Pure LLM Analysis via Gemini API (Pola Analytical Banking Agent)
        if GeminiEngine.is_available():
            prompt = f"""
            Anda adalah Senior Portfolio Credit Analyst & Relationship Manager Bank BNI:
            
            Konteks Portofolio Mitra:
            - Nama Merchant: {merchant_name}
            - Total Transaksi: {total_trx}
            - Transaksi Berhasil (Paid): {paid_trx} (Success Rate: {success_rate}%)
            - Transaksi Expired / Pending: {pending_trx}
            - Transaksi Gagal: {failed_trx}
            - Total Omzet Settlement Terhimpun: Rp {int(total_settled_idr):,}
            - Status Prioritas Risiko: {rm_priority}
            - Ringkasan Komplain Terkait Pembayaran/Layanan: {json.dumps(feedback_list[:8])}

            Tugas Anda:
            1. Analisis pola kendala payment gateway (payment_gateway_friction_patterns) - apa penyebab utama kegagalan/expired transaksi.
            2. Buat profil agregat persona nasabah (member_feedback_personas) yang relevan (nama persona & deskripsi perilaku bayar, tanpa PII).
            3. Rumuskan 2-3 rekomendasi strategis bagi RM BNI (actionable_rm_recommendations) seperti penawaran BNI Direct Debit, BNI QRIS EDC, atau kredit modal kerja KUR/SME.

            Format JSON murni:
            {{
                "payment_gateway_friction_patterns": ["...", "..."],
                "member_feedback_personas": [
                    {{"persona_name": "...", "description": "..."}}
                ],
                "actionable_rm_recommendations": ["...", "..."]
            }}
            """
            llm_analysis = GeminiEngine.generate_json(
                prompt=prompt,
                system_instruction="Anda adalah Analytical Banking RM Advisor Bank BNI."
            )
            if llm_analysis and "actionable_rm_recommendations" in llm_analysis:
                return {
                    "merchant_id": merchant_id,
                    "merchant_name": merchant_name,
                    "overview": {
                        "total_transactions": total_trx,
                        "paid_transactions": paid_trx,
                        "success_rate_pct": success_rate,
                        "total_settled_turnover_idr": int(total_settled_idr),
                        "bni_rm_priority": rm_priority
                    },
                    "payment_gateway_friction_patterns": llm_analysis.get("payment_gateway_friction_patterns", []),
                    "member_feedback_personas": llm_analysis.get("member_feedback_personas", []),
                    "actionable_rm_recommendations": llm_analysis.get("actionable_rm_recommendations", []),
                    "compliance_statement": "Data diagregasikan secara anonim mematuhi UU Pelindungan Data Pribadi (UU PDP).",
                    "engine_source": "Google Gemini 1.5 Flash (Analytical Banking RM Agent)"
                }

        # Fallback Analysis
        return {
            "merchant_id": merchant_id,
            "merchant_name": merchant_name,
            "overview": {
                "total_transactions": total_trx,
                "paid_transactions": paid_trx,
                "success_rate_pct": success_rate,
                "total_settled_turnover_idr": int(total_settled_idr),
                "bni_rm_priority": rm_priority
            },
            "payment_gateway_friction_patterns": [
                f"Tingkat penyelesaian transaksi settlement VA berada pada angka {success_rate}%."
            ],
            "member_feedback_personas": [
                {"persona_name": "Budget-Conscious Subscribers", "description": "Nasabah yang memerlukan opsi fleksibilitas pembayaran."}
            ],
            "actionable_rm_recommendations": [
                "Lakukan review berkala terhadap waktu jatuh tempo BNI SNAP Virtual Account.",
                "Tawarkan fasilitas perbankan BNI Smart Merchant untuk meningkatkan efisiensi penerimaan kas."
            ],
            "compliance_statement": "Mematuhi UU Pelindungan Data Pribadi (UU PDP).",
            "engine_source": "LANJUT Analytical RM Fallback"
        }
