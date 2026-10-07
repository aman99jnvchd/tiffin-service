from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from ..schemas.schemas import SubscriptionUpdate, SubscriptionSchema
from ..schemas.responses import ApiResponse
from .deps import RoleChecker
from ..db.session import get_db
from ..services.subscription_service import SubscriptionService

router = APIRouter()

@router.get("/customer/subscriptions", response_model=ApiResponse[List[SubscriptionSchema]])
def get_customer_subscriptions(
    db: Session = Depends(get_db),
    current_user: dict = Depends(RoleChecker(["customer"]))
):
    subs = SubscriptionService.get_customer_subscriptions(db, current_user['user_id'])
    return ApiResponse(status=200, message="Subscriptions fetched", data=subs)

@router.patch("/customer/subscriptions/{subscription_id}", response_model=ApiResponse)
def update_subscription(
    subscription_id: int, 
    update_data: SubscriptionUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(RoleChecker(["customer"]))
):
    order = SubscriptionService.update_subscription(db, subscription_id, update_data, current_user['user_id'])
    return ApiResponse(status=200, message="Subscription updated successfully", data={"subscription_id": order.id})
