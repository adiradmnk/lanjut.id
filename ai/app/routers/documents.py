import io
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel

router = APIRouter()

# Guidebook uploads are validated for extension/size on the Go backend side already; this
# is a defensive second check so the sidecar never tries to parse something it can't.
SUPPORTED_EXTENSIONS = (".pdf", ".docx", ".doc", ".txt", ".md")


class ExtractTextResponse(BaseModel):
    filename: str
    extracted_text: str
    char_count: int
    engine_source: str


def _extract_pdf(data: bytes) -> str:
    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(data))
    pages = [page.extract_text() or "" for page in reader.pages]
    return "\n\n".join(pages).strip()


def _extract_docx(data: bytes) -> str:
    import docx

    document = docx.Document(io.BytesIO(data))
    paragraphs = [p.text for p in document.paragraphs if p.text.strip()]
    return "\n".join(paragraphs).strip()


def _extract_plain_text(data: bytes) -> str:
    return data.decode("utf-8", errors="replace").strip()


@router.post("/extract-text", response_model=ExtractTextResponse)
async def extract_text(file: UploadFile = File(...)):
    """
    Extracts plain text from a merchant's uploaded guidebook document (PDF/docx/txt/md),
    so the Go backend can store it and ground GenerateOffers' Gemini prompt on the
    merchant's actual catalog/policy/payment-system detail instead of guessing.
    """
    filename = file.filename or "upload"
    lower_name = filename.lower()

    if not lower_name.endswith(SUPPORTED_EXTENSIONS):
        raise HTTPException(status_code=415, detail=f"Unsupported file type: {filename}")

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    try:
        if lower_name.endswith(".pdf"):
            text = _extract_pdf(data)
            engine = "pypdf"
        elif lower_name.endswith(".docx"):
            text = _extract_docx(data)
            engine = "python-docx"
        elif lower_name.endswith(".doc"):
            # Legacy binary .doc has no lightweight pure-Python parser; ask the merchant to
            # re-save as .docx/.pdf rather than silently returning garbage/empty text.
            raise HTTPException(
                status_code=415,
                detail="Legacy .doc is not supported for text extraction — please re-save as .docx or .pdf",
            )
        else:
            text = _extract_plain_text(data)
            engine = "plain-text-decode"
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Failed to extract text from {filename}: {e}")

    return ExtractTextResponse(
        filename=filename,
        extracted_text=text,
        char_count=len(text),
        engine_source=engine,
    )
