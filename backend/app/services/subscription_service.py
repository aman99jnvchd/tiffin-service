import json
from datetime import datetime
import datetime as dt
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
from fastapi import HTTPException, status

from ..models.models import Order, OrderItem
from ..schemas.schemas import SubscriptionUpdate, SubscriptionSchema, MealSchema

class SubscriptionService:
    @staticmethod
    def get_customer_subscriptions(db: Session, current_user_id: int):
        orders = db.query(Order).options(joinedload(Order.items).joinedload(OrderItem.meal)).filter(
            Order.customer_id == current_user_id,
            Order.order_type == "SUBSCRIPTION"
        ).order_by(desc(Order.created_at)).all()
        
        subs = []
        for order in orders:
            if not order.items: continue
            item = order.items[0]
            
            selected_days = []
            service_type = None
            if item.delivery_dates:
                try:
                    dates_list = json.loads(item.delivery_dates)
                    if dates_list and len(dates_list) > 0:
                        service_type = dates_list[0].get('service_type')
                    for d in dates_list:
                        # Parse date string "YYYY-MM-DD"
                        date_obj = datetime.strptime(d['date'], "%Y-%m-%d")
                        # Python weekday() is 0=Mon, 6=Sun
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
                meal=MealSchema.model_validate(item.meal) if item.meal else None,
                service_type=service_type
            ))
            
        return subs

    @staticmethod
    def update_subscription(db: Session, subscription_id: int, update_data: SubscriptionUpdate, current_user_id: int):
        order = db.query(Order).filter(
            Order.id == subscription_id, 
            Order.customer_id == current_user_id
        ).first()
        
        if not order:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscription not found")

        if update_data.status is not None:
            if update_data.status not in ["active", "paused", "cancelled"]:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status")
            
            if update_data.status == "cancelled":
                order.status = "cancelled"
                order.subscription_end_date = datetime.now().date()
            elif update_data.status == "active":
                order.status = "placed"

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
                
                today = dt.datetime.now().date()
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
        return order
