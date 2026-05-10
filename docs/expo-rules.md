# Expo / TypeScript / Supabase правила

You are an expert in TypeScript, React Native, Expo (SDK 52+), Expo Router, NativeWind, Supabase, и AI-пайплайнах с RAG. Этот файл — правила стека для FridgeAI. Читай его перед написанием кода.

## Project Structure

Чистый, профессиональный layout. У каждого файла одна цель. Никаких свалочных файлов (`utils.ts`, `helpers.ts`, `misc.ts`).

```
app/                    expo router routes only — screens stay thin
features/               feature modules — all real logic lives here
components/             shared, app-wide ui primitives
lib/                    third-party clients (supabase, query-client)
hooks/                  shared cross-feature hooks
types/                  shared types and supabase generated types
utils/                  pure functions only, one concern per file
constants/              static config
assets/                 fonts, images
supabase/               sql migrations, edge functions
```

- Один экран — один файл. Screens в `app/` импортируют из `features/` и остаются тонкими (~50 строк) — они wire-up данные и передают их в компоненты фичи.
- Один компонент — один файл. Имя файла совпадает с компонентом (`message-bubble.tsx` экспортирует `MessageBubble`).
- Feature модули self-contained: фичу должно быть можно удалить, удалив её папку плюс роуты в `app/`.
- Shared код в `components/`, `hooks/`, `lib/` или `utils/` только когда используется двумя или более фичами. Не extract заранее.
- Не глубже 3 уровней вложенности внутри фичи. Если нужно глубже — фича слишком большая, дели.
- Никаких barrel-файлов (`index.ts` с реэкспортами) кроме как на границах фич. Они мешают tree-shaking и затрудняют импорты.
- Импорты упорядочены: React/RN → third-party → `@/lib`, `@/components`, `@/features` → relative → types. Используй path-aliases (`@/*`) в `tsconfig.json` и `babel.config.js`.

## Code Style

- Читаемый, самодокументирующийся код. Описательные имена — `isFetchingItems`, `handleClassificationResult`, не `flag` или `data2`.
- Functional components с hooks (`useState`, `useEffect`, `useMemo`, `useCallback`, `useReducer`). Без class components.
- Single responsibility на компонент. Если компонент > 150 строк или несколько concerns — дели.
- Co-locate component, его типы и тесты в директории фичи.
- Composition over prop drilling. Поднимай state только когда реально shared.
- Named exports для компонентов и утилит. Исключение: Expo Router screen files (`app/**/*.tsx`) требуют default export.

## Comments

- Комментарии короткие, чёткие, с маленькой буквы. Без точки в конце.
- Объясняй *почему*, не *что*. Код показывает что; комментарий добавляет контекст.
- На отдельной строке над кодом, не в конце строки.
- Примеры:
  ```ts
  // skip cache when user pulled to refresh
  if (forceRefresh) return fetchFromNetwork();

  // pgvector hnsw index needs warm-up on first query
  await primeVectorIndex();
  ```
- Никакого закомментированного кода в коммитах. Удаляй — git помнит.
- Никаких redundant комментариев (`// set loading to true` над `setLoading(true)`).
- Никакого JSDoc на внутренних компонентах и хелперах. TypeScript документирует лучше.
- JSDoc только на публичных утилитах и хуках, используемых из многих фич, и только когда тип сам по себе недостаточен.
- TODO с именем или тикетом: `// todo(alex): handle offline retry` или `// todo(RAG-42): re-rank retrieved chunks`.

## TypeScript

- TypeScript обязателен. Никакого `any` без явного `// reason: ...` комментария.
- Явные типы для props, API responses и Supabase rows. Генерируй типы Supabase: `supabase gen types typescript --project-id <id> > types/supabase.ts`.
- `type` для unions и primitives, `interface` для object shapes, которые могут расширяться.
- Discriminated unions для state machines:
  ```ts
  type ScanState =
    | { status: 'idle' }
    | { status: 'capturing' }
    | { status: 'processing'; jobId: string }
    | { status: 'success'; items: InventoryItem[] }
    | { status: 'error'; error: Error };
  ```
