"""
Real Inference Router — proxies to Gemini for generic AI analysis.
Previously returned a hardcoded fake string with a fabricated +35.5ms latency offset.
Now calls GeminiEngine.generate_text() and returns real AI output.
"""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
import time

from app.core.gemini_client import GeminiEngine, DEFAULT_GEMINI_MODEL

router = APIRouter()


class InferenceRequest(BaseModel):
    prompt: str
    model_type: str = DEFAULT_GEMINI_MODEL
    max_tokens: int = 150
    context: Optional[str] = None


class InferenceResponse(BaseModel):
    response: str
    model_used: str
    processing_time_ms: float
    engine_source: str
    status: str


@router.post("/analyze", response_model=InferenceResponse, tags=["Inference"])
async def analyze_data(request: InferenceRequest):
    """
    Generic AI inference endpoint — calls Gemini with the supplied prompt.
    Returns an honest error response (not a fake reply) if Gemini is unavailable.
    """
    start_time = time.time()

    full_prompt = request.prompt
    if request.context:
        full_prompt = f"Konteks:\n{request.context}\n\nPertanyaan:\n{request.prompt}"

    reply = None
    engine_source = "unavailable"

    if GeminiEngine.is_available():
        reply = GeminiEngine.generate_text(
            prompt=full_prompt,
            system_instruction=(
                "Kamu adalah AI Assistant untuk platform lanjut.id — "
                "sistem retensi member dan kecerdasan bisnis berbasis BNI SNAP. "
                "Jawab secara ringkas dan akurat dalam Bahasa Indonesia."
            ),
        )
        if reply:
            engine_source = "Google Gemini 1.5 Flash"

    elapsed = round((time.time() - start_time) * 1000, 2)

    if not reply:
        return InferenceResponse(
            response=(
                "AI engine tidak tersedia. "
                "Pastikan GEMINI_API_KEY sudah dikonfigurasi di environment."
            ),
            model_used=request.model_type,
            processing_time_ms=elapsed,
            engine_source="unavailable",
            status="error",
        )

    return InferenceResponse(
        response=reply,
        model_used=request.model_type,
        processing_time_ms=elapsed,
        engine_source=engine_source,
        status="success",
    )
