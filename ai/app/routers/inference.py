from fastapi import APIRouter
from pydantic import BaseModel
import time

router = APIRouter()

class InferenceRequest(BaseModel):
    prompt: str
    model_type: str = "lightweight-llm"
    max_tokens: int = 150

class InferenceResponse(BaseModel):
    response: str
    model_used: str
    processing_time_ms: float
    status: str

@router.post("/analyze", response_model=InferenceResponse, tags=["Inference"])
async def analyze_data(request: InferenceRequest):
    start_time = time.time()
    
    # Simulasi inference logic
    reply = (
        f"[AI Microservice Engine]: Analysis complete for: '{request.prompt}'. "
        f"Microservices pipeline is running optimally with low-latency dispatch."
    )
    
    elapsed = round((time.time() - start_time) * 1000 + 35.5, 2)
    return InferenceResponse(
        response=reply,
        model_used=request.model_type,
        processing_time_ms=elapsed,
        status="success"
    )
