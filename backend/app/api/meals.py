from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List
from datetime import date

from ..db.session import get_db
from ..models.models import DailyMenu, Meal, VendorProfile
from ..schemas.responses import ApiResponse
from ..schemas.schemas import MealSchema
from .deps import RoleChecker

router = APIRouter()

@router.post("/meals", response_model=ApiResponse[MealSchema], status_code=status.HTTP_201_CREATED)
async def create_meal(
    name: str, 
    price: float, 
    always_available: bool = True, 
    db: Session = Depends(get_db),
    current_vendor: dict = Depends(RoleChecker(["vendor"]))
):
    vendor = db.query(VendorProfile).filter(VendorProfile.user_id == current_vendor['user_id']).first()
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor profile not found. Please complete your profile first."
        )
    
    new_meal = Meal(
        name=name,
        base_price=price,
        vendor_id=vendor.id,
        is_always_available=always_available
    )
    db.add(new_meal)
    db.commit()
    db.refresh(new_meal)
    
    return ApiResponse(status=201, message="Meal created successfully", data=new_meal)

@router.post("/meals/{meal_id}/enable", response_model=ApiResponse)
async def enable_meal_for_today(
    meal_id: int,
    db: Session = Depends(get_db),
    current_vendor: dict = Depends(RoleChecker(["vendor"]))
):
    today = date.today()
    vendor = db.query(VendorProfile).filter(VendorProfile.user_id == current_vendor['user_id']).first()
    
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor profile not found"
        )

    # Verify meal exists and belongs to this specific vendor
    meal = db.query(Meal).filter(Meal.id == meal_id, Meal.vendor_id == vendor.id).first()
    if not meal:
        # 404 is safer here to avoid leaking information about other vendors' meals
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meal not found or you do not have permission to enable it"
        )
    
    if meal.is_always_available:
        return ApiResponse(status=200, message="Meal is always available by default", data=None)

    existing_entry = db.query(DailyMenu).filter(
        DailyMenu.meal_id == meal_id, 
        DailyMenu.date == today
    ).first()

    if not existing_entry:
        new_entry = DailyMenu(meal_id=meal_id, vendor_id=vendor.id, date=today)
        db.add(new_entry)
        db.commit()
        msg = "Meal enabled for today's menu"
    else:
        msg = "Meal was already active for today"

    return ApiResponse(status=200, message=msg, data={"meal_id": meal_id, "active_date": str(today)})

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
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Meal not found"
        )
    
    meal.is_active = not meal.is_active
    db.commit()
    
    status_msg = "activated" if meal.is_active else "deactivated"
    return ApiResponse(status=200, message=f"Meal successfully {status_msg}", data=None)

@router.get("/vendor/{vendor_id}/menu", response_model=ApiResponse[List[MealSchema]])
async def get_active_menu(vendor_id: int, db: Session = Depends(get_db)):
    """Fetch what is currently orderable (Always available + specific daily items)."""
    today = date.today()
    
    meals = db.query(Meal).outerjoin(DailyMenu).filter(
        Meal.vendor_id == vendor_id,
        Meal.is_active == True,
        or_(
            Meal.is_always_available == True,
            DailyMenu.date == today
        )
    ).all()

    return ApiResponse(status=200, message="Menu fetched successfully", data=meals)

@router.get("/vendor/{vendor_id}/all-meals", response_model=ApiResponse[List[MealSchema]])
async def get_all_vendor_meals(vendor_id: int, db: Session = Depends(get_db)):
    """Fetch every meal registered to a vendor (for management dashboard)."""
    meals = db.query(Meal).filter(Meal.vendor_id == vendor_id).all()
    return ApiResponse(status=200, message="All meals fetched", data=meals)
