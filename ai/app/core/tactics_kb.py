"""
Knowledge Base Taktik Retensi untuk LANJUT Engine
Diadaptasi dari RETENTION_TACTICS_KB pada Outlier.AI dan disesuaikan untuk
Konteks Fintech / Subscription Recovery / Gym Membership B2B.
"""

RETENTION_TACTICS_KB = {
    "PAYMENT_FRICTION": [
        {
            "action": "BNI Auto-Debit Migration + Cashback 5%",
            "benefit": "Mengeliminasi kegagalan tagihan berulang dan friction manual checkout",
            "reference": "BNI Payment Gateway Best Practice 2024",
            "category": "FINTECH_AUTOMATION"
        },
        {
            "action": "Grace Period Extension (7 Hari)",
            "benefit": "Memberikan relaksasi waktu pembayaran sebelum kuota diputus",
            "reference": "Subscription Billing Recovery Playbook",
            "category": "BILLING_POLICY"
        }
    ],
    "SCHEDULE_CONFLICT": [
        {
            "action": "Switch to Off-Peak / Evening Sessions",
            "benefit": "Mengalihkan member dari jam sibuk (pagi) ke sesi malam tanpa kehilangan keanggotaan",
            "reference": "Capacity-Aware Smart Scheduling",
            "category": "RESOURCE_OPTIMIZATION"
        },
        {
            "action": "Weekend Class Access Unlock",
            "benefit": "Memberi opsi latihan fleksibel bagi pekerja kantoran (WFO)",
            "reference": "Member Utilization Retention Matrix",
            "category": "SCHEDULE_PIVOT"
        }
    ],
    "PRICE_SENSITIVITY": [
        {
            "action": "Downgrade with Margin-Protected Discount",
            "benefit": "Menyesuaikan kapasitas kuota sesi yang realistis tanpa melanggar batas margin merchant",
            "reference": "Dynamic Tier Downsizing Strategy",
            "category": "MARGIN_PROTECTION"
        },
        {
            "action": "Freeze Membership 30 Hari (Pause)",
            "benefit": "Mencegah churn permanen saat member mengalami kendala anggaran temporer",
            "reference": "SaaS & Gym Membership Freeze Protocol",
            "category": "RETENTION_FREEZE"
        }
    ],
    "SILENT_CHURN": [
        {
            "action": "Proactive Personal Trainer Consultation",
            "benefit": "Membangkitkan kembali motivasi latihan member yang inaktif > 21 hari",
            "reference": "High-Touch Engagement Protocol",
            "category": "ENGAGEMENT"
        },
        {
            "action": "Class Buddy Pass (Ajak Teman Gratis)",
            "benefit": "Meningkatkan stickiness melalui aspek sosial komunitas",
            "reference": "Community-Driven Habit Rebuild",
            "category": "SOCIAL_STICKINESS"
        }
    ]
}
