from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Float, JSON, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.database import Base


class KPI(Base):
    __tablename__ = "kpis"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    category = Column(String(100), nullable=True)
    unit = Column(String(50), nullable=True)          # %, $, units, etc.
    target_value = Column(Float, nullable=True)
    current_value = Column(Float, nullable=True)
    alert_threshold = Column(Float, nullable=True)
    alert_operator = Column(String(20), default="<")  # <, >, =
    trend_data = Column(JSON, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    owner = relationship("User")


class StrategicTarget(Base):
    __tablename__ = "strategic_targets"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    period_type = Column(String(50), default="annual")   # annual, quarterly, monthly
    period_label = Column(String(50), nullable=True)     # "2024", "Q1-2024"
    target_revenue = Column(Float, nullable=True)
    target_units = Column(Float, nullable=True)
    target_growth_pct = Column(Float, nullable=True)
    actual_revenue = Column(Float, nullable=True)
    actual_units = Column(Float, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    owner = relationship("User")
