from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from ..db.session import get_db
from ..schemas.responses import ApiResponse
from ..schemas.schemas import VendorProfileUpdate, AdminPasswordUpdate
from .deps import get_current_user_data
from ..services.user_service import UserService

router = APIRouter()

@router.get("/users", response_model=ApiResponse)
def get_all_users(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_data)
):
    users_data = UserService.get_all_users(db)
    return ApiResponse(status=200, message="Users fetched successfully", data=users_data)

@router.get("/users/{user_id}", response_model=ApiResponse)
def get_user_by_id(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_data)
):
    user_data = UserService.get_user_by_id(db, user_id)
    return ApiResponse(status=200, message="User details fetched successfully", data=user_data)

@router.put("/users/{user_id}", response_model=ApiResponse)
def update_user(
    user_id: int,
    name: str,
    phone: str,
    city_id: int,
    role_id: Optional[int] = Query(None),
    is_blocked: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_data)
):
    user = UserService.update_user(db, user_id, name, phone, city_id, role_id, is_blocked, current_user)
    return ApiResponse(
        status=200,
        message="User updated successfully",
        data={
            "id": user.id,
            "name": user.name,
            "phone": user.phone,
            "city_id": user.city_id,
            "role_id": user.role_id,
            "is_blocked": getattr(user, "is_blocked", False),
        }
    )

@router.patch("/users/{user_id}/vendor-profile", response_model=ApiResponse)
def update_user_vendor_profile(
    user_id: int,
    settings: VendorProfileUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_data)
):
    vendor = UserService.update_user_vendor_profile(db, user_id, settings)
    return ApiResponse(
        status=200,
        message="Vendor profile updated successfully",
        data={
            "id": vendor.id,
            "kitchen_name": vendor.kitchen_name,
            "is_open": vendor.is_open,
            "open_time": vendor.open_time.strftime("%H:%M") if vendor.open_time else None,
            "close_time": vendor.close_time.strftime("%H:%M") if vendor.close_time else None,
        }
    )

@router.patch("/users/{user_id}/password", response_model=ApiResponse)
def update_user_password(
    user_id: int,
    body: AdminPasswordUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_data)
):
    UserService.update_user_password(db, user_id, body)
    return ApiResponse(status=200, message="Password updated successfully", data=None)

@router.patch("/users/{user_id}/toggle-status", response_model=ApiResponse)
def toggle_user_status(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_data)
):
    new_status, user_id = UserService.toggle_user_status(db, user_id, current_user)
    return ApiResponse(
        status=200,
        message=f"User {'blocked' if new_status else 'unblocked'} successfully",
        data={"id": user_id, "is_blocked": new_status}
    )
