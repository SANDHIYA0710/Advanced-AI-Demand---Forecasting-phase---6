from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional
from pydantic import BaseModel
from datetime import datetime, timezone
from app.db.database import get_db
from app.models.user import User
from app.models.organization import Organization, OrgMember
from app.core.security import get_current_user
from app.services.activity_service import log_activity

router = APIRouter(prefix="/api/organizations", tags=["Organizations"])

ROLES = ["owner", "admin", "manager", "analyst", "viewer"]


class OrgCreate(BaseModel):
    name: str
    description: Optional[str] = None
    plan: str = "standard"
    settings: Optional[dict] = None


class OrgUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    plan: Optional[str] = None
    status: Optional[str] = None
    settings: Optional[dict] = None


class MemberAdd(BaseModel):
    user_id: int
    role: str = "analyst"


@router.post("/", status_code=201)
def create_org(data: OrgCreate, db: Session = Depends(get_db),
               current_user: User = Depends(get_current_user)):
    if db.query(Organization).filter(Organization.name == data.name).first():
        raise HTTPException(status_code=400, detail="Organization name already exists")
    org = Organization(**data.model_dump(), owner_id=current_user.id)
    db.add(org)
    db.commit()
    db.refresh(org)
    member = OrgMember(org_id=org.id, user_id=current_user.id, role="owner")
    db.add(member)
    db.commit()
    log_activity(db, "org_created", user_id=current_user.id, resource="organization", resource_id=org.id)
    return _fmt(org, db)


@router.get("/")
def list_orgs(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Show orgs where user is a member or owner
    member_org_ids = [m.org_id for m in db.query(OrgMember).filter(OrgMember.user_id == current_user.id).all()]
    orgs = db.query(Organization).filter(Organization.id.in_(member_org_ids)).all()
    return [_fmt(o, db) for o in orgs]


@router.get("/{org_id}")
def get_org(org_id: int, db: Session = Depends(get_db),
            current_user: User = Depends(get_current_user)):
    org = _get_org_or_404(org_id, db, current_user)
    return _fmt(org, db)


@router.patch("/{org_id}")
def update_org(org_id: int, data: OrgUpdate, db: Session = Depends(get_db),
               current_user: User = Depends(get_current_user)):
    org = _get_org_or_404(org_id, db, current_user)
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(org, k, v)
    org.updated_at = datetime.now(timezone.utc)
    db.commit()
    return _fmt(org, db)


@router.delete("/{org_id}")
def delete_org(org_id: int, db: Session = Depends(get_db),
               current_user: User = Depends(get_current_user)):
    org = db.query(Organization).filter(
        Organization.id == org_id, Organization.owner_id == current_user.id
    ).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found or not owner")
    db.delete(org)
    db.commit()
    return {"message": "Organization deleted"}


@router.get("/{org_id}/members")
def list_members(org_id: int, db: Session = Depends(get_db),
                 current_user: User = Depends(get_current_user)):
    _get_org_or_404(org_id, db, current_user)
    members = db.query(OrgMember).filter(OrgMember.org_id == org_id).all()
    return [{"id": m.id, "user_id": m.user_id, "role": m.role,
             "username": m.user.username if m.user else None,
             "email": m.user.email if m.user else None,
             "joined_at": str(m.joined_at)} for m in members]


@router.post("/{org_id}/members", status_code=201)
def add_member(org_id: int, data: MemberAdd, db: Session = Depends(get_db),
               current_user: User = Depends(get_current_user)):
    _get_org_or_404(org_id, db, current_user)
    if data.role not in ROLES:
        raise HTTPException(status_code=400, detail=f"Role must be one of {ROLES}")
    existing = db.query(OrgMember).filter(
        OrgMember.org_id == org_id, OrgMember.user_id == data.user_id
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already a member")
    member = OrgMember(org_id=org_id, user_id=data.user_id, role=data.role)
    db.add(member)
    db.commit()
    return {"message": "Member added", "user_id": data.user_id, "role": data.role}


@router.patch("/{org_id}/members/{user_id}")
def update_member_role(org_id: int, user_id: int, role: str,
                       db: Session = Depends(get_db),
                       current_user: User = Depends(get_current_user)):
    _get_org_or_404(org_id, db, current_user)
    if role not in ROLES:
        raise HTTPException(status_code=400, detail=f"Role must be one of {ROLES}")
    member = db.query(OrgMember).filter(
        OrgMember.org_id == org_id, OrgMember.user_id == user_id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    member.role = role
    db.commit()
    return {"message": "Role updated", "role": role}


@router.delete("/{org_id}/members/{user_id}")
def remove_member(org_id: int, user_id: int, db: Session = Depends(get_db),
                  current_user: User = Depends(get_current_user)):
    _get_org_or_404(org_id, db, current_user)
    member = db.query(OrgMember).filter(
        OrgMember.org_id == org_id, OrgMember.user_id == user_id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    db.delete(member)
    db.commit()
    return {"message": "Member removed"}


def _get_org_or_404(org_id, db, current_user):
    member = db.query(OrgMember).filter(
        OrgMember.org_id == org_id, OrgMember.user_id == current_user.id
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Organization not found")
    return db.query(Organization).filter(Organization.id == org_id).first()


def _fmt(org, db):
    count = db.query(OrgMember).filter(OrgMember.org_id == org.id).count()
    return {
        "id": org.id, "name": org.name, "description": org.description,
        "plan": org.plan, "status": org.status, "settings": org.settings,
        "owner_id": org.owner_id, "member_count": count,
        "created_at": str(org.created_at), "updated_at": str(org.updated_at),
    }
