from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import Optional
from ..models.models import VendorProfile, Address
from ..schemas.schemas import (
    VendorProfileUpdate, 
    VendorOnboardingStep1, VendorOnboardingStep2, 
    VendorOnboardingStep3, VendorOnboardingStep4
)

class VendorService:
    @staticmethod
    def create_vendor_profile(db: Session, kitchen_name: str, user_id: int):
        existing = db.query(VendorProfile).filter(VendorProfile.user_id == user_id).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Vendor profile already exists for this account"
            )
        new_vendor = VendorProfile(user_id=user_id, kitchen_name=kitchen_name)
        db.add(new_vendor)
        db.commit()
        db.refresh(new_vendor)
        return new_vendor

    @staticmethod
    def update_vendor_settings(db: Session, settings: VendorProfileUpdate, user_id: int):
        vendor = db.query(VendorProfile).filter(VendorProfile.user_id == user_id).first()
        if not vendor:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor profile not found")
        for key, value in settings.model_dump(exclude_unset=True).items():
            setattr(vendor, key, value)
        db.commit()
        db.refresh(vendor)
        return vendor

    @staticmethod
    def get_vendor_profile(db: Session, user_id: int):
        vendor = db.query(VendorProfile).filter(VendorProfile.user_id == user_id).first()
        if not vendor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Profile not found. Please create your vendor profile first."
            )
        return vendor

    @staticmethod
    def onboarding_step_1(db: Session, data: VendorOnboardingStep1, user_id: int):
        vendor = db.query(VendorProfile).filter(VendorProfile.user_id == user_id).first()
        if not vendor: raise HTTPException(status_code=404, detail="Vendor not found")
        vendor.kitchen_name = data.kitchen_name
        vendor.dietary_type = data.dietary_type
        vendor.service_types = data.service_types
        vendor.onboarding_step = 2
        db.commit()
        db.refresh(vendor)
        return vendor

    @staticmethod
    def onboarding_step_2(db: Session, data: VendorOnboardingStep2, user_id: int):
        vendor = db.query(VendorProfile).filter(VendorProfile.user_id == user_id).first()
        if not vendor: raise HTTPException(status_code=404, detail="Vendor not found")
        vendor.delivery_windows = data.delivery_windows
        vendor.order_cutoff_hours = data.order_cutoff_hours
        vendor.max_capacity_per_slot = data.max_capacity_per_slot
        vendor.onboarding_step = 3
        db.commit()
        db.refresh(vendor)
        return vendor

    @staticmethod
    def onboarding_step_3(db: Session, data: VendorOnboardingStep3, user_id: int):
        vendor = db.query(VendorProfile).filter(VendorProfile.user_id == user_id).first()
        if not vendor: raise HTTPException(status_code=404, detail="Vendor not found")
        new_address = Address(
            user_id=user_id,
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
        return vendor

    @staticmethod
    def onboarding_step_4(db: Session, data: VendorOnboardingStep4, user_id: int):
        vendor = db.query(VendorProfile).filter(VendorProfile.user_id == user_id).first()
        if not vendor: raise HTTPException(status_code=404, detail="Vendor not found")
        vendor.fssai_number = data.fssai_number
        vendor.is_onboarding_complete = True
        vendor.onboarding_step = 5
        db.commit()
        db.refresh(vendor)
        return vendor

    @staticmethod
    def get_all_vendors(db: Session, dietary_preference: Optional[str]):
        query = db.query(VendorProfile).filter(VendorProfile.is_onboarding_complete == True)
        if dietary_preference == "Pure Veg Only":
            query = query.filter(VendorProfile.dietary_type == "Pure Veg")
        elif dietary_preference == "Non-Veg Only":
            query = query.filter(VendorProfile.dietary_type.in_(["Both", "Non-Veg"]))
        return query.all()
