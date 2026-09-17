from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict, Any
from app.features.guidebook.document_parser import extract_text_from_bytes
from app.features.guidebook.extractor import GuidebookExtractor

router = APIRouter()

class GuidebookTextRequest(BaseModel):
    filename: Optional[str] = "guidebook.txt"
    raw_text: str

class GuidebookExtractResponse(BaseModel):
    status: str
    filename: str
    extracted_text_preview: str
    engine_source: str
    processing_time_ms: float
    rules: Dict[str, Any]

@router.post("/extract-rules", response_model=GuidebookExtractResponse)
async def extract_rules_from_text(payload: GuidebookTextRequest):
    if not payload.raw_text.strip():
        raise HTTPException(status_code=400, detail="raw_text cannot be empty")

    result = GuidebookExtractor.extract_rules(payload.raw_text, payload.filename or "guidebook.txt")
    preview = payload.raw_text[:250] + ("..." if len(payload.raw_text) > 250 else "")

    return GuidebookExtractResponse(
        status="SUCCESS",
        filename=payload.filename or "guidebook.txt",
        extracted_text_preview=preview,
        engine_source=result["source"],
        processing_time_ms=result["processing_time_ms"],
        rules=result["rules"]
    )

@router.post("/upload-and-extract", response_model=GuidebookExtractResponse)
async def upload_and_extract_file(
    file: UploadFile = File(...),
    notes: Optional[str] = Form(None)
):
    contents = await file.read()
    if not contents:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    filename = file.filename or "guidebook.pdf"
    extracted_text = extract_text_from_bytes(contents, filename)

    if notes:
        extracted_text = f"Catatan Tambahan Merchant:\n{notes}\n\n" + extracted_text

    if not extracted_text.strip():
        raise HTTPException(status_code=422, detail="Failed to extract readable text from the uploaded document")

    result = GuidebookExtractor.extract_rules(extracted_text, filename)
    preview = extracted_text[:250] + ("..." if len(extracted_text) > 250 else "")

    return GuidebookExtractResponse(
        status="SUCCESS",
        filename=filename,
        extracted_text_preview=preview,
        engine_source=result["source"],
        processing_time_ms=result["processing_time_ms"],
        rules=result["rules"]
    )
