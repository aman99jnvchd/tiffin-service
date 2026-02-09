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
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    role = relationship("Role", back_populates="users")
    city = relationship("City", back_populates="profiles")
    vendor_profile = relationship("VendorProfile", back_populates="owner", uselist=False, cascade="all, delete")
    addresses = relationship("Address", back_populates="user", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="customer")

# --- Vendor Profiles Table ---
class VendorProfile(Base):
    __tablename__ = "vendor_profiles"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("profiles.id"), unique=True)
    kitchen_name = Column(String(150), nullable=False)
    is_open = Column(Boolean, default=True)
    open_time = Column(Time)
    close_time = Column(Time)

    # Relationships
    owner = relationship("Profile", back_populates="vendor_profile")
    meals = relationship("Meal", back_populates="vendor", cascade="all, delete-orphan")
    orders = relationship("Order", back_populates="vendor")

# --- Meals Table ---
class Meal(Base):
    __tablename__ = "meals"
    id = Column(Integer, primary_key=True, index=True)
    vendor_id = Column(Integer, ForeignKey("vendor_profiles.id"))
    name = Column(String(150), nullable=False)
    base_price = Column(Numeric(precision=10, scale=2), nullable=False)
    is_always_available = Column(Boolean, default=True)
    is_active = Column(Boolean, default=True)

    # Relationships
    vendor = relationship("VendorProfile", back_populates="meals")
    daily_entries = relationship("DailyMenu", back_populates="meal", cascade="all, delete-orphan")

# --- Daily Menu Table ---
class DailyMenu(Base):
    __tablename__ = "daily_menu"
    id = Column(Integer, primary_key=True, index=True)
    meal_id = Column(Integer, ForeignKey("meals.id"))
    vendor_id = Column(Integer, ForeignKey("vendor_profiles.id"))
    date = Column(Date, server_default=func.current_date())

    # Relationships
    meal = relationship("Meal", back_populates="daily_entries")

# --- Addresses Table ---
class Address(Base):
    __tablename__ = "addresses"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("profiles.id"))
    label = Column(String(50), default="home")
    address_text = Column(String(500), nullable=False)
    house_no = Column(String(50))
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
    
    # Relationships
    order = relationship("Order", back_populates="items")
    meal = relationship("Meal")
