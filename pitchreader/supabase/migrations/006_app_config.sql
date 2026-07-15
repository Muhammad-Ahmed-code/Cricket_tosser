CREATE TABLE IF NOT EXISTS app_config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT INTO app_config (key, value) VALUES
  ('min_ios_version',      '1.0.0'),
  ('min_android_version',  '1.0.0'),
  ('force_update_message', 'A new version of Cricket Tosser is required. Please update to continue.'),
  ('soft_update_message',  'A new version of Cricket Tosser is available with improvements and bug fixes.'),
  ('ios_store_url',        'https://apps.apple.com/app/idYOUR_APP_ID'),
  ('android_store_url',    'https://play.google.com/store/apps/details?id=YOUR_PACKAGE_NAME')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read app_config"
  ON app_config FOR SELECT
  USING (true);
