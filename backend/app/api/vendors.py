from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..db.session import get_db
from ..models.models import VendorProfile, Profile, Address
from ..schemas.responses import ApiResponse
from ..schemas.schemas import (
    VendorProfileSchema, VendorProfileUpdate, 
    VendorOnboardingStep1, VendorOnboardingStep2, 
    VendorOnboardingStep3, VendorOnboardingStep4
)
from .deps import RoleChecker

router = APIRouter()

@router.post("/vendor-profile", response_model=ApiResponse[VendorProfileSchema], status_code=status.HTTP_201_CREATED)
async def create_vendor_profile(
    kitchen_name: str, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(RoleChecker(["vendor"]))
):
    user_id = current_user['user_id']
    
    # 1. Check if profile already exists - 409 Conflict is most accurate
    existing = db.query(VendorProfile).filter(VendorProfile.user_id == user_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Vendor profile already exists for this account"
        )
        
    # 2. Create the kitchen profile linked to the authenticated user
    new_vendor = VendorProfile(
        user_id=user_id, 
        kitchen_name=kitchen_name
    )
    db.add(new_vendor)
    db.commit()
    db.refresh(new_vendor)

    return ApiResponse(status=201, message="Vendor profile created", data=new_vendor)

@router.patch("/vendor-profile/settings", response_model=ApiResponse[VendorProfileSchema])
async def update_vendor_settings(
    settings: VendorProfileUpdate,
    db: Session = Depends(get_db),
    current_vendor: dict = Depends(RoleChecker(["vendor"]))
):
    vendor = db.query(VendorProfile).filter(VendorProfile.user_id == current_vendor['user_id']).first()
    
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor profile not found"
        )

    # Update only the fields provided
    update_data = settings.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(vendor, key, value)

    db.commit()
    db.refresh(vendor)
    
    return ApiResponse(status=200, message="Settings updated successfully", data=vendor)

@router.get("/my-vendor-profile", response_model=ApiResponse[VendorProfileSchema])
async def get_my_vendor_profile(
    db: Session = Depends(get_db),
    current_vendor: dict = Depends(RoleChecker(["vendor"]))
):
    vendor = db.query(VendorProfile).filter(VendorProfile.user_id == current_vendor['user_id']).first()
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found. Please create your vendor profile first."
        )
        
    return ApiResponse(status=200, message="Profile fetched", data=vendor)


# --- ONBOARDING ENDPOINTS ---
@router.patch("/onboarding/step-1", response_model=ApiResponse[VendorProfileSchema])
async def onboarding_step_1(
    data: VendorOnboardingStep1,
    db: Session = Depends(get_db),
    current_vendor: dict = Depends(RoleChecker(["vendor"]))
):
    vendor = db.query(VendorProfile).filter(VendorProfile.user_id == current_vendor['user_id']).first()
    if not vendor: raise HTTPException(status_code=404, detail="Vendor not found")
    
    vendor.kitchen_name = data.kitchen_name
    vendor.dietary_type = data.dietary_type
    vendor.service_types = data.service_types
    vendor.onboarding_step = 2
    
    db.commit()
    db.refresh(vendor)
    return ApiResponse(status=200, message="Step 1 complete", data=vendor)


@router.patch("/onboarding/step-2", response_model=ApiResponse[VendorProfileSchema])
async def onboarding_step_2(
    data: VendorOnboardingStep2,
    db: Session = Depends(get_db),
    current_vendor: dict = Depends(RoleChecker(["vendor"]))
):
    vendor = db.query(VendorProfile).filter(VendorProfile.user_id == current_vendor['user_id']).first()
    if not vendor: raise HTTPException(status_code=404, detail="Vendor not found")
    
    vendor.delivery_windows = data.delivery_windows
    vendor.order_cutoff_hours = data.order_cutoff_hours
    vendor.max_capacity_per_slot = data.max_capacity_per_slot
    vendor.onboarding_step = 3
    
    db.commit()
    db.refresh(vendor)
    return ApiResponse(status=200, message="Step 2 complete", data=vendor)


@router.patch("/onboarding/step-3", response_model=ApiResponse[VendorProfileSchema])
async def onboarding_step_3(
    data: VendorOnboardingStep3,
    db: Session = Depends(get_db),
    current_vendor: dict = Depends(RoleChecker(["vendor"]))
):
    vendor = db.query(VendorProfile).filter(VendorProfile.user_id == current_vendor['user_id']).first()
    if not vendor: raise HTTPException(status_code=404, detail="Vendor not found")
    
    # Save kitchen address
    new_address = Address(
        user_id=current_vendor['user_id'],
        label="Kitchen",
        address_text=data.address_text,
        pincode=data.pincode,
        house_no=data.house_no,
        google_maps_url=data.google_maps_url,
        house_photo_url=data.house_photo_url
    )
    db.add(new_address)
    
    vendor.onboarding_step = 4
    db.commit()
    db.refresh(vendor)
    return ApiResponse(status=200, message="Step 3 complete", data=vendor)


@router.patch("/onboarding/step-4", response_model=ApiResponse[VendorProfileSchema])
async def onboarding_step_4(
    data: VendorOnboardingStep4,
    db: Session = Depends(get_db),
    current_vendor: dict = Depends(RoleChecker(["vendor"]))
):
    vendor = db.query(VendorProfile).filter(VendorProfile.user_id == current_vendor['user_id']).first()
    if not vendor: raise HTTPException(status_code=404, detail="Vendor not found")
    
    vendor.fssai_number = data.fssai_number
    vendor.is_onboarding_complete = True
    vendor.onboarding_step = 5 # Finished
    
    db.commit()
    db.refresh(vendor)
    return ApiResponse(status=200, message="Onboarding complete!", data=vendor)


from typing import Optional

@router.get("/vendors", response_model=ApiResponse)
async def get_all_vendors(
    dietary_preference: Optional[str] = None,
    include_eggs: Optional[bool] = False,
    db: Session = Depends(get_db)
):
    """Public endpoint — returns all vendor profiles with kitchen info and city."""
    query = db.query(VendorProfile).filter(VendorProfile.is_onboarding_complete == True)
    
    if dietary_preference == "Pure Veg Only":
        query = query.filter(VendorProfile.dietary_type == "Pure Veg")
    elif dietary_preference == "Non-Veg Only":
        query = query.filter(VendorProfile.dietary_type.in_(["Both", "Non-Veg"]))
        
    vendors = query.all()
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
