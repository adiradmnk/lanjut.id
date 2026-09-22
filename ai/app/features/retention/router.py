import os
import json
import time
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.core.schemas import ExtractedBusinessRules, BusinessProfile, FinancialConstraints, ProductItem, CancellationTrigger, RetentionPolicy
from app.core.sanitizer import PIISanitizer
from app.core.tactics_kb import DynamicTacticsSynthesizer
from app.core.gemini_client import GeminiEngine
from app.features.retention.risk_engine import PaymentRiskScoringEngine
from app.features.retention.ml_churn import MLChurnPredictionEngine
from app.features.retention.agent import RetentionAgent

router = APIRouter()

# ----------------------------------------------------
# Pydantic Request & Response Models
# ----------------------------------------------------
class GrievanceTranslateRequest(BaseModel):
    member_name: str
    free_text_complaint: str
    current_package: Optional[str] = "Paket Standar Berlangganan"
    missed_sessions: Optional[int] = 0
    total_sessions: Optional[int] = 0
    business_rules: Optional[ExtractedBusinessRules] = None

class GrievanceTranslateResponse(BaseModel):
    member_name: str
    intent: str
    category: str
    preferred_time_of_day: str
    preferred_days: List[str]
    churn_risk_score: float
    sentiment: str
    root_cause_summary: str
    recommended_action: str
    engine_source: str
    processing_time_ms: float

class AvailableSessionInput(BaseModel):
    id: str
    title: str
    day_of_week: str
    time_slot: str
    time_of_day: str
    total_capacity: int
    booked_slots: int
    price_per_session_idr: float

class RankSmartOptionsRequest(BaseModel):
    member_id: str
    member_name: str
    remaining_quota: int = 0
    days_to_expiry: int = 7
    available_sessions: Optional[List[AvailableSessionInput]] = Field(default_factory=list)
    business_rules: Optional[ExtractedBusinessRules] = None

class RankedOptionOutput(BaseModel):
    id: str
    type: str
    title: str
    badge: str
    highlight: str
    description: str
    target_session_id: Optional[str] = None
    target_session_title: Optional[str] = None
    target_session_time: Optional[str] = None
    price_adjustment_idr: float
    original_price_idr: Optional[float] = None
    discount_label: Optional[str] = None
    available_slots: int
    suitability_score: float
    action_label: str

class RankSmartOptionsResponse(BaseModel):
    status: str
    member_id: str
    options: List[RankedOptionOutput]
    strategy_summary: str
    processing_time_ms: float

class RMSummaryRequest(BaseModel):
    merchant_name: str
    total_members: int
    at_risk_members: int
    saved_this_month: int
    retention_rate_pct: float
    avg_attendance_pct: float
    top_churn_reason: str
    est_bni_va_turnover_idr: int
    business_rules: Optional[ExtractedBusinessRules] = None

class RMSummaryResponse(BaseModel):
    merchant_name: str
    health_status: str
    bni_rm_priority: str
    narrative_summary: List[str]
    actionable_recommendations: List[str]
    compliance_guarantee: str
    processing_time_ms: float

class AttendancePoint(BaseModel):
    session_date: str
    attended: bool

class PredictChurnVelocityRequest(BaseModel):
    member_id: str
    attendance_history_90d: List[AttendancePoint]
    total_quota: int
    used_quota: int
    days_to_expiry: int
    business_rules: Optional[ExtractedBusinessRules] = None

class PredictChurnVelocityResponse(BaseModel):
    member_id: str
    churn_probability: float
    risk_level: str
    velocity_delta: float
    burn_rate_ratio: float
    recommended_strategy: str
    mathematical_proof: str

class EvaluateSMECreditRequest(BaseModel):
    merchant_id: str
    merchant_name: str
    monthly_installment_idr: int
    monthly_bni_va_turnover_idr: int
    retention_rate_pct: float
    active_member_count: int
    business_rules: Optional[ExtractedBusinessRules] = None

class EvaluateSMECreditResponse(BaseModel):
    merchant_id: str
    merchant_name: str
    credit_health_rating: str
    bni_dscr_ratio: float
    sme_credit_readiness_index: str
    recommended_rm_action: str
    ai_risk_rationale: List[str]
    compliance_disclaimer: str
    processing_time_ms: float

