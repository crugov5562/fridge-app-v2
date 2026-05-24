# FridgeAI — мобильное приложение управления продуктами с ИИ

> Это главный конфигурационный файл проекта для Claude Code. Читай его перед любой работой над репозиторием. Дополнительные правила — в `docs/ui-ux.md` (UI/UX) и `docs/expo-rules.md` (стек, структура, TypeScript). Перед написанием UI читай `docs/ui-ux.md`. Перед написанием кода читай `docs/expo-rules.md`.

## О проекте

Мобильное приложение для автоматизации учёта продуктов питания дома. Пользователь не помнит что в холодильнике, не следит за сроками годности, теряет до 30% покупок. Приложение автоматизирует ввод данных через ИИ-распознавание чеков и фото, отслеживает сроки годности и предлагает рецепты на основе того что есть, с учётом аллергий пользователя.

Дипломный проект, специальность ИИТ, 4 курс, СевГУ. Направление 09.03.02. Тема: «Разработка приложения для автоматической идентификации продуктов питания и формирования персональных рекомендаций». Должен быть рабочим и красивым.

## Технологический стек

| Слой | Технология | Зачем |
| --- | --- | --- |
| Клиент | Expo SDK 52+, React Native, TypeScript | кроссплатформенность, быстрый старт |
| Навигация | Expo Router (typed routes) | file-based routing |
| Стили | NativeWind 4 (Tailwind 3.4) | утилитарные классы, design tokens |
| State (server) | TanStack Query | кэш, инвалидация, оптимистичные апдейты |
| State (client) | Zustand | редко, для глобальных UI-состояний |
| Формы | react-hook-form + zod | валидация |
| Auth | FastAPI + JWT (passlib bcrypt + python-jose) | собственная авторизация |
| БД | PostgreSQL 16 + pgvector (локально в Docker, порт 5432) | реляционная схема + векторы для RAG |
| Storage | локальная папка /app/uploads в контейнере | фото чеков и продуктов |
| Бэкенд ИИ | FastAPI (Python 3.11), порт 8000 | все ИИ-вызовы только через него |
| OCR | Yandex Vision API | распознавание текста с чеков и упаковок |
| LLM | Ollama локально (llama3.2) | классификация, парсинг, RAG-генерация |
| Embeddings | fastembed (Python, multilingual-e5-small) | векторы для pgvector, русский язык |
| Уведомления | expo-notifications (локальные) | без серверной push-инфраструктуры |
| Голосовой ввод | expo-speech | распознавание на устройстве |

## Архитектура

```
Телефон (React Native + Expo)
    ↕ HTTP (axios, EXPO_PUBLIC_API_URL)
FastAPI (локально, порт 8000)
  - JWT Auth → собственная авторизация
  - Yandex Vision → OCR текста с фото
  - Ollama (llama3.2) → LLM логика
  - fastembed → эмбеддинги
  - asyncpg → PostgreSQL 16 + pgvector (Docker, порт 5432)
  - /app/uploads → хранение фото
```

Клиент **никогда** не вызывает Yandex Vision или Ollama напрямую. Только через FastAPI.

## Структура проекта

