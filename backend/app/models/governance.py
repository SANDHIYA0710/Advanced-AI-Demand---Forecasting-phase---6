from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, JSON, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.database import Base


class ForecastGovernance(Base):
    __tablename__ = "forecast_governance"

    id = Column(Integer, primary_key=True, index=True)
    forecast_id = Column(Integer, ForeignKey("forecasts.id"), nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    lifecycle_status = Column(String(50), default="draft")
    # draft -> submitted -> approved -> published -> archived
    version = Column(Integer, default=1)
    change_log = Column(JSON, nullable=True)
    compliance_notes = Column(Text, nullable=True)
    approved_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    published_at = Column(DateTime, nullable=True)
    archived_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    forecast = relationship("Forecast")
    owner = relationship("User", foreign_keys=[owner_id])
    approver = relationship("User", foreign_keys=[approved_by])


class DataQualityReport(Base):
    __tablename__ = "data_quality_reports"

    id = Column(Integer, primary_key=True, index=True)
    dataset_id = Column(Integer, ForeignKey("datasets.id"), nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    overall_score = Column(Float, nullable=True)      # 0-100
    completeness_score = Column(Float, nullable=True)
    consistency_score = Column(Float, nullable=True)
    validity_score = Column(Float, nullable=True)
    issues = Column(JSON, nullable=True)
    recommendations = Column(JSON, nullable=True)
    row_count = Column(Integer, nullable=True)
    column_count = Column(Integer, nullable=True)
    missing_pct = Column(Float, nullable=True)
    duplicate_pct = Column(Float, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    dataset = relationship("Dataset")
    owner = relationship("User")


class Announcement(Base):
    __tablename__ = "announcements"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    type = Column(String(50), default="info")   # info, warning, success, critical
    is_active = Column(Boolean, default=True)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    owner = relationship("User")
