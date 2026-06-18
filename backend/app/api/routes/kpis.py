from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from datetime import datetime, timezone
from app.db.database import get_db
from app.models.user import User
from app.models.kpi import KPI, StrategicTarget
from app.core.security import get_current_user

router = APIRouter(prefix="/api/kpis", tags=["KPI Management"])


class KPICreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    target_value: Optional[float] = None
    current_value: Optional[float] = None
    alert_threshold: Optional[float] = None
    alert_operator: str = "<"


class KPIUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    target_value: Optional[float] = None
    current_value: Optional[float] = None
    alert_threshold: Optional[float] = None
    alert_operator: Optional[str] = None
    is_active: Optional[bool] = None


class TargetCreate(BaseModel):
    name: str
    period_type: str = "annual"
    period_label: Optional[str] = None
    target_revenue: Optional[float] = None
    target_units: Optional[float] = None
    target_growth_pct: Optional[float] = None
    actual_revenue: Optional[float] = None
    actual_units: Optional[float] = None
    notes: Optional[str] = None


@router.post("/", status_code=201)
def create_kpi(data: KPICreate, db: Session = Depends(get_db),
               current_user: User = Depends(get_current_user)):
    kpi = KPI(**data.model_dump(), owner_id=current_user.id)
    db.add(kpi)
    db.commit()
    db.refresh(kpi)
    return _fmt_kpi(kpi)


@router.get("/")
def list_kpis(category: Optional[str] = None, db: Session = Depends(get_db),
              current_user: User = Depends(get_current_user)):
    query = db.query(KPI).filter(KPI.owner_id == current_user.id)
    if category:
        query = query.filter(KPI.category == category)
    kpis = query.order_by(KPI.created_at.desc()).all()
    return [_fmt_kpi(k) for k in kpis]


@router.get("/{kpi_id}")
def get_kpi(kpi_id: int, db: Session = Depends(get_db),
            current_user: User = Depends(get_current_user)):
    kpi = db.query(KPI).filter(KPI.id == kpi_id, KPI.owner_id == current_user.id).first()
    if not kpi:
        raise HTTPException(status_code=404, detail="KPI not found")
    return _fmt_kpi(kpi)


@router.patch("/{kpi_id}")
def update_kpi(kpi_id: int, data: KPIUpdate, db: Session = Depends(get_db),
               current_user: User = Depends(get_current_user)):
    kpi = db.query(KPI).filter(KPI.id == kpi_id, KPI.owner_id == current_user.id).first()
    if not kpi:
        raise HTTPException(status_code=404, detail="KPI not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(kpi, k, v)
    kpi.updated_at = datetime.now(timezone.utc)
    db.commit()
    return _fmt_kpi(kpi)


@router.delete("/{kpi_id}")
def delete_kpi(kpi_id: int, db: Session = Depends(get_db),
               current_user: User = Depends(get_current_user)):
    kpi = db.query(KPI).filter(KPI.id == kpi_id, KPI.owner_id == current_user.id).first()
    if not kpi:
        raise HTTPException(status_code=404, detail="KPI not found")
    db.delete(kpi)
    db.commit()
    return {"message": "KPI deleted"}


@router.get("/summary/alerts")
def kpi_alerts(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    kpis = db.query(KPI).filter(KPI.owner_id == current_user.id, KPI.is_active == True).all()
    alerts = []
    for kpi in kpis:
        if kpi.alert_threshold is None or kpi.current_value is None:
            continue
        triggered = False
        if kpi.alert_operator == "<" and kpi.current_value < kpi.alert_threshold:
            triggered = True
        elif kpi.alert_operator == ">" and kpi.current_value > kpi.alert_threshold:
            triggered = True
        elif kpi.alert_operator == "=" and kpi.current_value == kpi.alert_threshold:
            triggered = True
        if triggered:
            alerts.append({"kpi_id": kpi.id, "name": kpi.name,
                           "current_value": kpi.current_value, "threshold": kpi.alert_threshold,
                           "operator": kpi.alert_operator, "unit": kpi.unit})
    return {"alerts": alerts, "count": len(alerts)}


# ── Strategic Targets ─────────────────────────────────────────────────────────
@router.post("/targets", status_code=201)
def create_target(data: TargetCreate, db: Session = Depends(get_db),
                  current_user: User = Depends(get_current_user)):
    target = StrategicTarget(**data.model_dump(), owner_id=current_user.id)
    db.add(target)
    db.commit()
    db.refresh(target)
    return _fmt_target(target)


@router.get("/targets")
def list_targets(period_type: Optional[str] = None, db: Session = Depends(get_db),
                 current_user: User = Depends(get_current_user)):
    query = db.query(StrategicTarget).filter(StrategicTarget.owner_id == current_user.id)
    if period_type:
        query = query.filter(StrategicTarget.period_type == period_type)
    return [_fmt_target(t) for t in query.order_by(StrategicTarget.created_at.desc()).all()]


@router.patch("/targets/{target_id}")
def update_target(target_id: int, data: TargetCreate, db: Session = Depends(get_db),
                  current_user: User = Depends(get_current_user)):
    target = db.query(StrategicTarget).filter(
        StrategicTarget.id == target_id, StrategicTarget.owner_id == current_user.id
    ).first()
    if not target:
        raise HTTPException(status_code=404, detail="Target not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(target, k, v)
    db.commit()
    return _fmt_target(target)


@router.delete("/targets/{target_id}")
def delete_target(target_id: int, db: Session = Depends(get_db),
                  current_user: User = Depends(get_current_user)):
    target = db.query(StrategicTarget).filter(
        StrategicTarget.id == target_id, StrategicTarget.owner_id == current_user.id
    ).first()
    if not target:
        raise HTTPException(status_code=404, detail="Target not found")
    db.delete(target)
    db.commit()
    return {"message": "Target deleted"}


def _fmt_kpi(k):
    progress = None
    if k.target_value and k.current_value:
        progress = round(k.current_value / k.target_value * 100, 1)
    return {
        "id": k.id, "name": k.name, "description": k.description,
        "category": k.category, "unit": k.unit,
        "target_value": k.target_value, "current_value": k.current_value,
        "alert_threshold": k.alert_threshold, "alert_operator": k.alert_operator,
        "progress_pct": progress, "is_active": k.is_active,
        "owner_id": k.owner_id, "created_at": str(k.created_at),
    }


def _fmt_target(t):
    rev_progress = None
    if t.target_revenue and t.actual_revenue:
        rev_progress = round(t.actual_revenue / t.target_revenue * 100, 1)
    return {
        "id": t.id, "name": t.name, "period_type": t.period_type,
        "period_label": t.period_label, "target_revenue": t.target_revenue,
        "target_units": t.target_units, "target_growth_pct": t.target_growth_pct,
        "actual_revenue": t.actual_revenue, "actual_units": t.actual_units,
        "revenue_progress_pct": rev_progress, "notes": t.notes,
        "owner_id": t.owner_id, "created_at": str(t.created_at),
    }
