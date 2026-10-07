import json
from datetime import datetime
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
from fastapi import HTTPException, status

from ..models.models import Order, OrderItem, Meal, VendorProfile, Address
from ..schemas.schemas import OrderCreate, OrderFeedbackUpdate

class OrderService:
    @staticmethod
    def place_order(db: Session, order_data: OrderCreate, current_user_id: int):
        if not order_data.items:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Order must have at least one item"
            )

        # 1. Verify Address exists and belongs to user
        address = db.query(Address).filter(Address.id == order_data.address_id, Address.user_id == current_user_id).first()
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

        first_order_id = None
        
        for item in order_data.items:
            meal = db.query(Meal).filter(Meal.id == item.meal_id, Meal.vendor_id == order_data.vendor_id).first()
            if not meal:
                db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Meal {item.meal_id} not available from this vendor"
                )
                
            item_start_date = order_data.subscription_start_date
            item_end_date = order_data.subscription_end_date
            item_delivery_date = order_data.delivery_date
            
            if item.delivery_dates:
                item_dates = sorted([d.date for d in item.delivery_dates])
                item_delivery_date = datetime.strptime(item_dates[0], "%Y-%m-%d").date()
                
                if order_type == "SUBSCRIPTION":
                    item_start_date = item_delivery_date
                    if not order_data.is_continuous:
                        item_end_date = datetime.strptime(item_dates[-1], "%Y-%m-%d").date()

            new_order = Order(
                customer_id=current_user_id,
                vendor_id=order_data.vendor_id,
                address_id=order_data.address_id,
                order_type=order_type, 
                status="placed",
                delivery_date=item_delivery_date,
                delivery_time=order_data.delivery_time,
                subscription_start_date=item_start_date,
                subscription_end_date=item_end_date
            )
            db.add(new_order)
            db.flush()
            
            if first_order_id is None:
                first_order_id = new_order.id
            
            delivery_dates_json = json.dumps([d.model_dump() for d in item.delivery_dates]) if item.delivery_dates else None
            db.add(OrderItem(
                order_id=new_order.id, 
                meal_id=item.meal_id, 
                quantity=item.quantity,
                delivery_dates=delivery_dates_json
            ))

        db.commit()
        return first_order_id

    @staticmethod
    def get_vendor_active_orders(db: Session, current_vendor_id: int):
        vendor = db.query(VendorProfile).filter(VendorProfile.user_id == current_vendor_id).first()
        if not vendor:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor profile not found")
        
        return db.query(Order).options(joinedload(Order.items).joinedload(OrderItem.meal)).filter(
            Order.vendor_id == vendor.id,
            Order.status.in_(["placed", "accepted", "delivering"])
        ).order_by(desc(Order.created_at)).all()

    @staticmethod
    def update_order_status(db: Session, order_id: int, new_status: str, current_vendor_id: int):
        vendor = db.query(VendorProfile).filter(VendorProfile.user_id == current_vendor_id).first()
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
        return order

    @staticmethod
    def get_customer_active_orders(db: Session, current_user_id: int):
        return db.query(Order).options(joinedload(Order.items).joinedload(OrderItem.meal)).filter(
            Order.customer_id == current_user_id,
            Order.status.in_(["placed", "accepted", "delivering"])
        ).order_by(desc(Order.delivery_date)).all()

    @staticmethod
    def get_customer_order_history(db: Session, current_user_id: int):
        return db.query(Order).options(joinedload(Order.items).joinedload(OrderItem.meal)).filter(
            Order.customer_id == current_user_id,
            Order.status.in_(["completed", "cancelled", "skipped", "missed"])
        ).order_by(desc(Order.delivery_date)).all()

    @staticmethod
    def cancel_customer_order(db: Session, order_id: int, current_user_id: int):
        order = db.query(Order).filter(Order.id == order_id, Order.customer_id == current_user_id).first()
        if not order:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
        
        if order.status not in ["placed"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Order cannot be cancelled at this stage. Preparation has already started."
            )

        order.status = "skipped"
        db.commit()
        return order

    @staticmethod
    def submit_order_feedback(db: Session, order_id: int, feedback_data: OrderFeedbackUpdate, current_user_id: int):
        order = db.query(Order).filter(
            Order.id == order_id, 
            Order.customer_id == current_user_id
        ).first()
        
        if not order:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
            
        order.rating = feedback_data.rating
        order.feedback_tags = feedback_data.feedback_tags
        order.feedback_comment = feedback_data.feedback_comment
        
        db.commit()
        return order
