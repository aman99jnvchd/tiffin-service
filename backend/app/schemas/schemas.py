from pydantic import BaseModel, Field, field_validator
from datetime import datetime, time, date
from typing import Optional, List
from decimal import Decimal
import re

# --- PERMISSIONS ---
class PermissionBase(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None

class PermissionSchema(PermissionBase):
    id: int
    class Config:
        from_attributes = True

# --- ROLES ---
class RoleBase(BaseModel):
    name: str
    slug: str
    is_active: bool = True

class RoleCreate(RoleBase):
    permission_ids: List[int] = []

class RoleUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    is_active: Optional[bool] = None
    permission_ids: Optional[List[int]] = None

class RoleSchema(RoleBase):
    id: int
    permissions: List[PermissionSchema] = []
    class Config:
        from_attributes = True

# --- CITY ---
class CityBase(BaseModel):
    name: str
    alias: Optional[str] = None
    is_active: bool = True

class CityCreate(CityBase):
    pass

class CityUpdate(BaseModel):
    name: Optional[str] = None
    alias: Optional[str] = None
    is_active: Optional[bool] = None

class CitySchema(CityBase):
    id: int
    class Config:
        from_attributes = True

# --- CATEGORY ---
class CategoryBase(BaseModel):
    name: str

class CategoryCreate(CategoryBase):
    pass

class CategorySchema(CategoryBase):
    id: int
    vendor_id: int
    class Config:
        from_attributes = True

# --- MEAL ---
class MealSchema(BaseModel):
    id: int
    vendor_id: int
    kitchen_name: Optional[str] = None
    name: str
    base_price: Decimal
    description: Optional[str] = None
    image_url: Optional[str] = None
    available_days: Optional[str] = None  # JSON array e.g. ["Mon", "Wed"]
    service_types: Optional[str] = None
    is_always_available: bool
    is_active: bool
    category_id: Optional[int] = None
    dietary_type: str = 'veg'  # 'veg', 'non-veg', 'egg'
    order_cutoff_hours: Optional[int] = None

    @classmethod
    def from_orm_with_kitchen(cls, meal):
        obj = cls.model_validate(meal)
        obj.kitchen_name = meal.vendor.kitchen_name if meal.vendor else None
        return obj

    class Config:
        from_attributes = True

class MealCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    base_price: Decimal = Field(..., gt=0)
    description: Optional[str] = None
    image_url: Optional[str] = None
    available_days: Optional[str] = None  # None = daily, else JSON array string
    service_types: Optional[str] = None
    is_always_available: bool = True
    is_active: bool = True
    category_id: Optional[int] = None
    dietary_type: str = 'veg'

class MealUpdate(BaseModel):
    name: Optional[str] = None
    base_price: Optional[Decimal] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    available_days: Optional[str] = None
    service_types: Optional[str] = None
    is_always_available: Optional[bool] = None
    is_active: Optional[bool] = None
    category_id: Optional[int] = None
    dietary_type: Optional[str] = None

# --- VENDOR ---
class VendorProfileSchema(BaseModel):
    id: int
    user_id: int
    kitchen_name: str
    is_open: bool
    open_time: Optional[time]
    close_time: Optional[time]
    dietary_type: Optional[str] = None
    service_types: Optional[str] = None
    delivery_windows: Optional[str] = None
    order_cutoff_hours: Optional[int] = None
    max_capacity_per_slot: Optional[int] = None
    fssai_number: Optional[str] = None
    is_onboarding_complete: Optional[bool] = False
    onboarding_step: Optional[int] = 1
    class Config:
        from_attributes = True

class VendorProfileUpdate(BaseModel):
    kitchen_name: Optional[str] = None
    is_open: Optional[bool] = None
    open_time: Optional[time] = None
    close_time: Optional[time] = None
    fssai_number: Optional[str] = None
    delivery_windows: Optional[str] = None
    service_types: Optional[str] = None
    dietary_type: Optional[str] = None
    order_cutoff_hours: Optional[int] = None
    max_capacity_per_slot: Optional[int] = None

    @field_validator('fssai_number')
    @classmethod
    def validate_fssai(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            if not re.match(r"^[1-3](0[1-9]|[12]\d|3[0-6])(0[6-9]|1\d|2[0-6])\d{9}$", v):
                raise ValueError("Invalid FSSAI Registration Number. Please ensure it follows the correct format.")
        return v

class TimeSlot(BaseModel):
    start_time: str
    end_time: str

class VendorOnboardingStep1(BaseModel):
    kitchen_name: str
    dietary_type: str
    service_types: str # JSON array or comma-separated string

class VendorOnboardingStep2(BaseModel):
    delivery_windows: str # JSON object mapping service type to list of TimeSlots
    order_cutoff_hours: int
    max_capacity_per_slot: int

class VendorOnboardingStep3(BaseModel):
    address_text: str # This creates an Address record
    pincode: str
    city_id: int
    house_no: Optional[str] = None
    house_photo_url: Optional[str] = None
    google_maps_url: Optional[str] = None

class VendorOnboardingStep4(BaseModel):
    fssai_number: str

    @field_validator('fssai_number')
    @classmethod
    def validate_fssai(cls, v: str) -> str:
        if not re.match(r"^[1-3](0[1-9]|[12]\d|3[0-6])(0[6-9]|1\d|2[0-6])\d{9}$", v):
            raise ValueError("Invalid FSSAI Registration Number. Please ensure it follows the correct format.")
        return v

class AdminPasswordUpdate(BaseModel):
    new_password: str = Field(..., min_length=6)

class SelfPasswordUpdate(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=6)
    confirm_password: str

class SelfProfileUpdate(BaseModel):
    name: str = Field(..., min_length=2, max_length=50)
    phone: str
    city_id: int
    dietary_preference: Optional[str] = None
    include_eggs: Optional[bool] = None

    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v: str):
        clean_phone = re.sub(r'\D', '', v)
        if len(clean_phone) != 10:
            raise ValueError('Phone number must be exactly 10 digits')
        return clean_phone

# --- AUTH & USER ---
class ProfileCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=50)
    phone: str = Field(..., description="10-digit mobile number")
    
    # We now strictly use ID, no Enums
    role_id: int = Field(..., description="ID of the role from database")
    
    city_id: int
    password: str = Field(..., min_length=6)

    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v: str):
        clean_phone = re.sub(r'\D', '', v)
        if len(clean_phone) != 10:
            raise ValueError('Phone number must be exactly 10 digits')
        return clean_phone