```
fridge-ai/
├── app/                          expo router routes (тонкие, только wiring)
│   ├── (auth)/
│   │   ├── sign-in.tsx
│   │   ├── sign-up.tsx
│   │   └── _layout.tsx
│   ├── (tabs)/
│   │   ├── index.tsx             инвентарь
│   │   ├── recipes.tsx           рецепты
│   │   ├── stats.tsx             статистика
│   │   ├── profile.tsx
│   │   └── _layout.tsx
│   ├── (modal)/
│   │   ├── add-item.tsx          добавление вручную
│   │   ├── scan-receipt.tsx      сканирование чека
│   │   ├── scan-photo.tsx        фото продуктов/упаковки
│   │   ├── voice-input.tsx       голосовой ввод
│   │   └── recipe/[id].tsx
│   ├── _layout.tsx
│   └── +not-found.tsx
├── features/
│   ├── auth/
│   ├── inventory/
│   ├── scan-receipt/
│   ├── scan-photo/
│   ├── voice-input/
│   ├── recipes/
│   ├── notifications/
│   └── stats/
├── components/
│   ├── ui/                       Button, Input, Card, Skeleton, Screen
│   └── layout/
├── lib/
│   ├── api.ts                    axios клиент для FastAPI (auth + все запросы)
│   └── query-client.ts
├── hooks/
├── types/
│   └── supabase.ts
├── utils/
│   ├── cn.ts
│   └── format-date.ts
├── constants/
├── assets/
├── backend/                      FastAPI сервер (Python)
│   ├── main.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── routers/
│   │   ├── scan.py               OCR чеков и фото упаковок
│   │   ├── classify.py           классификация продуктов + аллергены
│   │   └── recipes.py            RAG рекомендации рецептов
│   ├── services/
│   │   ├── yandex_vision.py      Yandex Vision OCR
│   │   ├── ollama_service.py     Ollama LLM вызовы
│   │   └── embedding_service.py  fastembed эмбеддинги
│   ├── models/
│   │   └── schemas.py            Pydantic схемы
│   └── db/
│       └── connection.py         asyncpg → PostgreSQL (Docker)
├── supabase/                     (устарело, оставлено для истории)
├── global.css
├── tailwind.config.js
├── babel.config.js
├── metro.config.js
├── tsconfig.json
├── app.config.ts
├── package.json
├── docs/
│   ├── ui-ux.md
│   └── expo-rules.md
└── CLAUDE.md
```

## Схема базы данных

13 таблиц, миграция в `backend/migrations/001_initial.sql`.

```
users              профиль пользователя (собственная auth)
fridges            холодильники пользователя
fridge_zones       зоны конкретного холодильника (m2m с zone_types)
zone_types         справочник типов зон (верхняя полка, морозилка...)
categories         справочник категорий (Мясо, Овощи, Молочное...)
allergens          справочник аллергенов
user_allergies     аллергены пользователя
product_catalog    каталог: название → категория → зона → срок
storage_rules      правила хранения + vector(384) embedding для RAG
inventory_items    фактический инвентарь пользователя
measurement_units  кг, л, шт, г, уп
recipes            рецепты + vector(384) embedding для RAG
recipe_ingredients состав рецептов (m2m)
```

Векторные поля для RAG:
- `storage_rules.embedding` vector(384) — подбор зоны для нестандартного продукта
- `recipes.embedding` vector(384) — семантический поиск рецептов

Индексы: HNSW (m=16, ef_construction=64) на оба векторных поля.

RPC функции: `match_recipes(query_embedding, match_count)` и `match_storage_rules(query_embedding, match_count)`.

## Функционал приложения

### Основной

**1. Многоканальное добавление продуктов**

Канал А — Фото продукта (основной, трёхшаговый флоу):
1. Пользователь фотографирует упаковку → FastAPI → Yandex Vision + Ollama определяют продукт. Фото сохраняется в /app/uploads как photo_url — это постоянное фото продукта в карточке инвентаря.
2. Экран подтверждения: фото + название + категория + зона хранения + количество. Пользователь подтверждает или редактирует. Если ИИ не уверен — жёлтый баннер «Проверьте название».
3. Экран камеры в реальном времени: пользователь наводит на дату на упаковке. Каждые 1.5 секунды кадр отправляется в FastAPI → Yandex Vision ищет паттерн даты. Как только нашёл — зелёная рамка на превью + карточка снизу с найденной датой + кнопка «Подтвердить». Кнопка «Ввести вручную» всегда видна в углу. Если за 15 секунд дата не найдена — bottom sheet с тремя вариантами:
   - «Вписать вручную» — открывает DatePicker
   - «Дефолтный срок» — рассчитывается по категории из product_catalog.default_expiry_days, показываем конкретное число дней и итоговую дату
   - «Заполнить позже» — продукт сохраняется без даты, серый бейдж в карточке, уведомление через день

Канал Б — Фото чека:
Фото чека → Yandex Vision читает текст → Ollama парсит список товаров → расчёт срока (дата покупки + default_expiry_days из product_catalog) → экран подтверждения всего списка

Канал В — Голосовой ввод:
expo-speech → транскрипт → Ollama парсит в структурированный список → экран подтверждения

Канал Г — Ручной ввод:
Форма с полями: название, количество, единица, категория, зона, дата. Умный дефолт даты по категории.

