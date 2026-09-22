import time
from typing import Any, Dict, List, Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.features.analytics.agent import AnalyticsQueryAgent

router = APIRouter()


class AnalyticsQueryRequest(BaseModel):
    merchant_name: str
    category: Optional[str] = ""
    query: str
    transactions: List[Dict[str, Any]] = Field(default_factory=list)
    feedback: List[Dict[str, Any]] = Field(default_factory=list)
    history: Optional[List[Dict[str, str]]] = Field(default_factory=list)


@router.post("/query")
def query_analytics(payload: AnalyticsQueryRequest):
    start = time.time()
    result = AnalyticsQueryAgent.answer_query(
        merchant_name=payload.merchant_name,
        category=payload.category or "",
        query=payload.query,
        transactions=payload.transactions,
        feedback_list=payload.feedback,
        history=payload.history,
    )
    result["processing_time_ms"] = round((time.time() - start) * 1000, 2)
    return result
