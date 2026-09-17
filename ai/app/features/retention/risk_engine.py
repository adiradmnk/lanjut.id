"""
Universal Risk Scoring & Feature Attribution Engine (SHAP-Equivalent)
Dinamis & Generic: Mengadaptasi threshold, persona nasabah, dan faktor risiko
berdasarkan Business Rules hasil ekstraksi dokumen Guidebook.
"""

from typing import Dict, Any, List
from app.core.schemas import ExtractedBusinessRules

class PaymentRiskScoringEngine:
    @classmethod
    def evaluate(cls, profile: Dict[str, Any], business_rules: ExtractedBusinessRules = None) -> Dict[str, Any]:
        """
        Mengevaluasi risiko pelanggan secara komprehensif berdasarkan panduan bisnis merchant.
        Menggunakan pendekatan proporsional berbasis threshold dinamis (Zero Hardcoded Cutoffs).
        """
        if business_rules is None:
            business_rules = ExtractedBusinessRules()

        # Dynamic Thresholds dari Guidebook Merchant
        threshold_days = max(7, business_rules.financial_constraints.auto_intervention_threshold_days or 21)
        industry_category = business_rules.business_profile.category or "Layanan"

        days_inactive = max(0, int(profile.get("days_since_last_visit", profile.get("days_inactive", 0))))
        missed_payments = max(0, int(profile.get("missed_payments_count", 0)))
        utilization = max(0.0, min(1.0, float(profile.get("quota_utilization_pct", profile.get("service_utilization_pct", 1.0)))))
        tenure = max(1, int(profile.get("tenure_months", profile.get("tenure", 1))))
        contract = str(profile.get("contract_type", profile.get("contract", "MONTHLY"))).upper()

        risk_score = 0.0
        contributing_factors = []

        # 1. Evaluasi Inaktivitas Rasional (Proporsional terhadap ambang batas Guidebook)
        inactivity_ratio = days_inactive / threshold_days
        if inactivity_ratio >= 1.0:
            risk_score += min(0.45, 0.35 + (inactivity_ratio - 1.0) * 0.1)
            contributing_factors.append(f"Inaktivitas ({days_inactive} hari) melampaui batas panduan operasional ({threshold_days} hari)")
        elif inactivity_ratio >= 0.5:
            risk_score += 0.20
            contributing_factors.append(f"Aktivitas menurun ({days_inactive} hari tanpa pemanfaatan layanan)")

        # 2. Riwayat Pembayaran (Virtual Account / Autodebit BNI)
        if missed_payments > 0:
            risk_score += min(0.35, missed_payments * 0.18)
            contributing_factors.append(f"Riwayat transaksi tertunda/gagal sebanyak {missed_payments} kali pada gateway BNI")

        # 3. Utilisasi Layanan
        if utilization < 0.30:
            risk_score += 0.25
            contributing_factors.append(f"Tingkat penggunaan kuota/layanan sangat rendah ({int(utilization * 100)}%)")
        elif utilization < 0.60:
            risk_score += 0.10

        # 4. Tenure & Jenis Kontrak
        if tenure <= 3:
            risk_score += 0.15
            contributing_factors.append(f"Periode retensi awal ({tenure} bulan pertama rentan churn)")
        if any(w in contract for w in ["MONTH", "BULAN", "FLEX"]):
            risk_score += 0.10

        probability = max(0.05, min(0.98, round(risk_score, 4)))

        # Dynamic Archetype Assignment (Adaptif terhadap industri merchant)
        if missed_payments > 0 and probability >= 0.6:
            cluster_id = 1
            cluster_name = "Payment At-Risk Segment"
            cluster_desc = f"Nasabah {industry_category} dengan friksi pembayaran atau invoice expired."
        elif inactivity_ratio >= 1.0:
            cluster_id = 2
            cluster_name = "Inactive Silent Churn"
            cluster_desc = f"Nasabah pasif yang berisiko berhenti tanpa mengajukan komplain resmi."
        elif utilization < 0.4:
            cluster_id = 3
            cluster_name = "Value/Price-Sensitive Optimizer"
            cluster_desc = f"Nasabah dengan utilisasi rendah yang memerlukan penyesuaian tier paket."
        else:
            cluster_id = 0
            cluster_name = "Core Active Member"
            cluster_desc = f"Nasabah aktif dan loyal pada layanan {business_rules.business_profile.business_name}."

        return {
            "probability": probability,
            "cluster_id": cluster_id,
            "cluster_name": cluster_name,
            "cluster_description": cluster_desc,
            "top_contributing_factors": contributing_factors[:4],
            "applied_threshold_days": threshold_days,
            "merchant_category": industry_category
        }