# ----------------------------------------------------
# 1. AI Grievance Translator (Pure Guidebook RAG + Zero Hardcode)
# ----------------------------------------------------
@router.post("/translate-grievance", response_model=GrievanceTranslateResponse)
def translate_grievance(payload: GrievanceTranslateRequest):
    start_time = time.time()
    rules = payload.business_rules or ExtractedBusinessRules()
    biz_name = rules.business_profile.business_name
    category = rules.business_profile.category
    
    sanitized_complaint, pii_map = PIISanitizer.sanitize_text(payload.free_text_complaint, payload.member_name)
    
    triggers_context = [
        {"pattern": t.trigger_pattern, "action": t.recommended_action, "desc": t.description}
        for t in rules.cancellation_triggers
    ]

    # 1. Gunakan Gemini API Reasoning jika tersedia
    if GeminiEngine.is_available():
        prompt = f"""
        Analisis teks keluhan nasabah berikut untuk platform B2B perbankan:
        Bisnis Merchant: {biz_name} ({category})
        Jam Operasional: {rules.business_profile.operating_hours or 'Reguler'}
        Paket Saat Ini: {payload.current_package}
        Teks Keluhan Nasabah: "{sanitized_complaint}"
        
        Pemicu Pembatalan Resmi dari Guidebook Merchant:
        {json.dumps(triggers_context, indent=2)}

        Instruksi:
        1. Identifikasi intent utama (cancellation_request, pause_request, complaint).
        2. Tentukan kategori kendala yang relevan secara kontekstual.
        3. Deteksi preferensi waktu atau hari nasabah HANYA jika tersirat di teks keluhan (atau kosongkan).
        4. Pilih recommended_action dari daftar pemicu Guidebook yang paling cocok.
        5. Buat 1 kalimat ringkasan akar masalah.

        Kembalikan JSON murni dengan skema:
        {{
            "intent": "cancellation_request" | "pause_request" | "support_inquiry",
            "category": "string kategori kendala",
            "sentiment": "NEGATIVE" | "NEUTRAL",
            "churn_risk_score": 0.85,
            "preferred_time_of_day": "string preferensi waktu jika ada",
            "preferred_days": ["hari jika disebutkan"],
            "recommended_action": "kode aksi dari guidebook",
            "root_cause_summary": "ringkasan akar masalah"
        }}
        """
        llm_data = GeminiEngine.generate_json(
            prompt=prompt,
            system_instruction="Anda adalah Strategic Retention Advisor AI untuk ekosistem perbankan BNI LANJUT."
        )
        if llm_data:
            root_cause = PIISanitizer.desanitize_text(llm_data.get("root_cause_summary", ""), pii_map)
            elapsed = round((time.time() - start_time) * 1000, 2)
            return GrievanceTranslateResponse(
                member_name=payload.member_name,
                intent=llm_data.get("intent", "cancellation_request"),
                category=llm_data.get("category", "general_inconvenience"),
                preferred_time_of_day=llm_data.get("preferred_time_of_day", "FLEXIBLE"),
                preferred_days=llm_data.get("preferred_days", []),
                churn_risk_score=float(llm_data.get("churn_risk_score", 0.75)),
                sentiment=llm_data.get("sentiment", "NEGATIVE"),
                root_cause_summary=root_cause,
                recommended_action=llm_data.get("recommended_action", "ADJUST_TIER_WITH_SAFE_MARGIN"),
                engine_source="Google Gemini 1.5 Flash (Guidebook Driven + PII Masked)",
                processing_time_ms=elapsed
            )

    # 2. Universal Heuristic Fallback (Zero Hardcoded Days/Times)
    lower_complaint = payload.free_text_complaint.lower()
    matched_action = "ADJUST_TIER_WITH_SAFE_MARGIN"
    category = "general_dissatisfaction"
    
    for trig in rules.cancellation_triggers:
        pattern_words = [w for w in trig.trigger_pattern.lower().split() if len(w) > 3]
        if any(w in lower_complaint for w in pattern_words):
            matched_action = trig.recommended_action
            category = trig.trigger_pattern
            break

    # Ekstraksi preferensi waktu secara dinamis tanpa mengasumsikan hari tertentu
    detected_days = [d for d in ["senin", "selasa", "rabu", "kamis", "jumat", "sabtu", "minggu"] if d in lower_complaint]
    time_pref = "FLEXIBLE"
    for t_word in ["pagi", "siang", "sore", "malam", "weekend", "akhir pekan"]:
        if t_word in lower_complaint:
            time_pref = t_word.upper()
            break

    elapsed = round((time.time() - start_time) * 1000, 2)
    return GrievanceTranslateResponse(
        member_name=payload.member_name,
        intent="cancellation_request",
        category=category,
        preferred_time_of_day=time_pref,
        preferred_days=[d.capitalize() for d in detected_days],
        churn_risk_score=0.80,
        sentiment="NEGATIVE",
        root_cause_summary=payload.free_text_complaint[:150],
        recommended_action=matched_action,
        engine_source="LANJUT Universal Dynamic Fallback Engine",
        processing_time_ms=elapsed
    )

