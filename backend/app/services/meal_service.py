from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import Optional, List
from fastapi import HTTPException, status
from ..models.models import Meal, VendorProfile
from ..schemas.schemas import MealCreate, MealUpdate, MealSchema

class MealService:
    @staticmethod
    def get_all_meals(db: Session, vendor_id: Optional[int], current_user: dict):
        query = db.query(Meal)
        if current_user["role"] == "vendor":
            vendor = db.query(VendorProfile).filter(VendorProfile.user_id == current_user["user_id"]).first()
            if vendor:
                query = query.filter(Meal.vendor_id == vendor.id)
        elif vendor_id is not None:
            query = query.filter(Meal.vendor_id == vendor_id)
        return query.all()

    @staticmethod
    def create_meal(db: Session, meal_in: MealCreate, vendor_id: int):
        vendor = db.query(VendorProfile).filter(VendorProfile.id == vendor_id).first()
        if not vendor:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor not found")
        new_meal = Meal(
            vendor_id=vendor_id,
            name=meal_in.name,
            base_price=meal_in.base_price,
            description=meal_in.description,
            image_url=meal_in.image_url,
            available_days=meal_in.available_days,
            is_always_available=meal_in.is_always_available,
            is_active=meal_in.is_active,
            category_id=meal_in.category_id,
            service_types=meal_in.service_types,
            dietary_type=meal_in.dietary_type,
        )
        db.add(new_meal)
        db.commit()
        db.refresh(new_meal)
        return new_meal

    @staticmethod
    def update_meal(db: Session, meal_id: int, meal_in: MealUpdate):
        meal = db.query(Meal).filter(Meal.id == meal_id).first()
        if not meal:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meal not found")
        for field, value in meal_in.model_dump(exclude_unset=True).items():
            setattr(meal, field, value)
        db.commit()
        db.refresh(meal)
        return meal

    @staticmethod
    def toggle_meal_availability(db: Session, meal_id: int, current_vendor: dict):
        vendor = db.query(VendorProfile).filter(VendorProfile.user_id == current_vendor['user_id']).first()
        if not vendor:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor profile not found")
        meal = db.query(Meal).filter(Meal.id == meal_id, Meal.vendor_id == vendor.id).first()
        if not meal:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meal not found")
        meal.is_active = not meal.is_active
        db.commit()
        return meal

    @staticmethod
    def get_menu(db: Session, vendor_id: Optional[int], dietary_preference: Optional[str], include_eggs: bool):
        query = db.query(Meal)
        if vendor_id is not None:
            query = query.filter(Meal.vendor_id == vendor_id)
        if dietary_preference in ["Pure Veg Only", "Veg Meals Only"]:
            if include_eggs:
                query = query.filter(Meal.dietary_type.in_(["veg", "egg"]))
            else:
                query = query.filter(Meal.dietary_type == "veg")
        elif dietary_preference == "Non-Veg Only":
            query = query.filter(Meal.dietary_type == "non-veg")
        return query.all()

    @staticmethod
    def get_active_menu(db: Session, vendor_id: int):
        return db.query(Meal).filter(Meal.vendor_id == vendor_id).all()

    @staticmethod
    def get_all_vendor_meals(db: Session, vendor_id: int):
        return db.query(Meal).filter(Meal.vendor_id == vendor_id).all()

    @staticmethod
    def search(db: Session, q: str, dietary_preference: Optional[str], include_eggs: bool):
        term = f"%{q.lower()}%"
        meal_query = db.query(Meal).filter(Meal.name.ilike(term))
        if dietary_preference in ["Pure Veg Only", "Veg Meals Only"]:
            if include_eggs:
                meal_query = meal_query.filter(Meal.dietary_type.in_(["veg", "egg"]))
            else:
                meal_query = meal_query.filter(Meal.dietary_type == "veg")
        elif dietary_preference == "Non-Veg Only":
            meal_query = meal_query.filter(Meal.dietary_type == "non-veg")
        meals = meal_query.limit(20).all()

        vendor_query = db.query(VendorProfile).filter(VendorProfile.kitchen_name.ilike(term))
        if dietary_preference == "Pure Veg Only":
            vendor_query = vendor_query.filter(VendorProfile.dietary_type == "Pure Veg")
        elif dietary_preference == "Non-Veg Only":
            vendor_query = vendor_query.filter(VendorProfile.dietary_type.in_(["Both", "Non-Veg"]))
        vendors = vendor_query.limit(10).all()

        return meals, vendors
