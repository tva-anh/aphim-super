-- ============================================================
-- APHIM SUPER — SUPABASE SQL SCHEMA
-- Copy toàn bộ và chạy trong: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- BẢNG 1: profiles (mở rộng auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL DEFAULT '',
  phone           TEXT DEFAULT '',
  avatar_url      TEXT DEFAULT '',
  role            TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','vip','admin')),
  is_blocked      BOOLEAN NOT NULL DEFAULT false,
  equipped_frame  TEXT DEFAULT 'frame_none',
  equipped_banner TEXT DEFAULT 'banner_default',
  profile_cover   TEXT DEFAULT '',
  xu              INTEGER NOT NULL DEFAULT 150,
  xp              INTEGER NOT NULL DEFAULT 0,
  level           INTEGER NOT NULL DEFAULT 1,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger: tự tạo profile khi user đăng ký
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- BẢNG 2: vip_subscriptions
CREATE TABLE IF NOT EXISTS vip_subscriptions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan         TEXT NOT NULL DEFAULT 'PREMIUM' CHECK (plan IN ('PREMIUM','FAMILY','FREE')),
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('active','expired','pending','cancelled')),
  started_at   TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ,
  payment_ref  TEXT DEFAULT '',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- BẢNG 3: transactions
CREATE TABLE IF NOT EXISTS transactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type             TEXT NOT NULL CHECK (type IN ('vip_purchase','xu_topup','xu_redeem_vip','admin_adjust')),
  amount_vnd       INTEGER NOT NULL DEFAULT 0,
  xu_amount        INTEGER NOT NULL DEFAULT 0,
  plan_code        TEXT DEFAULT '',
  transfer_content TEXT DEFAULT '',
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','rejected')),
  note             TEXT DEFAULT '',
  confirmed_by     UUID REFERENCES auth.users(id),
  confirmed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- BẢNG 4: system_settings
CREATE TABLE IF NOT EXISTS system_settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL DEFAULT '{}',
  category   TEXT NOT NULL DEFAULT 'general',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Dữ liệu mặc định cho system_settings
INSERT INTO system_settings (key, value, category) VALUES
  ('site_name',         '"APhim Super"',                  'general'),
  ('maintenance_mode',  'false',                           'general'),
  ('allow_register',    'true',                            'general'),
  ('allow_comments',    'true',                            'general'),
  ('api_primary',       '"https://ophim1.com/v1/api"',     'content'),
  ('api_secondary',     '"https://phim.nguonc.com/api"',   'content'),
  ('enable_phim_x',     'false',                           'content'),
  ('bank_name',         '"MB Bank"',                       'payment'),
  ('bank_account',      '"048889019999"',                  'payment'),
  ('bank_owner',        '"TRAN VAN ANH"',                  'payment'),
  ('price_premium',     '69000',                           'payment'),
  ('price_family',      '699000',                          'payment')
ON CONFLICT (key) DO NOTHING;

-- BẢNG 5: banners
CREATE TABLE IF NOT EXISTS banners (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        TEXT NOT NULL CHECK (type IN ('hero_slider','catfish','popup','inline')),
  title       TEXT NOT NULL DEFAULT '',
  image_url   TEXT NOT NULL DEFAULT '',
  link_url    TEXT DEFAULT '',
  is_active   BOOLEAN NOT NULL DEFAULT true,
  position    INTEGER NOT NULL DEFAULT 0,
  target      TEXT NOT NULL DEFAULT 'all' CHECK (target IN ('all','free','vip')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE vip_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions      ENABLE ROW LEVEL SECURITY;

-- Profiles: user chỉ đọc/sửa của chính mình
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_service_all" ON profiles;
CREATE POLICY "profiles_service_all" ON profiles FOR ALL USING (true) WITH CHECK (true);

-- VIP subscriptions: user chỉ đọc của mình
DROP POLICY IF EXISTS "vip_select_own" ON vip_subscriptions;
CREATE POLICY "vip_select_own" ON vip_subscriptions FOR SELECT USING (auth.uid() = user_id);

-- Transactions: user chỉ đọc của mình, chỉ tạo mới
DROP POLICY IF EXISTS "tx_select_own" ON transactions;
CREATE POLICY "tx_select_own" ON transactions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "tx_insert_own" ON transactions;
CREATE POLICY "tx_insert_own" ON transactions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Banners: public đọc được
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "banners_public_read" ON banners;
CREATE POLICY "banners_public_read" ON banners FOR SELECT USING (true);

-- System settings: public đọc được
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "settings_public_read" ON system_settings;
CREATE POLICY "settings_public_read" ON system_settings FOR SELECT USING (true);

-- ============================================================
-- TẠO TÀI KHOẢN ADMIN (Chạy sau khi tạo xong schema)
-- Đăng ký user bình thường tại /admin/login trước, 
-- sau đó chạy lệnh này để cấp quyền admin:
-- UPDATE profiles SET role = 'admin' WHERE email = 'your-admin@email.com';
-- ============================================================
