INSERT INTO categories (name, slug)
VALUES
  ('Idle Game', 'idle-game'),
  ('RPG', 'rpg')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO games (
  name,
  slug,
  description,
  category_id,
  supported_android,
  supported_ios,
  warranty_days,
  warranty_note,
  is_featured
)
SELECT
  'Primitive Brothers : Idle Game',
  'primitive-brothers-idle-game',
  'บริการแพ็คเกจสำหรับ Primitive Brothers พร้อมระบบสรุปข้อมูลก่อนทักแชท',
  categories.id,
  true,
  true,
  7,
  'รับประกัน 7 วัน กรณีเกิดปัญหาตามเงื่อนไขร้าน ดูแลฟรี 1 ครั้ง',
  true
FROM categories
WHERE categories.slug = 'idle-game'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO packages (game_id, name, description, price, badge, is_recommended, sort_order)
SELECT
  id,
  'Starter Boost',
  'เพชร / เงิน / VIP 2,000M B',
  150,
  'ขายดี',
  true,
  1
FROM games
WHERE slug = 'primitive-brothers-idle-game';

INSERT INTO packages (game_id, name, description, price, badge, is_recommended, sort_order)
SELECT
  id,
  'Auto Pack',
  'แพ็คออโต้สำหรับเล่นต่อเนื่อง',
  150,
  'Auto',
  false,
  2
FROM games
WHERE slug = 'primitive-brothers-idle-game';

INSERT INTO packages (game_id, name, description, price, badge, is_recommended, sort_order)
SELECT
  id,
  'Buff Pack',
  'แพ็คบัฟเพิ่มความสะดวก',
  150,
  'Buff',
  false,
  3
FROM games
WHERE slug = 'primitive-brothers-idle-game';

INSERT INTO packages (game_id, name, description, price, badge, is_recommended, sort_order)
SELECT
  id,
  'Ads Remove Pack',
  'แพ็คปิดโฆษณา',
  150,
  'No Ads',
  false,
  4
FROM games
WHERE slug = 'primitive-brothers-idle-game';

