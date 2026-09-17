from typing import List, Optional, Dict, Any
try:
    from pydantic import BaseModel, Field
except ImportError:
    class BaseModel:
        def __init__(self, **kwargs):
            # Isi default dari class attributes
            for attr in dir(self.__class__):
                if not attr.startswith("__"):
                    val = getattr(self.__class__, attr)
                    if not callable(val):
                        setattr(self, attr, val)
            for k, v in kwargs.items():
                setattr(self, k, v)

        def model_dump(self):
            res = {}
            for k, v in self.__dict__.items():
                if hasattr(v, 'model_dump'):
                    res[k] = v.model_dump()
                elif isinstance(v, list):
                    res[k] = [x.model_dump() if hasattr(x, 'model_dump') else x for x in v]
                else:
                    res[k] = v
            return res

    def Field(default=None, default_factory=None, **kwargs):
        if default_factory is not None:
            return default_factory()
        return default

class BusinessProfile(BaseModel):
    business_name: str = Field(default="Partner Merchant", description="Nama Bisnis / Merchant")
    category: str = Field(default="Subscription / Membership Service", description="Kategori/Industri Bisnis")
    operating_hours: Optional[str] = Field(default=None, description="Jam & Hari Operasional")
    summary: Optional[str] = Field(default=None, description="Ringkasan model bisnis & layanan")

class FinancialConstraints(BaseModel):
    max_discount_allowed_pct: float = Field(default=15.0, description="Diskon maksimum yang diizinkan untuk retensi")
    min_margin_floor_idr: float = Field(default=50000.0, description="Batas bawah margin profit minimum")
    currency: str = Field(default="IDR", description="Mata uang")
    rationale: Optional[str] = Field(default=None, description="Penjelasan batasan keuangan")
    auto_intervention_threshold_days: Optional[int] = Field(default=21, description="Ambang batas hari inaktivitas sebelum intervensi otomatis")

class ProductItem(BaseModel):
    name: str = Field(..., description="Nama Paket / Produk / Layanan")
    price_idr: float = Field(..., description="Harga reguler produk")
    quota_sessions: Optional[int] = Field(default=None, description="Jumlah kuota sesi/akses jika ada")
    validity_days: Optional[int] = Field(default=30, description="Masa aktif layanan (hari)")
    description: Optional[str] = Field(default="", description="Deskripsi paket")

class CancellationTrigger(BaseModel):
    trigger_pattern: str = Field(..., description="Pola keluhan / pemicu pembatalan")
    recommended_action: str = Field(..., description="Kode aksi retensi yang disarankan")
    allowed_discount_pct: float = Field(default=0.0, description="Diskon spesifik untuk pemicu ini")
    description: str = Field(..., description="Deskripsi solusi intervensi")

class RetentionPolicy(BaseModel):
    free_freeze_allowed: bool = Field(default=False, description="Apakah jeda/pause langganan diperbolehkan")
    max_freeze_days: int = Field(default=0, description="Maksimal durasi freeze/pause dalam hari")
    allow_reschedule: bool = Field(default=False, description="Apakah penjadwalan ulang/fleksibilitas waktu diizinkan")
    reschedule_notice_hours: Optional[int] = Field(default=12, description="Batas waktu pemberitahuan reschedule")
    refund_policy: Optional[str] = Field(default="No refund", description="Kebijakan refund jika intervensi gagal")

class ExtractedBusinessRules(BaseModel):
    business_profile: BusinessProfile = Field(default_factory=BusinessProfile)
    financial_constraints: FinancialConstraints = Field(default_factory=FinancialConstraints)
    product_catalog: List[ProductItem] = Field(default_factory=list)
    cancellation_triggers: List[CancellationTrigger] = Field(default_factory=list)
    retention_policy: RetentionPolicy = Field(default_factory=RetentionPolicy)
