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

# --- MEAL ---
class MealSchema(BaseModel):
    id: int
    vendor_id: int
    name: str
    base_price: Decimal
    is_always_available: bool
    is_active: bool
    class Config:
        from_attributes = True

# --- VENDOR ---
class VendorProfileSchema(BaseModel):
    id: int
    user_id: int
    kitchen_name: str
    is_open: bool
    open_time: Optional[time]
    close_time: Optional[time]
    class Config:
        from_attributes = True

class VendorProfileUpdate(BaseModel):
    kitchen_name: Optional[str] = None
    is_open: Optional[bool] = None
    open_time: Optional[time] = None
    close_time: Optional[time] = None

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

class ProfileSchema(BaseModel):
    id: int
    name: str
    phone: str
    role: Optional[RoleSchema] = None # Returns full object
    city_id: int
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
    google_maps_url: Optional[str] = None
    house_photo_url: Optional[str] = None

class AddressSchema(AddressCreate):
    id: int
    user_id: int
    class Config:
        from_attributes = True

# --- ORDERS ---
class OrderItemCreate(BaseModel):
    meal_id: int
    quantity: int = Field(..., gt=0)

class OrderCreate(BaseModel):
    vendor_id: int
    address_id: int
    delivery_date: date
    delivery_time: Optional[time] = None
    items: List[OrderItemCreate] = Field(..., min_items=1)

class OrderItemSchema(BaseModel):
    meal_id: int
    quantity: int
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
    items: List[OrderItemSchema] = [] 
    class Config:
        from_attributes = True

# --- DAILY MENU ---
class DailyMenuSchema(BaseModel):
    id: int
    meal_id: int
    date: date
    class Config:
        from_attributes = True
