from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from ..models.models import Role, Profile, City, VendorProfile
from ..schemas.schemas import ProfileCreate, LoginRequest, SelfProfileUpdate, SelfPasswordUpdate
from ..core.security import verify_password, create_access_token, hash_password

class AuthService:
    @staticmethod
    def register_user(db: Session, user_data: ProfileCreate):
        existing = db.query(Profile).filter(Profile.phone == user_data.phone).first()
        if existing:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Phone number already registered")

        city_exists = db.query(City).filter(City.id == user_data.city_id).first()
        if not city_exists:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid City ID provided")

        if user_data.role_id not in (2, 3):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role. Only customer or vendor registration is allowed.")

        role_obj = db.query(Role).filter(Role.id == user_data.role_id).first()
        if not role_obj:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Role ID provided")

        new_profile = Profile(
            name=user_data.name,
            phone=user_data.phone,
            role_id=user_data.role_id,
            city_id=user_data.city_id,
            hashed_password=hash_password(user_data.password)
        )
        db.add(new_profile)
        db.commit()
        db.refresh(new_profile)

        if role_obj.slug == "vendor":
            vendor_profile = VendorProfile(user_id=new_profile.id, kitchen_name=f"{user_data.name}'s Kitchen")
            db.add(vendor_profile)
            db.commit()
        
        token = create_access_token(data={
            "sub": str(new_profile.id), 
            "role": role_obj.slug,
            "city_id": new_profile.city_id
        })
        
        return {
            "access_token": token, 
            "token_type": "bearer", 
            "user_role": role_obj.slug,
            "city_id": new_profile.city_id,
            "user_name": new_profile.name,
            "dietary_preference": new_profile.dietary_preference,
            "include_eggs": new_profile.include_eggs,
            "is_onboarding_complete": False if role_obj.slug == "vendor" else True
        }

    @staticmethod
    def login(db: Session, login_data: LoginRequest):
        user = db.query(Profile).filter(Profile.phone == login_data.phone).first()
        
        if not user or not verify_password(login_data.password, user.hashed_password):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid phone or password")

        if getattr(user, 'is_blocked', False):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Your account has been blocked. Please contact support.")
        if user.role and not user.role.is_active:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Your account role has been disabled. Please contact support.")

        role_slug = user.role.slug if user.role else "customer"
        access_token = create_access_token(
            data={
                "sub": str(user.id),
                "role": role_slug,
                "city_id": user.city_id
            }
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user_role": role_slug,
            "city_id": user.city_id,
            "dietary_preference": user.dietary_preference,
            "include_eggs": user.include_eggs,
            "is_onboarding_complete": getattr(user.vendor_profile, 'is_onboarding_complete', True) if role_slug == "vendor" else True
        }

    @staticmethod
    def get_my_permissions(db: Session, current_user: dict):
        user = db.query(Profile).filter(Profile.id == current_user["user_id"]).first()
        if not user or not user.role:
            return []
        return [perm.slug for perm in user.role.permissions]

    @staticmethod
    def get_my_profile(db: Session, current_user: dict):
        user = db.query(Profile).filter(Profile.id == current_user["user_id"]).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        data = {
            "id": user.id,
            "name": user.name,
            "phone": user.phone,
            "city": {"id": user.city.id, "name": user.city.name} if user.city else None,
            "role": {"id": user.role.id, "name": user.role.name, "slug": user.role.slug} if user.role else None,
            "cod_status": user.cod_status,
            "dietary_preference": getattr(user, 'dietary_preference', 'Any'),
            "include_eggs": getattr(user, 'include_eggs', False),
            "wallet": {"balance": float(user.wallet.balance)} if getattr(user, 'wallet', None) else {"balance": 0.0},
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
                "open_time": v.open_time.strftime("%H:%M") if v.open_time else None,
                "close_time": v.close_time.strftime("%H:%M") if v.close_time else None,
                "dietary_type": v.dietary_type,
                "service_types": v.service_types,
                "delivery_windows": v.delivery_windows,
                "order_cutoff_hours": v.order_cutoff_hours,
                "max_capacity_per_slot": v.max_capacity_per_slot,
                "fssai_number": v.fssai_number,
                "is_onboarding_complete": v.is_onboarding_complete,
                "onboarding_step": v.onboarding_step,
            }

        return data

    @staticmethod
    def update_my_profile(db: Session, body: SelfProfileUpdate, current_user: dict):
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
        if body.dietary_preference is not None:
            user.dietary_preference = body.dietary_preference
        if body.include_eggs is not None:
            user.include_eggs = body.include_eggs
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def update_my_password(db: Session, body: SelfPasswordUpdate, current_user: dict):
        user = db.query(Profile).filter(Profile.id == current_user["user_id"]).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
            
        if not verify_password(body.old_password, user.hashed_password):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect old password")
            
        user.hashed_password = hash_password(body.new_password)
        db.commit()
        return True
