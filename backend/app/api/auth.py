from sqlalchemy.orm import Session
from ..db.session import get_db
from fastapi import APIRouter, Depends, HTTPException, status
from ..models.models import Role, Profile, City, VendorProfile
from ..schemas.schemas import ProfileCreate, LoginRequest
from ..schemas.responses import ApiResponse
from ..core.security import verify_password, create_access_token, hash_password

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

    # 3. NEW: Validate Role exists
    # We fetch the role object so we can use its 'slug' for the token/logic later
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
    
    # 3. Create Token with claims
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