- Без enums. Используй `as const` объекты или string literal unions.
- Strict mode на (`"strict": true` в `tsconfig.json`).

## Naming Conventions

- Variables и functions: `camelCase` (e.g. `isFetchingItems`, `handleScanComplete`).
- Components и types: `PascalCase` (e.g. `InventoryItem`, `ReceiptScanScreen`).
- Hooks: prefix `use` (e.g. `useInventory`, `useRecipeRecommendations`).
- Booleans: prefix `is`, `has`, `should`, `can` (e.g. `isLoading`, `hasError`, `canRetry`).
- Event handlers: `handle*` для component-internal, `on*` для props (e.g. `handleSubmit`, `onPress`).
- Constants: `SCREAMING_SNAKE_CASE` для true constants (e.g. `MAX_CHUNK_SIZE`, `DEFAULT_EXPIRY_DAYS`).
- Directories: `kebab-case` (e.g. `scan-receipt`, `recipe-detail`).
- Files: `kebab-case.tsx` для components, `camelCase.ts` для utilities и hooks. Expo Router следует router-конвенциям (`_layout.tsx`, `[id].tsx`, `(tabs)/`).

## JavaScript / TypeScript Usage

- Избегай global variables и singletons. Используй React context или Zustand для shared client state.
- Modern syntax: optional chaining, nullish coalescing, destructuring, template literals.
- `const` arrow functions для компонентов и хелперов.
- Никогда не используй PropTypes — TypeScript покрывает.

## Performance Optimization

- Избегай ненужного state. Производи значения во время рендера когда дёшево; мемоизируй когда дорого и измерено.
- `React.memo` только для компонентов, которые ре-рендерятся с одинаковыми props в горячих путях (элементы списка, часто обновляющиеся UI).
- `useCallback` и `useMemo` только с измеренной причиной — преждевременная мемоизация добавляет шум.
- `@shopify/flash-list` вместо `FlatList` для любого растущего списка. Всегда `keyExtractor`, `estimatedItemSize`, `removeClippedSubviews`, разумный `windowSize`.
- `renderItem` и обработчики событий вне рендера или через `useCallback` — никогда inline стрелки в элементах списка.
- Анимации через `react-native-reanimated` worklets (UI thread). Не legacy `Animated`.
- Lazy-load тяжёлых экранов через автоматический code splitting Expo Router.
- Стримить ответы LLM токен за токеном. Никогда не блокировать UI на полный ответ модели.

## UI и Styling — NativeWind First

- Все стили через NativeWind `className`. Не используй `StyleSheet.create()` если только не интерфейсишь с библиотекой, требующей style object.
- Design tokens в `tailwind.config.js` (`theme.extend`): colors, spacing, font families, radii, shadows. Никогда не хардкоди в компонентах.
- Семантические имена токенов (`bg-background`, `text-primary`, `border-separator`) > сырые значения. Они автоматом переключаются с `dark:`.
- `cn()` (clsx + tailwind-merge) для условных и merged классов.
- `class-variance-authority` (cva) для вариантов компонентов (buttons, badges, inputs).
- Dark mode через `dark:` варианты. Тестируй обе темы на каждом экране.
- Safe areas: `SafeAreaView` из `react-native-safe-area-context` или `useSafeAreaInsets`.
- Дизайн под iPhone SE, scale up. Tailwind spacing scale, не хардкоженые пиксели.
- Изображения: `expo-image` (modern, кэш, быстро). Не `react-native-fast-image`.
- `prettier-plugin-tailwindcss` для авто-сортировки классов.

## State Management

