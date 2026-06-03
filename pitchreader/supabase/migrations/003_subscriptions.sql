CREATE TABLE IF NOT EXISTS subscriptions (
  user_id TEXT PRIMARY KEY,
  is_subscribed BOOLEAN DEFAULT false,
  product_id TEXT,
  expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own subscription" ON subscriptions
  FOR SELECT USING (user_id = requesting_user_id());

CREATE POLICY "Users manage own subscription" ON subscriptions
  FOR ALL USING (user_id = requesting_user_id())
  WITH CHECK (user_id = requesting_user_id());
