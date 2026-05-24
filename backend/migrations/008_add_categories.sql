-- добавить недостающие категории
INSERT INTO categories (name, default_expiry_days)
VALUES
  ('Консервы',       730),
  ('Масла и жиры',   365),
  ('Снеки и сладкое', 180)
ON CONFLICT (name) DO UPDATE SET default_expiry_days = EXCLUDED.default_expiry_days;

-- уточнить дефолты существующих категорий
UPDATE categories SET default_expiry_days = 14  WHERE name = 'Молочные продукты';
UPDATE categories SET default_expiry_days = 5   WHERE name = 'Мясо и птица';
UPDATE categories SET default_expiry_days = 3   WHERE name = 'Рыба и морепродукты';
