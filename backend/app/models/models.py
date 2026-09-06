from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Numeric, Date, Time, DateTime, Table, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from ..db.session import Base

# --- Roles - Permissions, Table for Many-to-Many ---
role_permissions = Table(
    "role_permissions",
    Base.metadata,
    Column("role_id", Integer, ForeignKey("roles.id"), primary_key=True),
    Column("permission_id", Integer, ForeignKey("permissions.id"), primary_key=True)
)

# --- Permissions Table ---
class Permission(Base):
    __tablename__ = "permissions"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)  # e.g., "Create City"
    slug = Column(String(100), unique=True, nullable=False) # e.g., "city:create"
    description = Column(Text, nullable=True)

    # Relationships
    roles = relationship("Role", secondary=role_permissions, back_populates="permissions")

# --- Roles Table ---
class Role(Base):
    __tablename__ = "roles"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False) # e.g., "City Manager"
    slug = Column(String(50), unique=True, nullable=False) # e.g., "city_manager"
    is_active = Column(Boolean, default=True)

    # Relationships
    permissions = relationship("Permission", secondary=role_permissions, back_populates="roles")
    users = relationship("Profile", back_populates="role")

# --- Cities Table ---
class City(Base):
    __tablename__ = "cities"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    alias = Column(String(20), unique=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    profiles = relationship("Profile", back_populates="city")

# --- Profiles Table ---
class Profile(Base):
    __tablename__ = "profiles"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100))
    phone = Column(String(20), unique=True)

    role_id = Column(Integer, ForeignKey("roles.id"), nullable=True)
    city_id = Column(Integer, ForeignKey("cities.id"))
    hashed_password = Column(String(255), nullable=False)
    is_blocked = Column(Boolean, default=False)
    cod_status = Column(String(50), default="Eligible")
    dietary_preference = Column(String(50), nullable=True, default="Any") # e.g. "Pure Veg Only", "Non-Veg Only", "Any"
    include_eggs = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    role = relationship("Role", back_populates="users")
    city = relationship("City", back_populates="profiles")
    vendor_profile = relationship("VendorProfile", back_populates="owner", uselist=False, cascade="all, delete")
    addresses = relationship("Address", back_populates="user", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="customer")
    wallet = relationship("Wallet", back_populates="user", uselist=False, cascade="all, delete-orphan")

# --- Wallet Table ---
class Wallet(Base):
    __tablename__ = "wallets"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("profiles.id"), unique=True)
    balance = Column(Numeric(precision=10, scale=2), default=0.00)
    is_cod_revoked = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("Profile", back_populates="wallet")
    transactions = relationship("WalletTransaction", back_populates="wallet", cascade="all, delete-orphan")

# --- Wallet Transactions Table ---
class WalletTransaction(Base):
    __tablename__ = "wallet_transactions"
    id = Column(Integer, primary_key=True, index=True)
    wallet_id = Column(Integer, ForeignKey("wallets.id"))
    amount = Column(Numeric(precision=10, scale=2), nullable=False)
    transaction_type = Column(String(50), nullable=False) # e.g., 'credit', 'debit'
    description = Column(String(255), nullable=True) # e.g., 'Recharge', 'Meal Order'
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    wallet = relationship("Wallet", back_populates="transactions")

# --- Vendor Profiles Table ---
class VendorProfile(Base):
    __tablename__ = "vendor_profiles"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("profiles.id"), unique=True)
    kitchen_name = Column(String(150), nullable=False)
    is_open = Column(Boolean, default=True)
    open_time = Column(Time)
    close_time = Column(Time)
    
    # Onboarding & Settings Fields
    dietary_type = Column(String(50), nullable=True) # Pure Veg, Non-Veg, Both
    service_types = Column(String(255), nullable=True) # e.g. "Breakfast,Lunch,Dinner"
    delivery_windows = Column(Text, nullable=True) # JSON of delivery slots
    order_cutoff_hours = Column(Integer, nullable=True)
    max_capacity_per_slot = Column(Integer, nullable=True)
    fssai_number = Column(String(100), nullable=True)
    is_onboarding_complete = Column(Boolean, default=False)
    onboarding_step = Column(Integer, default=1)

    # Relationships
    owner = relationship("Profile", back_populates="vendor_profile")
    meals = relationship("Meal", back_populates="vendor", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="vendor")
    categories = relationship("Category", back_populates="vendor", cascade="all, delete-orphan")

