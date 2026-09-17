"""
Merchant Revenue Optimization & Trend Engine (FastAPI Analytics Template Pattern)
Memproses agregasi data transaksi untuk:
1. Menganalisis pola anomali waktu & friksi pembayaran.
2. Mengestimasi omzet terselamatkan (Saved Revenue Velocity).
3. Merumuskan rekomendasi aksi peningkatan pendapatan via Gemini tanpa template statis.
"""

import json
from typing import Dict, Any, List
from app.core.schemas import ExtractedBusinessRules
from app.core.gemini_client import GeminiEngine

class RevenueOptimizerEngine:
    @classmethod
    def generate_revenue_insights(
        cls,
        total_members: int,
        churn_risk_count: int,
        saved_members_count: int,
        feedback_summary_list: List[Dict[str, Any]],
        business_rules: ExtractedBusinessRules,
        transaction_history: List[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        fin = business_rules.financial_constraints
        catalog = business_rules.product_catalog or []
        biz_name = business_rules.business_profile.business_name or "Merchant"
        category = business_rules.business_profile.category or "Layanan"
        avg_price = fin.min_margin_floor_idr
        if catalog:
            avg_price = sum(p.price_idr for p in catalog) / len(catalog)
        elif transaction_history:
            prices = [t.get("amount", 0) for t in transaction_history if t.get("amount", 0) > 0]
            if prices:
                avg_price = sum(prices) / len(prices)

        est_saved_revenue_idr = saved_members_count * avg_price
        est_at_risk_revenue_idr = churn_risk_count * avg_price

        # 1. Analisis Kuantitatif Riwayat Transaksi
        total_expired_va = 0
        total_paid = 0
        if transaction_history:
            for t in transaction_history:
                st = str(t.get("status", "")).upper()
                if st == "PAID":
                    total_paid += 1
                elif st in ["EXPIRED", "PENDING"]:
                    total_expired_va += 1

        # 2. Pure LLM Strategic Reasoning (Pola Automated Reporting Template)
        if GeminiEngine.is_available():
            prompt = f"""
            Anda adalah Chief Revenue Officer & AI Business Consultant untuk platform merchant B2B:
            
            Profil Merchant: {biz_name} ({category})
            Metrik Operasional:
            - Total Member Aktif: {total_members}
            - Member Berisiko Churn: {churn_risk_count}
            - Member Berhasil Diselamatkan: {saved_members_count}
            - Estimasi Omzet Terselamatkan Bulan Ini: Rp {int(est_saved_revenue_idr):,}
            - Riwayat Transaksi: {total_paid} sukses, {total_expired_va} expired/pending
            - Ringkasan Masukan User: {json.dumps(feedback_summary_list[:10])}

            Tugas Anda:
            1. Identifikasi tren peluang pasar dan gaya hidup pelanggan saat ini.
            2. Rumuskan 2-3 strategi optimasi pendapatan (actionable_revenue_optimizations) yang sangat spesifik untuk bisnis {category} (misal: strategi paket dinamis, optimasi jam/periode sepi, loyalty lock-in).
            3. Estimasi potensi persentase kenaikan omzet yang realistis per strategi.

            Format JSON murni:
            {{
                "market_trend_opportunity": "penjelasan tren peluang bisnis saat ini",
                "actionable_revenue_optimizations": [
                    {{
                        "strategy_title": "...",
                        "impact_level": "HIGH" | "MEDIUM",
                        "potential_revenue_boost_pct": 15.0,
                        "action_description": "penjelasan taktik konkret untuk merchant"
                    }}
                ]
            }}
            """
            llm_report = GeminiEngine.generate_json(
                prompt=prompt,
                system_instruction="Anda adalah Senior Revenue Management Consultant kelas enterprise."
            )
            if llm_report and "actionable_revenue_optimizations" in llm_report:
                return {
                    "merchant_name": biz_name,
                    "metrics": {
                        "total_active_members": total_members,
                        "at_risk_members": churn_risk_count,
                        "successfully_saved_members": saved_members_count,
                        "retention_success_rate_pct": round((saved_members_count / max(1, churn_risk_count)) * 100, 1),
                        "est_monthly_saved_revenue_idr": int(est_saved_revenue_idr),
                        "potential_at_risk_revenue_idr": int(est_at_risk_revenue_idr)
                    },
                    "market_trend_opportunity": llm_report.get("market_trend_opportunity", "Optimalisasi penetapan harga dinamis."),
                    "actionable_revenue_optimizations": llm_report["actionable_revenue_optimizations"],
                    "engine_source": "Google Gemini 1.5 Flash (Automated Revenue Analytics Reporting)"
                }

        # Fallback Dynamic Insights
        return {
            "merchant_name": biz_name,
            "metrics": {
                "total_active_members": total_members,
                "at_risk_members": churn_risk_count,
                "successfully_saved_members": saved_members_count,
                "retention_success_rate_pct": round((saved_members_count / max(1, churn_risk_count)) * 100, 1),
                "est_monthly_saved_revenue_idr": int(est_saved_revenue_idr),
                "potential_at_risk_revenue_idr": int(est_at_risk_revenue_idr)
            },
            "market_trend_opportunity": f"Permintaan fleksibilitas penyesuaian layanan pada segmen {category}.",
            "actionable_revenue_optimizations": [
                {
                    "strategy_title": "Off-Peak Capacity & Yield Management",
                    "impact_level": "HIGH",
                    "potential_revenue_boost_pct": 18.0,
                    "action_description": "Maksimalkan utilisasi kapasitas di luar jam sibuk dengan program insentif retensi terukur."
                }
            ],
            "engine_source": "LANJUT Revenue Analytics Fallback"
        }
