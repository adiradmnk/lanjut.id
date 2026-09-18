from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
# Import per-fitur modular routers
from app.features.common.health_router import router as health_router
from app.features.common.inference_router import router as inference_router
from app.features.guidebook.router import router as guidebook_router
from app.features.chatbot.router import router as chatbot_router
from app.features.retention.router import router as retention_router
from app.features.lifecycle.router import router as lifecycle_router
from app.features.analytics.router import router as analytics_router
from app.routers import documents

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrasi router fitur
app.include_router(health_router)
app.include_router(inference_router, prefix=settings.API_V1_STR)
app.include_router(guidebook_router, prefix=f"{settings.API_V1_STR}/guidebook", tags=["Fitur 1: Ingestion Guidebook Merchant"])
app.include_router(chatbot_router, prefix=f"{settings.API_V1_STR}/chatbot", tags=["Fitur 2: Conversational Logic Builder"])
app.include_router(retention_router, prefix=f"{settings.API_V1_STR}/retention", tags=["Fitur 3: Retention & Churn Scoring"])
app.include_router(lifecycle_router, prefix=f"{settings.API_V1_STR}/lifecycle", tags=["Fitur 4: Lifecycle & Banking RM Health"])
app.include_router(documents.router, prefix=f"{settings.API_V1_STR}/documents", tags=["Guidebook Document Parsing"])
app.include_router(analytics_router, prefix=f"{settings.API_V1_STR}/analytics", tags=["Fitur 5: Merchant Analytics Query Agent"])

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=True)
