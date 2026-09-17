"""
Transaction Churn & Non-Renewal Detection Engine (Domain 1)
Mengadopsi pola Temporal State Machine & Feast Feature Store:
- Membedakan SILENT_CANCELLATION, PASSIVE_NON_RENEWAL, dan PAYMENT_FRICTION
- Menghitung Quota Burn Rate Ratio & Velocity Inaction
"""

import time
from typing import Dict, Any, List, Optional

class TransactionChurnDetector:
    @classmethod
    def analyze_transactions(
        cls,
        transactions: List[Dict[str, Any]],
        days_to_expiry: int = 7,
        total_quota: Optional[int] = None,
        used_quota: Optional[int] = None,
        active_until: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Mendeteksi sinyal churn dan non-renewal berbasis state transaksi & utilisasi kuota:
        1. SILENT_CANCELLATION: Ada tagihan VA BNI yang dibiarkan EXPIRED / PENDING setelah riwayat berbayar.
        2. PASSIVE_NON_RENEWAL: Mendekati kedaluwarsa (<= 7 hari) dan sisa kuota masih banyak (Burn Rate Inaction).
        3. PAYMENT_FRICTION: Kegagalan transaksi berulang (FAILED >= 2).
        4. FIRST_CYCLE_INACTIVE: Member baru yang belum pernah menyelesaikan transaksi awal.
        5. HEALTHY_RENEWED: Transaksi berjalan normal dan lunas.
        """
        if not transactions:
            return {
                "churn_risk_level": "HIGH",
                "churn_probability": 0.85,
                "detected_pattern": "ZERO_TRANSACTION_HISTORY",
                "is_at_risk": True,
                "root_cause": "Tidak ada riwayat transaksi aktif yang tercatat pada payment gateway.",
                "intervention_trigger": "FIRST_CYCLE_ACTIVATION_ASSISTANCE",
                "metrics": {
                    "burn_rate_ratio": 0.0,
                    "unused_quota": 0,
                    "days_to_expiry": days_to_expiry
                }
            }

        paid_count = 0
        pending_count = 0
        expired_count = 0
        failed_count = 0

        for trx in transactions:
            status = str(trx.get("status", "")).upper()
            if status == "PAID":
                paid_count += 1
            elif status == "EXPIRED":
                expired_count += 1
            elif status == "PENDING":
                pending_count += 1
            elif status in ["FAILED", "CANCELLED"]:
                failed_count += 1

        # Hitung Quota Burn Rate Ratio jika data kuota disediakan
        unused_quota = 0
        burn_rate_ratio = 1.0
        if total_quota is not None and used_quota is not None and total_quota > 0:
            unused_quota = max(0, total_quota - used_quota)
            # Rasio kuota sisa terhadap hari aktif tersisa
            # Jika kuota sisa 6 sesi namun sisa hari cuma 3 hari -> burn_rate = 6/3 = 2.0 (anomali tinggi)
            burn_rate_ratio = round(unused_quota / max(1, days_to_expiry), 2)

        # STATE MACHINE DECISION TREE (Temporal / Event-Driven Pattern)
        base_prob = 0.05
        penalty = 0.0
        
        # Skenario 1: SILENT CANCELLATION (Tagihan VA dibiarkan kedaluwarsa oleh nasabah)
        if (expired_count > 0 or pending_count > 0) and paid_count > 0:
            penalty += 0.40 + (0.10 * expired_count)
            pattern = "SILENT_CANCELLATION"
            cause = (
                f"Nasabah sengaja membiarkan {expired_count + pending_count} tagihan Virtual Account BNI "
                f"kedaluwarsa (24h timeout) tanpa penyelesaian (indikasi pembatalan pasif)."
            )
            trigger = "PROACTIVE_DISCOUNT_OR_FREEZE_OFFER"

        # Skenario 2: PASSIVE NON-RENEWAL / BURN RATE FRICTION (Sisa kuota banyak, hari mau habis)
        elif days_to_expiry <= 7 and ((total_quota and unused_quota >= (total_quota * 0.5)) or burn_rate_ratio >= 0.8):
            penalty += 0.35 + (0.05 * min(5, unused_quota)) + (0.05 * (7 - days_to_expiry))
            pattern = "PASSIVE_NON_RENEWAL"
            cause = (
                f"Masa aktif tersisa {days_to_expiry} hari dengan {unused_quota} sesi kuota belum terpakai "
                f"(Burn ratio: {burn_rate_ratio}). Nasabah enggan memperpanjang karena merasa rugi kuota hangus."
            )
            trigger = "ROLLOVER_QUOTA_OR_FLEX_PLAN"

        # Skenario 3: PAYMENT FRICTION (Fasilitas atau limit bank bermasalah)
        elif failed_count >= 2:
            penalty += 0.30 + (0.08 * failed_count)
            pattern = "PAYMENT_FRICTION"
            cause = f"Terdeteksi {failed_count} kali transaksi ditolak/gagal oleh payment gateway BNI."
            trigger = "REISSUE_BNI_VA_OR_DIRECT_DEBIT"

        # Skenario 4: Standard Expiry Nudge
        elif days_to_expiry <= 7:
            penalty += 0.20 + (0.03 * (7 - days_to_expiry))
            pattern = "CYCLE_NON_RENEWAL"
            cause = f"Masa aktif paket tersisa {days_to_expiry} hari dan belum ada transaksi pembaruan."
            trigger = "RENEWAL_REMINDER"

        # Skenario 5: Sehat & Aktif
        else:
            penalty -= (0.02 * paid_count)
            pattern = "HEALTHY_ACTIVE"
            cause = f"Transaksi nasabah berjalan lancar ({paid_count} kali pembayaran sukses via BNI VA)."
            trigger = "NONE"

        prob = min(0.98, max(0.01, base_prob + penalty))
        prob = round(prob, 2)

        is_at_risk = prob >= 0.50
        risk_level = "HIGH" if prob >= 0.75 else ("MEDIUM" if prob >= 0.45 else "LOW")

        return {
            "churn_risk_level": risk_level,
            "churn_probability": prob,
            "detected_pattern": pattern,
            "is_at_risk": is_at_risk,
            "root_cause": cause,
            "intervention_trigger": trigger,
            "metrics": {
                "burn_rate_ratio": burn_rate_ratio,
                "unused_quota": unused_quota,
                "days_to_expiry": days_to_expiry
            },
            "transaction_stats": {
                "total_transactions": len(transactions),
                "paid_count": paid_count,
                "pending_count": pending_count,
                "expired_count": expired_count,
                "failed_count": failed_count
            }
        }
