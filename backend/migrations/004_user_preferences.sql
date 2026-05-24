alter table users add column if not exists preferences text[] not null default '{}';