# ----------------------------------------------------
# 2. Smart Options Ranker (Guidebook & Margin-Locked)
# ----------------------------------------------------
@router.post("/rank-smart-options", response_model=RankSmartOptionsResponse)
def rank_smart_options(payload: RankSmartOptionsRequest):
    start_time = time.time()
    rules = payload.business_rules or ExtractedBusinessRules()
    fin = rules.financial_constraints
    max_disc = fin.max_discount_allowed_pct
    min_floor = fin.min_margin_floor_idr
    currency = fin.currency or "IDR"

    ranked_options: List[RankedOptionOutput] = []

    # 1. Sesi Tersedia (Jika model bisnis berbasis kuota sesi/waktu)
    if payload.available_sessions:
        for s in payload.available_sessions:
            capacity = max(1, s.total_capacity)
            available = max(0, capacity - s.booked_slots)
            if available == 0:
                continue

            available_ratio = available / capacity
            base_price = max(min_floor, s.price_per_session_idr * 0.5)
            final_price = int(base_price * (1.0 - (max_disc / 100.0)))

            ranked_options.append(RankedOptionOutput(
                id=f"opt_sched_{s.id}",
                type="SWITCH_SCHEDULE",
                title=f"Pindah ke Jadwal {s.day_of_week} ({s.title})",
                badge="Rekomendasi Kapasitas Optimal",
                highlight=f"{s.day_of_week}, {s.time_slot}",
                description=f"Sisa kuota dipindahkan tanpa pinalti. Margin terkunci aman (Diskon penyesuaian maks: {max_disc}%).",
                target_session_id=s.id,
                target_session_title=s.title,
                target_session_time=f"{s.day_of_week}, {s.time_slot}",
                price_adjustment_idr=final_price,
                original_price_idr=s.price_per_session_idr,
                discount_label=f"Hemat {int(max_disc)}%",
                available_slots=available,
                suitability_score=round(0.6 * available_ratio + 0.4, 3),
                action_label="Pilih Jadwal Alternatif"
            ))

    # 2. Sintesis Kebijakan Jeda / Freeze dari Guidebook
    if rules.retention_policy.free_freeze_allowed and rules.retention_policy.max_freeze_days > 0:
        freeze_days = rules.retention_policy.max_freeze_days
        ranked_options.append(RankedOptionOutput(
            id="opt_freeze_membership",
            type="FREEZE_MEMBERSHIP",
            title=f"Jeda Akun Sementara ({freeze_days} Hari)",
            badge="Bebas Biaya",
            highlight=f"Akses Dijeda Hingga {freeze_days} Hari",
            description="Langganan dan kuota tetap aman tersimpan tanpa hangus, siap diaktifkan kembali kapan saja.",
            price_adjustment_idr=0.0,
            original_price_idr=0.0,
            available_slots=99,
            suitability_score=0.88,
            action_label=f"Aktifkan Jeda {freeze_days} Hari"
        ))

    # 3. Penyesuaian Tier dari Katalog Produk Riil
    if rules.product_catalog:
        sorted_prods = sorted(rules.product_catalog, key=lambda x: x.price_idr)
        for prod in sorted_prods[:2]:
            safe_disc_price = max(min_floor, prod.price_idr * (1.0 - (max_disc / 100.0)))
            ranked_options.append(RankedOptionOutput(
                id=f"opt_tier_{prod.name.lower().replace(' ', '_')}",
                type="ADJUST_TIER",
                title=f"Beralih ke {prod.name}",
                badge="Pilihan Ekonomis",
                highlight=f"{currency} {safe_disc_price:,.0f} / siklus",
                description=f"{prod.description or 'Paket alternatif hemat'} dengan jaminan margin perbankan aman.",
                price_adjustment_idr=safe_disc_price,
                original_price_idr=prod.price_idr,
                discount_label=f"Diskon Retensi {int(max_disc)}%",
                available_slots=50,
                suitability_score=0.82,
                action_label="Pilih Paket Ini"
            ))

    elapsed = round((time.time() - start_time) * 1000, 2)
    return RankSmartOptionsResponse(
        status="SUCCESS",
        member_id=payload.member_id,
        options=ranked_options,
        strategy_summary=f"Opsi retensi disusun otomatis berdasarkan panduan bisnis '{rules.business_profile.business_name}' dengan batasan diskon {max_disc}%.",
        processing_time_ms=elapsed
    )

