from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..db.session import get_db
from ..models.models import VendorProfile, Profile
from ..schemas.responses import ApiResponse
from ..schemas.schemas import VendorProfileSchema, VendorProfileUpdate
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


@router.get("/vendors", response_model=ApiResponse)
async def get_all_vendors(db: Session = Depends(get_db)):
    """Public endpoint — returns all vendor profiles with kitchen info and city."""
    vendors = db.query(VendorProfile).all()
    data = []
    for v in vendors:
        data.append({
            "id": v.id,
            "kitchen_name": v.kitchen_name,
            "is_open": v.is_open,
            "open_time": v.open_time.strftime("%H:%M") if v.open_time else None,
            "close_time": v.close_time.strftime("%H:%M") if v.close_time else None,
            "meal_count": len(v.meals),
            "city": {
                "id": v.owner.city.id,
                "name": v.owner.city.name,
            } if v.owner and v.owner.city else None,
        })
    return ApiResponse(status=200, message="Vendors fetched", data=data)
