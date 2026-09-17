import time
from typing import List, Optional, Dict, Any
from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.core.schemas import ExtractedBusinessRules
from app.features.lifecycle.churn_detector import TransactionChurnDetector
from app.features.lifecycle.survey_generator import DynamicSurveyGenerator, UserFeedbackAnalyzer
from app.features.lifecycle.revenue_optimizer import RevenueOptimizerEngine
from app.features.lifecycle.rm_payment_health import RMPaymentHealthEngine

router = APIRouter()

class TransactionItem(BaseModel):
    trx_id: str
    amount: float
    status: str
    bni_va_number: Optional[str] = None
    session_title: Optional[str] = None
    created_at: Optional[str] = None
    paid_at: Optional[str] = None

class DetectTransactionChurnRequest(BaseModel):
    member_id: str
    member_name: str
    days_to_expiry: int = 7
    total_quota: Optional[int] = None
    used_quota: Optional[int] = None
    transaction_history: List[TransactionItem]
    business_rules: Optional[ExtractedBusinessRules] = None

class GenerateSurveyRequest(BaseModel):
    member_name: str
    last_transaction_context: Optional[Dict[str, Any]] = None
    last_transaction: Optional[Dict[str, Any]] = None
    business_rules: Optional[ExtractedBusinessRules] = None

class AnalyzeFeedbackRequest(BaseModel):
    member_name: str
    selected_option_ids: List[str]
    free_text_feedback: Optional[str] = ""
    business_rules: Optional[ExtractedBusinessRules] = None

class RevenueInsightsRequest(BaseModel):
    total_members: int
    churn_risk_count: int
    saved_members_count: int
    feedback_summary_list: List[Dict[str, Any]] = Field(default_factory=list)
    transaction_history: Optional[List[TransactionItem]] = Field(default_factory=list)
    business_rules: Optional[ExtractedBusinessRules] = None

class RMGatewayHealthRequest(BaseModel):
    merchant_name: str
    transaction_history: List[TransactionItem]
    feedback_list: List[Dict[str, Any]] = Field(default_factory=list)

@router.post("/detect-transaction-churn")
async def detect_transaction_churn(payload: DetectTransactionChurnRequest):
    start = time.time()
    raw_history = [t.model_dump() for t in payload.transaction_history]
    result = TransactionChurnDetector.analyze_transactions(
        transactions=raw_history,
        days_to_expiry=payload.days_to_expiry,
        total_quota=payload.total_quota,
        used_quota=payload.used_quota
    )
    result["member_id"] = payload.member_id
    result["member_name"] = payload.member_name
    result["processing_time_ms"] = round((time.time() - start) * 1000, 2)
    return result

@router.post("/generate-cancellation-survey")
async def generate_cancellation_survey(payload: GenerateSurveyRequest):
    start = time.time()
    rules = payload.business_rules or ExtractedBusinessRules()
    ctx = payload.last_transaction_context or payload.last_transaction or {
        "detected_pattern": "EXPIRED_UNPAID_INVOICE", "days_to_expiry": 7, "unused_quota": 0
    }
    survey = DynamicSurveyGenerator.generate_cancellation_survey(
        member_name=payload.member_name,
        last_transaction_context=ctx,
        business_rules=rules
    )
    survey["processing_time_ms"] = round((time.time() - start) * 1000, 2)
    return survey

@router.post("/analyze-survey-feedback")
async def analyze_survey_feedback(payload: AnalyzeFeedbackRequest):
    start = time.time()
    rules = payload.business_rules or ExtractedBusinessRules()
    analysis = UserFeedbackAnalyzer.analyze_feedback_and_generate_offer(
        member_name=payload.member_name,
        selected_option_ids=payload.selected_option_ids,
        free_text_feedback=payload.free_text_feedback or "",
        business_rules=rules
    )
    analysis["processing_time_ms"] = round((time.time() - start) * 1000, 2)
    return analysis

@router.post("/merchant-revenue-insights")
async def get_merchant_revenue_insights(payload: RevenueInsightsRequest):
    start = time.time()
    rules = payload.business_rules or ExtractedBusinessRules()
    raw_trx = [t.model_dump() for t in payload.transaction_history] if payload.transaction_history else []
    insights = RevenueOptimizerEngine.generate_revenue_insights(
        total_members=payload.total_members,
        churn_risk_count=payload.churn_risk_count,
        saved_members_count=payload.saved_members_count,
        feedback_summary_list=payload.feedback_summary_list,
        business_rules=rules,
        transaction_history=raw_trx
    )
    insights["processing_time_ms"] = round((time.time() - start) * 1000, 2)
    return insights

@router.post("/rm-gateway-health")
async def get_rm_gateway_health(payload: RMGatewayHealthRequest):
    start = time.time()
    raw_history = [t.model_dump() for t in payload.transaction_history]
    report = RMPaymentHealthEngine.evaluate_gateway_health(
        merchant_name=payload.merchant_name,
        transaction_history=raw_history,
        feedback_list=payload.feedback_list
    )
    report["processing_time_ms"] = round((time.time() - start) * 1000, 2)
    return report
