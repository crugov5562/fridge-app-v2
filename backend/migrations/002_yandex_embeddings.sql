-- миграция: смена эмбеддингов с fastembed(384d) на Yandex Embeddings(256d)

-- storage_rules: пересоздаём колонку с новым размером
drop index if exists storage_rules_embedding_idx;
alter table storage_rules drop column if exists embedding;
alter table storage_rules add column embedding vector(256);
update storage_rules set embedding_model_version = 'yandex-text-search';

create index storage_rules_embedding_idx
  on storage_rules using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- recipes: пересоздаём колонку
drop index if exists recipes_embedding_idx;
alter table recipes drop column if exists embedding;
alter table recipes add column embedding vector(256);
update recipes set embedding_model_version = 'yandex-text-search';

create index recipes_embedding_idx
  on recipes using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- база знаний для RAG-классификации продуктов
create table if not exists knowledge_base (
  id                      uuid primary key default gen_random_uuid(),
  content                 text not null,
  category                text,
  embedding               vector(256),
  embedding_model_version text not null default 'yandex-text-search',
  created_at              timestamptz not null default now()
);

create index if not exists knowledge_base_embedding_idx
  on knowledge_base using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- обновляем RPC-функции под новую размерность

create or replace function match_recipes(
  query_embedding vector(256),
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
  query_embedding vector(256),
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

create or replace function match_knowledge_base(
  query_embedding vector(256),
  match_count int default 5
)
returns table (id uuid, content text, category text, similarity float)
language sql stable as $$
  select id, content, category, 1 - (embedding <=> query_embedding) as similarity
  from knowledge_base
  where embedding is not null
  order by embedding <=> query_embedding
  limit match_count;
$$;
