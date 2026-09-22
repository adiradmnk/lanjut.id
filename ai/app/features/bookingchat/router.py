"""
Rukita booking chat: a short pre-checkout conversation with a real prospective tenant about
the room they picked, before they submit the booking. Grounded on the real room data the
frontend sends (never invented pricing/availability); falls back to a canned but honest reply
when Gemini is unavailable so the chat step never silently breaks the booking flow.
"""

import json
from typing import Dict, List, Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.core.gemini_client import GeminiEngine

router = APIRouter()


class BookingChatRequest(BaseModel):
    room_title: str
    room_price_idr: int
    room_meta: Optional[Dict] = Field(default_factory=dict)
    message: str
    history: Optional[List[Dict[str, str]]] = Field(default_factory=list)


class BookingChatResponse(BaseModel):
    reply: str
    source: str


@router.post("/query", response_model=BookingChatResponse)
def query_booking_chat(payload: BookingChatRequest):
    if GeminiEngine.is_available():
        history_text = json.dumps(payload.history or [], ensure_ascii=False)
        prompt = f"""
        Anda adalah asisten booking Rukita yang membantu calon penghuni sebelum mereka
        menyelesaikan booking kamar "{payload.room_title}" seharga Rp {payload.room_price_idr:,}/bulan.
        Detail kamar: {json.dumps(payload.room_meta or {}, ensure_ascii=False)}

        Riwayat percakapan sebelumnya: {history_text}
        Pesan calon penghuni: "{payload.message}"

        Jawab singkat (2-4 kalimat), ramah, dan hanya berdasarkan detail kamar di atas —
        jangan mengarang fasilitas atau harga yang tidak disebutkan. Jika mereka bertanya
        hal di luar detail yang tersedia, katakan dengan jujur bahwa informasi itu perlu
        dikonfirmasi tim properti.
        """
        text = GeminiEngine.generate_text(
            prompt=prompt,
            system_instruction="Anda asisten booking properti yang jujur dan tidak mengarang detail.",
        )
        if text:
            return BookingChatResponse(reply=text.strip(), source="gemini")

    return BookingChatResponse(
        reply=(
            f"Terima kasih sudah bertanya soal {payload.room_title}. Saat ini asisten AI sedang "
            f"tidak tersedia — silakan lanjutkan booking, atau hubungi tim properti untuk detail lebih lanjut."
        ),
        source="fallback",
    )
