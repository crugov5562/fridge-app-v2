import * as SecureStore from 'expo-secure-store';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync('auth_token');
}

export async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync('auth_token', token);
}

export async function removeToken(): Promise<void> {
  await SecureStore.deleteItemAsync('auth_token');
}

export async function rawRequest(
  method: string,
  path: string,
  body?: object
): Promise<unknown> {
  return request(path, {
    method,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  withAuth = true
): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (withAuth) {
    const token = await getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    const data = await res.json();

    if (!res.ok) {
      throw data?.error ?? { code: 'REQUEST_FAILED', message: 'Ошибка запроса' };
    }

    return data as T;
  } finally {
    clearTimeout(timeout);
  }
}

// ─── типы ───────────────────────────────────────────

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  display_name: string;
}

export interface UserResponse {
  id: string;
  email: string;
  display_name: string | null;
  notify_days_before: number;
  preferences: string[];
}


export interface InventoryItem {
  id: string;
  fridge_id: string;
  name: string;
  category_id: string | null;
  zone_type_id: string | null;
  quantity: number;
  unit_id: string | null;
  expiry_date: string | null;
  photo_url: string | null;
  notes: string | null;
  added_at: string;
  updated_at: string;
}

export interface InventoryItemCreate {
  fridge_id: string;
  name: string;
  category_id?: string;
  zone_type_id?: string;
  quantity?: number;
  unit_id?: string;
  expiry_date?: string;
  photo_url?: string;
  notes?: string;
}

export interface Fridge {
  id: string;
  name: string;
  created_at: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string | null;
}

export interface Unit {
  id: string;
  name: string;
  abbreviation: string;
}

export interface RecognizeProductResponse {
  product: { name: string; category: string; confidence: number };
  raw_text: string;
}

export interface ScanExpiryResponse {
  found: boolean;
  date: string | null;
  raw_text: string | null;
  confidence: number;
}

export interface ScanReceiptResponse {
  items: Array<{ name: string; quantity: number; unit: string; price: number | null }>;
  purchase_date: string | null;
}

export interface ScanPhotoResponse {
  name: string;
  brand: string | null;
  category: string | null;
  category_id: string | null;
  zone_name: string | null;
  zone_type_id: string | null;
  storage_tip: string | null;
  expiry_date: string | null;
  expiry_auto: boolean;
  confidence: number;
  photo_url: string | null;
  quantity: number | null;
  unit_suggestion: string | null;
}

export interface ClassifyProductResponse {
  category: string;
  category_id: string | null;
  zone_name: string;
  zone_type_id: string | null;
  expiry_days: number;
  storage_tip: string;
  unit_suggestion: string | null;
  confidence: string;
}

export interface RecipeRecommendation {
  id: string;
  title: string;
  description: string | null;
  cooking_time_minutes: number | null;
  match_percent: number;
  have_count: number;
  total_count: number;
  missing_ingredients: string[];
  have_ingredients: string[];
}

export interface RecommendRecipesResponse {
  recipes: RecipeRecommendation[];
}

export interface RecipeIngredientDetail {
  name: string;
  quantity: number | null;
  is_optional: boolean;
  have: boolean;
}

export interface RecipeDetail {
  id: string;
  title: string;
  description: string | null;
  instructions: string;
  cooking_time_minutes: number | null;
  servings: number | null;
  ingredients: RecipeIngredientDetail[];
}

export interface SmartProposalExpiring {
  name: string;
  expiry_date: string;
}

export interface SmartProposalIngredient {
  name: string;
  estimated_price: number;
}

export interface SmartProposalResponse {
  recipe_title: string;
  tagline: string;
  expiring_products: SmartProposalExpiring[];
  missing_ingredients: SmartProposalIngredient[];
  savings_rub: number;
  cost_rub: number;
}

// ─── auth ───────────────────────────────────────────

export const auth = {
  register: (email: string, password: string, displayName: string) =>
    request<TokenResponse>(
      '/auth/register',
      { method: 'POST', body: JSON.stringify({ email, password, display_name: displayName }) },
      false
    ),

  login: (email: string, password: string) =>
    request<TokenResponse>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) },
      false
    ),

  me: () => request<UserResponse>('/auth/me'),

  fridges: () => request<Fridge[]>('/auth/fridges'),

  setPreferences: (preferences: string[]) =>
    request<{ ok: boolean }>('/auth/me/preferences', {
      method: 'PUT',
      body: JSON.stringify({ preferences }),
    }),
};

// ─── справочники ────────────────────────────────────

export const catalog = {
  categories: () => request<Category[]>('/catalog/categories'),
  units: () => request<Unit[]>('/catalog/units'),
};

// ─── инвентарь ──────────────────────────────────────

export const inventory = {
  list: (fridgeId: string) =>
    request<InventoryItem[]>(`/inventory?fridge_id=${fridgeId}`),

  create: (item: InventoryItemCreate) =>
    request<InventoryItem>('/inventory', {
      method: 'POST',
      body: JSON.stringify(item),
    }),

  update: (id: string, patch: Partial<InventoryItemCreate>) =>
    request<InventoryItem>(`/inventory/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),

  remove: (id: string) =>
    request<{ deleted: boolean }>(`/inventory/${id}`, { method: 'DELETE' }),

  expiring: (days = 5) =>
    request<InventoryItem[]>(`/inventory/expiring?days=${days}`),
};

// ─── сканирование ───────────────────────────────────

export const scan = {
  product: (imageBase64: string) =>
    request<RecognizeProductResponse>('/scan/product', {
      method: 'POST',
      body: JSON.stringify({ image_base64: imageBase64 }),
    }),

  expiry: (imageBase64: string, productName: string) =>
    request<ScanExpiryResponse>('/scan/expiry', {
      method: 'POST',
      body: JSON.stringify({ image_base64: imageBase64, product_name: productName }),
    }),

  receipt: (imageBase64: string) =>
    request<ScanReceiptResponse>('/scan/receipt', {
      method: 'POST',
      body: JSON.stringify({ image_base64: imageBase64 }),
    }),

  photo: (frontBase64: string, labelBase64: string) =>
    request<ScanPhotoResponse>('/scan/photo', {
      method: 'POST',
      body: JSON.stringify({
        front_image_base64: frontBase64,
        label_image_base64: labelBase64,
      }),
    }),
};

// ─── классификация ──────────────────────────────────

export const classify = {
  product: (productName: string) =>
    request<ClassifyProductResponse>('/classify/product', {
      method: 'POST',
      body: JSON.stringify({ product_name: productName }),
    }),
};

// ─── рецепты ────────────────────────────────────────

export const recipes = {
  recommend: (fridgeId: string, query = '') =>
    request<RecommendRecipesResponse>('/recipes/recommend', {
      method: 'POST',
      body: JSON.stringify({ fridge_id: fridgeId, query }),
    }),

  detail: (recipeId: string, fridgeId?: string) => {
    const qs = fridgeId ? `?fridge_id=${fridgeId}` : '';
    return request<RecipeDetail>(`/recipes/${recipeId}${qs}`);
  },

  smartProposal: (fridgeId: string) =>
    request<SmartProposalResponse | null>(`/recipes/smart-proposal?fridge_id=${fridgeId}`),
};
