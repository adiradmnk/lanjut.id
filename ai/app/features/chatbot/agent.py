"""
Conversational Business Logic Builder (LangChain Agent & Tool Calling Pattern)
Menerapkan arsitektur:
1. Tool Mutation Extraction via Gemini (Mengubah teks bebas menjadi JSON tool-call)
2. Tool Execution & Deterministic Guardrail Check (Verifikasi margin floor BNI)
3. Pure LLM Natural Response Synthesis (Menyusun kalimat percakapan ramah dan persuasif tanpa template string kaku)
"""

import os
import re
import json
import logging
from typing import Dict, Any, List, Optional

from app.core.schemas import ExtractedBusinessRules, CancellationTrigger, ProductItem
from app.core.guardrails import FinancialGuardrailValidator
from app.core.sanitizer import PIISanitizer
from app.core.gemini_client import GeminiEngine

logger = logging.getLogger(__name__)

class ConversationalLogicAgent:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY", "")

    def process_merchant_message(
        self,
        message: str,
        current_rules: ExtractedBusinessRules,
        history: Optional[List[Dict[str, str]]] = None
    ) -> Dict[str, Any]:
        sanitized_msg, pii_map = PIISanitizer.sanitize_text(message)

        # 1. Tool Call Parsing via Gemini / Dynamic Fallback
        parsed_action = self._parse_tool_call_with_llm(sanitized_msg, current_rules, history)
        if not parsed_action or parsed_action.get("intent") == "INQUIRY":
            # Cek apakah fallback mendeteksi mutasi
            fallback_res = self._heuristic_tool_call(sanitized_msg, current_rules)
            if fallback_res.get("intent") == "MUTATION":
                parsed_action = fallback_res
            elif not parsed_action:
                parsed_action = fallback_res

        intent_type = parsed_action.get("intent", "INQUIRY")

        # SKENARIO A: KONSULTASI / PERTANYAAN ATURAN AKTIF (INQUIRY)
        if intent_type == "INQUIRY":
            reply = self._synthesize_inquiry_reply(sanitized_msg, current_rules, history)
            return {
                "status": "INQUIRY_ANSWER",
                "reply_message": PIISanitizer.desanitize_text(reply, pii_map),
                "updated_rules": current_rules.model_dump(),
                "mutation_diff": [],
                "guardrail_report": {"is_safe": True, "violations": []}
            }

        # SKENARIO B: MUTASI ATURAN BISNIS (MUTATION VIA TOOL CALL)
        proposed_discount = parsed_action.get("proposed_max_discount_pct")
        proposed_margin = parsed_action.get("proposed_min_margin_floor_idr")
        new_trigger_data = parsed_action.get("new_cancellation_trigger")
        new_product_data = parsed_action.get("new_product_item")
        freeze_days = parsed_action.get("freeze_days")

        # 2. Tool Execution: Financial Guardrail Validation
        guardrail = FinancialGuardrailValidator.validate_mutation(
            current_rules=current_rules,
            proposed_max_discount=proposed_discount,
            proposed_min_margin=proposed_margin
        )

        # JIKA MELANGGAR MARGIN AMAN BNI:
        if not guardrail["is_safe"]:
            rejection_reply = self._synthesize_guardrail_rejection_reply(
                message=sanitized_msg,
                current_rules=current_rules,
                guardrail=guardrail
            )
            return {
                "status": "REJECTED",
                "reply_message": PIISanitizer.desanitize_text(rejection_reply, pii_map),
                "updated_rules": current_rules.model_dump(),
                "mutation_diff": [],
                "guardrail_report": guardrail
            }

        # JIKA LOLOS: APLIKASIKAN MUTASI SCHEMA & DIFF
        updated_dict = current_rules.model_dump()
        diff_logs = []

        if proposed_discount is not None:
            old_d = updated_dict["financial_constraints"]["max_discount_allowed_pct"]
            updated_dict["financial_constraints"]["max_discount_allowed_pct"] = float(proposed_discount)
            diff_logs.append(f"Diskon maksimal retensi diubah dari {old_d}% menjadi {proposed_discount}%")

        if proposed_margin is not None:
            old_m = updated_dict["financial_constraints"]["min_margin_floor_idr"]
            updated_dict["financial_constraints"]["min_margin_floor_idr"] = float(proposed_margin)
            diff_logs.append(f"Batas bawah margin profit minimum diubah dari Rp {old_m:,.0f} menjadi Rp {proposed_margin:,.0f}")

        if freeze_days is not None:
            updated_dict["retention_policy"]["free_freeze_allowed"] = True
            old_f = updated_dict["retention_policy"]["max_freeze_days"]
            updated_dict["retention_policy"]["max_freeze_days"] = int(freeze_days)
            diff_logs.append(f"Durasi jeda/freeze akun diubah dari {old_f} hari menjadi {freeze_days} hari")

        if new_trigger_data:
            trig_obj = CancellationTrigger(**new_trigger_data)
            updated_dict["cancellation_triggers"].append(trig_obj.model_dump())
            diff_logs.append(f"Ditambahkan pemicu keluhan baru: '{trig_obj.trigger_pattern}' ({trig_obj.recommended_action})")

        if new_product_data:
            prod_obj = ProductItem(**new_product_data)
            updated_dict["product_catalog"].append(prod_obj.model_dump())
            diff_logs.append(f"Ditambahkan paket layanan baru: '{prod_obj.name}' (Rp {prod_obj.price_idr:,.0f})")

        # 3. Pure LLM Confirmation Synthesis
        success_reply = self._synthesize_success_reply(
            message=sanitized_msg,
            diff_logs=diff_logs,
            current_rules=current_rules,
            guardrail=guardrail
        )

        return {
            "status": "ACCEPTED",
            "reply_message": PIISanitizer.desanitize_text(success_reply, pii_map),
            "updated_rules": updated_dict,
            "mutation_diff": diff_logs,
            "guardrail_report": guardrail
        }

    def _parse_tool_call_with_llm(
        self,
        message: str,
        current_rules: ExtractedBusinessRules,
        history: Optional[List[Dict[str, str]]]
    ) -> Optional[Dict[str, Any]]:
        if not GeminiEngine.is_available():
            return None

        rules_context = json.dumps(current_rules.model_dump(), indent=2)
        prompt = f"""
        Anda adalah Semantic Tool Calling Agent untuk platform bisnis LANJUT.
        Analisis pesan pemilik merchant berikut dan tentukan tool mutasi aturan yang ingin dieksekusi:

        Aturan Aktif Merchant:
        {rules_context}

        Pesan Merchant: "{message}"

        Format JSON murni:
        {{
            "intent": "MUTATION" | "INQUIRY",
            "proposed_max_discount_pct": float | null,
            "proposed_min_margin_floor_idr": float | null,
            "freeze_days": int | null,
            "new_cancellation_trigger": {{
                "trigger_pattern": "...",
                "recommended_action": "...",
                "allowed_discount_pct": 10.0,
                "description": "..."
            }} | null,
            "new_product_item": {{
                "name": "...",
                "price_idr": 100000.0,
                "quota_sessions": null,
                "validity_days": 30,
                "description": "..."
            }} | null
        }}
        """
        return GeminiEngine.generate_json(
            prompt=prompt,
            system_instruction="Anda adalah Agentic Tool Parser yang akurat mengonversi instruksi merchant ke parameter mutasi."
        )

    def _synthesize_guardrail_rejection_reply(
        self,
        message: str,
        current_rules: ExtractedBusinessRules,
        guardrail: Dict[str, Any]
    ) -> str:
        violations_text = "\n".join([f"- {v}" for v in guardrail.get("violations", [])])
        safe_alt = guardrail.get("suggested_safe_discount_pct", 15.0)
        
        if GeminiEngine.is_available():
            prompt = f"""
            Pemilik merchant mengajukan perubahan aturan: "{message}".
            Namun usulan ini MELANGGAR batas keselamatan finansial perbankan BNI dengan temuan:
            {violations_text}

            Batas diskon aman alternatif yang dihitung sistem adalah: {safe_alt:.1f}%.

            Tugas Anda:
            Tulis balasan percakapan santun, empatik, dan profesional kepada pemilik merchant.
            Jelaskan secara logis mengapa perubahan ini berisiko bagi arus kas atau cicilan BNI mereka,
            dan tawarkan rekomendasi diskon aman {safe_alt:.1f}% sebagai solusi yang saling menguntungkan.
            Jangan gunakan template kaku, bicaralah layaknya business consultant terpercaya.
            """
            text_out = GeminiEngine.generate_text(
                prompt=prompt,
                system_instruction="Anda adalah Asisten Konsultan Bisnis & Keuangan Merchant B2B."
            )
            if text_out:
                return text_out

        return (
            f"Permintaan Anda belum dapat diterapkan karena melanggar batas keselamatan margin operasional:\n"
            f"{violations_text}\n\n"
            f"Saran sistem: Batas diskon maksimal yang aman untuk seluruh katalog Anda adalah {safe_alt:.1f}%. "
            f"Apakah Anda ingin menerapkan diskon aman ini?"
        )

    def _synthesize_success_reply(
        self,
        message: str,
        diff_logs: List[str],
        current_rules: ExtractedBusinessRules,
        guardrail: Dict[str, Any]
    ) -> str:
        diff_summary = "\n".join([f"- {d}" for d in diff_logs])
        if GeminiEngine.is_available():
            prompt = f"""
            Pemilik merchant meminta: "{message}".
            Perubahan tersebut TELAH LOLOS audit keselamatan margin finansial dan berhasil disimpan ke sistem dengan rincian:
            {diff_summary}

            Tugas Anda:
            Tulis balasan konfirmasi percakapan ramah, ringkas, dan meyakinkan kepada pemilik merchant.
            Sampaikan apresiasi dan konfirmasi bahwa aturan baru telah aktif serta aman untuk cashflow usaha mereka.
            """
            text_out = GeminiEngine.generate_text(
                prompt=prompt,
                system_instruction="Anda adalah Asisten Operasional Virtual Merchant yang ramah dan solutif."
            )
            if text_out:
                return text_out

        return (
            f"Perubahan aturan bisnis berhasil disimpan:\n"
            f"{diff_summary}\n\n"
            f"Aturan baru telah aktif dan seluruh simulasi harga dipastikan aman mematuhi batas margin minimum."
        )

    def _synthesize_inquiry_reply(
        self,
        message: str,
        current_rules: ExtractedBusinessRules,
        history: Optional[List[Dict[str, str]]]
    ) -> str:
        biz = current_rules.business_profile
        fin = current_rules.financial_constraints
        pol = current_rules.retention_policy
        catalog_summary = ", ".join([f"{p.name} (Rp {p.price_idr:,.0f})" for p in current_rules.product_catalog[:4]])

        if GeminiEngine.is_available():
            prompt = f"""
            Pemilik merchant ({biz.business_name} - {biz.category}) bertanya: "{message}".
            Kondisi Aturan Bisnis Aktif Saat Ini:
            - Diskon Maksimal Retensi: {fin.max_discount_allowed_pct}%
            - Batas Margin Minimal: Rp {fin.min_margin_floor_idr:,.0f}
            - Kebijakan Freeze: {'Diizinkan hingga ' + str(pol.max_freeze_days) + ' hari' if pol.free_freeze_allowed else 'Tidak diizinkan'}
            - Kebijakan Reschedule: {'Diizinkan' if pol.allow_reschedule else 'Tidak diizinkan'}
            - Produk Terdaftar: {catalog_summary or 'Belum ada produk spesifik'}

            Tugas Anda:
            Jawab pertanyaan pemilik dengan ramah, jelas, dan komunikatif. Beritahu mereka bahwa mereka dapat meminta Anda mengubah aturan ini kapan saja secara natural.
            """
            text_out = GeminiEngine.generate_text(
                prompt=prompt,
                system_instruction="Anda adalah Virtual Assistant pengatur logika bisnis merchant."
            )
            if text_out:
                return text_out

        return (
            f"Saat ini aturan bisnis aktif untuk {biz.business_name} adalah diskon maksimal {fin.max_discount_allowed_pct}%, "
            f"margin minimal Rp {fin.min_margin_floor_idr:,.0f}, dan jeda akun hingga {pol.max_freeze_days} hari. "
            f"Anda dapat memerintahkan saya untuk mengubah aturan ini kapan saja."
        )

    def _heuristic_tool_call(self, message: str, current_rules: ExtractedBusinessRules) -> Dict[str, Any]:
        lower = message.lower()
        disc_match = re.search(r"(?:diskon|potongan)[^0-9%]*([0-9]+(?:\.[0-9]+)?)\s*%", lower)
        margin_match = re.search(r"(?:margin|profit|batas bawah)[^0-9]*(?:rp\.?|idr)?\s*([0-9\.,]+)", lower)
        freeze_match = re.search(r"(?:freeze|jeda|cuti)[^0-9]*([0-9]+)\s*hari", lower)

        if disc_match or margin_match or freeze_match or any(w in lower for w in ["tambah opsi", "tambah trigger", "ubah diskon", "ganti diskon", "naikkan diskon"]):
            res = {"intent": "MUTATION"}
            if disc_match:
                res["proposed_max_discount_pct"] = float(disc_match.group(1))
            if margin_match:
                res["proposed_min_margin_floor_idr"] = float(margin_match.group(1).replace(".", "").replace(",", ""))
            if freeze_match:
                res["freeze_days"] = int(freeze_match.group(1))
            return res

        return {"intent": "INQUIRY"}
