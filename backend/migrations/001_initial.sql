-- включаем pgvector
create extension if not exists vector;
create extension if not exists "uuid-ossp";

-- единицы измерения
create table if not exists measurement_units (
  id           uuid primary key default gen_random_uuid(),
  name         text not null unique,
  abbreviation text not null unique
);

insert into measurement_units (name, abbreviation) values
  ('килограмм', 'кг'),
  ('грамм', 'г'),
  ('литр', 'л'),
  ('миллилитр', 'мл'),
  ('штука', 'шт'),
  ('упаковка', 'уп'),
  ('пучок', 'пуч'),
  ('столовая ложка', 'ст.л.'),
  ('чайная ложка', 'ч.л.')
on conflict (name) do nothing;

-- категории продуктов
create table if not exists categories (
  id         uuid primary key default gen_random_uuid(),
  name       text not null unique,
  icon       text,
  created_at timestamptz not null default now()
);

insert into categories (name, icon) values
  ('Мясо и птица', 'drumstick'),
  ('Рыба и морепродукты', 'fish'),
  ('Молочные продукты', 'milk'),
  ('Яйца', 'egg'),
  ('Овощи', 'carrot'),
  ('Фрукты', 'apple'),
  ('Зелень', 'leaf'),
  ('Напитки', 'cup'),
  ('Хлебобулочные', 'bread'),
  ('Крупы и макароны', 'wheat'),
  ('Готовые блюда', 'utensils'),
  ('Соусы и приправы', 'bottle'),
  ('Замороженные', 'snowflake'),
  ('Другое', 'box')
on conflict (name) do nothing;

-- типы зон хранения
create table if not exists zone_types (
  id       uuid primary key default gen_random_uuid(),
  name     text not null unique,
  position integer not null default 0
);

insert into zone_types (name, position) values
  ('Верхняя полка', 1),
  ('Средняя полка', 2),
  ('Нижняя полка', 3),
  ('Дверца', 4),
  ('Фреш-зона', 5),
  ('Морозилка', 6),
  ('Овощной ящик', 7)
on conflict (name) do nothing;

-- справочник аллергенов
create table if not exists allergens (
  id   uuid primary key default gen_random_uuid(),
  name text not null unique
);

insert into allergens (name) values
  ('Глютен'), ('Лактоза'), ('Арахис'), ('Орехи'),
  ('Яйца'), ('Рыба'), ('Морепродукты'), ('Соя'),
  ('Кунжут'), ('Горчица'), ('Сельдерей'), ('Сульфиты')
on conflict (name) do nothing;

-- пользователи (своя таблица без Supabase)
create table if not exists users (
  id                 uuid primary key default gen_random_uuid(),
  email              text not null unique,
  password_hash      text not null,
  display_name       text,
  avatar_url         text,
  notify_days_before integer not null default 2,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- холодильники
create table if not exists fridges (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  name       text not null default 'Мой холодильник',
  created_at timestamptz not null default now()
);

-- зоны конкретного холодильника
create table if not exists fridge_zones (
  id           uuid primary key default gen_random_uuid(),
  fridge_id    uuid not null references fridges(id) on delete cascade,
  zone_type_id uuid not null references zone_types(id) on delete cascade,
  unique (fridge_id, zone_type_id)
);

-- аллергены пользователя
create table if not exists user_allergies (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users(id) on delete cascade,
  allergen_id uuid not null references allergens(id) on delete cascade,
  severity    text check (severity in ('mild', 'moderate', 'severe')),
  created_at  timestamptz not null default now(),
  unique (user_id, allergen_id)
);

-- каталог продуктов
create table if not exists product_catalog (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null unique,
  category_id         uuid references categories(id) on delete set null,
  zone_type_id        uuid references zone_types(id) on delete set null,
  default_expiry_days integer,
  created_at          timestamptz not null default now()
);

-- правила хранения с эмбеддингами для RAG
create table if not exists storage_rules (
  id                      uuid primary key default gen_random_uuid(),
  category_id             uuid references categories(id) on delete set null,
  zone_type_id            uuid references zone_types(id) on delete set null,
  rule_text               text not null,
  embedding               vector(384),
  embedding_model_version text not null default 'multilingual-e5-small',
  created_at              timestamptz not null default now()
);

create index if not exists storage_rules_embedding_idx
  on storage_rules
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- инвентарь
create table if not exists inventory_items (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users(id) on delete cascade,
  fridge_id    uuid not null references fridges(id) on delete cascade,
  name         text not null,
  category_id  uuid references categories(id) on delete set null,
  zone_type_id uuid references zone_types(id) on delete set null,
  quantity     numeric(10, 2) not null default 1,
  unit_id      uuid references measurement_units(id) on delete set null,
  expiry_date  date,
  photo_url    text,
  notes        text,
  added_at     timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists inventory_items_fefo_idx
  on inventory_items (user_id, expiry_date asc nulls last);

create index if not exists inventory_items_fridge_idx
  on inventory_items (fridge_id);

-- рецепты с эмбеддингами для RAG
create table if not exists recipes (
  id                      uuid primary key default gen_random_uuid(),
  title                   text not null,
  description             text,
  instructions            text not null,
  cooking_time_minutes    integer,
  servings                integer,
  embedding               vector(384),
  embedding_model_version text not null default 'multilingual-e5-small',
  created_at              timestamptz not null default now()
);

create index if not exists recipes_embedding_idx
  on recipes
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- состав рецептов
create table if not exists recipe_ingredients (
  id           uuid primary key default gen_random_uuid(),
  recipe_id    uuid not null references recipes(id) on delete cascade,
  product_name text not null,
  quantity     numeric(10, 2),
  unit_id      uuid references measurement_units(id) on delete set null,
  is_optional  boolean not null default false
);

create index if not exists recipe_ingredients_recipe_idx
  on recipe_ingredients (recipe_id);

-- RPC функции для RAG
create or replace function match_recipes(
  query_embedding vector(384),
  match_count int default 20
)
returns table (id uuid, title text, similarity float)
language sql stable as $$
  select id, title, 1 - (embedding <=> query_embedding) as similarity
  from recipes
  where embedding is not null
  order by embedding <=> query_embedding
  limit match_count;
$$;

create or replace function match_storage_rules(
  query_embedding vector(384),
  match_count int default 3
)
returns table (id uuid, rule_text text, zone_type_id uuid, similarity float)
language sql stable as $$
  select id, rule_text, zone_type_id, 1 - (embedding <=> query_embedding) as similarity
  from storage_rules
  where embedding is not null
  order by embedding <=> query_embedding
  limit match_count;
$$;
