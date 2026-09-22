import os
import json
import re
import logging
from typing import Dict, Any, Iterator, Optional

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
# gemini-1.5-flash and gemini-2.0-flash were both retired by Google (404 on generateContent,
# the latter's error explicitly points to gemini-3.6-flash) — override via GEMINI_MODEL if
# the API key's project needs a different current model.
DEFAULT_GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")

try:
    import google.generativeai as genai
    HAS_GENAI = True
    if GEMINI_API_KEY:
        genai.configure(api_key=GEMINI_API_KEY)
except ImportError:
    genai = None
    HAS_GENAI = False

# Loud, unambiguous startup signal — without this, "no [GeminiEngine] Call failed in the
# logs" could mean either "Gemini calls are succeeding" or "GEMINI_API_KEY is empty so
# Gemini is never even attempted", and those look identical unless we say so explicitly.
if GEMINI_API_KEY and HAS_GENAI:
    logger.warning(f"[GeminiEngine] ACTIVE — using model '{DEFAULT_GEMINI_MODEL}' with a configured GEMINI_API_KEY.")
else:
    logger.warning(
        "[GeminiEngine] DISABLED — GEMINI_API_KEY is not set (or google-generativeai failed to import). "
        "Every AI feature will use its deterministic/rule-based fallback engine, not Gemini."
    )

class GeminiEngine:
    @classmethod
    def is_available(cls) -> bool:
        return bool(GEMINI_API_KEY and HAS_GENAI)

    @classmethod
    def generate_json(cls, prompt: str, system_instruction: Optional[str] = None, model_name: str = DEFAULT_GEMINI_MODEL) -> Optional[Dict[str, Any]]:
        """
        Memanggil Gemini API untuk menghasilkan output JSON murni terstruktur.
        Mengembalikan None jika terjadi error/timeout/API key tidak ada.
        """
        if not cls.is_available():
            return None

        try:
            full_system = system_instruction or "Anda adalah AI Engine Enterprise untuk platform retensi B2B LANJUT."
            model = genai.GenerativeModel(
                model_name=model_name,
                system_instruction=full_system
            )
            response = model.generate_content(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            cleaned = response.text.strip()
            if cleaned.startswith("```"):
                cleaned = re.sub(r"^```(?:json)?\n?", "", cleaned)
                cleaned = re.sub(r"\n?```$", "", cleaned)
            return json.loads(cleaned)
        except Exception as e:
            logger.warning(f"[GeminiEngine] Call failed: {e}")
            return None

    @classmethod
    def generate_text(cls, prompt: str, system_instruction: Optional[str] = None, model_name: str = DEFAULT_GEMINI_MODEL) -> Optional[str]:
        """
        Memanggil Gemini API untuk menghasilkan teks penjelasan naratif yang kaya konteks.
        """
        if not cls.is_available():
            return None

        try:
            full_system = system_instruction or "Anda adalah AI Engine penasihat bisnis dan retensi pelanggan LANJUT."
            model = genai.GenerativeModel(
                model_name=model_name,
                system_instruction=full_system
            )
            response = model.generate_content(prompt)
            return response.text.strip()
        except Exception as e:
            logger.warning(f"[GeminiEngine Text] Call failed: {e}")
            return None

    @classmethod
    def generate_text_stream(cls, prompt: str, system_instruction: Optional[str] = None, model_name: str = DEFAULT_GEMINI_MODEL) -> Iterator[str]:
        """
        Same as generate_text, but yields real text chunks as Gemini generates them instead
        of waiting for the full response — so the caller can stream tokens to the client as
        they actually arrive rather than faking a typing animation over an already-complete
        answer. Yields nothing (empty iterator) if unavailable or the call fails; callers
        must have their own fallback for that case.
        """
        if not cls.is_available():
            return

        try:
            full_system = system_instruction or "Anda adalah AI Engine penasihat bisnis dan retensi pelanggan LANJUT."
            model = genai.GenerativeModel(
                model_name=model_name,
                system_instruction=full_system
            )
            response = model.generate_content(prompt, stream=True)
            for chunk in response:
                if chunk.text:
                    yield chunk.text
        except Exception as e:
            logger.warning(f"[GeminiEngine Stream] Call failed: {e}")
            return
