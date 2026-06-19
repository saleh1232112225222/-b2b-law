CREATE TABLE IF NOT EXISTS plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  description TEXT,
  description_ar TEXT,
  interval TEXT NOT NULL DEFAULT 'month',
  price NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'SAR',
  features TEXT[],
  features_ar TEXT[],
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES plans(id),
  status TEXT NOT NULL DEFAULT 'trial',
  trial_start TIMESTAMPTZ DEFAULT NOW(),
  trial_end TIMESTAMPTZ NOT NULL,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id),
  plan_id UUID REFERENCES plans(id),
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'SAR',
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  payment_provider TEXT,
  provider_payment_id TEXT,
  invoice_url TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_company ON subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_payments_company ON payments(company_id);
CREATE INDEX IF NOT EXISTS idx_payments_subscription ON payments(subscription_id);

-- Seed default plans
INSERT INTO plans (name, name_ar, description, description_ar, interval, price, features, features_ar, sort_order)
VALUES
  ('Monthly', 'شهري', 'Full access for one month', 'اشتراك شهري كامل لجميع الميزات', 'month', 99.00,
   ARRAY['Unlimited clients', 'Unlimited cases', 'Unlimited sessions', 'All reports', 'Priority support', 'Data export'],
   ARRAY['موكلين غير محدود', 'قضايا غير محدودة', 'جلسات غير محدودة', 'جميع التقارير', 'دعم ذو أولوية', 'تصدير البيانات'],
   1),
  ('Yearly', 'سنوي', 'Full access for one year (2 months free)', 'اشتراك سنوي كامل (شهران مجاناً)', 'year', 999.00,
   ARRAY['Unlimited clients', 'Unlimited cases', 'Unlimited sessions', 'All reports', 'Priority support', 'Data export', 'Best value'],
   ARRAY['موكلين غير محدود', 'قضايا غير محدودة', 'جلسات غير محدودة', 'جميع التقارير', 'دعم ذو أولوية', 'تصدير البيانات', 'أفضل قيمة'],
   2),
  ('Lifetime', 'مدى الحياة', 'One-time payment, lifetime access', 'دفعة واحدة، وصول مدى الحياة', 'lifetime', 2499.00,
   ARRAY['Unlimited clients', 'Unlimited cases', 'Unlimited sessions', 'All reports', 'Priority support', 'Data export', 'Lifetime updates'],
   ARRAY['موكلين غير محدود', 'قضايا غير محدودة', 'جلسات غير محدودة', 'جميع التقارير', 'دعم ذو أولوية', 'تصدير البيانات', 'تحديثات مدى الحياة'],
   3);
