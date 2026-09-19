import time
from typing import List, Optional, Dict, Any
from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.core.schemas import ExtractedBusinessRules
from app.features.chatbot.agent import ConversationalLogicAgent

router = APIRouter()

class ChatbotMessageRequest(BaseModel):
    tenant_id: Optional[str] = Field(None, description="ID Merchant/Tenant")
    message: str = Field(..., description="Kalimat perintah atau pertanyaan dari pemilik merchant")
    current_rules: Optional[ExtractedBusinessRules] = Field(default_factory=ExtractedBusinessRules, description="Aturan bisnis baseline merchant saat ini")
    conversation_history: Optional[List[Dict[str, str]]] = Field(default_factory=list, description="Riwayat percakapan sebelumnya")

class ChatbotMessageResponse(BaseModel):
    tenant_id: Optional[str] = Field(None, description="ID Merchant/Tenant")
    status: str = Field(..., description="Status hasil proses: ACCEPTED | REJECTED | INQUIRY_ANSWER")
    reply_message: str = Field(..., description="Teks balasan percakapan yang ramah untuk merchant")
    updated_rules: Dict[str, Any] = Field(..., description="Objek aturan bisnis terkini (termodifikasi jika ACCEPTED)")
    mutation_diff: List[str] = Field(default_factory=list, description="Daftar rincian field aturan bisnis yang termutasi")
    guardrail_report: Dict[str, Any] = Field(default_factory=dict, description="Hasil evaluasi kepatuhan margin finansial")
    processing_time_ms: float
    engine_source: str = Field("LANJUT Deterministic Fallback Engine", description="Engine yang menghasilkan balasan: 'Google Gemini' atau fallback deterministik")

@router.post("/process-instruction", response_model=ChatbotMessageResponse)
async def process_chatbot_instruction(payload: ChatbotMessageRequest):
    start_time = time.time()
    agent = ConversationalLogicAgent()
    
    result = agent.process_merchant_message(
        message=payload.message,
        current_rules=payload.current_rules or ExtractedBusinessRules(),
        history=payload.conversation_history,
        tenant_id=payload.tenant_id
    )
    
    elapsed = round((time.time() - start_time) * 1000, 2)
    return ChatbotMessageResponse(
        tenant_id=result.get("tenant_id"),
        status=result["status"],
        reply_message=result["reply_message"],
        updated_rules=result["updated_rules"],
        mutation_diff=result["mutation_diff"],
        guardrail_report=result["guardrail_report"],
        processing_time_ms=elapsed,
        engine_source=result.get("engine_source", "LANJUT Deterministic Fallback Engine")
    )
