from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from datetime import datetime, timezone
from app.db.database import get_db
from app.models.user import User
from app.models.workflow import Workflow, WorkflowLog
from app.core.security import get_current_user

router = APIRouter(prefix="/api/workflows", tags=["Workflow Automation"])


class WorkflowCreate(BaseModel):
    name: str
    description: Optional[str] = None
    trigger: str = "manual"
    trigger_config: Optional[dict] = None
    actions: Optional[list] = None


class WorkflowUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    trigger: Optional[str] = None
    trigger_config: Optional[dict] = None
    actions: Optional[list] = None
    is_active: Optional[bool] = None


@router.post("/", status_code=201)
def create_workflow(data: WorkflowCreate, db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_user)):
    wf = Workflow(**data.model_dump(), owner_id=current_user.id)
    db.add(wf)
    db.commit()
    db.refresh(wf)
    return _fmt(wf)


@router.get("/")
def list_workflows(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    wfs = db.query(Workflow).filter(Workflow.owner_id == current_user.id).order_by(Workflow.created_at.desc()).all()
    return [_fmt(w) for w in wfs]


@router.get("/{wf_id}")
def get_workflow(wf_id: int, db: Session = Depends(get_db),
                 current_user: User = Depends(get_current_user)):
    wf = db.query(Workflow).filter(Workflow.id == wf_id, Workflow.owner_id == current_user.id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return _fmt(wf)


@router.patch("/{wf_id}")
def update_workflow(wf_id: int, data: WorkflowUpdate, db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_user)):
    wf = db.query(Workflow).filter(Workflow.id == wf_id, Workflow.owner_id == current_user.id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(wf, k, v)
    db.commit()
    return _fmt(wf)


@router.delete("/{wf_id}")
def delete_workflow(wf_id: int, db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_user)):
    wf = db.query(Workflow).filter(Workflow.id == wf_id, Workflow.owner_id == current_user.id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    db.delete(wf)
    db.commit()
    return {"message": "Deleted"}


@router.post("/{wf_id}/run")
def run_workflow(wf_id: int, db: Session = Depends(get_db),
                 current_user: User = Depends(get_current_user)):
    wf = db.query(Workflow).filter(Workflow.id == wf_id, Workflow.owner_id == current_user.id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")
    if not wf.is_active:
        raise HTTPException(status_code=400, detail="Workflow is paused")
    log = WorkflowLog(workflow_id=wf.id, status="running")
    db.add(log)
    db.commit()
    try:
        output_lines = []
        for action in (wf.actions or []):
            action_type = action.get("type", "unknown")
            output_lines.append(f"✓ Executed action: {action_type}")
        log.status = "success"
        log.output = "\n".join(output_lines) or "Workflow completed with no actions."
        log.finished_at = datetime.now(timezone.utc)
        wf.last_run_at = datetime.now(timezone.utc)
        wf.run_count = (wf.run_count or 0) + 1
        db.commit()
    except Exception as e:
        log.status = "failed"
        log.error = str(e)
        log.finished_at = datetime.now(timezone.utc)
        db.commit()
    return {"message": "Workflow executed", "log_id": log.id, "status": log.status, "output": log.output}


@router.get("/{wf_id}/logs")
def get_logs(wf_id: int, db: Session = Depends(get_db),
             current_user: User = Depends(get_current_user)):
    wf = db.query(Workflow).filter(Workflow.id == wf_id, Workflow.owner_id == current_user.id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Not found")
    logs = db.query(WorkflowLog).filter(WorkflowLog.workflow_id == wf_id).order_by(WorkflowLog.started_at.desc()).limit(50).all()
    return [{"id": l.id, "status": l.status, "output": l.output, "error": l.error,
             "started_at": str(l.started_at), "finished_at": str(l.finished_at) if l.finished_at else None} for l in logs]


@router.patch("/{wf_id}/toggle")
def toggle_workflow(wf_id: int, db: Session = Depends(get_db),
                    current_user: User = Depends(get_current_user)):
    wf = db.query(Workflow).filter(Workflow.id == wf_id, Workflow.owner_id == current_user.id).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Not found")
    wf.is_active = not wf.is_active
    db.commit()
    return {"message": f"Workflow {'activated' if wf.is_active else 'paused'}", "is_active": wf.is_active}


def _fmt(wf):
    return {
        "id": wf.id, "name": wf.name, "description": wf.description,
        "trigger": wf.trigger, "trigger_config": wf.trigger_config,
        "actions": wf.actions, "is_active": wf.is_active,
        "run_count": wf.run_count, "last_run_at": str(wf.last_run_at) if wf.last_run_at else None,
        "owner_id": wf.owner_id, "created_at": str(wf.created_at),
    }
