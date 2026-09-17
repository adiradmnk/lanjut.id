"""
Dual-Engine Risk Scoring & Feature Attribution (SHAP-Equivalent)
Diadaptasi dari Random Forest + K-Means + SHAP di Outlier.AI.
Dirancang khusus untuk Payment & Behavioral Data (BNI VA, Attendance, Tenure).
"""

from typing import Dict, Any, List, Tuple


class PaymentRiskScoringEngine:
    """
    Mengimplementasikan:
    1. Cluster/Archetype Identification (K-Means Equivalent)
    2. Churn Prediction & Probability (Random Forest Equivalent)
    3. Feature Influence Matrix (SHAP Top Contributors Equivalent)
    """

    CLUSTER_ARCHETYPES = {
        0: {
            "name": "The Loyal Spenders",
            "code": "LOYAL_SPENDER",
            "desc": "Member jangka panjang, tagihan lancar via BNI, utilisasi kuota tinggi, jarang membatalkan."
        },
        1: {
            "name": "The At-Risk Group",
            "code": "AT_RISK_GROUP",
            "desc": "Member baru dengan paket bulanan, utilisasi rendah, dan terdapat riwayat tagihan pending/gagal."
        },
        2: {
            "name": "The Inactive Ghost",
            "code": "INACTIVE_GHOST",
            "desc": "Member yang tidak pernah check-in > 21 hari (Silent Churn), berisiko tidak memperpanjang siklus berikutnya."
        },
        3: {
            "name": "The Price-Sensitive Optimizer",
            "code": "PRICE_SENSITIVE",
            "desc": "Member yang sangat sensitif terhadap kenaikan harga atau mencari diskon sebelum memperpanjang."
        }
    }

    @classmethod
    def evaluate(cls, profile: Dict[str, Any]) -> Dict[str, Any]:
        """
        Mengevaluasi risiko pelanggan secara komprehensif.
        
        Parameter input:
        - days_since_last_visit: int
        - missed_payments_count: int (pembayaran gagal / expired)
        - quota_utilization_pct: float (0.0 - 1.0)
        - tenure_months: int
        - contract_type: str ("MONTHLY", "ANNUAL")
        - monthly_fee_idr: int
        """
        days_inactive = int(profile.get("days_since_last_visit", 0))
        missed_payments = int(profile.get("missed_payments_count", 0))
        utilization = float(profile.get("quota_utilization_pct", 1.0))
        tenure = int(profile.get("tenure_months", 1))
        contract = profile.get("contract_type", "MONTHLY").upper()

        # ---------------------------------------------------------
        # 1. Feature Attribution Matrix (SHAP Values Calculation)
        # ---------------------------------------------------------
        base_probability = 0.12  # Baseline churn prior
        feature_contributions = []

        # Feature A: Inactivity (Days since last visit)
        if days_inactive > 21:
            impact = min(0.38, (days_inactive - 21) * 0.02)
            base_probability += impact
            feature_contributions.append({
                "feature": "days_since_last_visit",
                "value": f"{days_inactive} hari",
                "attribution_score": round(impact, 3),
                "direction": "RISK_INCREASING",
                "label": "Inaktivitas Sesi (> 21 hari)"
            })
        elif days_inactive < 7:
            base_probability -= 0.05
            feature_contributions.append({
                "feature": "days_since_last_visit",
                "value": f"{days_inactive} hari",
                "attribution_score": -0.05,
                "direction": "RISK_REDUCING",
                "label": "Kehadiran Aktif (< 7 hari)"
            })

        # Feature B: Payment Friction (Missed / Failed Payments)
        if missed_payments > 0:
            impact = min(0.35, missed_payments * 0.18)
            base_probability += impact
            feature_contributions.append({
                "feature": "missed_payments_count",
                "value": f"{missed_payments} kali",
                "attribution_score": round(impact, 3),
                "direction": "RISK_INCREASING",
                "label": f"Tagihan BNI VA Gagal / Pending ({missed_payments}x)"
            })

        # Feature C: Quota Utilization
        if utilization < 0.35:
            impact = round(0.25 * (1.0 - utilization), 3)
            base_probability += impact
            feature_contributions.append({
                "feature": "quota_utilization_pct",
                "value": f"{int(utilization * 100)}%",
                "attribution_score": impact,
                "direction": "RISK_INCREASING",
                "label": "Utilisasi Kuota Rendah (< 35%)"
            })
        elif utilization >= 0.80:
            base_probability -= 0.08
            feature_contributions.append({
                "feature": "quota_utilization_pct",
                "value": f"{int(utilization * 100)}%",
                "attribution_score": -0.08,
                "direction": "RISK_REDUCING",
                "label": "Utilisasi Kuota Optimal"
            })

        # Feature D: Contract & Tenure
        if contract == "MONTHLY":
            base_probability += 0.08
            feature_contributions.append({
                "feature": "contract_type",
                "value": "Monthly",
                "attribution_score": 0.08,
                "direction": "RISK_INCREASING",
                "label": "Kontrak Fleksibel Bulanan (No Lock-in)"
            })
        else:
            base_probability -= 0.10
            feature_contributions.append({
                "feature": "contract_type",
                "value": "Annual",
                "attribution_score": -0.10,
                "direction": "RISK_REDUCING",
                "label": "Komitmen Tahunan"
            })

        if tenure >= 12:
            base_probability -= 0.12
            feature_contributions.append({
                "feature": "tenure_months",
                "value": f"{tenure} bulan",
                "attribution_score": -0.12,
                "direction": "RISK_REDUCING",
                "label": "Tenure Member Loyal (> 12 bulan)"
            })

        # Normalisasi Churn Probability (0.05 s/d 0.98)
        final_probability = max(0.05, min(0.98, round(base_probability, 3)))
        is_churn = 1 if final_probability >= 0.50 else 0

        # ---------------------------------------------------------
        # 2. Cluster / Archetype Identification (K-Means Logic)
        # ---------------------------------------------------------
        if missed_payments > 0:
            cluster_id = 1
        elif days_inactive > 21:
            cluster_id = 2
        elif utilization < 0.35 and contract == "MONTHLY":
            cluster_id = 3
        else:
            cluster_id = 0

        cluster_info = cls.CLUSTER_ARCHETYPES[cluster_id]

        # Urutkan kontributor berdasarkan dampak absolut terbesar (SHAP Top Factors)
        feature_contributions.sort(key=lambda x: abs(x["attribution_score"]), reverse=True)
        top_risk_factors = [
            f["label"] for f in feature_contributions if f["direction"] == "RISK_INCREASING"
        ][:3]

        return {
            "prediction": is_churn,
            "probability": final_probability,
            "risk_level": "CRITICAL" if final_probability >= 0.70 else "HIGH" if final_probability >= 0.45 else "MODERATE" if final_probability >= 0.25 else "LOW",
            "cluster_id": cluster_id,
            "cluster_name": cluster_info["name"],
            "cluster_desc": cluster_info["desc"],
            "top_contributing_factors": top_risk_factors,
            "feature_attribution_matrix": feature_contributions
        }
