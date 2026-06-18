from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from datetime import datetime, timezone
import pandas as pd
import numpy as np
from app.db.database import get_db
from app.models.user import User
from app.models.forecast import Forecast
from app.models.dataset import Dataset
from app.models.governance import ForecastGovernance, DataQualityReport, Announcement
from app.core.security import get_current_user
from app.services.data_processor import load_dataset

router = APIRouter(prefix="/api/governance", tags=["Governance"])

LIFECYCLE = ["draft", "submitted", "approved", "published", "archived"]


class GovernanceCreate(BaseModel):
    forecast_id: int
    lifecycle_status: str = "draft"
    compliance_notes: Optional[str] = None


class LifecycleUpdate(BaseModel):
    lifecycle_status: str
    compliance_notes: Optional[str] = None


class AnnouncementCreate(BaseModel):
    title: str
    content: str
    type: str = "info"
    expires_at: Optional[str] = None


# ── Governance ────────────────────────────────────────────────────────────────
@router.post("/forecasts", status_code=201)
def create_governance(data: GovernanceCreate, db: Session = Depends(get_db),
                      current_user: User = Depends(get_current_user)):
    forecast = db.query(Forecast).filter(
        Forecast.id == data.forecast_id, Forecast.owner_id == current_user.id
    ).first()
    if not forecast:
        raise HTTPException(status_code=404, detail="Forecast not found")
    existing = db.query(ForecastGovernance).filter(
        ForecastGovernance.forecast_id == data.forecast_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Governance record already exists for this forecast")
    gov = ForecastGovernance(
        forecast_id=data.forecast_id, owner_id=current_user.id,
        lifecycle_status=data.lifecycle_status,
        compliance_notes=data.compliance_notes,
        change_log=[{"action": "created", "status": data.lifecycle_status,
                     "by": current_user.id, "at": str(datetime.now(timezone.utc))}],
    )
    db.add(gov)
    db.commit()
    db.refresh(gov)
    return _fmt_gov(gov, forecast)


@router.get("/forecasts")
def list_governance(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    govs = db.query(ForecastGovernance).filter(
        ForecastGovernance.owner_id == current_user.id
    ).order_by(ForecastGovernance.created_at.desc()).all()
    result = []
    for g in govs:
        f = db.query(Forecast).filter(Forecast.id == g.forecast_id).first()
        result.append(_fmt_gov(g, f))
    return result


@router.patch("/forecasts/{gov_id}/lifecycle")
def update_lifecycle(gov_id: int, data: LifecycleUpdate, db: Session = Depends(get_db),
                     current_user: User = Depends(get_current_user)):
    gov = db.query(ForecastGovernance).filter(
        ForecastGovernance.id == gov_id, ForecastGovernance.owner_id == current_user.id
    ).first()
    if not gov:
        raise HTTPException(status_code=404, detail="Governance record not found")
    if data.lifecycle_status not in LIFECYCLE:
        raise HTTPException(status_code=400, detail=f"Status must be one of {LIFECYCLE}")
    gov.lifecycle_status = data.lifecycle_status
    if data.compliance_notes:
        gov.compliance_notes = data.compliance_notes
    gov.version = (gov.version or 1) + 1
    gov.updated_at = datetime.now(timezone.utc)
    change_log = gov.change_log or []
    change_log.append({"action": "lifecycle_update", "status": data.lifecycle_status,
                       "by": current_user.id, "at": str(datetime.now(timezone.utc))})
    gov.change_log = change_log
    if data.lifecycle_status == "approved":
        gov.approved_by = current_user.id
    elif data.lifecycle_status == "published":
        gov.published_at = datetime.now(timezone.utc)
    elif data.lifecycle_status == "archived":
        gov.archived_at = datetime.now(timezone.utc)
    db.commit()
    f = db.query(Forecast).filter(Forecast.id == gov.forecast_id).first()
    return _fmt_gov(gov, f)


@router.get("/dashboard")
def governance_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    govs = db.query(ForecastGovernance).filter(
        ForecastGovernance.owner_id == current_user.id
    ).all()
    status_counts = {}
    for g in govs:
        status_counts[g.lifecycle_status] = status_counts.get(g.lifecycle_status, 0) + 1
    quality_reports = db.query(DataQualityReport).filter(
        DataQualityReport.owner_id == current_user.id
    ).order_by(DataQualityReport.created_at.desc()).limit(5).all()
    avg_quality = None
    if quality_reports:
        scores = [r.overall_score for r in quality_reports if r.overall_score]
        avg_quality = round(sum(scores) / len(scores), 1) if scores else None
    return {
        "total_governed": len(govs),
        "lifecycle_breakdown": status_counts,
        "avg_data_quality": avg_quality,
        "quality_reports_count": len(quality_reports),
        "recent_governance": [_fmt_gov(g, db.query(Forecast).filter(Forecast.id == g.forecast_id).first()) for g in govs[:5]],
    }


# ── Data Quality ──────────────────────────────────────────────────────────────
@router.post("/data-quality/{dataset_id}", status_code=201)
def run_data_quality(dataset_id: int, db: Session = Depends(get_db),
                     current_user: User = Depends(get_current_user)):
    dataset = db.query(Dataset).filter(
        Dataset.id == dataset_id, Dataset.owner_id == current_user.id
    ).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    try:
        df = load_dataset(dataset.file_path)
        total_cells = df.shape[0] * df.shape[1]
        missing = df.isnull().sum().sum()
        missing_pct = round(missing / total_cells * 100, 2) if total_cells else 0
        dup = df.duplicated().sum()
        dup_pct = round(dup / len(df) * 100, 2) if len(df) else 0
        completeness = round(max(0, 100 - missing_pct), 1)
        consistency = round(max(0, 100 - dup_pct * 2), 1)
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        validity = 100.0
        issues = []
        recommendations = []
        if missing_pct > 10:
            issues.append(f"{missing_pct}% missing values detected")
            recommendations.append("Fill or drop missing values before forecasting")
        if dup_pct > 5:
            issues.append(f"{dup_pct}% duplicate rows detected")
            recommendations.append("Remove duplicate rows for better accuracy")
        for col in numeric_cols:
            q1, q3 = df[col].quantile(0.25), df[col].quantile(0.75)
            iqr = q3 - q1
            outliers = ((df[col] < q1 - 3*iqr) | (df[col] > q3 + 3*iqr)).sum()
            if outliers > 0:
                issues.append(f"Column '{col}' has {outliers} outliers")
                validity = max(0, validity - 5)
        overall = round((completeness * 0.4 + consistency * 0.3 + validity * 0.3), 1)
        if overall >= 80:
            recommendations.append("Data quality is good — ready for forecasting")
        elif overall >= 60:
            recommendations.append("Data quality is acceptable — consider cleaning before forecasting")
        else:
            recommendations.append("Data quality is poor — clean data before proceeding")
        report = DataQualityReport(
            dataset_id=dataset_id, owner_id=current_user.id,
            overall_score=overall, completeness_score=completeness,
            consistency_score=consistency, validity_score=round(validity, 1),
            issues=issues, recommendations=recommendations,
            row_count=len(df), column_count=len(df.columns),
            missing_pct=missing_pct, duplicate_pct=dup_pct,
        )
        db.add(report)
        db.commit()
        db.refresh(report)
        return _fmt_quality(report, dataset.name)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/data-quality")
def list_quality_reports(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    reports = db.query(DataQualityReport).filter(
        DataQualityReport.owner_id == current_user.id
    ).order_by(DataQualityReport.created_at.desc()).all()
    result = []
    for r in reports:
        ds = db.query(Dataset).filter(Dataset.id == r.dataset_id).first()
        result.append(_fmt_quality(r, ds.name if ds else "Unknown"))
    return result


# ── Announcements ─────────────────────────────────────────────────────────────
@router.post("/announcements", status_code=201)
def create_announcement(data: AnnouncementCreate, db: Session = Depends(get_db),
                         current_user: User = Depends(get_current_user)):
    if not current_user.is_admin and current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Admin only")
    expires = None
    if data.expires_at:
        try:
            expires = datetime.fromisoformat(data.expires_at)
        except Exception:
            pass
    ann = Announcement(title=data.title, content=data.content, type=data.type,
                       owner_id=current_user.id, expires_at=expires)
    db.add(ann)
    db.commit()
    db.refresh(ann)
    return _fmt_ann(ann)


@router.get("/announcements")
def list_announcements(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    anns = db.query(Announcement).filter(
        Announcement.is_active == True
    ).order_by(Announcement.created_at.desc()).all()
    return [_fmt_ann(a) for a in anns if not a.expires_at or a.expires_at > now]


@router.delete("/announcements/{ann_id}")
def delete_announcement(ann_id: int, db: Session = Depends(get_db),
                         current_user: User = Depends(get_current_user)):
    if not current_user.is_admin:
        raise HTTPException(status_code=403, detail="Admin only")
    ann = db.query(Announcement).filter(Announcement.id == ann_id).first()
    if not ann:
        raise HTTPException(status_code=404, detail="Not found")
    db.delete(ann)
    db.commit()
    return {"message": "Deleted"}


def _fmt_gov(g, f):
    return {
        "id": g.id, "forecast_id": g.forecast_id,
        "forecast_name": f.name if f else None,
        "lifecycle_status": g.lifecycle_status, "version": g.version,
        "compliance_notes": g.compliance_notes, "change_log": g.change_log,
        "approved_by": g.approved_by, "published_at": str(g.published_at) if g.published_at else None,
        "archived_at": str(g.archived_at) if g.archived_at else None,
        "created_at": str(g.created_at), "updated_at": str(g.updated_at),
    }


def _fmt_quality(r, dataset_name):
    return {
        "id": r.id, "dataset_id": r.dataset_id, "dataset_name": dataset_name,
        "overall_score": r.overall_score, "completeness_score": r.completeness_score,
        "consistency_score": r.consistency_score, "validity_score": r.validity_score,
        "issues": r.issues, "recommendations": r.recommendations,
        "row_count": r.row_count, "column_count": r.column_count,
        "missing_pct": r.missing_pct, "duplicate_pct": r.duplicate_pct,
        "created_at": str(r.created_at),
    }


def _fmt_ann(a):
    return {
        "id": a.id, "title": a.title, "content": a.content, "type": a.type,
        "is_active": a.is_active, "expires_at": str(a.expires_at) if a.expires_at else None,
        "created_at": str(a.created_at),
    }
