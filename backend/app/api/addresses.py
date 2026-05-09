import os
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import exists
from typing import List, Optional

from ..db.session import get_db
from ..models.models import Address, Order
from ..schemas.responses import ApiResponse
from ..schemas.schemas import AddressSchema, AddressCreate
from .deps import get_current_user_data

router = APIRouter()

@router.post("/addresses", response_model=ApiResponse[AddressSchema], status_code=status.HTTP_201_CREATED)
async def add_address(
    address_data: AddressCreate,
    target_user_id: Optional[int] = Query(None, description="Admin can pass a user_id to add address for that user"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_data)
):
    # Admin can add for another user, otherwise use own id
    owner_id = target_user_id if target_user_id else current_user['user_id']

    new_address = Address(
        user_id=owner_id,
        label=address_data.label,
        address_text=address_data.address_text,
        house_no=address_data.house_no,
        pincode=address_data.pincode,
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
    current_user: dict = Depends(get_current_user_data)
):
    addresses = db.query(Address).filter(Address.user_id == current_user['user_id']).all()
    return ApiResponse(status=200, message="Addresses fetched", data=addresses)

@router.put("/addresses/{address_id}", response_model=ApiResponse[AddressSchema])
async def update_address(
    address_id: int,
    address_data: AddressCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_data)
):
    address = db.query(Address).filter(Address.id == address_id).first()
    if not address:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Address not found")

    address.label = address_data.label
    address.address_text = address_data.address_text
    address.house_no = address_data.house_no
    address.pincode = address_data.pincode
    address.google_maps_url = address_data.google_maps_url
    if address_data.house_photo_url:
        address.house_photo_url = address_data.house_photo_url

    db.commit()
    db.refresh(address)
    return ApiResponse(status=200, message="Address updated successfully", data=address)

@router.delete("/addresses/{address_id}", response_model=ApiResponse)
async def delete_address(
    address_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user_data)
):
    # Admin can delete any address; others only their own
    address = db.query(Address).filter(Address.id == address_id).first()

    if not address:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Address not found")

    # Non-admin: enforce ownership
    if current_user['role'] != 'admin' and address.user_id != current_user['user_id']:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not allowed")

    active_order = db.query(exists().where(Order.address_id == address_id)).scalar()
    if active_order:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete address linked to orders")

    if address.house_photo_url:
        file_path = address.house_photo_url.lstrip("/")
        if os.path.exists(file_path):
            os.remove(file_path)

    db.delete(address)
    db.commit()

    return ApiResponse(status=200, message="Address deleted successfully", data=None)
