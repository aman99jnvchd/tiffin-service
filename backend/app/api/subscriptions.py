from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
from typing import List
import json
from datetime import datetime

from ..models.models import Order, OrderItem, Meal
from ..schemas.schemas import SubscriptionUpdate, SubscriptionSchema, MealSchema
from ..schemas.responses import ApiResponse
from .deps import RoleChecker
from ..db.session import get_db

router = APIRouter()

@router.get("/customer/subscriptions", response_model=ApiResponse[List[SubscriptionSchema]])
async def get_customer_subscriptions(
    db: Session = Depends(get_db),
    current_user: dict = Depends(RoleChecker(["customer"]))
):
    orders = db.query(Order).options(joinedload(Order.items).joinedload(OrderItem.meal)).filter(
        Order.customer_id == current_user['user_id'],
        Order.order_type == "SUBSCRIPTION"
    ).order_by(desc(Order.created_at)).all()
    
    subs = []
    for order in orders:
        if not order.items: continue
        item = order.items[0]
        
        selected_days = []
        if item.delivery_dates:
            try:
                dates_list = json.loads(item.delivery_dates)
                for d in dates_list:
                    # Parse date string "YYYY-MM-DD"
                    date_obj = datetime.strptime(d['date'], "%Y-%m-%d")
                    # Python weekday() is 0=Mon, 6=Sun. This matches the UI perfectly!
                    day_idx = date_obj.weekday()
                    if day_idx not in selected_days:
                        selected_days.append(day_idx)
            except:
                pass
                
        subs.append(SubscriptionSchema(
            id=order.id,
            customer_id=order.customer_id,
            vendor_id=order.vendor_id,
            meal_id=item.meal_id,
            status=order.status,
            selected_days=json.dumps(selected_days),
            subscription_start_date=order.subscription_start_date,
            subscription_end_date=order.subscription_end_date,
            meal=MealSchema.model_validate(item.meal) if item.meal else None
        ))
        
    return ApiResponse(status=200, message="Subscriptions fetched", data=subs)

@router.patch("/customer/subscriptions/{subscription_id}", response_model=ApiResponse)
async def update_subscription(
    subscription_id: int, 
    update_data: SubscriptionUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(RoleChecker(["customer"]))
):
    # subscription_id is actually the order_id
    order = db.query(Order).filter(
        Order.id == subscription_id, 
        Order.customer_id == current_user['user_id']
    ).first()
    
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscription not found")

    if update_data.status is not None:
        if update_data.status not in ["active", "paused", "cancelled"]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status")
        
        # Mapping subscription status to order status
        if update_data.status == "cancelled":
            order.status = "cancelled"
            order.subscription_end_date = datetime.now().date()
        elif update_data.status == "active":
            order.status = "placed" # Reverting to placed

    if update_data.selected_days is not None:
        if order.items:
            item = order.items[0]
            new_dates_list = []
            
            slot = "10:00 AM - 10:30 AM"
            service_type = "Lunch"
            if item.delivery_dates:
                try:
                    old_dates = json.loads(item.delivery_dates)
                    if old_dates:
                        slot = old_dates[0].get('slot', slot)
                        service_type = old_dates[0].get('service_type', service_type)
                except:
                    pass
            
            import datetime as dt
            today = dt.datetime.now().date()
            # If no days selected, we should maybe cancel or just store empty
            for day_idx in update_data.selected_days:
                days_ahead = day_idx - today.weekday()
                if days_ahead <= 0:
                    days_ahead += 7
                next_date = today + dt.timedelta(days=days_ahead)
                new_dates_list.append({
                    "date": next_date.strftime("%Y-%m-%d"),
                    "slot": slot,
                    "service_type": service_type
                })
            
            item.delivery_dates = json.dumps(new_dates_list)

    db.commit()
    return ApiResponse(status=200, message="Subscription updated successfully", data={"subscription_id": order.id})
