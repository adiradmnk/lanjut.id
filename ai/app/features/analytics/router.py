import json
import time
from typing import Any, Dict, List, Optional

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
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


def _sse(event: str, data: Dict[str, Any]) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False, default=str)}\n\n"


@router.post("/query-stream")
def query_analytics_stream(payload: AnalyticsQueryRequest):
    """
    Same job as /query, streamed as Server-Sent Events so the caller can render the report
    as Gemini actually generates it instead of waiting for the whole thing. Runs in a plain
    `def` (threadpool) handler like /query — the generator below is consumed by Starlette in
    that same worker thread, so the blocking Gemini stream doesn't touch the event loop.
    """
    def event_stream():
        for event in AnalyticsQueryAgent.answer_query_stream(
            merchant_name=payload.merchant_name,
            category=payload.category or "",
            query=payload.query,
            transactions=payload.transactions,
            feedback_list=payload.feedback,
            history=payload.history,
        ):
            if event["type"] == "chunk":
                yield _sse("chunk", {"text": event["text"]})
            elif event["type"] == "done":
                yield _sse("done", {"title": event["title"], "engine_source": event["engine_source"]})

    return StreamingResponse(event_stream(), media_type="text/event-stream")