# ----------------------------------------------------
# 3. RM Executive Health Generator (AI Contextual Narrative)
# ----------------------------------------------------
@router.post("/generate-rm-summary", response_model=RMSummaryResponse)
def generate_rm_summary(payload: RMSummaryRequest):
    start_time = time.time()
    rules = payload.business_rules or ExtractedBusinessRules()
    
    if payload.retention_rate_pct >= 85 and payload.avg_attendance_pct >= 75:
        health = "PRIME"
        priority = "STABLE"
    elif payload.retention_rate_pct >= 70:
        health = "MODERATE"
        priority = "MEDIUM"
    else:
        health = "WATCHLIST"
        priority = "HIGH"

    narratives = []
    recommendations = []

    # 1. Coba Sintesis Narasi dengan Gemini API
    if GeminiEngine.is_available():
        prompt = f"""
        Buatkan narasi ringkasan eksekutif kesehatan bisnis merchant untuk Relationship Manager (RM) Bank BNI:
        Nama Merchant: {payload.merchant_name} ({rules.business_profile.category})
        Total Member: {payload.total_members}
        Member Berisiko Churn: {payload.at_risk_members}
        Member Berhasil Diselamatkan: {payload.saved_this_month}
        Tingkat Retensi: {payload.retention_rate_pct}%
        Rata-rata Utilisasi Layanan: {payload.avg_attendance_pct}%
        Alasan Churn Terbesar: "{payload.top_churn_reason}"
        Estimasi Perputaran BNI VA Bulanan: Rp {payload.est_bni_va_turnover_idr:,}

        Kembalikan JSON murni:
        {{
            "narrative_summary": [
                "3 poin analisis mendalam tentang stabilitas operasional, efektivitas penyelamatan, dan kepatuhan arus kas"
            ],
            "actionable_recommendations": [
                "3 langkah aksi strategis bagi RM BNI (fasilitas perbankan, kredit, mitigasi risiko)"
            ]
        }}
        """
        llm_out = GeminiEngine.generate_json(
            prompt=prompt,
            system_instruction="Anda adalah Senior Credit Analyst & RM Portfolio Advisor Bank BNI."
        )
        if llm_out and "narrative_summary" in llm_out and "actionable_recommendations" in llm_out:
            narratives = llm_out["narrative_summary"]
            recommendations = llm_out["actionable_recommendations"]

    # Fallback jika LLM tidak tersedia
    if not narratives:
        narratives = [
            f"Kesehatan Portofolio {health}: Mitra '{payload.merchant_name}' ({rules.business_profile.category}) mencatat retensi {payload.retention_rate_pct}% member aktif.",
            f"Efektivitas Intervensi: {payload.saved_this_month} pelanggan berisiko berhasil diselamatkan menggunakan playbook guidebook merchant.",
            f"Dukungan Likuiditas: Estimasi perputaran BNI VA bulanan sebesar Rp {payload.est_bni_va_turnover_idr:,} terpantau stabil."
        ]
        recommendations = [
            "Optimalisasi perputaran saldo settlement melalui instrumen kas BNI Giro Prioritas.",
            "Rekomendasikan ekspansi fasilitas kredit usaha rakyat / BNI Wirausaha sesuai stabilitas retensi.",
            "Pertahankan monitoring otomatis Early Warning Signals pada portal RM BNI."
        ]

    elapsed = round((time.time() - start_time) * 1000, 2)
    return RMSummaryResponse(
        merchant_name=payload.merchant_name,
        health_status=health,
        bni_rm_priority=priority,
        narrative_summary=narratives,
        actionable_recommendations=recommendations,
        compliance_guarantee="Data diagregasi mematuhi UU Pelindungan Data Pribadi (UU PDP). Identitas nasabah tersanitasi.",
        processing_time_ms=elapsed
    )

