from fastapi import APIRouter
from datetime import datetime, timezone
from app.core.gemini_client import GeminiEngine, DEFAULT_GEMINI_MODEL

router = APIRouter()

@router.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "service": "ai-service",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": "1.0.0",
        # A clean log with no "[GeminiEngine] Call failed" lines is NOT proof Gemini is
        # active — it also looks like that when GEMINI_API_KEY is unset and every call is
        # silently skipped. Check "enabled" here to know for sure.
        "gemini_engine": {
            "enabled": GeminiEngine.is_available(),
            "model": DEFAULT_GEMINI_MODEL,
        },
    }
