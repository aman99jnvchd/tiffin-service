from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from ..db.session import get_db
from ..models.models import Profile, Role, VendorProfile
from ..schemas.responses import ApiResponse
from ..schemas.schemas import VendorProfileUpdate, AdminPasswordUpdate
from ..core.security import hash_password
from .deps import get_current_user_data

router = APIRouter()


# --- GET ALL USERS ---
@router.get("/users", response_model=ApiResponse)
async def get_all_users(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_data)
):
    """
    Get list of all users with their role and city information
    Excludes Super Admin users (role_id = 1)
    """
    try:
        # Get all users except Super Admins
        users = db.query(Profile).filter(Profile.role_id != 1).all()
        
        users_data = []
        for user in users:
            user_dict = {
                "id": user.id,
                "name": user.name,
                "phone": user.phone,
                "is_blocked": getattr(user, 'is_blocked', False),
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "role": {
                    "id": user.role.id,
                    "name": user.role.name,
                    "slug": user.role.slug
                } if user.role else None,
                "city": {
                    "id": user.city.id,
                    "name": user.city.name,
                    "alias": user.city.alias
                } if user.city else None
            }
            users_data.append(user_dict)
        
        return ApiResponse(
            status=200,
            message="Users fetched successfully",
            data=users_data
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch users: {str(e)}"
        )


# --- GET SINGLE USER ---
@router.get("/users/{user_id}", response_model=ApiResponse)
async def get_user_by_id(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_data)
):
    """
    Get detailed information about a specific user
    """
    user = db.query(Profile).filter(Profile.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user_data = {
        "id": user.id,
        "name": user.name,
        "phone": user.phone,
        "is_blocked": getattr(user, 'is_blocked', False),
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "role": {
            "id": user.role.id,
            "name": user.role.name,
            "slug": user.role.slug
        } if user.role else None,
        "city": {
            "id": user.city.id,
            "name": user.city.name,
            "alias": user.city.alias
        } if user.city else None,
        "vendor_profile": None
    }
    
    # Add vendor profile if user is a vendor
    if user.role and user.role.slug == "vendor" and user.vendor_profile:
        vendor = user.vendor_profile
        user_data["vendor_profile"] = {
            "id": vendor.id,
            "kitchen_name": vendor.kitchen_name,
            "is_open": vendor.is_open,
            "open_time": vendor.open_time.strftime("%H:%M") if vendor.open_time else None,
            "close_time": vendor.close_time.strftime("%H:%M") if vendor.close_time else None
        }

    # Add addresses
    user_data["addresses"] = [
        {
            "id": addr.id,
            "label": addr.label,
            "address_text": addr.address_text,
            "house_no": addr.house_no,
            "pincode": addr.pincode,
            "house_photo_url": addr.house_photo_url,
            "google_maps_url": addr.google_maps_url,
        }
        for addr in user.addresses
    ]

    return ApiResponse(
        status=200,
        message="User details fetched successfully",
        data=user_data
    )


# --- UPDATE USER ---
@router.put("/users/{user_id}", response_model=ApiResponse)
async def update_user(
    user_id: int,
    name: str,
    phone: str,
    city_id: int,
    role_id: Optional[int] = Query(None),
    is_blocked: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_data)
):
    """
    Update user's basic information (name, phone, city), and optionally role and blocked status.
    """
    user = db.query(Profile).filter(Profile.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if phone is already taken by another user
    if phone != user.phone:
        existing_phone = db.query(Profile).filter(
            Profile.phone == phone,
            Profile.id != user_id
        ).first()
        
        if existing_phone:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Phone number already in use"
            )
    
    user.name = name
    user.phone = phone
    user.city_id = city_id

    if role_id is not None:
        role_obj = db.query(Role).filter(Role.id == role_id).first()
        if not role_obj:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role")
        if role_id == 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot assign super admin role through this form"
            )
        user.role_id = role_id
        if role_obj.slug == "vendor" and not user.vendor_profile:
            db.add(VendorProfile(user_id=user.id, kitchen_name=f"{user.name}'s Kitchen"))

    if is_blocked is not None:
        if user.id == current_user["user_id"] and is_blocked:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot block yourself"
            )
        user.is_blocked = is_blocked
    
    db.commit()
    db.refresh(user)
    
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


# --- UPDATE TARGET USER VENDOR PROFILE (admin / staff editing a vendor) ---
@router.patch("/users/{user_id}/vendor-profile", response_model=ApiResponse)
async def update_user_vendor_profile(
    user_id: int,
    settings: VendorProfileUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_data)
):
    user = db.query(Profile).filter(Profile.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if not user.role or user.role.slug != "vendor":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User is not a vendor")
    vendor = user.vendor_profile
    if not vendor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor profile not found")

    update_data = settings.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(vendor, key, value)

    db.commit()
    db.refresh(vendor)

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


# --- SET USER PASSWORD (admin reset) ---
@router.patch("/users/{user_id}/password", response_model=ApiResponse)
async def update_user_password(
    user_id: int,
    body: AdminPasswordUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_data)
):
    user = db.query(Profile).filter(Profile.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.hashed_password = hash_password(body.new_password)
    db.commit()

    return ApiResponse(status=200, message="Password updated successfully", data=None)


# --- TOGGLE USER STATUS (BLOCK/UNBLOCK) ---
@router.patch("/users/{user_id}/toggle-status", response_model=ApiResponse)
async def toggle_user_status(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_data)
):
    """
    Block or unblock a user
    """
    user = db.query(Profile).filter(Profile.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent blocking yourself
    if user.id == current_user["user_id"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot block yourself"
        )
    
    # Toggle is_blocked status
    current_status = getattr(user, 'is_blocked', False)
    setattr(user, 'is_blocked', not current_status)
    
    db.commit()
    db.refresh(user)
    
    new_status = getattr(user, 'is_blocked', False)
    
    return ApiResponse(
        status=200,
        message=f"User {'blocked' if new_status else 'unblocked'} successfully",
        data={
            "id": user.id,
            "is_blocked": new_status
        }
    )
