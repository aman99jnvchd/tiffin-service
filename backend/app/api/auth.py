from sqlalchemy.orm import Session
from ..db.session import get_db
from fastapi import APIRouter, Depends, HTTPException, status
from ..models.models import Role, Profile, City, VendorProfile
from ..schemas.schemas import ProfileCreate, LoginRequest, SelfProfileUpdate, SelfPasswordUpdate
from ..schemas.responses import ApiResponse
from ..core.security import verify_password, create_access_token, hash_password
from .deps import get_current_user_data

router = APIRouter()

# --- REGISTER USER ---
@router.post("/register", response_model=ApiResponse, status_code=status.HTTP_201_CREATED)
async def register_user(user_data: ProfileCreate, db: Session = Depends(get_db)):
    # 1. Check if phone already exists
    existing = db.query(Profile).filter(Profile.phone == user_data.phone).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Phone number already registered"
        )

    # 2. Validate City exists
    city_exists = db.query(City).filter(City.id == user_data.city_id).first()
    if not city_exists:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid City ID provided"
        )

    # 3. Validate Role — only customer (id=2) and vendor (id=3) allowed on public register
    if user_data.role_id not in (2, 3):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role. Only customer or vendor registration is allowed."
        )

    role_obj = db.query(Role).filter(Role.id == user_data.role_id).first()
    if not role_obj:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Role ID provided"
        )

    # 4. Create profile with hashed password
    new_profile = Profile(
        name=user_data.name,
        phone=user_data.phone,
        role_id=user_data.role_id, # <--- Changed from role=... to role_id=...
        city_id=user_data.city_id,
        hashed_password=hash_password(user_data.password)
    )
    
    db.add(new_profile)
    db.commit()
    db.refresh(new_profile)

    # 5. Dynamic Logic: If user is a Vendor, initialize their Profile
    # Using the immutable 'slug' is safer than checking IDs or Names
    if role_obj.slug == "vendor":
        vendor_profile = VendorProfile(
            user_id=new_profile.id,
            kitchen_name=f"{user_data.name}'s Kitchen" # Default name
        )
        db.add(vendor_profile)
        db.commit()
    
    # 6. AUTO-LOGIN: Generate Token
    # IMPORTANT: We put the 'slug' (string) in the token, not the ID.
    # This keeps the frontend logic (e.g. check for "admin") working.
    token = create_access_token(data={
        "sub": str(new_profile.id), 
        "role": role_obj.slug,      # <--- Send "customer" string, not ID 2
        "city_id": new_profile.city_id
    })
    
    return ApiResponse(
        status=201, 
        message="Profile created successfully", 
        data={
            "access_token": token, 
            "token_type": "bearer", 
            "user_role": role_obj.slug, # Return string ("customer") to frontend
            "city_id": new_profile.city_id,
            "user_name": new_profile.name
        }
    )

# --- LOGIN ---
@router.post("/login", response_model=ApiResponse)
async def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    # 1. Find user by phone
    user = db.query(Profile).filter(Profile.phone == login_data.phone).first()
    
    # 2. Verify existence and password
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid phone or password"
        )

    # 3. Check user is not blocked and role is active
    if getattr(user, 'is_blocked', False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been blocked. Please contact support."
        )
    if user.role and not user.role.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account role has been disabled. Please contact support."
        )

    # 4. Create Token with claims
    role_slug = user.role.slug if user.role else "customer"
    access_token = create_access_token(
        data={
            "sub": str(user.id),
            "role": role_slug,
            "city_id": user.city_id
        }
    )
    
    return ApiResponse(
        status=200,
        message="Login successful",
        data={
            "access_token": access_token,
            "token_type": "bearer",
            "user_role": role_slug,
            "city_id": user.city_id
        }
    )

# --- GET CURRENT USER PERMISSIONS ---
@router.get("/me/permissions", response_model=ApiResponse)
async def get_my_permissions(
    current_user: dict = Depends(get_current_user_data),
    db: Session = Depends(get_db)
):
    """
    Returns the list of permission slugs for the currently logged-in user.
    Frontend uses this to show/hide UI elements based on permissions.
    """
    user = db.query(Profile).filter(Profile.id == current_user["user_id"]).first()
    
    if not user or not user.role:
        return ApiResponse(
            status=200,
            message="No permissions found",
            data={"permissions": []}
        )
    
    # Extract permission slugs from the user's role
    permission_slugs = [perm.slug for perm in user.role.permissions]
    
    return ApiResponse(
        status=200,
        message="Permissions fetched successfully",
        data={"permissions": permission_slugs}
    )


# --- GET MY PROFILE ---
@router.get("/me", response_model=ApiResponse)
async def get_my_profile(
    current_user: dict = Depends(get_current_user_data),
    db: Session = Depends(get_db)
):
    user = db.query(Profile).filter(Profile.id == current_user["user_id"]).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    data = {
        "id": user.id,
        "name": user.name,
        "phone": user.phone,
        "city": {"id": user.city.id, "name": user.city.name} if user.city else None,
        "role": {"id": user.role.id, "name": user.role.name, "slug": user.role.slug} if user.role else None,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "vendor_profile": None,
        "addresses": [
            {
                "id": a.id, "label": a.label, "address_text": a.address_text,
                "house_no": a.house_no, "pincode": a.pincode,
                "house_photo_url": a.house_photo_url, "google_maps_url": a.google_maps_url,
            }
            for a in user.addresses
        ],
    }

    if user.role and user.role.slug == "vendor" and user.vendor_profile:
        v = user.vendor_profile
        data["vendor_profile"] = {
            "id": v.id,
            "kitchen_name": v.kitchen_name,
            "is_open": v.is_open,
            "open_time": v.open_time.strftime("%H:%M") if v.open_time else None,
            "close_time": v.close_time.strftime("%H:%M") if v.close_time else None,
        }

    return ApiResponse(status=200, message="Profile fetched", data=data)


# --- UPDATE MY PROFILE ---
@router.put("/me", response_model=ApiResponse)
async def update_my_profile(
    body: SelfProfileUpdate,
    current_user: dict = Depends(get_current_user_data),
    db: Session = Depends(get_db)
):
    user = db.query(Profile).filter(Profile.id == current_user["user_id"]).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if body.phone != user.phone:
        existing = db.query(Profile).filter(Profile.phone == body.phone, Profile.id != user.id).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Phone number already in use")

    city = db.query(City).filter(City.id == body.city_id).first()
    if not city:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid city")

    user.name = body.name
    user.phone = body.phone
    user.city_id = body.city_id
    db.commit()
    db.refresh(user)

    return ApiResponse(status=200, message="Profile updated successfully", data={"name": user.name, "phone": user.phone})


# --- CHANGE MY PASSWORD ---
@router.patch("/me/password", response_model=ApiResponse)
async def change_my_password(
    body: SelfPasswordUpdate,
    current_user: dict = Depends(get_current_user_data),
    db: Session = Depends(get_db)
):
    user = db.query(Profile).filter(Profile.id == current_user["user_id"]).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if not verify_password(body.current_password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")

    if body.new_password != body.confirm_password:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Passwords do not match")

    user.hashed_password = hash_password(body.new_password)
    db.commit()

    return ApiResponse(status=200, message="Password changed successfully", data=None)
