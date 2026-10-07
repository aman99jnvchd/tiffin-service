import os
from sqlalchemy.orm import Session
from sqlalchemy import exists
from fastapi import HTTPException, status
from typing import Optional

from ..models.models import Address, Order
from ..schemas.schemas import AddressCreate

class AddressService:
    @staticmethod
    def add_address(db: Session, address_data: AddressCreate, target_user_id: Optional[int], current_user: dict):
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
        return new_address

    @staticmethod
    def get_my_addresses(db: Session, current_user: dict):
        return db.query(Address).filter(Address.user_id == current_user['user_id']).all()

    @staticmethod
    def update_address(db: Session, address_id: int, address_data: AddressCreate):
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
        return address

    @staticmethod
    def delete_address(db: Session, address_id: int, current_user: dict):
        address = db.query(Address).filter(Address.id == address_id).first()
        if not address:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Address not found")

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
        return True
