from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from sqlalchemy.orm import Session
from ..db.session import get_db
from ..models.models import Category, VendorProfile, Meal
from ..schemas.responses import ApiResponse
from ..schemas.schemas import CategorySchema, CategoryCreate
from .deps import RoleChecker, get_current_user_data

router = APIRouter()

@router.get("/categories", response_model=ApiResponse[List[CategorySchema]])
async def get_categories(
    vendor_id: int = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_data)
):
    query = db.query(Category)
    
    if current_user["role"] == "vendor":
        vendor = db.query(VendorProfile).filter(VendorProfile.user_id == current_user["user_id"]).first()
        if vendor:
            query = query.filter(Category.vendor_id == vendor.id)
    elif vendor_id:
        query = query.filter(Category.vendor_id == vendor_id)
        
    categories = query.all()
    return ApiResponse(status=200, message="Categories fetched", data=categories)

@router.post("/categories", response_model=ApiResponse[CategorySchema], status_code=201)
async def create_category(
    category_in: CategoryCreate,
    vendor_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_data)
):
    vendor = db.query(VendorProfile).filter(VendorProfile.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    # Check for duplicate category name
    existing = db.query(Category).filter(
        Category.vendor_id == vendor_id,
        Category.name.ilike(category_in.name)
    ).first()
    
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Category '{category_in.name}' already exists."
        )

    new_category = Category(
        vendor_id=vendor_id,
        name=category_in.name
    )
    db.add(new_category)
    db.commit()
    db.refresh(new_category)

    return ApiResponse(status=201, message="Category created", data=new_category)

@router.put("/categories/{category_id}", response_model=ApiResponse[CategorySchema])
async def update_category(
    category_id: int,
    category_in: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_data)
):
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
        
    # Check for duplicate
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
    return ApiResponse(status=200, message="Category updated", data=category)

@router.delete("/categories/{category_id}", response_model=ApiResponse)
async def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_data)
):
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
        
    # Check if any meals are assigned
    assigned_meals = db.query(Meal).filter(Meal.category_id == category_id).count()
    if assigned_meals > 0:
        raise HTTPException(
            status_code=400, 
            detail="Unassign meals before deleting"
        )
        
    db.delete(category)
    db.commit()
    return ApiResponse(status=200, message="Category deleted")
