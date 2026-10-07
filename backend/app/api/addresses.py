from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional

from ..db.session import get_db
from ..schemas.responses import ApiResponse
from ..schemas.schemas import AddressSchema, AddressCreate
from .deps import get_current_user_data
from ..services.address_service import AddressService

router = APIRouter()

@router.post("/addresses", response_model=ApiResponse[AddressSchema], status_code=status.HTTP_201_CREATED)
def add_address(
    address_data: AddressCreate,
    target_user_id: Optional[int] = Query(None, description="Admin can pass a user_id to add address for that user"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_data)
):
    new_address = AddressService.add_address(db, address_data, target_user_id, current_user)
    return ApiResponse(status=201, message="Address saved successfully", data=new_address)

@router.get("/addresses", response_model=ApiResponse[List[AddressSchema]])
def get_my_addresses(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_data)
):
    addresses = AddressService.get_my_addresses(db, current_user)
    return ApiResponse(status=200, message="Addresses fetched", data=addresses)

@router.put("/addresses/{address_id}", response_model=ApiResponse[AddressSchema])
def update_address(
    address_id: int,
    address_data: AddressCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_data)
):
    address = AddressService.update_address(db, address_id, address_data)
    return ApiResponse(status=200, message="Address updated successfully", data=address)

@router.delete("/addresses/{address_id}", response_model=ApiResponse)
def delete_address(
    address_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_data)
):
    AddressService.delete_address(db, address_id, current_user)
    return ApiResponse(status=200, message="Address deleted successfully", data=None)