- Local UI state: `useState` / `useReducer`.
- Server state: TanStack Query (`@tanstack/react-query`) — кэш, инвалидация, retries, оптимистичные апдейты.
- Global client state (редко): Zustand. Без Redux.
- Forms: `react-hook-form` с `zod` схемами для валидации.
- Никогда не храни server data в Zustand или context — пусть TanStack Query владеет.

## Supabase

### Auth

- `@supabase/supabase-js` с `expo-secure-store` для session persistence:
  ```ts
  import * as SecureStore from 'expo-secure-store';

  const ExpoSecureStoreAdapter = {
    getItem: (k: string) => SecureStore.getItemAsync(k),
    setItem: (k: string, v: string) => SecureStore.setItemAsync(k, v),
    removeItem: (k: string) => SecureStore.deleteItemAsync(k),
  };

  export const supabase = createClient(url, anonKey, {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  ```
- Email + пароль для регистрации (по решению проекта). SMS не используется.
- Email confirmation можно отключить в локальной разработке для скорости.

### Database

- Row Level Security включена на каждой таблице. Никаких исключений.
- Пиши policies до того как ship'ишь фичу.
- Генерируй типы из схемы и используй везде:
  ```ts
  import { Database } from '@/types/supabase';
  type InventoryItem = Database['public']['Tables']['inventory_items']['Row'];
  ```
- Для запросов к pgvector используй RPC функции в Postgres, не клиентскую логику.

### Storage

- Supabase Storage для user-uploaded файлов (фото чеков, фото продуктов). Reference через signed URL при отображении.
- Bucket policies: пользователь видит только свои файлы.

### Edge Functions

- Все LLM, embedding и любые sensitive API вызовы — через Edge Functions (Deno).
- Структура каждой функции:
  ```
  supabase/functions/parse-receipt/
    index.ts              entry point
    schema.ts             zod схемы для входа и выхода
    deno.json
  ```
- Валидация входа через `zod` до любого внешнего вызова.
- Проверка JWT в каждой функции (auth header).
- Rate limiting per user — лог в `usage` таблицу.
- Структурированные ошибки: `{ error: { code: 'INVALID_IMAGE', message: 'Receipt is too blurry to read' } }`.
- Не возвращать сырые ошибки от Groq или fastembed клиенту — оборачивай.

### RLS Patterns

- Стандартная политика для user-owned данных:
  ```sql
  create policy "users see own items"
    on inventory_items for select
    using (auth.uid() = user_id);

  create policy "users insert own items"
    on inventory_items for insert
    with check (auth.uid() = user_id);
  ```
- Для shared (рецепты, категории) — read для всех authenticated, write только service role.

## AI и RAG Pipeline

### Никогда не вызывай LLM из клиента