# --- WALLET ---
class WalletTransactionSchema(BaseModel):
    id: int
    wallet_id: int
    amount: Decimal
    transaction_type: str
    description: Optional[str]
    created_at: datetime
    class Config:
        from_attributes = True

class WalletSchema(BaseModel):
    id: int
    balance: Decimal
    is_cod_revoked: bool
    transactions: List[WalletTransactionSchema] = []
    class Config:
        from_attributes = True

class ProfileSchema(BaseModel):
    id: int
    name: str
    phone: str
    role: Optional[RoleSchema] = None
    city_id: int
    cod_status: str
    wallet: Optional[WalletSchema] = None
    created_at: datetime
    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    phone: str
    password: str

# --- ADDRESS ---
class AddressCreate(BaseModel):
    label: str = Field(default="home", description="e.g. home, office, other")
    address_text: str = Field(..., min_length=5)
    house_no: Optional[str] = None
    pincode: Optional[str] = None
    google_maps_url: Optional[str] = None
    house_photo_url: Optional[str] = None

class AddressSchema(AddressCreate):
    id: int
    user_id: int
    class Config:
        from_attributes = True

# --- ORDERS ---
class OrderDateSlot(BaseModel):
    date: str
    slot: str
    service_type: Optional[str] = None

class OrderItemCreate(BaseModel):
    meal_id: int
    quantity: int = Field(..., gt=0)
    delivery_dates: Optional[List[OrderDateSlot]] = None # List of {date, slot} objects

class OrderCreate(BaseModel):
    vendor_id: int
    address_id: int
    delivery_date: date
    delivery_time: Optional[time] = None
    subscription_start_date: Optional[date] = None
    subscription_end_date: Optional[date] = None
    is_continuous: Optional[bool] = False
    items: List[OrderItemCreate] = Field(..., min_items=1)

class OrderItemSchema(BaseModel):
    meal_id: int
    quantity: int
    delivery_dates: Optional[str] = None
    meal: Optional[MealSchema] = None
    class Config:
        from_attributes = True

class OrderSchema(BaseModel):
    id: int
    customer_id: int
    vendor_id: int
    status: str
    delivery_date: date
    delivery_time: Optional[time]
    subscription_start_date: Optional[date]
    subscription_end_date: Optional[date]
    rating: Optional[int] = None
    feedback_tags: Optional[str] = None
    feedback_comment: Optional[str] = None
    items: List[OrderItemSchema] = [] 
    class Config:
        from_attributes = True

class OrderFeedbackUpdate(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    feedback_tags: Optional[str] = None
    feedback_comment: Optional[str] = None

# --- SUBSCRIPTIONS ---
class SubscriptionUpdate(BaseModel):
    selected_days: Optional[List[int]] = None
    status: Optional[str] = None

class SubscriptionSchema(BaseModel):
    id: int
    customer_id: int
    vendor_id: int
    meal_id: int
    status: str
    selected_days: str
    subscription_start_date: Optional[date] = None
    subscription_end_date: Optional[date] = None
    meal: Optional[MealSchema] = None
    class Config:
        from_attributes = True
