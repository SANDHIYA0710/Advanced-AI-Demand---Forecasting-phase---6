from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.database import Base


class ForecastApproval(Base):
    __tablename__ = "forecast_approvals"

    id = Column(Integer, primary_key=True, index=True)
    forecast_id = Column(Integer, ForeignKey("forecasts.id"), nullable=False)
    submitted_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    reviewed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(String(50), default="pending")   # pending, approved, rejected
    comments = Column(Text, nullable=True)
    rejection_reason = Column(Text, nullable=True)
    submitted_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    reviewed_at = Column(DateTime, nullable=True)

    forecast = relationship("Forecast")
    submitter = relationship("User", foreign_keys=[submitted_by])
    reviewer = relationship("User", foreign_keys=[reviewed_by])
    history = relationship("ApprovalHistory", back_populates="approval", cascade="all, delete-orphan")


class ApprovalHistory(Base):
    __tablename__ = "approval_history"

    id = Column(Integer, primary_key=True, index=True)
    approval_id = Column(Integer, ForeignKey("forecast_approvals.id"), nullable=False)
    action = Column(String(100), nullable=False)
    performed_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    note = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    approval = relationship("ForecastApproval", back_populates="history")
    actor = relationship("User")