# --- Categories Table ---
class Category(Base):
    __tablename__ = "categories"
    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendor_profiles.id"))
    name = Column(String(50), nullable=False)

    # Relationships
    vendor = relationship("VendorProfile", back_populates="categories")
    meals = relationship("Meal", back_populates="category")

# --- Meals Table ---
class Meal(Base):
    __tablename__ = "meals"
    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendor_profiles.id"))
    name = Column(String(150), nullable=False)
    base_price = Column(Numeric(precision=10, scale=2), nullable=False)
    description = Column(Text, nullable=True)
    image_url = Column(String(255), nullable=True)
    available_days = Column(Text, nullable=True)  # JSON array e.g. ["Mon", "Wed", "Fri"] or null = daily
    is_always_available = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    service_types = Column(String(255), nullable=True) # e.g. "Breakfast,Lunch"
    dietary_type = Column(String(20), nullable=False, default='veg') # 'veg', 'non-veg', 'egg'

    # Relationships
    vendor = relationship("VendorProfile", back_populates="meals")
    category = relationship("Category", back_populates="meals")

    @property
    def kitchen_name(self):
        return self.vendor.kitchen_name if self.vendor else None

    @property
    def order_cutoff_hours(self):
        return getattr(self.vendor, 'order_cutoff_hours', None) if self.vendor else None



# --- Addresses Table ---
class Address(Base):
    __tablename__ = "addresses"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("profiles.id"))
    label = Column(String(50), default="home")
    address_text = Column(String(500), nullable=False)
    house_no = Column(String(50))
    pincode = Column(String(10), nullable=True)
    house_photo_url = Column(String(255), nullable=True)
    google_maps_url = Column(String(255), nullable=True)

    # Relationships
    user = relationship("Profile", back_populates="addresses")
    orders = relationship("Order", back_populates="address")

# --- Orders Table ---
class Order(Base):
    __tablename__ = "orders"
    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("profiles.id"))
    vendor_id = Column(Integer, ForeignKey("vendor_profiles.id"))
    address_id = Column(Integer, ForeignKey("addresses.id"))
    order_type = Column(String(50), default="ONE_TIME")
    status = Column(String(50), default="placed")
    delivery_date = Column(Date, nullable=False)
    delivery_time = Column(Time, nullable=True)
    subscription_start_date = Column(Date, nullable=True)
    subscription_end_date = Column(Date, nullable=True)
    rating = Column(Integer, nullable=True)
    feedback_tags = Column(String(255), nullable=True)
    feedback_comment = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    customer = relationship("Profile", back_populates="orders")
    vendor = relationship("VendorProfile", back_populates="orders")
    address = relationship("Address", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")

# --- Order Items Table ---
class OrderItem(Base):
    __tablename__ = "order_items"
    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    meal_id = Column(Integer, ForeignKey("meals.id"))
    quantity = Column(Integer, nullable=False)
    delivery_dates = Column(Text, nullable=True)  # JSON string of explicit dates like ["2026-07-15", "2026-07-16"]
    
    # Relationships
    order = relationship("Order", back_populates="items")
    meal = relationship("Meal")

# --- Subscriptions Table ---
class Subscription(Base):
    __tablename__ = "subscriptions"
    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey("profiles.id"))
    vendor_id = Column(Integer, ForeignKey("vendor_profiles.id"))
    meal_id = Column(Integer, ForeignKey("meals.id"))
    status = Column(String(50), default="active") # active, paused, cancelled
    selected_days = Column(String(255), nullable=False, default="[]") # JSON string e.g., "[1, 3, 5]" (1=Mon, 7=Sun)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # relationships
    customer = relationship("Profile", foreign_keys=[customer_id])
    vendor = relationship("VendorProfile", foreign_keys=[vendor_id])
    meal = relationship("Meal", foreign_keys=[meal_id])
