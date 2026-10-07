from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from ..models.models import Category, VendorProfile, Meal
from ..schemas.schemas import CategoryCreate

class CategoryService:
    @staticmethod
    def get_categories(db: Session, vendor_id: int, current_user: dict):
        query = db.query(Category)
        
        if current_user["role"] == "vendor":
            vendor = db.query(VendorProfile).filter(VendorProfile.user_id == current_user["user_id"]).first()
            if vendor:
                query = query.filter(Category.vendor_id == vendor.id)
        elif vendor_id:
            query = query.filter(Category.vendor_id == vendor_id)
            
        return query.all()

    @staticmethod
    def create_category(db: Session, category_in: CategoryCreate, vendor_id: int):
        vendor = db.query(VendorProfile).filter(VendorProfile.id == vendor_id).first()
        if not vendor:
            raise HTTPException(status_code=404, detail="Vendor not found")

        existing = db.query(Category).filter(
            Category.vendor_id == vendor_id,
            Category.name.ilike(category_in.name)
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Category '{category_in.name}' already exists."
            )

        new_category = Category(vendor_id=vendor_id, name=category_in.name)
        db.add(new_category)
        db.commit()
        db.refresh(new_category)
        return new_category

    @staticmethod
    def update_category(db: Session, category_id: int, category_in: CategoryCreate):
        category = db.query(Category).filter(Category.id == category_id).first()
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
            
        existing = db.query(Category).filter(
            Category.vendor_id == category.vendor_id,
            Category.name.ilike(category_in.name),
            Category.id != category_id
        ).first()
        if existing:
            raise HTTPException(status_code=409, detail=f"Category '{category_in.name}' already exists.")
            
        category.name = category_in.name
        db.commit()
        db.refresh(category)
        return category

    @staticmethod
    def delete_category(db: Session, category_id: int):
        category = db.query(Category).filter(Category.id == category_id).first()
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
            
        assigned_meals = db.query(Meal).filter(Meal.category_id == category_id).count()
        if assigned_meals > 0:
            raise HTTPException(status_code=400, detail="Unassign meals before deleting")
            
        db.delete(category)
        db.commit()
        return True
