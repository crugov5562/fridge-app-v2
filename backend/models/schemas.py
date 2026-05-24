from pydantic import BaseModel, Field, field_validator


# Auth

class RegisterRequest(BaseModel):
    email: str = Field(min_length=3)
    password: str = Field(min_length=6, max_length=72)
    display_name: str = Field(min_length=2)

    @field_validator("email")
    @classmethod
    def email_must_contain_at(cls, v: str) -> str:
        if "@" not in v:
            raise ValueError("Некорректный email")
        return v


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    display_name: str


class UserResponse(BaseModel):
    id: str
    email: str
    display_name: str | None
    notify_days_before: int
    preferences: list[str] = []


class SetPreferencesRequest(BaseModel):
    preferences: list[str]


# Инвентарь

class InventoryItemCreate(BaseModel):
    fridge_id: str
    name: str
    category_id: str | None = None
    zone_type_id: str | None = None
    quantity: float = 1
    unit_id: str | None = None
    expiry_date: str | None = None
    photo_url: str | None = None
    notes: str | None = None


class InventoryItemUpdate(BaseModel):
    name: str | None = None
    category_id: str | None = None
    zone_type_id: str | None = None
    quantity: float | None = None
    unit_id: str | None = None
    expiry_date: str | None = None
    photo_url: str | None = None
    notes: str | None = None


class InventoryItemResponse(BaseModel):
    id: str
    fridge_id: str
    name: str
    category_id: str | None
    zone_type_id: str | None
    quantity: float
    unit_id: str | None
    expiry_date: str | None
    photo_url: str | None
    notes: str | None
    added_at: str
    updated_at: str


# Сканирование

class RecognizeProductRequest(BaseModel):
    image_base64: str
    mime_type: str = "image/jpeg"


class RecognizedProduct(BaseModel):
    name: str
    category: str
    confidence: float


class RecognizeProductResponse(BaseModel):
    product: RecognizedProduct
    raw_text: str


class ScanExpiryRequest(BaseModel):
    image_base64: str
    product_name: str
    mime_type: str = "image/jpeg"


class ScanExpiryResponse(BaseModel):
    found: bool
    date: str | None = None
    raw_text: str | None = None
    confidence: float = 0.0


class ScanReceiptRequest(BaseModel):
    image_base64: str
    mime_type: str = "image/jpeg"


class ReceiptItem(BaseModel):
    name: str
    quantity: float
    unit: str
    price: float | None = None


class ScanReceiptResponse(BaseModel):
    items: list[ReceiptItem]
    purchase_date: str | None = None


class ScanPhotoRequest(BaseModel):
    front_image_base64: str
    label_image_base64: str
    mime_type: str = "image/jpeg"


class ScanPhotoResponse(BaseModel):
    name: str
    brand: str | None = None
    category: str | None = None
    category_id: str | None = None
    zone_name: str | None = None
    zone_type_id: str | None = None
    storage_tip: str | None = None
    expiry_date: str | None = None
    expiry_auto: bool = False
    confidence: float = 0.0
    photo_url: str | None = None
    quantity: float | None = None
    unit_suggestion: str | None = None


# Классификация

class ClassifyProductRequest(BaseModel):
    product_name: str


class ClassifyProductResponse(BaseModel):
    category: str
    category_id: str | None = None
    zone_name: str
    zone_type_id: str | None = None
    expiry_days: int
    storage_tip: str
    unit_suggestion: str | None = None
    confidence: str


# Рецепты

class RecommendRecipesRequest(BaseModel):
    fridge_id: str
    query: str = ""
    allergies: list[str] = []


class RecipeRecommendation(BaseModel):
    id: str
    title: str
    description: str | None = None
    cooking_time_minutes: int | None = None
    match_percent: int
    have_count: int
    total_count: int
    missing_ingredients: list[str]
    have_ingredients: list[str]


class RecommendRecipesResponse(BaseModel):
    recipes: list[RecipeRecommendation]


class RecipeIngredientDetail(BaseModel):
    name: str
    quantity: float | None = None
    is_optional: bool
    have: bool


class RecipeDetail(BaseModel):
    id: str
    title: str
    description: str | None = None
    instructions: str
    cooking_time_minutes: int | None = None
    servings: int | None = None
    ingredients: list[RecipeIngredientDetail]


# Smart Proposal

class SmartProposalExpiring(BaseModel):
    name: str
    expiry_date: str


class SmartProposalIngredient(BaseModel):
    name: str
    estimated_price: int


class SmartProposalResponse(BaseModel):
    recipe_title: str
    tagline: str
    expiring_products: list[SmartProposalExpiring]
    missing_ingredients: list[SmartProposalIngredient]
    savings_rub: int
    cost_rub: int
