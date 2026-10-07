from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import Optional
from ..models.models import Profile, Role, VendorProfile
from ..schemas.schemas import VendorProfileUpdate, AdminPasswordUpdate
from ..core.security import hash_password

class UserService:
    @staticmethod
    def get_all_users(db: Session):
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
        return users_data

    @staticmethod
    def get_user_by_id(db: Session, user_id: int):
        user = db.query(Profile).filter(Profile.id == user_id).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
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
        
        if user.role and user.role.slug == "vendor" and user.vendor_profile:
            vendor = user.vendor_profile
            user_data["vendor_profile"] = {
                "id": vendor.id,
                "kitchen_name": vendor.kitchen_name,
                "is_open": vendor.is_open,
                "open_time": vendor.open_time.strftime("%H:%M") if vendor.open_time else None,
                "close_time": vendor.close_time.strftime("%H:%M") if vendor.close_time else None,
                "fssai_number": vendor.fssai_number,
                "delivery_windows": vendor.delivery_windows,
                "service_types": vendor.service_types,
                "dietary_type": vendor.dietary_type,
                "order_cutoff_hours": vendor.order_cutoff_hours,
                "max_capacity_per_slot": vendor.max_capacity_per_slot
            }

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
        return user_data

    @staticmethod
    def update_user(db: Session, user_id: int, name: str, phone: str, city_id: int, role_id: Optional[int], is_blocked: Optional[bool], current_user: dict):
        user = db.query(Profile).filter(Profile.id == user_id).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
        if phone != user.phone:
            existing_phone = db.query(Profile).filter(Profile.phone == phone, Profile.id != user_id).first()
            if existing_phone:
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Phone number already in use")
        
        user.name = name
        user.phone = phone
        user.city_id = city_id

        if role_id is not None:
            role_obj = db.query(Role).filter(Role.id == role_id).first()
            if not role_obj:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid role")
            if role_id == 1:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot assign super admin role through this form")
            user.role_id = role_id
            if role_obj.slug == "vendor" and not user.vendor_profile:
                db.add(VendorProfile(user_id=user.id, kitchen_name=f"{user.name}'s Kitchen"))

        if is_blocked is not None:
            if user.id == current_user["user_id"] and is_blocked:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot block yourself")
            user.is_blocked = is_blocked
        
        db.commit()
        db.refresh(user)
        return user

    @staticmethod
    def update_user_vendor_profile(db: Session, user_id: int, settings: VendorProfileUpdate):
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
        return vendor

    @staticmethod
    def update_user_password(db: Session, user_id: int, body: AdminPasswordUpdate):
        user = db.query(Profile).filter(Profile.id == user_id).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        user.hashed_password = hash_password(body.new_password)
        db.commit()
        return True

    @staticmethod
    def toggle_user_status(db: Session, user_id: int, current_user: dict):
        user = db.query(Profile).filter(Profile.id == user_id).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
        
        if user.id == current_user["user_id"]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot block yourself")
        
        current_status = getattr(user, 'is_blocked', False)
        setattr(user, 'is_blocked', not current_status)
        db.commit()
        db.refresh(user)
        return getattr(user, 'is_blocked', False), user.id
