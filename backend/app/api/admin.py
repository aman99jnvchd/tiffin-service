from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from typing import List

from ..db.session import get_db
from ..schemas.responses import ApiResponse
from ..schemas.schemas import CitySchema, CityCreate, CityUpdate, RoleSchema, RoleCreate, RoleUpdate, PermissionSchema
from ..services.admin_service import AdminService

router = APIRouter()

@router.get("/permissions", response_model=ApiResponse[List[PermissionSchema]])
def get_all_permissions(db: Session = Depends(get_db)):
    perms = AdminService.get_all_permissions(db)
    return ApiResponse(status=200, message="Permissions fetched", data=perms)

@router.get("/roles", response_model=ApiResponse[List[RoleSchema]])
def get_roles(
    db: Session = Depends(get_db),
    active_only: bool = Query(False, description="If true, return only active roles"),
):
    roles = AdminService.get_roles(db, active_only)
    return ApiResponse(status=200, message="Roles fetched", data=roles)

@router.post("/roles", response_model=ApiResponse[RoleSchema])
def create_role(role_in: RoleCreate, db: Session = Depends(get_db)):
    new_role = AdminService.create_role(db, role_in)
    return ApiResponse(status=201, message="Role created", data=new_role)

@router.put("/roles/{role_id}", response_model=ApiResponse[RoleSchema])
def update_role(role_id: int, role_in: RoleUpdate, db: Session = Depends(get_db)):
    role = AdminService.update_role(db, role_id, role_in)
    return ApiResponse(status=200, message="Role updated", data=role)

@router.post("/cities", response_model=ApiResponse[CitySchema], status_code=status.HTTP_201_CREATED)
def add_city(city_in: CityCreate, db: Session = Depends(get_db)):
    db_city = AdminService.add_city(db, city_in)
    return ApiResponse(status=201, message="City added successfully", data=db_city)

@router.get("/cities", response_model=ApiResponse[List[CitySchema]])
def list_cities(db: Session = Depends(get_db)):
    cities = AdminService.list_cities(db)
    return ApiResponse(status=200, message="Cities fetched successfully", data=cities)

@router.put("/cities/{city_id}", response_model=ApiResponse[CitySchema])
def update_city(city_id: int, city_update: CityUpdate, db: Session = Depends(get_db)):
    db_city = AdminService.update_city(db, city_id, city_update)
    return ApiResponse(status=200, message="City updated successfully", data=db_city)

@router.patch("/cities/{city_id}/toggle", response_model=ApiResponse[CitySchema])
def toggle_city_status(city_id: int, db: Session = Depends(get_db)):
    db_city = AdminService.toggle_city_status(db, city_id)
    status_text = "enabled" if db_city.is_active else "disabled"
    return ApiResponse(status=200, message=f"City {status_text} successfully", data=db_city)
