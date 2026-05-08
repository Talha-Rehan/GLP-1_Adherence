from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from core.loader import load_all
from core.model import init_all_caches
from routers import summary, patients, segments, survival, cost, budget, shap, info


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_all()
    init_all_caches()
    yield


app = FastAPI(
    title="GLP-1 Analytics API",
    description="Backend for the GLP-1 Adherence & Cost Intelligence Platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(summary.router,  prefix="/api")
app.include_router(patients.router, prefix="/api")
app.include_router(segments.router, prefix="/api")
app.include_router(survival.router, prefix="/api")
app.include_router(cost.router,     prefix="/api")
app.include_router(budget.router,   prefix="/api")
app.include_router(shap.router,     prefix="/api")
app.include_router(info.router,     prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok", "version": "1.0.0"}
