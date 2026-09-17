import os
import re
import json
import time
import shutil
from typing import Dict, Any, List, Optional
from app.core.schemas import ExtractedBusinessRules, BusinessProfile, FinancialConstraints, ProductItem, CancellationTrigger, RetentionPolicy
from app.core.gemini_client import GeminiEngine

class DocumentProcessor:
    """
    Diadaptasi langsung dari arsitektur bestoism/rag-document-analyzer:
    1. Parsing teks dokumen (PDF/DOCX/TXT) dengan pembersihan memori.
    2. Contextual Document Understanding via Gemini.
    3. Structured Extraction ke skema ExtractedBusinessRules.
    """
    def __init__(self):
        self.model_name = "gemini-1.5-flash"

    def extract_structured_rules(self, raw_text: str, filename: str = "guidebook.pdf") -> Dict[str, Any]:
        start_time = time.time()

        # Gunakan Gemini API untuk ekstraksi presisi RAG
        if GeminiEngine.is_available():
            prompt = f"""
            Anda adalah Document Intelligence Analyzer kelas enterprise untuk platform retensi perbankan LANJUT.
            Analisis isi dokumen Guidebook/SOP/PKS berikut (Nama File: {filename}):

            --- ISI DOKUMEN ---
            {raw_text}
            --- AKHIR DOKUMEN ---

            Instruksi Analisis:
            1. business_profile: Ekstrak nama bisnis resmi, kategori/industri, jam operasional, dan ringkasan model bisnis.
            2. financial_constraints: Ekstrak batas diskon maksimal retensi (default 15.0 jika tidak ada), batas bawah margin profit minimal (default 50000.0 IDR jika tidak ada), dan hari inaktivitas (default 21).
            3. product_catalog: Ekstrak semua paket/layanan berbayar, harga normal (IDR), kuota jika ada, dan masa aktif (hari).
            4. cancellation_triggers: Identifikasi pemicu pembatalan yang mungkin terjadi beserta kode aksi penanganan, diskon yang diizinkan, dan deskripsi solusinya.
            5. retention_policy: Ekstrak kebijakan jeda/freeze langganan (apakah boleh, durasi maksimal hari), izin reschedule waktu, dan klausul refund.

            Format Output WAJIB murni JSON valid:
            {{
                "business_profile": {{
                    "business_name": "...",
                    "category": "...",
                    "operating_hours": "...",
                    "summary": "..."
                }},
                "financial_constraints": {{
                    "max_discount_allowed_pct": 15.0,
                    "min_margin_floor_idr": 50000.0,
                    "currency": "IDR",
                    "rationale": "...",
                    "auto_intervention_threshold_days": 21
                }},
                "product_catalog": [
                    {{
                        "name": "...",
                        "price_idr": 100000.0,
                        "quota_sessions": null,
                        "validity_days": 30,
                        "description": "..."
                    }}
                ],
                "cancellation_triggers": [
                    {{
                        "trigger_pattern": "...",
                        "recommended_action": "...",
                        "allowed_discount_pct": 10.0,
                        "description": "..."
                    }}
                ],
                "retention_policy": {{
                    "free_freeze_allowed": true,
                    "max_freeze_days": 30,
                    "allow_reschedule": true,
                    "reschedule_notice_hours": 12,
                    "refund_policy": "..."
                }}
            }}
            """
            llm_result = GeminiEngine.generate_json(
                prompt=prompt,
                system_instruction="Anda adalah AI Document Intelligence Processor untuk B2B Merchant Banking."
            )
            if llm_result:
                try:
                    validated = ExtractedBusinessRules(**llm_result)
                    elapsed = round((time.time() - start_time) * 1000, 2)
                    return {
                        "source": "Google Gemini 1.5 Flash (bestoism RAG-style Document Analyzer)",
                        "processing_time_ms": elapsed,
                        "rules": validated.model_dump()
                    }
                except Exception as e:
                    print(f"[DocumentProcessor] Validation error: {e}")

        # Universal Dynamic Heuristic Fallback
        fallback_rules = self._dynamic_fallback_extract(raw_text, filename)
        elapsed = round((time.time() - start_time) * 1000, 2)
        return {
            "source": "LANJUT Universal Dynamic NLP Fallback Engine",
            "processing_time_ms": elapsed,
            "rules": fallback_rules.model_dump()
        }

    def _dynamic_fallback_extract(self, text: str, filename: str) -> ExtractedBusinessRules:
        business_name = "Mitra Merchant UMKM"
        name_match = re.search(r"(?:nama\s*(?:usaha|merchant|bisnis|perusahaan)|profil\s*usaha)[:\s]+([^\n\r,]+)", text, re.IGNORECASE)
        if name_match:
            business_name = name_match.group(1).strip()
        elif filename:
            clean_fn = re.sub(r"\.[a-zA-Z0-9]+$", "", filename).replace("_", " ").replace("-", " ").title()
            if len(clean_fn) > 2:
                business_name = clean_fn

        category_match = re.search(r"(?:kategori|bidang\s*usaha|jenis\s*layanan|industri)[:\s]+([^\n\r,]+)", text, re.IGNORECASE)
        category = category_match.group(1).strip().title() if category_match else "Layanan Berlangganan & Keanggotaan"

        max_disc = 15.0
        disc_match = re.search(r"(?:diskon|potongan|discount)\s*(?:maks|maksimal|up to|hingga)?\s*[:=]?\s*([0-9]+(?:\.[0-9]+)?)\s*%", text, re.IGNORECASE)
        if disc_match:
            try:
                max_disc = float(disc_match.group(1))
            except ValueError:
                pass

        min_margin = 50000.0
        margin_match = re.search(r"(?:margin|profit|floor|batas bawah)\s*(?:minimal|aman)?\s*[:=]?\s*(?:rp\.?|idr)?\s*([0-9\.,]+)", text, re.IGNORECASE)
        if margin_match:
            try:
                min_margin = float(margin_match.group(1).replace(".", "").replace(",", ""))
            except ValueError:
                pass

        products = []
        price_patterns = [
            r"([A-Za-z0-9\s]{3,35})\s*[:\-]\s*(?:rp\.?|idr)\s*([0-9\.,]+)",
            r"(?:paket|tier|layanan)\s+([A-Za-z0-9\s]{3,30})\s*(?:sebesar)?\s*(?:rp\.?|idr)?\s*([0-9\.,]+)"
        ]
        for pat in price_patterns:
            matches = re.findall(pat, text, re.IGNORECASE)
            for name_cand, price_str in matches[:5]:
                clean_name = name_cand.strip().title()
                if any(clean_name == p.name for p in products):
                    continue
                try:
                    price_val = float(price_str.replace(".", "").replace(",", ""))
                    if price_val >= 10000:
                        products.append(ProductItem(
                            name=clean_name,
                            price_idr=price_val,
                            quota_sessions=None,
                            validity_days=30,
                            description=f"Layanan {clean_name} sesuai panduan operasional"
                        ))
                except ValueError:
                    continue

        if not products:
            products.append(ProductItem(
                name="Paket Layanan Standar",
                price_idr=max(min_margin * 2, 100000.0),
                quota_sessions=None,
                validity_days=30,
                description="Paket layanan berkala standar merchant"
            ))

        lower_doc = text.lower()
        freeze_allowed = any(w in lower_doc for w in ["freeze", "jeda", "cuti", "pause", "tunda"])
        freeze_days_match = re.search(r"(?:freeze|jeda|cuti)\s*(?:maks|maksimal|hingga|selama)?\s*([0-9]+)\s*hari", text, re.IGNORECASE)
        max_freeze_days = int(freeze_days_match.group(1)) if freeze_days_match else (30 if freeze_allowed else 0)
        allow_reschedule = any(w in lower_doc for w in ["reschedule", "ganti waktu", "pindah jadwal", "jadwal fleksibel"])

        triggers = [
            CancellationTrigger(
                trigger_pattern="Kendala anggaran atau efisiensi pengeluaran",
                recommended_action="ADJUST_TIER_WITH_SAFE_MARGIN",
                allowed_discount_pct=min(15.0, max_disc),
                description=f"Tawarkan penyesuaian tier layanan dengan batas diskon retensi maksimal {max_disc}%."
            )
        ]
        if allow_reschedule or "jadwal" in lower_doc or "waktu" in lower_doc:
            triggers.append(CancellationTrigger(
                trigger_pattern="Kendala waktu atau ketidakcocokan jadwal",
                recommended_action="FLEXIBLE_TIME_RESCHEDULE",
                allowed_discount_pct=0.0,
                description="Berikan opsi penyesuaian waktu atau sesi pengganti tanpa biaya pinalti."
            ))
        if freeze_allowed:
            triggers.append(CancellationTrigger(
                trigger_pattern="Kondisi darurat, sakit, atau jeda sementara",
                recommended_action="FREEZE_MEMBERSHIP_PAUSE",
                allowed_discount_pct=0.0,
                description=f"Aktifkan jeda layanan sementara hingga {max_freeze_days} hari."
            ))

        return ExtractedBusinessRules(
            business_profile=BusinessProfile(
                business_name=business_name,
                category=category,
                summary=f"Profil usaha diekstrak secara otomatis dari dokumen {filename}."
            ),
            financial_constraints=FinancialConstraints(
                max_discount_allowed_pct=max_disc,
                min_margin_floor_idr=min_margin,
                currency="IDR",
                rationale="Batas finansial otomatis untuk menjaga kelayakan angsuran dan margin aman BNI.",
                auto_intervention_threshold_days=21
            ),
            product_catalog=products,
            cancellation_triggers=triggers,
            retention_policy=RetentionPolicy(
                free_freeze_allowed=freeze_allowed,
                max_freeze_days=max_freeze_days,
                allow_reschedule=allow_reschedule,
                reschedule_notice_hours=12,
                refund_policy="Sesuai klausul kepatuhan transaksi BNI SNAP merchant"
            )
        )

# Interface facade
class GuidebookExtractor:
    @classmethod
    def extract_rules(cls, raw_text: str, filename: str = "guidebook.txt") -> Dict[str, Any]:
        proc = DocumentProcessor()
        return proc.extract_structured_rules(raw_text, filename)
