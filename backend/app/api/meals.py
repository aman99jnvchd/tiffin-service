from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from datetime import date

from ..db.session import get_db
from ..models.models import Meal, VendorProfile
from ..schemas.responses import ApiResponse
from ..schemas.schemas import MealSchema, MealCreate, MealUpdate
from .deps import RoleChecker, get_current_user_data, PermissionChecker

router = APIRouter()


# --- ADMIN: Get all meals across all vendors, optional vendor_id filter ---
@router.get("/meals", response_model=ApiResponse[List[MealSchema]])
async def get_all_meals(
    vendor_id: int = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(PermissionChecker("meal:view"))
):
    query = db.query(Meal)
    
    if current_user["role"] == "vendor":
        vendor = db.query(VendorProfile).filter(VendorProfile.user_id == current_user["user_id"]).first()
        if vendor:
            query = query.filter(Meal.vendor_id == vendor.id)
    elif vendor_id is not None:
        query = query.filter(Meal.vendor_id == vendor_id)
        
    meals = query.all()
    return ApiResponse(status=200, message="Meals fetched", data=meals)


# --- ADMIN: Create meal for a vendor ---
@router.post("/meals", response_model=ApiResponse[MealSchema], status_code=status.HTTP_201_CREATED)
async def create_meal(
    meal_in: MealCreate,
    vendor_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(PermissionChecker("meal:create"))
):
    vendor = db.query(VendorProfile).filter(VendorProfile.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found")

    new_meal = Meal(
        vendor_id=vendor_id,
        name=meal_in.name,
        base_price=meal_in.base_price,
        description=meal_in.description,
        image_url=meal_in.image_url,
        available_days=meal_in.available_days,
        is_always_available=meal_in.is_always_available,
        is_active=meal_in.is_active,
        category_id=meal_in.category_id,
        service_types=meal_in.service_types,
        dietary_type=meal_in.dietary_type,
    )
    db.add(new_meal)
    db.commit()
    db.refresh(new_meal)
    return ApiResponse(status=201, message="Meal created successfully", data=new_meal)


# --- ADMIN: Update meal ---
@router.put("/meals/{meal_id}", response_model=ApiResponse[MealSchema])
async def update_meal(
    meal_id: int,
    meal_in: MealUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(PermissionChecker("meal:update"))
):
    meal = db.query(Meal).filter(Meal.id == meal_id).first()
    if not meal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meal not found")

    for field, value in meal_in.model_dump(exclude_unset=True).items():
        setattr(meal, field, value)

    db.commit()
    db.refresh(meal)
    return ApiResponse(status=200, message="Meal updated successfully", data=meal)


# --- Vendor: toggle meal active status ---
@router.patch("/meals/{meal_id}/toggle-status", response_model=ApiResponse)
async def toggle_meal_availability(
    meal_id: int,
    db: Session = Depends(get_db),
    current_vendor: dict = Depends(RoleChecker(["vendor"]))
):
    vendor = db.query(VendorProfile).filter(VendorProfile.user_id == current_vendor['user_id']).first()
    if not vendor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor profile not found")

    meal = db.query(Meal).filter(Meal.id == meal_id, Meal.vendor_id == vendor.id).first()
    if not meal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meal not found")

    meal.is_active = not meal.is_active
    db.commit()

    status_msg = "activated" if meal.is_active else "deactivated"
    return ApiResponse(status=200, message=f"Meal {status_msg}", data=None)


# --- Public: Get active meals — optional vendor_id filter ---
@router.get("/menu", response_model=ApiResponse)
async def get_menu(
    vendor_id: int = None,
    dietary_preference: Optional[str] = None,
    include_eggs: Optional[bool] = False,
    db: Session = Depends(get_db)
):
    query = db.query(Meal)
    if vendor_id is not None:
        query = query.filter(Meal.vendor_id == vendor_id)
        
    if dietary_preference in ["Pure Veg Only", "Veg Meals Only"]:
        if include_eggs:
            query = query.filter(Meal.dietary_type.in_(["veg", "egg"]))
        else:
            query = query.filter(Meal.dietary_type == "veg")
    elif dietary_preference == "Non-Veg Only":
        query = query.filter(Meal.dietary_type == "non-veg")
        
    meals = query.all()
    data = [MealSchema.from_orm_with_kitchen(m) for m in meals]
    return ApiResponse(status=200, message="Menu fetched successfully", data=data)


# --- Public: Get active menu for a vendor (kept for backwards compat) ---
@router.get("/vendor/{vendor_id}/menu", response_model=ApiResponse[List[MealSchema]])
async def get_active_menu(vendor_id: int, db: Session = Depends(get_db)):
    meals = db.query(Meal).filter(
        Meal.vendor_id == vendor_id
    ).all()
    return ApiResponse(status=200, message="Menu fetched successfully", data=meals)


# --- Public: Get all meals for a vendor (kept for backwards compat) ---
@router.get("/vendor/{vendor_id}/all-meals", response_model=ApiResponse[List[MealSchema]])
async def get_all_vendor_meals(vendor_id: int, db: Session = Depends(get_db)):
    meals = db.query(Meal).filter(Meal.vendor_id == vendor_id).all()
    return ApiResponse(status=200, message="All meals fetched", data=meals)


# --- Public: Search meals and vendors ---
@router.get("/search", response_model=ApiResponse)
async def search(
    q: str,
    dietary_preference: Optional[str] = None,
    include_eggs: Optional[bool] = False,
    db: Session = Depends(get_db)
):
    """Search meals by name and vendors by kitchen name. Min 2 chars enforced by caller."""
    term = f"%{q.lower()}%"

    meal_query = db.query(Meal).filter(
        Meal.name.ilike(term)
    )
    if dietary_preference in ["Pure Veg Only", "Veg Meals Only"]:
        if include_eggs:
            meal_query = meal_query.filter(Meal.dietary_type.in_(["veg", "egg"]))
        else:
            meal_query = meal_query.filter(Meal.dietary_type == "veg")
    elif dietary_preference == "Non-Veg Only":
        meal_query = meal_query.filter(Meal.dietary_type == "non-veg")
        
    meals = meal_query.limit(20).all()

    vendor_query = db.query(VendorProfile).filter(
        VendorProfile.kitchen_name.ilike(term)
    )
    if dietary_preference == "Pure Veg Only":
        vendor_query = vendor_query.filter(VendorProfile.dietary_type == "Pure Veg")
    elif dietary_preference == "Non-Veg Only":
        vendor_query = vendor_query.filter(VendorProfile.dietary_type.in_(["Both", "Non-Veg"]))
        
    vendors = vendor_query.limit(10).all()

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
