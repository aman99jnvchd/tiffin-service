from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
from datetime import date
from typing import List

from ..models.models import Order, OrderItem, Meal, VendorProfile, Address
from ..schemas.schemas import OrderCreate, OrderSchema, OrderFeedbackUpdate
from ..schemas.responses import ApiResponse
from .deps import RoleChecker
from ..db.session import get_db

router = APIRouter()

@router.post("/place-order", response_model=ApiResponse, status_code=status.HTTP_201_CREATED)
async def place_order(
    order_data: OrderCreate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(RoleChecker(["customer"]))
):
    if not order_data.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order must have at least one item"
        )

    # 1. Verify Address exists and belongs to user
    address = db.query(Address).filter(Address.id == order_data.address_id, Address.user_id == current_user['user_id']).first()
    if not address:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Delivery address not found or unauthorized"
        )

    # Determine order type
    order_type = "ONE_TIME"
    if order_data.is_continuous or (order_data.subscription_start_date and order_data.subscription_end_date and order_data.subscription_start_date != order_data.subscription_end_date):
        order_type = "SUBSCRIPTION"
        if order_data.is_continuous:
            order_data.subscription_end_date = None

    # 2. Create Order Header
    new_order = Order(
        customer_id=current_user['user_id'],
        vendor_id=order_data.vendor_id,
        address_id=order_data.address_id,
        order_type=order_type, 
        status="placed",
        delivery_date=order_data.delivery_date,
        delivery_time=order_data.delivery_time,
        subscription_start_date=order_data.subscription_start_date,
        subscription_end_date=order_data.subscription_end_date
    )
    db.add(new_order)
    db.flush() 

    import json
    # 3. Add Order Items
    for item in order_data.items:
        meal = db.query(Meal).filter(Meal.id == item.meal_id, Meal.vendor_id == order_data.vendor_id).first()
        if not meal:
            db.rollback() # Explicit rollback on failure
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Meal {item.meal_id} not available from this vendor"
            )
        
        delivery_dates_json = json.dumps([d.model_dump() for d in item.delivery_dates]) if item.delivery_dates else None
        db.add(OrderItem(
            order_id=new_order.id, 
            meal_id=item.meal_id, 
            quantity=item.quantity,
            delivery_dates=delivery_dates_json
        ))

    db.commit()
    return ApiResponse(status=201, message="Order placed successfully!", data={"order_id": new_order.id})

@router.get("/vendor/active-orders", response_model=ApiResponse[List[OrderSchema]])
async def get_vendor_orders(
    db: Session = Depends(get_db),
    current_vendor: dict = Depends(RoleChecker(["vendor"]))
):
    vendor = db.query(VendorProfile).filter(VendorProfile.user_id == current_vendor['user_id']).first()
    if not vendor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor profile not found")
    
    # Use joinedload to fetch items and meals in one query 
    orders = db.query(Order).options(joinedload(Order.items).joinedload(OrderItem.meal)).filter(
        Order.vendor_id == vendor.id,
        Order.status.in_(["placed", "accepted", "delivering"])
    ).order_by(desc(Order.created_at)).all()
    
    return ApiResponse(status=200, message="Active orders fetched", data=orders)

@router.patch("/orders/{order_id}/status", response_model=ApiResponse)
async def update_order_status(
    order_id: int, 
    new_status: str, 
    db: Session = Depends(get_db),
    current_vendor: dict = Depends(RoleChecker(["vendor"]))
):
    vendor = db.query(VendorProfile).filter(VendorProfile.user_id == current_vendor['user_id']).first()
    if not vendor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor profile not found")
    
    valid_statuses = ["placed", "accepted", "delivering", "completed", "cancelled", "skipped"]
    if new_status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
        )

    order = db.query(Order).filter(Order.id == order_id, Order.vendor_id == vendor.id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    order.status = new_status
    db.commit()
    return ApiResponse(status=200, message=f"Status updated to {new_status}", data={"order_id": order_id})

@router.get("/customer/active-orders", response_model=ApiResponse[List[OrderSchema]])
async def get_customer_active_orders(
    db: Session = Depends(get_db),
    current_user: dict = Depends(RoleChecker(["customer"]))
):
    orders = db.query(Order).options(joinedload(Order.items).joinedload(OrderItem.meal)).filter(
        Order.customer_id == current_user['user_id'],
        Order.status.in_(["placed", "accepted", "delivering"])
    ).order_by(desc(Order.delivery_date)).all()
    
    return ApiResponse(status=200, message="Active orders fetched", data=orders)

@router.get("/customer/order-history", response_model=ApiResponse[List[OrderSchema]])
async def get_customer_order_history(
    db: Session = Depends(get_db),
    current_user: dict = Depends(RoleChecker(["customer"]))
):
    orders = db.query(Order).options(joinedload(Order.items).joinedload(OrderItem.meal)).filter(
        Order.customer_id == current_user['user_id'],
        Order.status.in_(["completed", "cancelled", "skipped", "missed"])
    ).order_by(desc(Order.delivery_date)).all()
    
    return ApiResponse(status=200, message="History fetched", data=orders)

@router.patch("/customer/orders/{order_id}/cancel", response_model=ApiResponse)
async def cancel_customer_order(
    order_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(RoleChecker(["customer"]))
):
    order = db.query(Order).filter(Order.id == order_id, Order.customer_id == current_user['user_id']).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    
    if order.status not in ["placed"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Order cannot be cancelled at this stage. Preparation has already started."
        )

    order.status = "skipped"
    db.commit()
    return ApiResponse(status=200, message="Order skipped successfully", data={"order_id": order_id})

@router.patch("/customer/orders/{order_id}/feedback", response_model=ApiResponse)
async def submit_order_feedback(
    order_id: int, 
    feedback_data: OrderFeedbackUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(RoleChecker(["customer"]))
):
    order = db.query(Order).filter(
        Order.id == order_id, 
        Order.customer_id == current_user['user_id']
    ).first()
    
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
        
    order.rating = feedback_data.rating
    order.feedback_tags = feedback_data.feedback_tags
    order.feedback_comment = feedback_data.feedback_comment
    
    db.commit()
    return ApiResponse(status=200, message="Feedback submitted successfully", data={"order_id": order.id})