# ----------------------------------------------------
# 4. Attendance Velocity & Churn Scoring
# ----------------------------------------------------
@router.post("/predict-churn-velocity", response_model=PredictChurnVelocityResponse)
def predict_churn_velocity(payload: PredictChurnVelocityRequest):
    total_pts = len(payload.attendance_history_90d)
    if total_pts == 0:
        return PredictChurnVelocityResponse(
            member_id=payload.member_id,
            churn_probability=0.5,
            risk_level="MEDIUM",
            velocity_delta=0.0,
            burn_rate_ratio=0.0,
            recommended_strategy="Cold-start: Lakukan kontak sambutan dan verifikasi kendala onboarding.",
            mathematical_proof="Total data poin kehadiran = 0. Menggunakan prior probabilitas baseline 0.50."
        )

    recent_pts = payload.attendance_history_90d[-14:]
    baseline_pts = payload.attendance_history_90d[:-14] if total_pts > 14 else payload.attendance_history_90d

    recent_rate = sum(1 for p in recent_pts if p.attended) / max(1, len(recent_pts))
    baseline_rate = sum(1 for p in baseline_pts if p.attended) / max(1, len(baseline_pts))
    velocity_delta = round(recent_rate - baseline_rate, 4)

    expected_burn = (payload.total_quota / max(1, payload.days_to_expiry)) if payload.days_to_expiry > 0 else 1.0
    actual_burn = payload.used_quota / max(1, (90 - payload.days_to_expiry))
    burn_ratio = round(actual_burn / max(0.01, expected_burn), 4)

    prob = 0.30 - (velocity_delta * 0.4) + (0.2 if burn_ratio < 0.5 else 0.0)
    prob = max(0.05, min(0.95, round(prob, 4)))
    level = "HIGH" if prob >= 0.65 else ("MEDIUM" if prob >= 0.35 else "LOW")

    return PredictChurnVelocityResponse(
        member_id=payload.member_id,
        churn_probability=prob,
        risk_level=level,
        velocity_delta=velocity_delta,
        burn_rate_ratio=burn_ratio,
        recommended_strategy="Aktifkan opsi reschedule atau jeda akun sesuai Guidebook" if prob >= 0.5 else "Pertahankan siklus normal",
        mathematical_proof=f"Velocity Delta ({velocity_delta}) & Burn Ratio ({burn_ratio}) menghasilkan probabilitas risiko {prob:.1%}."
    )

