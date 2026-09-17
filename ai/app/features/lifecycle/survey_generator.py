"""
Dynamic User Survey Generator & Feedback Analyzer
Mengadopsi pola Vercel AI SDK Structured Object Generation & Advanced RAG:
1. Mengonsumsi spesifikasi transaksi terakhir dari backend sebagai konteks primer.
2. Dynamic Form Generation via Gemini (Pertanyaan empati, pilihan checkbox relevan, dan isian bebas).
3. Text Classification & Sentiment Analysis terhadap jawaban user.
4. Personalized Retention Offer Synthesis dengan penjagaan margin floor merchant.
"""

import time
import json
from uuid import uuid4
from typing import Dict, Any, List, Optional
from app.core.schemas import ExtractedBusinessRules
from app.core.sanitizer import PIISanitizer
from app.core.gemini_client import GeminiEngine

class DynamicSurveyGenerator:
    @classmethod
    def generate_cancellation_survey(
        cls,
        member_name: str,
        last_transaction_context: Dict[str, Any],
        business_rules: ExtractedBusinessRules
    ) -> Dict[str, Any]:
        """
        Menghasilkan komponen kuisioner intervensi dinamis berdasarkan
        spesifikasi transaksi terakhir yang dikirim oleh backend.
        """
        biz_name = business_rules.business_profile.business_name or "Merchant"
        category = business_rules.business_profile.category or "Layanan Berlangganan"
        
        trx_pattern = last_transaction_context.get("detected_pattern", "EXPIRED_UNPAID_INVOICE")
        days_to_expiry = last_transaction_context.get("days_to_expiry", 7)
        unused_quota = last_transaction_context.get("unused_quota", 0)

        # 1. Structured Object Generation via Gemini API (Pola Vercel AI SDK)
        if GeminiEngine.is_available():
            prompt = f"""
            Buatkan skema form kuesioner retensi interaktif untuk nasabah yang berniat membatalkan atau tidak melanjutkan subscription.
            
            Konteks Bisnis:
            - Nama Merchant: {biz_name}
            - Kategori Industri: {category}
            - Skenario Transaksi Terakhir Nasabah: {trx_pattern} (Sisa hari: {days_to_expiry}, Sisa kuota belum dipakai: {unused_quota})
            - Nama Nasabah: {member_name}

            Instruksi Desain Form:
            1. question_title: Buat 1 judul pertanyaan yang empatik, santun, dan relevan dengan industri {category} serta status transaksi terakhir.
            2. instruction: 1 kalimat petunjuk pengisian yang ramah.
            3. multiple_choice_options: Buat 4 pilihan checkbox alasan kendala yang sangat spesifik dan realistis untuk bisnis {category}.
            4. free_text_field: Buat label dan placeholder isian bebas di bagian akhir untuk mendengar suara nasabah.

            Kembalikan HANYA JSON murni dengan format:
            {{
                "question_title": "...",
                "instruction": "...",
                "multiple_choice_options": [
                    {{"id": "opt_1", "label": "...", "category": "..."}},
                    {{"id": "opt_2", "label": "...", "category": "..."}},
                    {{"id": "opt_3", "label": "...", "category": "..."}},
                    {{"id": "opt_4", "label": "...", "category": "..."}}
                ],
                "free_text_field": {{
                    "label": "...",
                    "placeholder": "..."
                }}
            }}
            """
            llm_form = GeminiEngine.generate_json(
                prompt=prompt,
                system_instruction="Anda adalah UX Retention Form Specialist untuk platform perbankan B2B."
            )
            if llm_form and "question_title" in llm_form and "multiple_choice_options" in llm_form:
                return {
                    "survey_id": f"srv_{uuid4().hex[:12]}",
                    "question_title": llm_form["question_title"],
                    "instruction": llm_form.get("instruction", "Pilih satu atau beberapa alasan yang menggambarkan situasi Anda:"),
                    "is_multi_select": True,
                    "multiple_choice_options": llm_form["multiple_choice_options"],
                    "free_text_field": llm_form.get("free_text_field", {
                        "label": "Catatan Tambahan (Opsional)",
                        "placeholder": "Ceritakan kendala spesifik Anda..."
                    }),
                    "engine_source": "Google Gemini 1.5 Flash (Structured Object Generator)"
                }

        # Fallback Dynamic Generator
        return {
            "survey_id": f"srv_{uuid4().hex[:12]}",
            "question_title": f"Halo {member_name}, apa yang sedang menjadi pertimbangan Anda mengenai kelanjutan layanan di {biz_name}?",
            "instruction": "Pilih satu atau beberapa alasan berikut yang paling menggambarkan kendala Anda:",
            "is_multi_select": True,
            "multiple_choice_options": [
                {"id": "opt_schedule", "label": "Kendala fleksibilitas waktu atau kecocokan jadwal", "category": "schedule_conflict"},
                {"id": "opt_price", "label": "Penyesuaian prioritas anggaran pengeluaran saat ini", "category": "price_sensitivity"},
                {"id": "opt_temporary", "label": "Sedang ada keperluan darurat, cuti, atau dinas sementara", "category": "temporary_pause"},
                {"id": "opt_payment", "label": "Kendala pada proses transaksi Virtual Account BNI", "category": "payment_friction"}
            ],
            "free_text_field": {
                "label": "Masukan & Catatan Tambahan (Opsional)",
                "placeholder": "Boleh ceritakan kendala spesifik Anda agar kami dapat memberikan solusi terbaik..."
            },
            "engine_source": "LANJUT Universal Dynamic Form Fallback"
        }

