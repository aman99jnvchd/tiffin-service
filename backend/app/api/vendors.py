from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional
from fastapi_cache.decorator import cache

from ..db.session import get_db
from ..schemas.responses import ApiResponse
from ..schemas.schemas import (
    VendorProfileSchema, VendorProfileUpdate, 
    VendorOnboardingStep1, VendorOnboardingStep2, 
    VendorOnboardingStep3, VendorOnboardingStep4
)
from .deps import RoleChecker
from ..services.vendor_service import VendorService

router = APIRouter()

@router.post("/vendor-profile", response_model=ApiResponse[VendorProfileSchema], status_code=status.HTTP_201_CREATED)
def create_vendor_profile(
    kitchen_name: str, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(RoleChecker(["vendor"]))
):
    new_vendor = VendorService.create_vendor_profile(db, kitchen_name, current_user['user_id'])
    return ApiResponse(status=201, message="Vendor profile created", data=new_vendor)

@router.patch("/vendor-profile/settings", response_model=ApiResponse[VendorProfileSchema])
def update_vendor_settings(
    settings: VendorProfileUpdate,
    db: Session = Depends(get_db),
    current_vendor: dict = Depends(RoleChecker(["vendor"]))
):
    vendor = VendorService.update_vendor_settings(db, settings, current_vendor['user_id'])
    return ApiResponse(status=200, message="Settings updated successfully", data=vendor)

@router.get("/my-vendor-profile", response_model=ApiResponse[VendorProfileSchema])
def get_my_vendor_profile(
    db: Session = Depends(get_db),
    current_vendor: dict = Depends(RoleChecker(["vendor"]))
):
    vendor = VendorService.get_vendor_profile(db, current_vendor['user_id'])
    return ApiResponse(status=200, message="Profile fetched", data=vendor)


# --- ONBOARDING ENDPOINTS ---
@router.patch("/onboarding/step-1", response_model=ApiResponse[VendorProfileSchema])
def onboarding_step_1(
    data: VendorOnboardingStep1,
    db: Session = Depends(get_db),
    current_vendor: dict = Depends(RoleChecker(["vendor"]))
):
    vendor = VendorService.onboarding_step_1(db, data, current_vendor['user_id'])
    return ApiResponse(status=200, message="Step 1 complete", data=vendor)


@router.patch("/onboarding/step-2", response_model=ApiResponse[VendorProfileSchema])
def onboarding_step_2(
    data: VendorOnboardingStep2,
    db: Session = Depends(get_db),
    current_vendor: dict = Depends(RoleChecker(["vendor"]))
):
    vendor = VendorService.onboarding_step_2(db, data, current_vendor['user_id'])
    return ApiResponse(status=200, message="Step 2 complete", data=vendor)


@router.patch("/onboarding/step-3", response_model=ApiResponse[VendorProfileSchema])
def onboarding_step_3(
    data: VendorOnboardingStep3,
    db: Session = Depends(get_db),
    current_vendor: dict = Depends(RoleChecker(["vendor"]))
):
    vendor = VendorService.onboarding_step_3(db, data, current_vendor['user_id'])
    return ApiResponse(status=200, message="Step 3 complete", data=vendor)


@router.patch("/onboarding/step-4", response_model=ApiResponse[VendorProfileSchema])
def onboarding_step_4(
    data: VendorOnboardingStep4,
    db: Session = Depends(get_db),
    current_vendor: dict = Depends(RoleChecker(["vendor"]))
):
    vendor = VendorService.onboarding_step_4(db, data, current_vendor['user_id'])
    return ApiResponse(status=200, message="Onboarding complete!", data=vendor)


@router.get("/vendors", response_model=ApiResponse)
@cache(expire=300)
def get_all_vendors(
    dietary_preference: Optional[str] = None,
    include_eggs: Optional[bool] = False,
    db: Session = Depends(get_db)
):
    """Public endpoint — returns all vendor profiles with kitchen info and city."""
    vendors = VendorService.get_all_vendors(db, dietary_preference)
    
    data = []
    for v in vendors:
        meal_count = len(v.meals)
        # Skip kitchens that don't have any meals to serve
        if meal_count == 0:
            continue
            
        image_url = None
        if v.owner and v.owner.addresses:
            # Assuming the first address is the kitchen address uploaded during onboarding
            image_url = v.owner.addresses[0].house_photo_url

        data.append({
            "id": v.id,
            "kitchen_name": v.kitchen_name,
            "image_url": image_url,
            "is_open": v.is_open,
            "open_time": v.open_time.strftime("%H:%M") if v.open_time else None,
            "close_time": v.close_time.strftime("%H:%M") if v.close_time else None,
            "delivery_windows": v.delivery_windows,
            "meal_count": meal_count,
            "city": {
                "id": v.owner.city.id,
                "name": v.owner.city.name,
            } if v.owner and v.owner.city else None,
        })
    return ApiResponse(status=200, message="Vendors fetched", data=data)
