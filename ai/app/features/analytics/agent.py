"""
Merchant Analytics Query Agent.

Turns a free-text question from a merchant owner ("berikan saya analisis satu minggu
terakhir") into a markdown report, grounded in that tenant's real transaction history and
member feedback — never invented numbers. Gemini gets the actual data rows in the prompt
and is told explicitly not to fabricate figures; when Gemini is unavailable, the fallback
still reports real aggregate counts computed directly from the same data, just without the
narrative synthesis.
"""

import json
import logging
from typing import Any, Dict, List, Optional

from app.core.gemini_client import GeminiEngine

logger = logging.getLogger(__name__)


class AnalyticsQueryAgent:
    @classmethod
    def answer_query(
        cls,
        merchant_name: str,
        category: str,
        query: str,
        transactions: List[Dict[str, Any]],
        feedback_list: List[Dict[str, Any]],
        history: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, Any]:
        aggregates = cls._compute_aggregates(transactions, feedback_list)

        if GeminiEngine.is_available():
            result = cls._answer_with_gemini(
                merchant_name, category, query, transactions, feedback_list, history, aggregates
            )
            if result:
                return result

        return cls._fallback_report(query, aggregates)

    @classmethod
    def _compute_aggregates(
        cls, transactions: List[Dict[str, Any]], feedback_list: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        paid = [t for t in transactions if str(t.get("status", "")).upper() == "PAID"]
        pending = [t for t in transactions if str(t.get("status", "")).upper() in ("PENDING", "EXPIRED")]
        total_revenue_idr = sum(float(t.get("amount") or 0) for t in paid)
        return {
            "total_transactions": len(transactions),
            "paid_count": len(paid),
            "pending_or_expired_count": len(pending),
            "total_revenue_paid_idr": total_revenue_idr,
            "feedback_count": len(feedback_list),
        }

    @classmethod
    def _answer_with_gemini(
        cls,
        merchant_name: str,
        category: str,
        query: str,
        transactions: List[Dict[str, Any]],
        feedback_list: List[Dict[str, Any]],
        history: Optional[List[Dict[str, str]]],
        aggregates: Dict[str, Any],
    ) -> Optional[Dict[str, Any]]:
        history_text = json.dumps(history or [], ensure_ascii=False)
        prompt = f"""
        Anda adalah AI Data Analyst internal untuk merchant "{merchant_name}" ({category}) di
        platform LANJUT x BNI.

        Pertanyaan pemilik merchant: "{query}"

        Data riwayat transaksi nyata milik merchant ini (JSON, maksimal 60 baris terbaru):
        {json.dumps(transactions[:60], default=str, ensure_ascii=False)}

        Data feedback pelanggan nyata (JSON, maksimal 40 baris terbaru):
        {json.dumps(feedback_list[:40], default=str, ensure_ascii=False)}

        Ringkasan agregat yang sudah dihitung sistem dari data di atas (gunakan sebagai
        acuan angka, jangan mengarang angka lain):
        {json.dumps(aggregates, ensure_ascii=False)}

        Riwayat percakapan analisis sebelumnya di sesi ini (jika ada): {history_text}

        Tugas Anda:
        1. Jawab pertanyaan pemilik merchant secara spesifik HANYA berdasarkan data riil di
           atas. Jangan pernah mengarang angka atau transaksi yang tidak ada di data.
        2. Jika data tidak cukup untuk menjawab dengan pasti, katakan dengan jujur alih-alih
           menebak.
        3. Tulis laporan dalam format Markdown yang rapi: heading, bullet point, angka nyata.
        4. Berikan judul singkat (3-6 kata, tanpa tanda kutip) yang merangkum topik analisis
           ini untuk dijadikan judul sesi percakapan.

        Format JSON murni:
        {{
            "title": "judul singkat analisis",
            "report_markdown": "laporan lengkap dalam format markdown"
        }}
        """
        result = GeminiEngine.generate_json(
            prompt=prompt,
            system_instruction=(
                "Anda adalah AI Data Analyst yang jujur, selalu berbasis data riil yang "
                "diberikan, dan tidak pernah mengarang angka atau fakta."
            ),
        )
        if result and isinstance(result.get("report_markdown"), str) and result["report_markdown"].strip():
            return {
                "title": (result.get("title") or query[:40]).strip()[:80],
                "report_markdown": result["report_markdown"].strip(),
                "source": "gemini",
            }
        return None

    @classmethod
    def _fallback_report(cls, query: str, aggregates: Dict[str, Any]) -> Dict[str, Any]:
        revenue = aggregates["total_revenue_paid_idr"]
        report = (
            f"## Ringkasan Data (mode deterministik — AI narasi sedang tidak tersedia)\n\n"
            f"Pertanyaan: \"{query}\"\n\n"
            f"- Total transaksi: {aggregates['total_transactions']}\n"
            f"- Transaksi lunas: {aggregates['paid_count']}\n"
            f"- Transaksi pending/expired: {aggregates['pending_or_expired_count']}\n"
            f"- Total revenue lunas: Rp {int(revenue):,}\n"
            f"- Jumlah feedback member: {aggregates['feedback_count']}\n\n"
            f"_Angka di atas dihitung langsung dari data transaksi & feedback merchant ini. "
            f"Narasi AI tidak tersedia saat ini, jadi hanya agregat riil yang ditampilkan._"
        )
        return {
            "title": query[:40] if query else "Analisis Data",
            "report_markdown": report,
            "source": "fallback",
        }