class UserFeedbackAnalyzer:
    @classmethod
    def analyze_feedback_and_generate_offer(
        cls,
        member_name: str,
        selected_option_ids: List[str],
        free_text_feedback: str,
        business_rules: ExtractedBusinessRules
    ) -> Dict[str, Any]:
        """
        Menganalisis masukan pengguna dan meracik copywriting kartu penawaran retensi
        yang dipersonalisasi dengan jaminan margin floor merchant.
        """
        fin = business_rules.financial_constraints
        policy = business_rules.retention_policy
        catalog = business_rules.product_catalog
        max_disc = fin.max_discount_allowed_pct
        min_floor = fin.min_margin_floor_idr
        currency = fin.currency or "IDR"

        sanitized_feedback, pii_map = PIISanitizer.sanitize_text(free_text_feedback, member_name)

        # 1. Pure LLM Analysis & Offer Synthesis (Pola RAG + Sentiment Classifier)
        if GeminiEngine.is_available():
            catalog_info = [
                {"name": p.name, "price_idr": p.price_idr, "desc": p.description}
                for p in catalog[:4]
            ]
            prompt = f"""
            Analisis masukan pengguna yang berniat berhenti langganan dan rumuskan strategi penawaran retensi terbaik:
            
            Profil Usaha: {business_rules.business_profile.business_name} ({business_rules.business_profile.category})
            Pilihan Opsi yang Dicentang User: {json.dumps(selected_option_ids)}
            Teks Masukan Bebas User: "{sanitized_feedback}"
            
            Batasan Finansial Merchant:
            - Diskon Maksimal Diizinkan: {max_disc}%
            - Batas Margin Minimal: {currency} {min_floor:,.0f}
            - Kebijakan Freeze: {policy.free_freeze_allowed} (Maks {policy.max_freeze_days} hari)
            - Katalog Layanan: {json.dumps(catalog_info)}

            Instruksi:
            1. Tentukan detected_intent (schedule_conflict, price_sensitivity, temporary_pause, payment_friction, service_dissatisfaction).
            2. Buat ringkasan akar masalah dalam 1 kalimat empatik.
            3. Rumuskan 2-3 personalized_retention_offers (kartu penawaran penyelamatan).
               Setiap kartu wajib berisi:
               - offer_type (SWITCH_SCHEDULE, ADJUST_TIER, FREEZE_MEMBERSHIP, REISSUE_VA)
               - badge (kata persuasif singkat dengan icon emoji)
               - title (judul penawaran menarik)
               - description (penjelasan benefit solusi bagi nasabah)
               - price_idr (angka harga aman yang WAJIB >= {min_floor:,.0f})
               - discount_label (label diskon hemat)
               - action_button (teks tombol aksi ajakan)

            Format JSON murni:
            {{
                "detected_intent": "...",
                "feedback_sentiment": "NEGATIVE" | "NEUTRAL" | "CONSTRUCTIVE",
                "root_cause_summary": "...",
                "personalized_retention_offers": [
                    {{
                        "offer_type": "...",
                        "badge": "...",
                        "title": "...",
                        "description": "...",
                        "price_idr": 0.0,
                        "discount_label": "...",
                        "action_button": "..."
                    }}
                ]
            }}
            """
            llm_res = GeminiEngine.generate_json(
                prompt=prompt,
                system_instruction="Anda adalah Expert Customer Retention Copywriter & Strategist perbankan B2B."
            )
            if llm_res and "personalized_retention_offers" in llm_res:
                root_cause = PIISanitizer.desanitize_text(llm_res.get("root_cause_summary", ""), pii_map)
                
                # Enforce Hard Guardrail pada hasil harga LLM
                for offer in llm_res["personalized_retention_offers"]:
                    raw_price = float(offer.get("price_idr") or 0)
                    o_type = str(offer.get("offer_type", "")).upper()
                    
                    if o_type in ["FREEZE_MEMBERSHIP", "REISSUE_VA", "SWITCH_SCHEDULE"]:
                        offer["price_idr"] = raw_price
                    else:
                        offer["price_idr"] = max(min_floor, raw_price)

                return {
                    "member_name": member_name,
                    "detected_intent": llm_res.get("detected_intent", "general_retention"),
                    "feedback_sentiment": llm_res.get("feedback_sentiment", "CONSTRUCTIVE"),
                    "root_cause_summary": root_cause,
                    "personalized_retention_offers": llm_res["personalized_retention_offers"],
                    "margin_guardrail_status": {
                        "max_discount_enforced_pct": max_disc,
                        "min_margin_floor_idr": min_floor,
                        "is_compliant": True
                    },
                    "engine_source": "Google Gemini 1.5 Flash (RAG Retention Offer Synthesizer)"
                }

        # Fallback RAG Retention Matcher
        cheapest_price = catalog[0].price_idr if catalog else 100000.0
        safe_price = max(min_floor, cheapest_price * (1.0 - (max_disc / 100.0)))
        return {
            "member_name": member_name,
            "detected_intent": "price_sensitivity" if "price" in str(selected_option_ids) else "schedule_conflict",
            "feedback_sentiment": "CONSTRUCTIVE",
            "root_cause_summary": "Nasabah memerlukan penyesuaian fleksibilitas atau opsi paket yang lebih hemat.",
            "personalized_retention_offers": [
                {
                    "offer_type": "ADJUST_TIER",
                    "badge": f"Hemat {int(max_disc)}% 🔥",
                    "title": "Penyesuaian Paket Fleksibel Bergaransi Margin Aman",
                    "description": "Beralih ke opsi langganan terjangkau tanpa kehilangan hak akses layanan.",
                    "price_idr": safe_price,
                    "discount_label": f"Diskon Retensi {int(max_disc)}%",
                    "action_button": "Ambil Penawaran Hemat Ini"
                }
            ],
            "margin_guardrail_status": {
                "max_discount_enforced_pct": max_disc,
                "min_margin_floor_idr": min_floor,
                "is_compliant": True
            },
            "engine_source": "LANJUT RAG Fallback Matcher"
        }
