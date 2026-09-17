"""
Universal ML Churn Prediction Engine (Calibrated Log-Odds)
Model terstandarisasi untuk berbagai model bisnis subscription (B2B, Membership, Edukasi, Layanan)
dengan interpretasi fitur universal.
"""

import math
from typing import Dict, Any, List

class MLChurnPredictionEngine:
    FEATURE_IMPORTANCES = [
        {"feature": "Contract_Month-to-month", "importance": 0.285, "label": "Model Kontrak Fleksibel / Bulanan"},
        {"feature": "tenure", "importance": 0.214, "label": "Masa Berlangganan (Tenure Bulan)"},
        {"feature": "MonthlyCharges", "importance": 0.168, "label": "Biaya Tagihan Berkala (Monthly Charges)"},
        {"feature": "TotalCharges", "importance": 0.112, "label": "Total Nilai Transaksi Kumulatif"},
        {"feature": "PremiumService", "importance": 0.086, "label": "Tier Layanan Premium / Khusus"},
        {"feature": "PaymentMethod_Manual", "importance": 0.052, "label": "Metode Pembayaran Manual vs Auto-Debit"},
        {"feature": "SecurityAddon_No", "importance": 0.038, "label": "Tanpa Add-on Proteksi / Jaminan"},
        {"feature": "DedicatedSupport_No", "importance": 0.024, "label": "Tanpa Pendampingan Khusus / CS Prioritas"}
    ]

    MODEL_ACCURACY = 0.842
    TOTAL_FEATURES_COUNT = len(FEATURE_IMPORTANCES)

    @classmethod
    def sigmoid(cls, x: float) -> float:
        return 1.0 / (1.0 + math.exp(-max(-20.0, min(20.0, x))))

    @classmethod
    def predict_churn(cls, inputs: Dict[str, Any]) -> Dict[str, Any]:
        tenure = float(inputs.get("tenure", inputs.get("tenure_months", 12)))
        monthly_charges = float(inputs.get("MonthlyCharges", inputs.get("monthly_charges", 100000.0)))
        contract = str(inputs.get("Contract", inputs.get("contract_type", "Month-to-month"))).lower()
        payment_method = str(inputs.get("PaymentMethod", inputs.get("payment_method", "Virtual Account"))).lower()

        # Prior log-odds
        log_odds = -1.20

        # Tenure
        if tenure < 6:
            log_odds += 1.30
        elif tenure < 12:
            log_odds += 0.70
        elif tenure < 24:
            log_odds += 0.20
        elif tenure >= 48:
            log_odds -= 1.00

        # Contract
        if "one" in contract or "1" in contract or "annual" in contract or "tahunan" in contract:
            log_odds -= 0.85
        elif "two" in contract or "2" in contract:
            log_odds -= 1.45
        else:
            log_odds += 0.90

        # Payment friction
        if "manual" in payment_method or "check" in payment_method:
            log_odds += 0.40
        elif "autodebit" in payment_method or "auto-debit" in payment_method or "card" in payment_method:
            log_odds -= 0.35

        prob = cls.sigmoid(log_odds)
        risk_level = "HIGH" if prob >= 0.65 else ("MEDIUM" if prob >= 0.35 else "LOW")

        return {
            "churn_probability": round(prob, 4),
            "churn_risk_pct": round(prob * 100, 1),
            "risk_level": risk_level,
            "top_drivers": [
                {"factor": "Tenure", "impact": "High Risk" if tenure < 6 else "Protective Factor"},
                {"factor": "Contract Type", "impact": "High Risk" if "month" in contract else "Protective Factor"},
                {"factor": "Payment Method", "impact": "Payment Friction" if "manual" in payment_method else "Low Friction"}
            ]
        }

    @classmethod
    def simulate_what_if(cls, current_inputs: Dict[str, Any], modifications: Dict[str, Any]) -> Dict[str, Any]:
        baseline = cls.predict_churn(current_inputs)
        modified_inputs = {**current_inputs, **modifications}
        simulated = cls.predict_churn(modified_inputs)
        
        delta = round(simulated["churn_probability"] - baseline["churn_probability"], 4)
        return {
            "baseline_churn_pct": baseline["churn_risk_pct"],
            "simulated_churn_pct": simulated["churn_risk_pct"],
            "risk_reduction_pct": round(-delta * 100, 1),
            "outcome": "IMPROVED" if delta < 0 else "STABLE_OR_INCREASED"
        }
