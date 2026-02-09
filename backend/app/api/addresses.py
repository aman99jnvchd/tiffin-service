import os
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import exists
from typing import List

from ..db.session import get_db
from ..models.models import Address, Order
from ..schemas.responses import ApiResponse
from ..schemas.schemas import AddressSchema, AddressCreate
from .deps import RoleChecker

router = APIRouter()

@router.post("/addresses", response_model=ApiResponse[AddressSchema], status_code=status.HTTP_201_CREATED)
async def add_address(
    address_data: AddressCreate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(RoleChecker(["customer"]))
):
    new_address = Address(
        user_id=current_user['user_id'],
        label=address_data.label,
        address_text=address_data.address_text,
        house_no=address_data.house_no,
        google_maps_url=address_data.google_maps_url,
        house_photo_url=address_data.house_photo_url
    )
    db.add(new_address)
    db.commit()
    db.refresh(new_address)
    
    return ApiResponse(status=201, message="Address saved successfully", data=new_address)

@router.get("/addresses", response_model=ApiResponse[List[AddressSchema]])
async def get_my_addresses(
    db: Session = Depends(get_db),
    current_user: dict = Depends(RoleChecker(["customer"]))
):
    addresses = db.query(Address).filter(Address.user_id == current_user['user_id']).all()
    return ApiResponse(status=200, message="Addresses fetched", data=addresses)

@router.delete("/addresses/{address_id}", response_model=ApiResponse)
async def delete_address(
    address_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(RoleChecker(["customer"]))
):
    # Check ownership
    address = db.query(Address).filter(
        Address.id == address_id, 
        Address.user_id == current_user['user_id']
    ).first()

    if not address:
        # Proper 404 Not Found 
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Address not found"
        )

    # Prevent deletion if linked to an active order
    active_order = db.query(exists().where(Order.address_id == address_id)).scalar()
    if active_order:
        # Proper 400 Bad Request for logical constraints
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete address linked to orders"
        )

    # Delete photo from disk if exists
    if address.house_photo_url:
        file_path = address.house_photo_url.lstrip("/") 
        if os.path.exists(file_path):
            os.remove(file_path)

    db.delete(address)
    db.commit()
    
    return ApiResponse(status=200, message="Address deleted successfully", data=None)
