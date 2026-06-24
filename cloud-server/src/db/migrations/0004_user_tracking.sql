-- User Login Logs: track every login attempt (success/failure)
CREATE TABLE IF NOT EXISTS user_login_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  login_time TIMESTAMPTZ DEFAULT NOW(),
  logout_time TIMESTAMPTZ,
  ip_address TEXT,
  user_agent TEXT,
  device_info TEXT,
  browser_info TEXT,
  is_successful BOOLEAN DEFAULT TRUE,
  failure_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_login_logs_user_id ON user_login_logs(user_id);
CREATE INDEX idx_login_logs_company_id ON user_login_logs(company_id);
CREATE INDEX idx_login_logs_created_at ON user_login_logs(created_at DESC);

-- User Activity Logs: track user actions inside the system
CREATE TABLE IF NOT EXISTS user_activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  activity_description TEXT,
  entity_type TEXT,
  entity_id UUID,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_logs_user_id ON user_activity_logs(user_id);
CREATE INDEX idx_activity_logs_company_id ON user_activity_logs(company_id);
CREATE INDEX idx_activity_logs_created_at ON user_activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_type ON user_activity_logs(activity_type);
