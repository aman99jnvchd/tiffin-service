from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List

from ..models.models import City, Role, Permission
from ..db.session import get_db
from ..schemas.responses import ApiResponse
from ..schemas.schemas import CitySchema, CityCreate, CityUpdate, RoleSchema, RoleCreate, RoleUpdate, PermissionSchema

router = APIRouter()

# --- PERMISSIONS API ---
@router.get("/permissions", response_model=ApiResponse[List[PermissionSchema]])
def get_all_permissions(db: Session = Depends(get_db)):
    """List all available system permissions (for the checkboxes)"""
    perms = db.query(Permission).all()
    return ApiResponse(status=200, message="Permissions fetched", data=perms)

# --- ROLES CRUD ---
@router.get("/roles", response_model=ApiResponse[List[RoleSchema]])
def get_roles(
    db: Session = Depends(get_db),
    active_only: bool = Query(False, description="If true, return only active roles"),
):
    """List roles with assigned permissions (optionally only active ones)."""
    query = db.query(Role)
    if active_only:
        query = query.filter(Role.is_active == True)
    roles = query.all()
    return ApiResponse(status=200, message="Roles fetched", data=roles)

@router.post("/roles", response_model=ApiResponse[RoleSchema])
def create_role(role_in: RoleCreate, db: Session = Depends(get_db)):
    # 1. Check uniqueness
    if db.query(Role).filter(Role.slug == role_in.slug).first():
        raise HTTPException(status_code=400, detail="Role slug already exists")
    
    # 2. Create Role
    new_role = Role(
        name=role_in.name,
        slug=role_in.slug,
        is_active=role_in.is_active
    )
    
    # 3. Assign Permissions
    if role_in.permission_ids:
        perms = db.query(Permission).filter(Permission.id.in_(role_in.permission_ids)).all()
        new_role.permissions = perms
    
    db.add(new_role)
    db.commit()
    db.refresh(new_role)
    
    return ApiResponse(status=201, message="Role created", data=new_role)

@router.put("/roles/{role_id}", response_model=ApiResponse[RoleSchema])
def update_role(role_id: int, role_in: RoleUpdate, db: Session = Depends(get_db)):
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
        
    # Prevent editing critical roles if needed (optional safety)
    if role.slug in ['admin', 'customer', 'vendor'] and role_in.slug and role_in.slug != role.slug:
        raise HTTPException(status_code=400, detail="Cannot change slug of system roles")

    # Prevent disabling system roles (id 1, 2, 3)
    if role.id in (1, 2, 3) and role_in.is_active is False:
        raise HTTPException(status_code=400, detail="System roles cannot be disabled")

    # Update basic fields
    if role_in.name: role.name = role_in.name
    if role_in.slug: role.slug = role_in.slug
    if role_in.is_active is not None: role.is_active = role_in.is_active
    
    # Update Permissions (if provided)
    if role_in.permission_ids is not None:
        perms = db.query(Permission).filter(Permission.id.in_(role_in.permission_ids)).all()
        role.permissions = perms # SQLAlchemy handles the Many-to-Many update magic
        
    db.commit()
    db.refresh(role)
    return ApiResponse(status=200, message="Role updated", data=role)

# --- CITIES CRUD ---
@router.post("/cities", response_model=ApiResponse[CitySchema], status_code=status.HTTP_201_CREATED)
async def add_city(city_in: CityCreate, db: Session = Depends(get_db)):
    # 1. Check if city or alias already exists (Preserving your existing logic)
    existing_city = db.query(City).filter(
        or_(City.name == city_in.name, City.alias == city_in.alias)
    ).first()
    
    if existing_city:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="City name or Alias already exists"
        )

    # 2. Create and Save City (Now includes is_active from the schema)
    db_city = City(
        name=city_in.name, 
        alias=city_in.alias,
        is_active=city_in.is_active
    )
    db.add(db_city)
    db.commit()
    db.refresh(db_city)
    
    return ApiResponse(
        status=201, 
        message="City added successfully", 
        data=db_city
    )

@router.get("/cities", response_model=ApiResponse[List[CitySchema]])
async def list_cities(db: Session = Depends(get_db)):
    # Standard 200 OK fetch
    cities = db.query(City).all()
    return ApiResponse(
        status=200, 
        message="Cities fetched successfully", 
        data=cities
    )

@router.put("/cities/{city_id}", response_model=ApiResponse[CitySchema])
async def update_city(city_id: int, city_update: CityUpdate, db: Session = Depends(get_db)):
    # 1. Find the city
    db_city = db.query(City).filter(City.id == city_id).first()
    if not db_city:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="City not found"
        )

    # 2. Check for duplicate slug/alias ONLY if it's being changed
    if city_update.alias and city_update.alias != db_city.alias:
        existing_alias = db.query(City).filter(City.alias == city_update.alias).first()
        if existing_alias:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Slug is already taken by another city"
            )

    # 3. Update fields dynamically
    if city_update.name is not None:
        db_city.name = city_update.name
    if city_update.alias is not None:
        db_city.alias = city_update.alias
    if city_update.is_active is not None:
        db_city.is_active = city_update.is_active

    db.commit()
    db.refresh(db_city)

    return ApiResponse(
        status=200,
        message="City updated successfully",
        data=db_city
    )

@router.patch("/cities/{city_id}/toggle", response_model=ApiResponse[CitySchema])
async def toggle_city_status(city_id: int, db: Session = Depends(get_db)):
    # 1. Find the city
    db_city = db.query(City).filter(City.id == city_id).first()
    if not db_city:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="City not found"
        )

    # 2. Toggle Status
    db_city.is_active = not db_city.is_active
    db.commit()
    db.refresh(db_city)

    status_text = "enabled" if db_city.is_active else "disabled"
    
    return ApiResponse(
        status=200,
        message=f"City {status_text} successfully",
        data=db_city
    )