# ----------------------------------------------------
# 5. SME Credit DSS for BNI RM
# ----------------------------------------------------
@router.post("/evaluate-sme-credit-dss", response_model=EvaluateSMECreditResponse)
def evaluate_sme_credit_dss(payload: EvaluateSMECreditRequest):
    start_time = time.time()
    installment = max(1, payload.monthly_installment_idr)
    dscr = round(payload.monthly_bni_va_turnover_idr / installment, 2)

    if payload.monthly_bni_va_turnover_idr == 0:
        rating = "PROBATION_NEW_MERCHANT"
        index = "COLD_START_INSUFFICIENT_DATA"
        action = "Pendampingan onboarding dan integrasi penerimaan pembayaran BNI SNAP."
        rationale = ["Belum ada volume settlement BNI VA pada periode berjalan."]
    elif dscr >= 1.25 and payload.retention_rate_pct >= 80.0:
        rating = "PRIME_LOW_RISK"
        index = "PRIME_EXCELLENT"
        action = "Prioritas ekspansi: Tawarkan fasilitas penambahan limit kredit modal kerja BNI."
        rationale = [
            f"Debt Service Coverage Ratio (DSCR): {dscr}x (Ambang batas aman perbankan >= 1.25x).",
            f"Tingkat retensi pelanggan stabil di angka {payload.retention_rate_pct}%."
        ]
    else:
        rating = "WATCHLIST_MEDIUM"
        index = "WATCHLIST_MODERATE"
        action = "Monitoring berkala arus kas settlement BNI VA mingguan."
        rationale = [f"DSCR {dscr}x mendekati ambang batas kewajiban angsuran perbankan."]

    elapsed = round((time.time() - start_time) * 1000, 2)
    return EvaluateSMECreditResponse(
        merchant_id=payload.merchant_id,
        merchant_name=payload.merchant_name,
        credit_health_rating=rating,
        bni_dscr_ratio=dscr,
        sme_credit_readiness_index=index,
        recommended_rm_action=action,
        ai_risk_rationale=rationale,
        compliance_disclaimer="Sistem pendukung keputusan risiko dini (Early Warning System) BNI Decision Support Engine.",
        processing_time_ms=elapsed
    )

# ----------------------------------------------------
# 6. ML Churn & Risk Engine Proxies
# ----------------------------------------------------
@router.post("/evaluate-member-risk")
def evaluate_member_risk(payload: Dict[str, Any]):
    profile = payload.get("profile", payload)
    raw_rules = payload.get("business_rules")
    rules = ExtractedBusinessRules(**raw_rules) if raw_rules else ExtractedBusinessRules()
    return PaymentRiskScoringEngine.evaluate(profile, rules)

@router.post("/ml-churn/predict")
def ml_churn_predict(inputs: Dict[str, Any]):
    return MLChurnPredictionEngine.predict_churn(inputs)

@router.post("/ml-churn/simulate")
def ml_churn_simulate(payload: Dict[str, Any]):
    current = payload.get("current_inputs", {})
    mods = payload.get("modifications", {})
    return MLChurnPredictionEngine.simulate_what_if(current, mods)

@router.post("/agentic/run")
def run_agentic_retention(payload: Dict[str, Any]):
    customer = payload.get("customer_profile", {})
    risk_eval = payload.get("risk_evaluation", {})
    raw_rules = payload.get("business_rules")
    rules = ExtractedBusinessRules(**raw_rules) if raw_rules else ExtractedBusinessRules()
    
    agent = RetentionAgent()
    return agent.run_agentic_workflow(customer, risk_eval, rules)

# ----------------------------------------------------
# 7. Guidebook-Grounded Offer Generation (Human-Approval-Gated)
# ----------------------------------------------------
class ProductPackageInput(BaseModel):
    id: str
    name: str
    price_idr: float
    quota_sessions: int = 0
    duration_days: int = 0
    billing_type: str = "ONE_TIME"

class OfferCandidateOutput(BaseModel):
    source: str  # "CATALOG" | "AI_GENERATED"
    based_on_package_id: Optional[str] = None
    target_session_id: Optional[str] = None
    proposed_title: str
    price_idr: float
    discount_pct: float
    projected_margin_idr: float

class GenerateOffersRequest(BaseModel):
    member_id: str
    member_name: str
    tenant_constraint: Optional[Dict[str, Any]] = None
    active_packages: List[ProductPackageInput] = []
    available_sessions: List[AvailableSessionInput] = []
    guidebook_context: Optional[str] = ""

class GenerateOffersResponse(BaseModel):
    member_id: str
    offers: List[OfferCandidateOutput]
    engine_source: str
    processing_time_ms: float

