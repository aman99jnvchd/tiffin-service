from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date
from fastapi_cache.decorator import cache

from ..db.session import get_db
from ..models.models import Meal, VendorProfile
from ..schemas.responses import ApiResponse
from ..schemas.schemas import MealSchema, MealCreate, MealUpdate
from .deps import RoleChecker, get_current_user_data, PermissionChecker
from ..services.meal_service import MealService

router = APIRouter()


# --- ADMIN: Get all meals across all vendors, optional vendor_id filter ---
@router.get("/meals", response_model=ApiResponse[List[MealSchema]])
def get_all_meals(
    vendor_id: int = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(PermissionChecker("meal:view"))
):
    meals = MealService.get_all_meals(db, vendor_id, current_user)
    return ApiResponse(status=200, message="Meals fetched", data=meals)


# --- ADMIN: Create meal for a vendor ---
@router.post("/meals", response_model=ApiResponse[MealSchema], status_code=status.HTTP_201_CREATED)
def create_meal(
    meal_in: MealCreate,
    vendor_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(PermissionChecker("meal:create"))
):
    new_meal = MealService.create_meal(db, meal_in, vendor_id)
    return ApiResponse(status=201, message="Meal created successfully", data=new_meal)


# --- ADMIN: Update meal ---
@router.put("/meals/{meal_id}", response_model=ApiResponse[MealSchema])
def update_meal(
    meal_id: int,
    meal_in: MealUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(PermissionChecker("meal:update"))
):
    meal = MealService.update_meal(db, meal_id, meal_in)
    return ApiResponse(status=200, message="Meal updated successfully", data=meal)


# --- Vendor: toggle meal active status ---
@router.patch("/meals/{meal_id}/toggle-status", response_model=ApiResponse)
def toggle_meal_availability(
    meal_id: int,
    db: Session = Depends(get_db),
    current_vendor: dict = Depends(RoleChecker(["vendor"]))
):
    meal = MealService.toggle_meal_availability(db, meal_id, current_vendor)
    status_msg = "activated" if meal.is_active else "deactivated"
    return ApiResponse(status=200, message=f"Meal {status_msg}", data=None)


# --- Public: Get active meals — optional vendor_id filter ---
@router.get("/menu", response_model=ApiResponse)
@cache(expire=300)
def get_menu(
    vendor_id: int = None,
    dietary_preference: Optional[str] = None,
    include_eggs: Optional[bool] = False,
    db: Session = Depends(get_db)
):
    meals = MealService.get_menu(db, vendor_id, dietary_preference, include_eggs)
    data = [MealSchema.from_orm_with_kitchen(m) for m in meals]
    return ApiResponse(status=200, message="Menu fetched successfully", data=data)


# --- Public: Get active menu for a vendor (kept for backwards compat) ---
@router.get("/vendor/{vendor_id}/menu", response_model=ApiResponse[List[MealSchema]])
def get_active_menu(vendor_id: int, db: Session = Depends(get_db)):
    meals = MealService.get_active_menu(db, vendor_id)
    return ApiResponse(status=200, message="Menu fetched successfully", data=meals)


# --- Public: Get all meals for a vendor (kept for backwards compat) ---
@router.get("/vendor/{vendor_id}/all-meals", response_model=ApiResponse[List[MealSchema]])
def get_all_vendor_meals(vendor_id: int, db: Session = Depends(get_db)):
    meals = MealService.get_all_vendor_meals(db, vendor_id)
    return ApiResponse(status=200, message="All meals fetched", data=meals)


# --- Public: Search meals and vendors ---
@router.get("/search", response_model=ApiResponse)
def search(
    q: str,
    dietary_preference: Optional[str] = None,
    include_eggs: Optional[bool] = False,
    db: Session = Depends(get_db)
):
    """Search meals by name and vendors by kitchen name. Min 2 chars enforced by caller."""
    meals, vendors = MealService.search(db, q, dietary_preference, include_eggs)

    return ApiResponse(status=200, message="Search results", data={
        "meals": [MealSchema.from_orm_with_kitchen(m) for m in meals],
        "vendors": [
            {
                "id": v.id,
                "kitchen_name": v.kitchen_name,
                "is_open": v.is_open,
                "open_time": v.open_time.strftime("%H:%M") if v.open_time else None,
                "close_time": v.close_time.strftime("%H:%M") if v.close_time else None,
                "meal_count": len(v.meals),
                "city": {"id": v.owner.city.id, "name": v.owner.city.name} if v.owner and v.owner.city else None,
            }
            for v in vendors
        ],
    })
