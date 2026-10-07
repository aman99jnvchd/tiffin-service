from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List

from ..schemas.schemas import OrderCreate, OrderSchema, OrderFeedbackUpdate
from ..schemas.responses import ApiResponse
from .deps import RoleChecker
from ..db.session import get_db
from ..services.order_service import OrderService

router = APIRouter()

@router.post("/place-order", response_model=ApiResponse, status_code=status.HTTP_201_CREATED)
def place_order(
    order_data: OrderCreate, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(RoleChecker(["customer"]))
):
    order_id = OrderService.place_order(db, order_data, current_user['user_id'])
    return ApiResponse(status=201, message="Order placed successfully!", data={"order_id": order_id})

@router.get("/vendor/active-orders", response_model=ApiResponse[List[OrderSchema]])
def get_vendor_orders(
    db: Session = Depends(get_db),
    current_vendor: dict = Depends(RoleChecker(["vendor"]))
):
    orders = OrderService.get_vendor_active_orders(db, current_vendor['user_id'])
    return ApiResponse(status=200, message="Active orders fetched", data=orders)

@router.patch("/orders/{order_id}/status", response_model=ApiResponse)
def update_order_status(
    order_id: int, 
    new_status: str, 
    db: Session = Depends(get_db),
    current_vendor: dict = Depends(RoleChecker(["vendor"]))
):
    OrderService.update_order_status(db, order_id, new_status, current_vendor['user_id'])
    return ApiResponse(status=200, message=f"Status updated to {new_status}", data={"order_id": order_id})

@router.get("/customer/active-orders", response_model=ApiResponse[List[OrderSchema]])
def get_customer_active_orders(
    db: Session = Depends(get_db),
    current_user: dict = Depends(RoleChecker(["customer"]))
):
    orders = OrderService.get_customer_active_orders(db, current_user['user_id'])
    return ApiResponse(status=200, message="Active orders fetched", data=orders)

@router.get("/customer/order-history", response_model=ApiResponse[List[OrderSchema]])
def get_customer_order_history(
    db: Session = Depends(get_db),
    current_user: dict = Depends(RoleChecker(["customer"]))
):
    orders = OrderService.get_customer_order_history(db, current_user['user_id'])
    return ApiResponse(status=200, message="History fetched", data=orders)

@router.patch("/customer/orders/{order_id}/cancel", response_model=ApiResponse)
def cancel_customer_order(
    order_id: int, 
    db: Session = Depends(get_db),
    current_user: dict = Depends(RoleChecker(["customer"]))
):
    OrderService.cancel_customer_order(db, order_id, current_user['user_id'])
    return ApiResponse(status=200, message="Order skipped successfully", data={"order_id": order_id})

@router.patch("/customer/orders/{order_id}/feedback", response_model=ApiResponse)
def submit_order_feedback(
    order_id: int, 
    feedback_data: OrderFeedbackUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(RoleChecker(["customer"]))
):
    order = OrderService.submit_order_feedback(db, order_id, feedback_data, current_user['user_id'])
    return ApiResponse(status=200, message="Feedback submitted successfully", data={"order_id": order.id})
