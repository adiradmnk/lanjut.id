import io
from typing import Optional

def extract_text_from_bytes(file_bytes: bytes, filename: str) -> str:
    """
    Ekstrak teks mentah dari file PDF atau Text.
    Mengadopsi pendekatan smart document analyzer ala bestoism/rag-document-analyzer.
    """
    lower_name = filename.lower()
    
    if lower_name.endswith(".pdf"):
        try:
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            extracted_pages = []
            for i, page in enumerate(reader.pages):
                text = page.extract_text()
                if text:
                    extracted_pages.append(f"--- Halaman {i+1} ---\n{text.strip()}")
            return "\n\n".join(extracted_pages).strip()
        except Exception as e:
            # Fallback jika pypdf gagal atau terenkripsi
            print(f"[DocumentParser] Error parsing PDF with pypdf: {e}")
            try:
                return file_bytes.decode("utf-8", errors="ignore").strip()
            except Exception:
                return ""
    else:
        # Default text/markdown/csv file
        try:
            return file_bytes.decode("utf-8").strip()
        except UnicodeDecodeError:
            return file_bytes.decode("latin-1", errors="ignore").strip()
