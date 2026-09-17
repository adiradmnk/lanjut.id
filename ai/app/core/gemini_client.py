import os
import json
import re
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

try:
    import google.generativeai as genai
    HAS_GENAI = True
    if GEMINI_API_KEY:
        genai.configure(api_key=GEMINI_API_KEY)
except ImportError:
    genai = None
    HAS_GENAI = False

class GeminiEngine:
    @classmethod
    def is_available(cls) -> bool:
        return bool(GEMINI_API_KEY and HAS_GENAI)

    @classmethod
    def generate_json(cls, prompt: str, system_instruction: Optional[str] = None, model_name: str = "gemini-1.5-flash") -> Optional[Dict[str, Any]]:
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
    def generate_text(cls, prompt: str, system_instruction: Optional[str] = None, model_name: str = "gemini-1.5-flash") -> Optional[str]:
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
