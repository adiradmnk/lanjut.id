import re
from typing import Tuple, Dict

class PIISanitizer:
    """
    Enterprise Data Privacy / PII Sanitizer & Masking Layer.
    Mematuhi regulasi perbankan & UU Pelindungan Data Pribadi (UU PDP).
    Menyamarkan nama, nomor telepon, email, dan nomor akun sebelum dikirim ke eksternal LLM.
    """
    EMAIL_PATTERN = re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b')
    PHONE_PATTERN = re.compile(r'(\+62|62|08)[0-9]{8,12}')
    ACCOUNT_PATTERN = re.compile(r'\b[0-9]{10,16}\b') # Nomor VA / Rekening BNI

    @classmethod
    def sanitize_text(cls, text: str, entity_name: str = "Member") -> Tuple[str, Dict[str, str]]:
        """
        Menyamarkan data pribadi di dalam teks dan mengembalikan teks aman serta mapping token.
        """
        if not text:
            return text, {}

        mapping = {}
        sanitized = text

        # 1. Masking Email first to avoid name-in-email conflicts
        emails = cls.EMAIL_PATTERN.findall(sanitized)
        for i, email in enumerate(set(emails)):
            token = f"[MASKED_EMAIL_{i+1}]"
            mapping[token] = email
            sanitized = sanitized.replace(email, token)

        # 2. Masking Phone
        phones = cls.PHONE_PATTERN.findall(sanitized)
        for i, phone in enumerate(set(phones)):
            token = f"[MASKED_PHONE_{i+1}]"
            mapping[token] = phone
            sanitized = sanitized.replace(phone, token)

        # 3. Masking Bank VA / Account number
        accounts = cls.ACCOUNT_PATTERN.findall(sanitized)
        for i, acc in enumerate(set(accounts)):
            token = f"[MASKED_ACCOUNT_{i+1}]"
            mapping[token] = acc
            sanitized = sanitized.replace(acc, token)

        # 4. Masking entity name with word boundary if provided
        if entity_name and len(entity_name.strip()) > 1:
            token = "[MEMBER_NAME]"
            mapping[token] = entity_name
            sanitized = re.sub(rf"\b{re.escape(entity_name)}\b", token, sanitized, flags=re.IGNORECASE)

        return sanitized, mapping

    @classmethod
    def desanitize_text(cls, text: str, mapping: Dict[str, str]) -> str:
        """
        Mengembalikan token samaran ke data asli untuk dikembalikan ke caller.
        """
        if not text or not mapping:
            return text
        result = text
        for token, original in mapping.items():
            result = result.replace(token, original)
        return result