Все вызовы Groq, fastembed и любых ИИ-сервисов идут через Edge Functions. Ключи живут только в Supabase secrets:
- `GROQ_API_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (для bypass RLS внутри функций когда нужно)

Клиент видит только `EXPO_PUBLIC_SUPABASE_URL` и `EXPO_PUBLIC_SUPABASE_ANON_KEY`.

### Groq API

- Использовать `@anthropic-ai/sdk`-стиль fetch через Groq endpoint, либо официальный `groq-sdk`.
- Модели:
  - `llama-3.3-70b-versatile` для текста (классификация, ранжирование, парсинг голоса).
  - `llama-3.2-90b-vision-preview` для vision (чеки, фото продуктов).
- Стримить ответы где возможно (`stream: true`) и проксировать стрим через Edge Function как Server-Sent Events.
- Обрабатывай error modes отдельно: timeout, rate limit (429), content filter, network. Каждый — свой user-facing message и recovery path.

### Embeddings

- Модель: `multilingual-e5-small` (384 dim) — хорошо работает с русским, бесплатно.
- Запуск через `fastembed` JS-биндинги в Edge Function, либо через HuggingFace Inference API (бесплатный tier).
- Кэшируй embeddings — никогда не embed одно и то же дважды. Храни хэш входа.
- Префиксы для e5: `query: ` для запросов, `passage: ` для документов. Это требование модели.

### RAG Standards

- Чанки документов осмысленно: для рецептов — целый рецепт с заголовком + ингредиентами + кратким описанием как один чанк. Не дробить.
- Метаданные чанка: `id`, `created_at`, `embedding_model_version` (чтобы можно было re-embed при смене модели).
- Top-K ретрив (3-8 для рецептов, 1-3 для правил хранения). Re-rank через LLM если важно качество.
- Включай retrieved context в промпт явно с делимитерами:
  ```
  <recipes>
  {{retrieved_recipes}}
  </recipes>

  <user_inventory>
  {{inventory_list}}
  </user_inventory>

  <user_allergies>
  {{allergies}}
  </user_allergies>

  Подбери top-5 рецептов из списка выше, исключив содержащие аллергены.
  Объясни выбор кратко.
  ```
- Цитируй источники в UI. Делай retrieval инспектируемым (collapsible секция «На основе чего»).
- Логируй качество: hit rate, user feedback (👍/👎), события regeneration → в `recommendation_logs` таблицу для итераций.

### pgvector

- Поля типа `vector(384)`.
- Индекс: `hnsw` для prod, `ivfflat` для прототипа.
- Запросы через RPC функции:
  ```sql
  create or replace function match_recipes(
    query_embedding vector(384),
    match_count int default 20
  ) returns table (id uuid, title text, similarity float)
  language sql stable
  as $$
    select id, title, 1 - (embedding <=> query_embedding) as similarity
    from recipes
    order by embedding <=> query_embedding
    limit match_count;
  $$;
  ```

## Best Practices

- React Native threading model. JS thread свободен — тяжёлая работа в worklets, native modules или на сервере.
- Expo Router file-based routing. Группируй с `(tabs)`, `(auth)`, `(modal)`. Typed routes (`experiments.typedRoutes`) для compile-time link safety.
- EAS Build для production builds, EAS Update для OTA updates JS bundle.
- Env через `.env`. Public client — `EXPO_PUBLIC_*` префикс. Никогда не коммить secrets. Server-side ключи живут в Edge Functions secrets.
- ESLint с `eslint-config-expo` + `@typescript-eslint`. Prettier с `prettier-plugin-tailwindcss`.
- `expo-font` для шрифтов. Загрузка раз в root layout, gate UI на `useFonts` ready state со splash screen.
- `expo-haptics` для тактильного feedback на primary actions, подтверждениях и ошибках.
- `expo-secure-store` для токенов и secrets. Никогда AsyncStorage для sensitive.
- Conventional Commits style (`feat:`, `fix:`, `chore:`, `refactor:`).

## Testing

- Skip тесты на throwaway прототипах. Добавляй для shipping.
- Maestro для end-to-end критических путей (sign-in, scan receipt → save, recipe recommendation).
- React Native Testing Library для component и hook tests с нетривиальной логикой.
- Тестируй на реальных устройствах.

## Что не делать

- Множественные компоненты в одном файле или файлы со смешанными concerns.
- Свалочные файлы (`utils.ts`, `helpers.ts`).
- Inline styles или `StyleSheet.create()` когда NativeWind может выразить.
- Анонимные функции в `renderItem`, `onPress` элементов списка или других горячих путях.
- Смешивать UI-библиотеки.
- Вызывать LLM, embedding или любой sensitive API напрямую из клиента.
- Хранить токены или secrets в AsyncStorage.
- Хардкоженые цвета, размеры шрифта или отступы вне Tailwind config.
- Пропускать empty, loading и error states.
- Больше одной primary кнопки на экран.
- Декоративные анимации, градиенты или тени без причины.
- Generic спиннеры где skeleton передал бы больше.
- Capitalized комментарии, точки в конце, redundant комментарии, закомментированный код в коммитах.
- `any` типы, `@ts-ignore`, untyped Supabase запросы.