**2. Инвентарь с мониторингом сроков**
- Список с цветовой индикацией: зелёный (>5 дней), жёлтый (1-5), красный (≤1)
- Сортировка FEFO по умолчанию
- Свайп влево: «использовал», «выбросил» (для статистики)

**3. Умные уведомления**
- Push за N дней до истечения (настраивается в профиле)
- Текст уведомления: «{продукт} истекает завтра. Можно приготовить: {рецепт}»
- Тап → сразу на экран рецептов с этим продуктом

**4. Выявление аллергенов при добавлении**
- Фото упаковки → Yandex Vision читает состав → Ollama находит аллергены → точное предупреждение
- Чек или ручной ввод → Ollama определяет вероятные аллергены по названию → «предположительно»
- Предупреждение сразу при добавлении если совпадает с профилем

**5. Рекомендации по хранению**
- Для стандартных продуктов — из product_catalog напрямую
- Для нестандартных — RAG по storage_rules.embedding
- Обоснование: не просто зона, а почему

**6. Рекомендации рецептов (RAG)**
- «Приготовить сейчас» — автоподборка по инвентарю, приоритет FEFO
- «Свободный запрос» — пользователь пишет «хочу лёгкое и быстрое», RAG ищет по смыслу
- Показывает: какие ингредиенты есть, каких не хватает
- Фильтрация по аллергенам автоматически
- Кнопка «Приготовил» → списание ингредиентов из инвентаря

### Второстепенный
- Профиль: аллергены, предпочтения, настройка уведомлений
- Статистика: что чаще портится, сколько выброшено, экономия

## RAG-пайплайн

RAG только в двух точках:

**1. Рекомендации рецептов**
1. Инвентарь пользователя или свободный запрос → текст
2. fastembed → вектор (prefix: `"query: "`)
3. match_recipes() → top-20 по cosine similarity
4. Фильтр по аллергенам через SQL
5. Ollama ранжирует top-5 + объяснение

**2. Зона хранения нестандартного продукта**
1. Название продукта не найдено в product_catalog
2. fastembed → вектор
3. match_storage_rules() → top-3 похожих правила
4. Ollama формулирует рекомендацию с обоснованием

## Переменные окружения

Клиентские (`.env`):
```
EXPO_PUBLIC_API_URL=http://192.168.X.X:8000
```

Серверные (`backend/.env`):
```
DATABASE_URL=postgresql://fridgeai:fridgeai_secret@db:5432/fridgeai
JWT_SECRET=случайная_строка_минимум_32_символа
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=43200
OLLAMA_BASE_URL=http://host.docker.internal:11434
OLLAMA_MODEL=llama3.2
YANDEX_VISION_API_KEY=
YANDEX_FOLDER_ID=
```

## Команды

```bash
# мобильное приложение
npx expo start -c
npx expo start --tunnel

# бэкенд (из папки backend/)
cd backend && docker compose up --build    # первый запуск
cd backend && docker compose up            # обычный запуск
cd backend && docker compose down          # остановка
cd backend && docker compose logs -f api   # логи бэкенда

# ollama (на хосте, не в Docker)
ollama serve
ollama run llama3.2

# проверки
npx tsc --noEmit
npx eslint .
```

## Правила работы

1. Читай `docs/ui-ux.md` перед UI-задачами.
2. Читай `docs/expo-rules.md` перед кодом.
3. Никогда не вызывай Yandex Vision, Ollama или fastembed из мобильного клиента. Только через FastAPI.
4. Никогда не клади секреты в клиент. EXPO_PUBLIC_* — только публичный API_URL.
5. JWT-токен хранить в SecureStore, не в AsyncStorage.
6. Комментарии короткие, с маленькой буквы, без точек, объясняют почему.
8. Один файл — одна сущность.
9. NativeWind для всех стилей.
10. tsc --noEmit должен проходить перед коммитом.

## Что не делать

- Не вызывать LLM из клиента.
- Не хранить JWT-токены в AsyncStorage — только SecureStore.
- Не использовать StyleSheet.create когда можно NativeWind.
- Не использовать FlatList — только FlashList.
- Не делать декоративные эффекты без причины.
- Не оставлять any без // reason: комментария.
- Не оставлять закомментированный код.
- Не делать больше одной primary кнопки на экране.