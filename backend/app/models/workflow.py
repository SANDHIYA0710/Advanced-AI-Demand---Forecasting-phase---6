from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, JSON, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.database import Base


class Workflow(Base):
    __tablename__ = "workflows"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    trigger = Column(String(100), nullable=False)   # schedule, event, manual
    trigger_config = Column(JSON, nullable=True)    # cron, event name, etc.
    actions = Column(JSON, nullable=True)           # list of actions to perform
    is_active = Column(Boolean, default=True)
    last_run_at = Column(DateTime, nullable=True)
    run_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    owner = relationship("User")
    logs = relationship("WorkflowLog", back_populates="workflow", cascade="all, delete-orphan")


class WorkflowLog(Base):
    __tablename__ = "workflow_logs"

    id = Column(Integer, primary_key=True, index=True)
    workflow_id = Column(Integer, ForeignKey("workflows.id"), nullable=False)
    status = Column(String(50), default="running")   # running, success, failed
    output = Column(Text, nullable=True)
    error = Column(Text, nullable=True)
    started_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    finished_at = Column(DateTime, nullable=True)

    workflow = relationship("Workflow", back_populates="logs")