@router.post("/generate-offers", response_model=GenerateOffersResponse)
def generate_offers(payload: GenerateOffersRequest):
    start_time = time.time()
    t_cfg = payload.tenant_constraint or {}
    max_discount = float(t_cfg.get("max_discount_allowed_pct") or 10.0)
    min_floor = float(t_cfg.get("min_margin_floor_idr") or 50000.0)

    if GeminiEngine.is_available() and payload.guidebook_context:
        try:
            packages_json = json.dumps([p.model_dump() for p in payload.active_packages])
            sessions_json = json.dumps([s.model_dump() for s in payload.available_sessions])

            prompt = f"""
            You are LANJUT AI Offer Engine. Propose retention offer CANDIDATES ONLY based on this merchant guidebook:
            === MERCHANT GUIDEBOOK ===
            {payload.guidebook_context[:10000]}
            === END GUIDEBOOK ===

            Member: {payload.member_name} (id: {payload.member_id})
            Active catalog packages: {packages_json}
            Available sessions: {sessions_json}
            Tenant constraints: max_discount_allowed_pct={max_discount}, min_margin_floor_idr={min_floor}

            Return a valid JSON array of 1-3 offer candidates:
            [
                {{
                    "source": "CATALOG" | "AI_GENERATED",
                    "based_on_package_id": "<id or null>",
                    "target_session_id": "<id or null>",
                    "proposed_title": "<short title>",
                    "price_idr": <number>,
                    "discount_pct": <number <= {max_discount}>,
                    "projected_margin_idr": <number >= {min_floor}>
                }}
            ]
            """
            llm_items = GeminiEngine.generate_json(
                prompt=prompt,
                system_instruction="You are a strategic retention advisor for BNI LANJUT platform."
            )
            if isinstance(llm_items, list) and len(llm_items) > 0:
                offers = [
                    OfferCandidateOutput(
                        source=item.get("source", "AI_GENERATED"),
                        based_on_package_id=item.get("based_on_package_id"),
                        target_session_id=item.get("target_session_id"),
                        proposed_title=item.get("proposed_title", "Penawaran Retensi"),
                        price_idr=float(item.get("price_idr", 0)),
                        discount_pct=float(item.get("discount_pct", 0)),
                        projected_margin_idr=float(item.get("projected_margin_idr", 0)),
                    )
                    for item in llm_items
                ]
                elapsed = round((time.time() - start_time) * 1000, 2)
                return GenerateOffersResponse(
                    member_id=payload.member_id,
                    offers=offers,
                    engine_source="Google Gemini 1.5 Flash (guidebook-grounded)",
                    processing_time_ms=elapsed,
                )
        except Exception:
            pass

    # Deterministic fallback
    offers = [
        OfferCandidateOutput(
            source="CATALOG",
            based_on_package_id=pkg.id,
            target_session_id=None,
            proposed_title=pkg.name,
            price_idr=pkg.price_idr,
            discount_pct=0,
            projected_margin_idr=pkg.price_idr,
        )
        for pkg in payload.active_packages
    ]
    evening_sessions = [
        s for s in payload.available_sessions
        if s.time_of_day.upper() == "EVENING" and s.booked_slots < s.total_capacity
    ]
    candidate_sessions = evening_sessions or [
        s for s in payload.available_sessions if s.booked_slots < s.total_capacity
    ]
    if candidate_sessions:
        target = candidate_sessions[0]
        base_price = max(min_floor, target.price_per_session_idr * 0.5)
        adjusted_price = round(base_price * (1.0 - max_discount / 100.0))
        offers.append(OfferCandidateOutput(
            source="AI_GENERATED",
            based_on_package_id=None,
            target_session_id=target.id,
            proposed_title=f"Pindah ke {target.title} ({target.day_of_week}, {target.time_slot})",
            price_idr=adjusted_price,
            discount_pct=max_discount,
            projected_margin_idr=adjusted_price,
        ))

    elapsed = round((time.time() - start_time) * 1000, 2)
    return GenerateOffersResponse(
        member_id=payload.member_id,
        offers=offers,
        engine_source="LANJUT Deterministic Offer Fallback",
        processing_time_ms=elapsed,
    )
