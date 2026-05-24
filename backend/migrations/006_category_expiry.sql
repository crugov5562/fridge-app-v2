-- срок годности по умолчанию для каждой категории (дней)
ALTER TABLE categories ADD COLUMN IF NOT EXISTS default_expiry_days integer NOT NULL DEFAULT 7;

UPDATE categories SET default_expiry_days = 3   WHERE name = 'Мясо и птица';
UPDATE categories SET default_expiry_days = 2   WHERE name = 'Рыба и морепродукты';
UPDATE categories SET default_expiry_days = 7   WHERE name = 'Молочные продукты';
UPDATE categories SET default_expiry_days = 28  WHERE name = 'Яйца';
UPDATE categories SET default_expiry_days = 7   WHERE name = 'Овощи';
UPDATE categories SET default_expiry_days = 7   WHERE name = 'Фрукты';
UPDATE categories SET default_expiry_days = 5   WHERE name = 'Зелень';
UPDATE categories SET default_expiry_days = 30  WHERE name = 'Напитки';
UPDATE categories SET default_expiry_days = 5   WHERE name = 'Хлебобулочные';
UPDATE categories SET default_expiry_days = 365 WHERE name = 'Крупы и макароны';
UPDATE categories SET default_expiry_days = 3   WHERE name = 'Готовые блюда';
UPDATE categories SET default_expiry_days = 90  WHERE name = 'Соусы и приправы';
UPDATE categories SET default_expiry_days = 180 WHERE name = 'Замороженные';
