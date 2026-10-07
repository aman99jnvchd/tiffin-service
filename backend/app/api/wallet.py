from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
from typing import List
from pydantic import BaseModel

from ..models.models import Wallet, WalletTransaction
from ..services.wallet_service import WalletService
from ..schemas.schemas import WalletSchema
from ..schemas.responses import ApiResponse
from .deps import RoleChecker
from ..db.session import get_db

router = APIRouter()

class RechargeRequest(BaseModel):
    amount: float

@router.get("/customer/wallet", response_model=ApiResponse[WalletSchema])
def get_customer_wallet(
    db: Session = Depends(get_db),
    current_user: dict = Depends(RoleChecker(["customer"]))
):
    wallet = WalletService.get_wallet(db, current_user['user_id'])
    return ApiResponse(status=200, message="Wallet fetched", data=wallet)

@router.post("/customer/wallet/recharge", response_model=ApiResponse)
def recharge_wallet(
    request: RechargeRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(RoleChecker(["customer"]))
):
    wallet = WalletService.recharge_wallet(db, current_user['user_id'], request.amount)
    return ApiResponse(status=200, message="Recharge successful", data={"balance": wallet.balance})
