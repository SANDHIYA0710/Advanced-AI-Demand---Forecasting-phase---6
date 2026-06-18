USE demand_forecasting;

CREATE TABLE IF NOT EXISTS organizations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT NULL,
    owner_id INT NOT NULL,
    plan VARCHAR(50) DEFAULT 'standard',
    status VARCHAR(50) DEFAULT 'active',
    settings JSON NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_owner (owner_id)
);

CREATE TABLE IF NOT EXISTS org_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    org_id INT NOT NULL,
    user_id INT NOT NULL,
    role VARCHAR(50) DEFAULT 'member',
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_org (org_id),
    INDEX idx_user (user_id)
);

CREATE TABLE IF NOT EXISTS forecast_approvals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    forecast_id INT NOT NULL,
    submitted_by INT NOT NULL,
    reviewed_by INT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    comments TEXT NULL,
    rejection_reason TEXT NULL,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reviewed_at DATETIME NULL,
    INDEX idx_forecast (forecast_id),
    INDEX idx_status (status)
);

CREATE TABLE IF NOT EXISTS approval_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    approval_id INT NOT NULL,
    action VARCHAR(100) NOT NULL,
    performed_by INT NOT NULL,
    note TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_approval (approval_id)
);

CREATE TABLE IF NOT EXISTS workflows (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    owner_id INT NOT NULL,
    trigger VARCHAR(100) NOT NULL,
    trigger_config JSON NULL,
    actions JSON NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_run_at DATETIME NULL,
    run_count INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_owner (owner_id)
);

CREATE TABLE IF NOT EXISTS workflow_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    workflow_id INT NOT NULL,
    status VARCHAR(50) DEFAULT 'running',
    output TEXT NULL,
    error TEXT NULL,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    finished_at DATETIME NULL,
    INDEX idx_workflow (workflow_id)
);

CREATE TABLE IF NOT EXISTS kpis (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT NULL,
    owner_id INT NOT NULL,
    category VARCHAR(100) NULL,
    unit VARCHAR(50) NULL,
    target_value FLOAT NULL,
    current_value FLOAT NULL,
    alert_threshold FLOAT NULL,
    alert_operator VARCHAR(20) DEFAULT '<',
    trend_data JSON NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_owner (owner_id)
);

CREATE TABLE IF NOT EXISTS strategic_targets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    period_type VARCHAR(50) DEFAULT 'annual',
    period_label VARCHAR(50) NULL,
    target_revenue FLOAT NULL,
    target_units FLOAT NULL,
    target_growth_pct FLOAT NULL,
    actual_revenue FLOAT NULL,
    actual_units FLOAT NULL,
    notes TEXT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_owner (owner_id)
);

CREATE TABLE IF NOT EXISTS forecast_governance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    forecast_id INT NOT NULL,
    owner_id INT NOT NULL,
    lifecycle_status VARCHAR(50) DEFAULT 'draft',
    version INT DEFAULT 1,
    change_log JSON NULL,
    compliance_notes TEXT NULL,
    approved_by INT NULL,
    published_at DATETIME NULL,
    archived_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_forecast (forecast_id)
);

CREATE TABLE IF NOT EXISTS data_quality_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    dataset_id INT NOT NULL,
    owner_id INT NOT NULL,
    overall_score FLOAT NULL,
    completeness_score FLOAT NULL,
    consistency_score FLOAT NULL,
    validity_score FLOAT NULL,
    issues JSON NULL,
    recommendations JSON NULL,
    row_count INT NULL,
    column_count INT NULL,
    missing_pct FLOAT NULL,
    duplicate_pct FLOAT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_dataset (dataset_id)
);

CREATE TABLE IF NOT EXISTS announcements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    is_active BOOLEAN DEFAULT TRUE,
    expires_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

SELECT 'Phase 6 migration complete!' AS status;
