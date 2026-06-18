from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from datetime import datetime, timezone
from app.db.database import get_db
from app.models.user import User
from app.models.forecast import Forecast
from app.models.approval import ForecastApproval, ApprovalHistory
from app.core.security import get_current_user
from app.services.notification_service import create_notification

router = APIRouter(prefix="/api/approvals", tags=["Approval Workflow"])


class SubmitApproval(BaseModel):
    forecast_id: int
    comments: Optional[str] = None


class ReviewApproval(BaseModel):
    action: str   # approve | reject
    comments: Optional[str] = None
    rejection_reason: Optional[str] = None


@router.post("/submit", status_code=201)
def submit_for_approval(data: SubmitApproval, db: Session = Depends(get_db),
                         current_user: User = Depends(get_current_user)):
    forecast = db.query(Forecast).filter(
        Forecast.id == data.forecast_id, Forecast.owner_id == current_user.id
    ).first()
    if not forecast:
        raise HTTPException(status_code=404, detail="Forecast not found")
    if forecast.status != "completed":
        raise HTTPException(status_code=400, detail="Only completed forecasts can be submitted")
    existing = db.query(ForecastApproval).filter(
        ForecastApproval.forecast_id == data.forecast_id,
        ForecastApproval.status == "pending",
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Already pending approval")
    approval = ForecastApproval(
        forecast_id=data.forecast_id,
        submitted_by=current_user.id,
        status="pending",
        comments=data.comments,
    )
    db.add(approval)
    db.commit()
    db.refresh(approval)
    _add_history(db, approval.id, "submitted", current_user.id, "Submitted for approval")
    create_notification(db, current_user.id, "Forecast Submitted",
                        f"'{forecast.name}' has been submitted for approval.", "info")
    return _fmt(approval, db)


@router.get("/")
def list_approvals(status: Optional[str] = None,
                   db: Session = Depends(get_db),
                   current_user: User = Depends(get_current_user)):
    query = db.query(ForecastApproval)
    if current_user.is_admin or (current_user.role in ["super_admin", "manager"]):
        pass   # admins see all
    else:
        query = query.filter(ForecastApproval.submitted_by == current_user.id)
    if status:
        query = query.filter(ForecastApproval.status == status)
    approvals = query.order_by(ForecastApproval.submitted_at.desc()).all()
    return [_fmt(a, db) for a in approvals]


@router.get("/{approval_id}")
def get_approval(approval_id: int, db: Session = Depends(get_db),
                 current_user: User = Depends(get_current_user)):
    approval = db.query(ForecastApproval).filter(ForecastApproval.id == approval_id).first()
    if not approval:
        raise HTTPException(status_code=404, detail="Approval not found")
    return _fmt(approval, db)


@router.post("/{approval_id}/review")
def review_approval(approval_id: int, data: ReviewApproval,
                    db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_user)):
    if not current_user.is_admin and current_user.role not in ["super_admin", "analyst"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions to review")
    approval = db.query(ForecastApproval).filter(ForecastApproval.id == approval_id).first()
    if not approval:
        raise HTTPException(status_code=404, detail="Approval not found")
    if approval.status != "pending":
        raise HTTPException(status_code=400, detail=f"Approval already {approval.status}")
    if data.action not in ["approve", "reject"]:
        raise HTTPException(status_code=400, detail="Action must be approve or reject")
    approval.status = "approved" if data.action == "approve" else "rejected"
    approval.reviewed_by = current_user.id
    approval.reviewed_at = datetime.now(timezone.utc)
    approval.comments = data.comments
    approval.rejection_reason = data.rejection_reason
    db.commit()
    _add_history(db, approval.id, approval.status, current_user.id,
                 data.comments or data.rejection_reason or f"Forecast {approval.status}")
    forecast = db.query(Forecast).filter(Forecast.id == approval.forecast_id).first()
    create_notification(db, approval.submitted_by, f"Forecast {approval.status.title()}",
                        f"'{forecast.name if forecast else ''}' was {approval.status}.", "success" if approval.status == "approved" else "error")
    return _fmt(approval, db)


@router.get("/{approval_id}/history")
def get_history(approval_id: int, db: Session = Depends(get_db),
                current_user: User = Depends(get_current_user)):
    history = db.query(ApprovalHistory).filter(
        ApprovalHistory.approval_id == approval_id
    ).order_by(ApprovalHistory.created_at.asc()).all()
    return [{"id": h.id, "action": h.action, "performed_by": h.performed_by,
             "note": h.note, "created_at": str(h.created_at)} for h in history]


def _add_history(db, approval_id, action, user_id, note=None):
    h = ApprovalHistory(approval_id=approval_id, action=action, performed_by=user_id, note=note)
    db.add(h)
    db.commit()


def _fmt(a, db):
    forecast = db.query(Forecast).filter(Forecast.id == a.forecast_id).first()
    return {
        "id": a.id, "forecast_id": a.forecast_id,
        "forecast_name": forecast.name if forecast else None,
        "forecast_model": forecast.model_type if forecast else None,
        "submitted_by": a.submitted_by, "reviewed_by": a.reviewed_by,
        "status": a.status, "comments": a.comments,
        "rejection_reason": a.rejection_reason,
        "submitted_at": str(a.submitted_at),
        "reviewed_at": str(a.reviewed_at) if a.reviewed_at else None,
    }
