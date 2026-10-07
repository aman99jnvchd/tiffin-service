from fastapi import APIRouter, Depends
from typing import List
from sqlalchemy.orm import Session
from ..db.session import get_db
from ..schemas.responses import ApiResponse
from ..schemas.schemas import CategorySchema, CategoryCreate
from .deps import get_current_user_data
from ..services.category_service import CategoryService

router = APIRouter()

@router.get("/categories", response_model=ApiResponse[List[CategorySchema]])
def get_categories(
    vendor_id: int = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_data)
):
    categories = CategoryService.get_categories(db, vendor_id, current_user)
    return ApiResponse(status=200, message="Categories fetched", data=categories)

@router.post("/categories", response_model=ApiResponse[CategorySchema], status_code=201)
def create_category(
    category_in: CategoryCreate,
    vendor_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_data)
):
    new_category = CategoryService.create_category(db, category_in, vendor_id)
    return ApiResponse(status=201, message="Category created", data=new_category)

@router.put("/categories/{category_id}", response_model=ApiResponse[CategorySchema])
def update_category(
    category_id: int,
    category_in: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_data)
):
    category = CategoryService.update_category(db, category_id, category_in)
    return ApiResponse(status=200, message="Category updated", data=category)

@router.delete("/categories/{category_id}", response_model=ApiResponse)
def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_data)
):
    CategoryService.delete_category(db, category_id)
    return ApiResponse(status=200, message="Category deleted")
