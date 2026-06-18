import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.openapi.utils import get_openapi
from app.db.database import create_tables
from app.api.routes import (
    auth, datasets, forecasts, dashboard, reports,
    notifications, admin, analytics, monitoring, anomaly,
    schedule, alerts, integrations, ai_features, widgets,
)
from app.api.routes import projects, scenarios, collaboration, intelligence
from app.api.routes import organizations, approvals, workflows, kpis, governance
from app.core.config import settings
from app.core.middleware import ActivityLogMiddleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    create_tables()
    yield


app = FastAPI(
    title="AI Demand Forecasting API",
    description="Enterprise AI-powered demand forecasting — Phase 6",
    version="6.0.0",
    lifespan=lifespan,
    swagger_ui_parameters={"persistAuthorization": True},
)


def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    schema = get_openapi(title="AI Demand Forecasting API", version="6.0.0", routes=app.routes)
    schema["components"]["securitySchemes"] = {
        "BearerAuth": {"type": "http", "scheme": "bearer", "bearerFormat": "JWT"}
    }
    for path in schema["paths"].values():
        for method in path.values():
            method["security"] = [{"BearerAuth": []}]
    app.openapi_schema = schema
    return schema


app.openapi = custom_openapi

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True, allow_methods=["*"], allow_headers=["*"],
)
app.add_middleware(ActivityLogMiddleware)

# Phase 1–4
for router in [auth, datasets, forecasts, dashboard, reports, notifications,
               admin, analytics, monitoring, anomaly, schedule, alerts,
               integrations, ai_features, widgets]:
    app.include_router(router.router)

# Phase 5
for router in [projects, scenarios, collaboration, intelligence]:
    app.include_router(router.router)

# Phase 6
for router in [organizations, approvals, workflows, kpis, governance]:
    app.include_router(router.router)

app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


@app.get("/")
def root():
    return {"message": "AI Demand Forecasting API v6.0", "status": "running"}


@app.get("/health")
def health():
    return {"status": "healthy", "version": "6.0.0"}
